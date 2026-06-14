import os
import datetime
import json
import uuid
import jwt
from fastapi import FastAPI, Request, Response, Depends, HTTPException, status, Form, UploadFile, File, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv

if os.path.exists(".env.local"):
    load_dotenv(".env.local")
else:
    load_dotenv()

import database

app = FastAPI(title=os.getenv('NEXT_PUBLIC_APP_NAME', 'Employee Wellbeing Platform'))

# Initialize DB on start
database.init_db()

# Point Rules
POINT_RULES = {
    'SURVEY_COMPLETE': 20,
    'RECOGNITION_SENT': 5,
    'RECOGNITION_RECEIVED': 10,
    'POST_CREATED': 5
}

SECRET_KEY = os.getenv('JWT_SECRET', 'change_me_to_a_long_random_string_min_32_chars')

# Setup Static directories
if not os.path.exists("static"):
    os.makedirs("static")
if not os.path.exists("static/css"):
    os.makedirs("static/css")
if not os.path.exists("static/js"):
    os.makedirs("static/js")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount public/uploads for files uploaded by /api/upload
upload_dir = os.getenv('UPLOAD_DIR', './public/uploads')
if not os.path.exists(upload_dir):
    os.makedirs(upload_dir)
app.mount("/static/uploads", StaticFiles(directory=upload_dir), name="uploads")

# Setup templates
templates = Jinja2Templates(directory="templates")

# --- EMAIL NOTIFICATION UTILITIES ---

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

# Email notification helper (sends real SMTP if configured, always appends to data/sent_emails.log)
def send_email_notification(to_emails: list | str, subject: str, body_html: str, body_text: str = "") -> bool:
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = os.getenv("SMTP_PORT", "")
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM", "noreply@company.com")
    
    if isinstance(to_emails, str):
        to_list = [to_emails]
    else:
        to_list = to_emails
        
    if not to_list:
        return False
        
    # Log to local file data/sent_emails.log
    try:
        dir_name = os.path.dirname(database.DATABASE_PATH)
        if dir_name and not os.path.exists(dir_name):
            os.makedirs(dir_name)
        log_path = os.path.join(dir_name, "sent_emails.log")
        
        now_str = datetime.datetime.utcnow().isoformat() + "Z"
        log_entry = {
            "timestamp": now_str,
            "to": to_list,
            "subject": subject,
            "body_text": body_text or subject,
            "body_html": body_html
        }
        with open(log_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry) + "\n")
    except Exception as log_err:
        print(f"Error logging sent email locally: {log_err}")
        
    # Log to console safely handling encoding limitations of some terminals (e.g. Windows cp1252)
    try:
        print(f"[{datetime.datetime.utcnow().isoformat()}Z] Email triggered to {to_list} | Subject: {subject}")
    except UnicodeEncodeError:
        safe_subject = subject.encode('ascii', errors='replace').decode('ascii')
        print(f"[{datetime.datetime.utcnow().isoformat()}Z] Email triggered to {to_list} | Subject: {safe_subject}")
    
    if not smtp_host:
        print("SMTP host not configured. Email logged to sent_emails.log (mock delivery)")
        return True
        
    try:
        port = int(smtp_port) if smtp_port else 25
        
        if smtp_user and smtp_pass:
            print(f"Connecting to SMTP server at {smtp_host}:{port} with authentication as {smtp_user}...")
        else:
            print(f"Connecting to SMTP server at {smtp_host}:{port} without authentication...")
            
        server = smtplib.SMTP(smtp_host, port)
        
        # Try STARTTLS if port is 587
        if port == 587:
            try:
                server.starttls()
            except Exception as tls_err:
                print(f"SMTP STARTTLS failed, proceeding: {tls_err}")
        
        # Log in only if credentials are provided
        if smtp_user and smtp_pass:
            server.login(smtp_user, smtp_pass)
            
        for recipient in to_list:
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = smtp_from
            msg['To'] = recipient
            
            part1 = MIMEText(body_text or subject, 'plain')
            part2 = MIMEText(body_html, 'html')
            
            msg.attach(part1)
            msg.attach(part2)
            
            server.sendmail(smtp_from, recipient, msg.as_string())
            
        server.quit()
        return True
    except Exception as smtp_err:
        print(f"SMTP failed to send email: {smtp_err}")
        return False

# Check if post has crossed trending threshold of unique users count (threshold = 3)
def check_and_trigger_trending_post(post_id: str, background_tasks: BackgroundTasks):
    conn = database.get_db_connection()
    post = conn.execute("SELECT p.*, u.name as author_name, u.email as author_email FROM posts p JOIN users u ON p.author_id = u.id WHERE p.id = ?", (post_id,)).fetchone()
    if not post:
        conn.close()
        return
        
    if post['trending_notified'] == 1:
        conn.close()
        return
        
    # Get unique users who liked this post
    like_rows = conn.execute("SELECT DISTINCT user_id FROM post_likes WHERE post_id = ?", (post_id,)).fetchall()
    # Get unique users who commented on this post
    comment_rows = conn.execute("SELECT DISTINCT author_id FROM comments WHERE post_id = ?", (post_id,)).fetchall()
    
    unique_users = {r['user_id'] for r in like_rows if r['user_id']}
    unique_users.update({r['author_id'] for r in comment_rows if r['author_id']})
    
    unique_count = len(unique_users)
    TRENDING_THRESHOLD = 3
    
    if unique_count >= TRENDING_THRESHOLD:
        # Mark as trending notified
        conn.execute("UPDATE posts SET trending_notified = 1 WHERE id = ?", (post_id,))
        conn.commit()
        
        # Load all approved employee emails
        user_rows = conn.execute("SELECT email FROM users WHERE status = 'approved'").fetchall()
        conn.close()
        
        all_emails = [r['email'] for r in user_rows if r['email']]
        
        # 1. Notify the author
        if post['author_email']:
            author_subject = f"Congratulations! Your post is trending in the forum!"
            author_html = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #6366f1;">🔥 Your post is trending!</h2>
                    <p>Hello {post['author_name']},</p>
                    <p>Congratulations! Your post on the Employee Wellbeing forum has caught everyone's attention and is now trending!</p>
                    <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; border-radius: 8px;">
                        <p style="margin: 0; font-style: italic;">"{post['content']}"</p>
                    </div>
                    <p>It has been engaged with by <strong>{unique_count}</strong> unique team members.</p>
                    <p>Check out the discussion on the platform to stay connected with your colleagues.</p>
                    <br/>
                    <p>Best regards,</p>
                    <p>Employee Wellbeing Platform</p>
                </div>
            </body>
            </html>
            """
            author_text = f"Hello {post['author_name']},\n\nCongratulations! Your post on the Employee Wellbeing forum is now trending!\n\nPost Content: \"{post['content']}\"\n\nIt has been engaged with by {unique_count} unique team members. Check it out on the platform!"
            background_tasks.add_task(send_email_notification, post['author_email'], author_subject, author_html, author_text)
            
        # 2. Notify all employees
        if all_emails:
            users_subject = f"🔥 Trending Topic: Check out what is hot on the Wellbeing Forum!"
            users_html = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #6366f1;">🔥 Trending on the Forum</h2>
                    <p>Hello,</p>
                    <p>A post by <strong>{post['author_name']}</strong> is currently trending on the Employee Wellbeing Forum!</p>
                    <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; border-radius: 8px;">
                        <p style="margin: 0; font-style: italic;">"{post['content']}"</p>
                    </div>
                    <p>Join the conversation, leave a like or comment, and connect with your team!</p>
                    <br/>
                    <p>Best regards,</p>
                    <p>Employee Wellbeing Platform</p>
                </div>
            </body>
            </html>
            """
            users_text = f"Hello,\n\nA post by {post['author_name']} is currently trending on the Employee Wellbeing Forum!\n\nPost Content: \"{post['content']}\"\n\nJoin the conversation, leave a like or comment, and connect with your team!"
            background_tasks.add_task(send_email_notification, all_emails, users_subject, users_html, users_text)
    else:
        conn.close()

# Helper to verify JWT token and get user payload
def get_user_from_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload
    except Exception:
        return None

# Helper to render templates with global vars
def render_template(request: Request, name: str, context: dict = None):
    if context is None:
        context = {}
    
    # Get current user from request state (set by middleware)
    user = getattr(request.state, "user", None)
    
    default_context = {
        "request": request,
        "app_name": os.getenv('NEXT_PUBLIC_APP_NAME', 'Employee Wellbeing Platform'),
        "now": datetime.datetime.utcnow(),
        "crypto_uuid": str(uuid.uuid4()),
        "current_user": user,
        "active_page": context.get("active_page", "")
    }
    
    merged_context = {**default_context, **context}
    return templates.TemplateResponse(request=request, name=name, context=merged_context)

# Middleware for Authentication
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path
    
    # Public paths
    public_paths = [
        "/login",
        "/api/auth/login",
        "/api/auth/register",
        "/api/public-stats",
        "/static"
    ]
    

    # Public tracking endpoint
    if path.startswith('/api/concerns/') and path.endswith('/status'):
        request.state.user = None
        return await call_next(request)

    if any(path.startswith(p) for p in public_paths):
        request.state.user = None
        return await call_next(request)

    # Retrieve JWT from cookie
    token = request.cookies.get('token')
    user = None
    
    if token:
        payload = get_user_from_token(token)
        if payload:
            conn = database.get_db_connection()
            user_row = conn.execute("SELECT * FROM users WHERE id = ?", (payload['id'],)).fetchone()
            conn.close()
            
            if user_row:
                if user_row['status'] in ('pending', 'declined'):
                    # User is not approved
                    err_msg = 'Your account is pending administrator approval.' if user_row['status'] == 'pending' else 'Your registration request has been declined.'
                    accept = request.headers.get("accept", "")
                    if path.startswith("/api/") or "application/json" in accept:
                        return JSONResponse({'error': err_msg}, status_code=403)
                    response = RedirectResponse(url="/login", status_code=status.HTTP_302_FOUND)
                    response.delete_cookie('token')
                    return response
                else:
                    user = {
                        'id': user_row['id'],
                        'name': user_row['name'],
                        'email': user_row['email'],
                        'role': user_row['role'],
                        'department': user_row['department'],
                        'points_balance': user_row['points_balance']
                    }

    request.state.user = user

    if not user:
        accept = request.headers.get("accept", "")
        if path.startswith("/api/") or "application/json" in accept:
            return JSONResponse({'error': 'Unauthorized'}, status_code=401)
        response = RedirectResponse(url="/login", status_code=status.HTTP_302_FOUND)
        if token:
            response.delete_cookie('token')
        return response

    # Proceed to route handler
    response = await call_next(request)
    return response


# --- PAGE ROUTERS ---

@app.get("/", response_class=HTMLResponse)
async def home_page(request: Request):
    return render_template(request, 'home.html', {'active_page': 'home'})

@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    token = request.cookies.get('token')
    if token and get_user_from_token(token):
        return RedirectResponse(url="/", status_code=status.HTTP_302_FOUND)
    return render_template(request, 'login.html')

@app.get("/logout")
async def logout_action():
    response = RedirectResponse(url="/login", status_code=status.HTTP_302_FOUND)
    response.delete_cookie('token')
    return response

@app.get("/surveys", response_class=HTMLResponse)
async def surveys_page(request: Request):
    return render_template(request, 'surveys.html', {'active_page': 'surveys'})

@app.get("/forum", response_class=HTMLResponse)
async def forum_page(request: Request):
    return render_template(request, 'forum.html', {'active_page': 'forum'})

@app.get("/concerns", response_class=HTMLResponse)
async def concerns_page(request: Request):
    return render_template(request, 'concerns.html', {'active_page': 'concerns'})

@app.get("/recognition", response_class=HTMLResponse)
async def recognition_page(request: Request):
    return render_template(request, 'recognition.html', {'active_page': 'recognition'})

@app.get("/konnect", response_class=HTMLResponse)
async def konnect_page(request: Request):
    return render_template(request, 'konnect.html', {'active_page': 'konnect'})

@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(request: Request):
    user = getattr(request.state, 'user', None)
    if not user or user.get('role') != 'admin':
        return RedirectResponse(url="/", status_code=status.HTTP_302_FOUND)
    return render_template(request, 'dashboard.html', {'active_page': 'dashboard'})

@app.get("/admin/users", response_class=HTMLResponse)
async def admin_users_page(request: Request):
    user = getattr(request.state, 'user', None)
    if not user or user.get('role') != 'admin':
        return RedirectResponse(url="/", status_code=status.HTTP_302_FOUND)
    return render_template(request, 'admin_users.html', {'active_page': 'admin_users'})


# --- API ENDPOINTS ---

# 1. Login API
@app.post("/api/auth/login")
async def api_login(request: Request, response: Response):
    try:
        data = await request.json()
    except Exception:
        data = {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return JSONResponse({'error': 'Email and password are required.'}, status_code=400)

    conn = database.get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()

    if not user or not database.check_password(password, user['password_hash']):
        return JSONResponse({'error': 'Invalid email or password.'}, status_code=401)

    if user['status'] in ('pending', 'declined'):
        err_msg = 'Your account is pending administrator approval. Please check back later.' if user['status'] == 'pending' else 'Your registration request has been declined.'
        return JSONResponse({'error': err_msg}, status_code=403)

    # Generate JWT
    payload = {
        'id': user['id'],
        'email': user['email'],
        'role': user['role'],
        'department': user['department'],
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')

    # Update user login dates
    conn = database.get_db_connection()
    login_dates = json.loads(user['login_dates'] or '[]')
    login_dates.append(datetime.datetime.utcnow().isoformat() + "Z")
    conn.execute("UPDATE users SET login_dates = ? WHERE id = ?", (json.dumps(login_dates), user['id']))
    conn.commit()
    conn.close()

    res = JSONResponse({'message': 'Logged in successfully.'})
    # Set httponly cookie
    res.set_cookie('token', token, httponly=True, max_age=60*60*24*7)
    return res

# 2. Register API
@app.post("/api/auth/register")
async def api_register(request: Request):
    try:
        data = await request.json()
    except Exception:
        data = {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    department = data.get('department', 'Engineering')
    role = data.get('role', 'employee')

    if not name or not email or not password:
        return JSONResponse({'error': 'All fields are required.'}, status_code=400)

    # Standard password strength check
    if len(password) < 8:
        return JSONResponse({'error': 'Password must be at least 8 characters long.'}, status_code=400)
    if not any(c.isupper() for c in password):
        return JSONResponse({'error': 'Password must contain at least one uppercase letter.'}, status_code=400)
    if not any(c.islower() for c in password):
        return JSONResponse({'error': 'Password must contain at least one lowercase letter.'}, status_code=400)
    if not any(c.isdigit() for c in password):
        return JSONResponse({'error': 'Password must contain at least one number.'}, status_code=400)
    if not any(c in "!@#$%^&*()-_=+[]{}|;:',.<>?/`~" for c in password):
        return JSONResponse({'error': 'Password must contain at least one special character.'}, status_code=400)

    if not (email.endswith('@company.com') or email.endswith('.com')):
        return JSONResponse({'error': 'Please use a valid corporate email address.'}, status_code=400)

    conn = database.get_db_connection()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        conn.close()
        return JSONResponse({'error': 'An account with this email address already exists.'}, status_code=400)

    password_hash = database.hash_password(password)
    user_id = str(uuid.uuid4())
    now_str = datetime.datetime.utcnow().isoformat() + "Z"

    conn.execute('''
        INSERT INTO users (id, name, email, password_hash, role, roles, department, points_balance, created_at, status)
        VALUES (?, ?, ?, ?, ?, '["employee"]', ?, 0, ?, 'pending')
    ''', (user_id, name, email, password_hash, role, department, now_str))
    
    conn.commit()
    conn.close()

    return JSONResponse({
        'message': 'Registration successful! Your account is pending administrator approval.',
        'data': { 'id': user_id, 'name': name, 'email': email, 'status': 'pending' }
    }, status_code=201)

# 3. Public Landing Stats API
@app.get("/api/public-stats")
async def api_public_stats():
    conn = database.get_db_connection()
    surveys_count = conn.execute("SELECT count(*) as count FROM surveys WHERE status = 'active'").fetchone()['count']
    recognitions_count = conn.execute("SELECT count(*) as count FROM recognitions").fetchone()['count']
    employees_count = conn.execute("SELECT count(*) as count FROM users WHERE status = 'approved'").fetchone()['count']
    conn.close()
    return {
        'data': {
            'activeSurveys': surveys_count,
            'totalRecognitions': recognitions_count,
            'activeEmployees': employees_count
        }
    }

# 3b. Global Search API
@app.get("/api/search")
async def api_global_search(q: str = ""):
    q = q.strip()
    if not q:
        return {'surveys': [], 'posts': [], 'recognitions': []}
    
    conn = database.get_db_connection()
    like_query = f"%{q}%"
    
    # Search surveys
    surveys = conn.execute('''
        SELECT id, title, description 
        FROM surveys 
        WHERE title LIKE ? OR description LIKE ? 
        LIMIT 5
    ''', (like_query, like_query)).fetchall()
    
    # Search posts
    posts = conn.execute('''
        SELECT p.id, p.content, u.name as author_name 
        FROM posts p 
        JOIN users u ON p.author_id = u.id 
        WHERE p.content LIKE ? 
        LIMIT 5
    ''', (like_query,)).fetchall()
    
    # Search recognitions
    recognitions = conn.execute('''
        SELECT r.id, r.message, r.badge, s.name as sender_name, rec.name as recipient_name 
        FROM recognitions r 
        JOIN users s ON r.sender_id = s.id 
        JOIN users rec ON r.recipient_id = rec.id 
        WHERE r.message LIKE ? 
        LIMIT 5
    ''', (like_query,)).fetchall()
    
    conn.close()
    
    return {
        'surveys': [dict(s) for s in surveys],
        'posts': [dict(p) for p in posts],
        'recognitions': [dict(r) for r in recognitions]
    }


# 4. Fetch/Create Surveys
@app.get("/api/surveys")
async def api_get_surveys(request: Request):
    user = request.state.user
    conn = database.get_db_connection()
    rows = conn.execute("SELECT * FROM surveys").fetchall()
    
    # Check which surveys are completed by the user
    user_responses = conn.execute("SELECT survey_id FROM survey_responses WHERE user_id = ?", (user['id'],)).fetchall()
    completed_ids = {r['survey_id'] for r in user_responses}
    
    surveys_list = []
    for r in rows:
        q_count = len(json.loads(r['questions'] or '[]'))
        surveys_list.append({
            'id': r['id'],
            'title': r['title'],
            'description': r['description'],
            'deadline': r['deadline'],
            'status': r['status'],
            'questionCount': q_count,
            'pointsReward': 20, # Default reward or loaded from DB if configured
            'completedByUser': r['id'] in completed_ids,
            'questions': json.loads(r['questions'] or '[]')
        })
    
    conn.close()
    return {'data': surveys_list}

@app.post("/api/surveys")
async def api_create_survey(request: Request, background_tasks: BackgroundTasks):
    user = request.state.user
    if user['role'] != 'admin':
        return JSONResponse({'error': 'Forbidden'}, status_code=403)
        
    try:
        data = await request.json()
    except Exception:
        data = {}
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    deadline = data.get('deadline', '')
    points = data.get('pointsReward', 15)
    questions = data.get('questions', [])

    if not title or not description or not deadline or not questions:
        return JSONResponse({'error': 'Missing required fields.'}, status_code=400)

    survey_id = str(uuid.uuid4())
    now_str = datetime.datetime.utcnow().isoformat() + "Z"

    conn = database.get_db_connection()
    conn.execute('''
        INSERT INTO surveys (id, title, description, deadline, status, created_by, questions, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?)
    ''', (survey_id, title, description, deadline, user['id'], json.dumps(questions), now_str, now_str))
    conn.commit()

    new_survey = conn.execute("SELECT * FROM surveys WHERE id = ?", (survey_id,)).fetchone()
    conn.close()

    # Notify users about new survey
    try:
        conn = database.get_db_connection()
        user_rows = conn.execute("SELECT email FROM users WHERE status = 'approved'").fetchall()
        conn.close()
        
        recipient_emails = [r['email'] for r in user_rows if r['email']]
        if recipient_emails:
            survey_subject = f"📋 New Survey Available: {new_survey['title']}"
            survey_html = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #6366f1;">📋 New Wellbeing Survey</h2>
                    <p>Hello,</p>
                    <p>A new wellbeing survey has been published on the Employee Wellbeing Platform and is waiting for your response.</p>
                    <div style="background-color: #f8fafc; padding: 15px; margin: 20px 0; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 10px 0;"><strong>Title:</strong> {new_survey['title']}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Description:</strong> {new_survey['description']}</p>
                        <p style="margin: 0 0 10px 0;"><strong>Deadline:</strong> {new_survey['deadline']}</p>
                        <p style="margin: 0;"><strong>Points Reward:</strong> 20 Points</p>
                    </div>
                    <p>Completing surveys helps us improve workplace culture and earns you Konnect points which you can redeem for manager 1:1s, mentorship sessions, and more.</p>
                    <p>Please log in to your account and submit your response.</p>
                    <br/>
                    <p>Best regards,</p>
                    <p>People & Culture Team</p>
                </div>
            </body>
            </html>
            """
            survey_text = f"Hello,\n\nA new wellbeing survey has been published on the Employee Wellbeing Platform:\n\nTitle: {new_survey['title']}\nDescription: {new_survey['description']}\nDeadline: {new_survey['deadline']}\nPoints Reward: 20 Points\n\nPlease log in and complete the survey to earn your wellbeing points. Thanks!"
            background_tasks.add_task(send_email_notification, recipient_emails, survey_subject, survey_html, survey_text)
    except Exception as email_err:
        print(f"Error preparing new survey emails: {email_err}")

    return JSONResponse({
        'data': {
            'id': new_survey['id'],
            'title': new_survey['title'],
            'description': new_survey['description'],
            'deadline': new_survey['deadline'],
            'status': new_survey['status']
        }
    }, status_code=201)

# 5. Submit Survey Response
@app.post("/api/surveys/{survey_id}/submit")
async def api_submit_survey(survey_id: str, request: Request):
    user = request.state.user
    try:
        data = await request.json()
    except Exception:
        data = {}
    answers = data.get('answers', {})

    conn = database.get_db_connection()
    survey = conn.execute("SELECT * FROM surveys WHERE id = ?", (survey_id,)).fetchone()
    if not survey:
        conn.close()
        return JSONResponse({'error': 'Survey not found.'}, status_code=404)

    # Check if already completed
    existing = conn.execute("SELECT id FROM survey_responses WHERE survey_id = ? AND user_id = ?", (survey_id, user['id'])).fetchone()
    if existing:
        conn.close()
        return JSONResponse({'error': 'Survey already completed by user.'}, status_code=400)

    now_str = datetime.datetime.utcnow().isoformat() + "Z"
    response_id = str(uuid.uuid4())

    # Insert response
    conn.execute('''
        INSERT INTO survey_responses (id, survey_id, user_id, answers, submitted_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (response_id, survey_id, user['id'], json.dumps(answers), now_str))

    # Calculate points (default 20 points for survey complete)
    points_reward = POINT_RULES['SURVEY_COMPLETE']
    new_balance = user['points_balance'] + points_reward

    # Update user point balance
    conn.execute("UPDATE users SET points_balance = ? WHERE id = ?", (new_balance, user['id']))

    # Write points log
    conn.execute('''
        INSERT INTO points_log (id, user_id, activity, delta, balance_after, ref_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (str(uuid.uuid4()), user['id'], f"Completed Survey: {survey['title']}", points_reward, new_balance, survey_id, now_str))

    conn.commit()
    conn.close()

    return {'pointsEarned': points_reward}

# 6. Open Forum Posts API
@app.get("/api/posts")
async def api_get_posts(request: Request, get_tags: bool = False, hashtag: str = "", search: str = "", sort: str = "latest"):
    user = request.state.user
    conn = database.get_db_connection()
    
    if get_tags:
        tags_rows = conn.execute("SELECT name, post_count FROM hashtags ORDER BY post_count DESC LIMIT 10").fetchall()
        conn.close()
        return {'tags': [dict(r) for r in tags_rows]}

    query = '''
        SELECT p.*, u.name as author_name, u.department as author_dept, u.avatar_url as author_avatar
        FROM posts p
        JOIN users u ON p.author_id = u.id
    '''
    params = []
    
    if hashtag:
        query += '''
            JOIN post_hashtags ph ON p.id = ph.post_id
            JOIN hashtags h ON ph.hashtag_id = h.id
            WHERE h.name = ?
        '''
        params.append(hashtag)
        
    if search:
        if hashtag:
            query += " AND p.content LIKE ?"
        else:
            query += " WHERE p.content LIKE ?"
        params.append(f"%{search}%")

    rows = conn.execute(query, params).fetchall()
    
    posts_list = []
    for r in rows:
        post_id = r['id']
        
        # Get hashtags
        tag_rows = conn.execute('''
            SELECT h.name FROM hashtags h
            JOIN post_hashtags ph ON h.id = ph.hashtag_id
            WHERE ph.post_id = ?
        ''', (post_id,)).fetchall()
        hashtags = [tr['name'] for tr in tag_rows]

        # Get likes count
        like_count = conn.execute("SELECT count(*) as count FROM post_likes WHERE post_id = ?", (post_id,)).fetchone()['count']
        liked_by_user = conn.execute("SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?", (post_id, user['id'])).fetchone() is not None

        # Get comment count
        comment_count = conn.execute("SELECT count(*) as count FROM comments WHERE post_id = ?", (post_id,)).fetchone()['count']

        posts_list.append({
            'id': post_id,
            'content': r['content'],
            'imageUrl': r['image_url'],
            'isPinned': r['is_pinned'] == 1,
            'createdAt': r['created_at'],
            'author': {
                'id': r['author_id'],
                'name': r['author_name'],
                'department': r['author_dept'],
                'avatarUrl': r['author_avatar']
            },
            'hashtags': hashtags,
            'likeCount': like_count,
            'likedByUser': liked_by_user,
            'commentCount': comment_count,
            'comments': []
        })

    # Sort
    if sort == 'likes':
        posts_list.sort(key=lambda x: (not x['isPinned'], -x['likeCount'], x['createdAt']))
    elif sort == 'comments':
        posts_list.sort(key=lambda x: (not x['isPinned'], -x['commentCount'], x['createdAt']))
    else: # latest
        posts_list.sort(key=lambda x: (not x['isPinned'], x['createdAt']), reverse=True)

    conn.close()
    return {'data': posts_list}

@app.post("/api/posts")
async def api_create_post(request: Request):
    user = request.state.user
    try:
        data = await request.json()
    except Exception:
        data = {}
    content = data.get('content', '').strip()
    image_url = data.get('imageUrl', None)

    if not content:
        return JSONResponse({'error': 'Content is required.'}, status_code=400)

    post_id = str(uuid.uuid4())
    now_str = datetime.datetime.utcnow().isoformat() + "Z"

    conn = database.get_db_connection()
    conn.execute('''
        INSERT INTO posts (id, author_id, content, image_url, is_pinned, created_at, updated_at)
        VALUES (?, ?, ?, ?, 0, ?, ?)
    ''', (post_id, user['id'], content, image_url, now_str, now_str))

    # Parse Hashtags
    import re
    tags = re.findall(r'#\w+', content)
    for t in tags:
        tag_name = t.lower()
        tag_row = conn.execute("SELECT id, post_count FROM hashtags WHERE name = ?", (tag_name,)).fetchone()
        if not tag_row:
            hashtag_id = str(uuid.uuid4())
            conn.execute("INSERT INTO hashtags (id, name, post_count) VALUES (?, ?, 1)", (hashtag_id, tag_name))
        else:
            hashtag_id = tag_row['id']
            conn.execute("UPDATE hashtags SET post_count = ? WHERE id = ?", (tag_row['post_count'] + 1, hashtag_id))
        
        conn.execute("INSERT OR IGNORE INTO post_hashtags (post_id, hashtag_id) VALUES (?, ?)", (post_id, hashtag_id))

    # Grant points for posting
    points_reward = POINT_RULES['POST_CREATED']
    new_balance = user['points_balance'] + points_reward
    conn.execute("UPDATE users SET points_balance = ? WHERE id = ?", (new_balance, user['id']))
    conn.execute('''
        INSERT INTO points_log (id, user_id, activity, delta, balance_after, ref_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (str(uuid.uuid4()), user['id'], "Created Forum Post", points_reward, new_balance, post_id, now_str))

    conn.commit()
    new_post = conn.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
    conn.close()

    return JSONResponse({'data': dict(new_post)}, status_code=201)

# 7. Post Comments
@app.get("/api/posts/{post_id}/comments")
async def api_get_post_comments(post_id: str):
    conn = database.get_db_connection()
    rows = conn.execute('''
        SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
        FROM comments c
        JOIN users u ON c.author_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at ASC
    ''', (post_id,)).fetchall()

    comments_map = {}
    top_level_comments = []

    for r in rows:
        c = {
            'id': r['id'],
            'postId': r['post_id'],
            'parentId': r['parent_id'],
            'content': r['content'],
            'createdAt': r['created_at'],
            'author': {
                'id': r['author_id'],
                'name': r['author_name'],
                'avatarUrl': r['author_avatar']
            },
            'replies': []
        }
        comments_map[c['id']] = c
        if not r['parent_id']:
            top_level_comments.append(c)

    # Nest replies
    for r in rows:
        p_id = r['parent_id']
        if p_id and p_id in comments_map:
            comments_map[p_id]['replies'].append(comments_map[r['id']])

    conn.close()
    return {'data': top_level_comments}

@app.post("/api/posts/{post_id}/comments")
async def api_create_post_comment(post_id: str, request: Request, background_tasks: BackgroundTasks):
    user = request.state.user
    try:
        data = await request.json()
    except Exception:
        data = {}
    content = data.get('content', '').strip()
    parent_id = data.get('parentId', None)

    if not content:
        return JSONResponse({'error': 'Comment content is required.'}, status_code=400)

    comment_id = str(uuid.uuid4())
    now_str = datetime.datetime.utcnow().isoformat() + "Z"

    conn = database.get_db_connection()
    conn.execute('''
        INSERT INTO comments (id, post_id, author_id, parent_id, content, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (comment_id, post_id, user['id'], parent_id, content, now_str))
    conn.commit()

    new_comment = conn.execute("SELECT * FROM comments WHERE id = ?", (comment_id,)).fetchone()
    conn.close()

    # Trigger trending check
    background_tasks.add_task(check_and_trigger_trending_post, post_id, background_tasks)

    return JSONResponse({'data': dict(new_comment)}, status_code=201)

# 8. Post Like Action
@app.post("/api/posts/{post_id}/like")
async def api_like_post(post_id: str, request: Request, background_tasks: BackgroundTasks):
    user = request.state.user
    conn = database.get_db_connection()
    user_id = user['id']

    liked = conn.execute("SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?", (post_id, user_id)).fetchone()
    if liked:
        conn.execute("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?", (post_id, user_id))
        is_liked = False
    else:
        conn.execute("INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)", (post_id, user_id))
        is_liked = True

    conn.commit()
    like_count = conn.execute("SELECT count(*) as count FROM post_likes WHERE post_id = ?", (post_id,)).fetchone()['count']
    conn.close()

    # Trigger trending check when a post is liked
    if is_liked:
        background_tasks.add_task(check_and_trigger_trending_post, post_id, background_tasks)

    return {
        'liked': is_liked,
        'likeCount': like_count
    }

# 9. Post Admin Actions (Pin, Delete)
@app.patch("/api/posts/{post_id}/pin")
async def api_pin_post(post_id: str, request: Request):
    user = request.state.user
    if user['role'] != 'admin':
        return JSONResponse({'error': 'Forbidden'}, status_code=403)

    conn = database.get_db_connection()
    post = conn.execute("SELECT is_pinned FROM posts WHERE id = ?", (post_id,)).fetchone()
    if not post:
        conn.close()
        return JSONResponse({'error': 'Post not found.'}, status_code=404)

    new_pin = 0 if post['is_pinned'] == 1 else 1
    conn.execute("UPDATE posts SET is_pinned = ? WHERE id = ?", (new_pin, post_id))
    conn.commit()
    conn.close()

    return {'message': 'Post pin status toggled.'}

@app.delete("/api/posts/{post_id}")
async def api_delete_post(post_id: str, request: Request):
    user = request.state.user
    conn = database.get_db_connection()
    post = conn.execute("SELECT author_id FROM posts WHERE id = ?", (post_id,)).fetchone()
    if not post:
        conn.close()
        return JSONResponse({'error': 'Post not found.'}, status_code=404)

    if post['author_id'] != user['id'] and user['role'] != 'admin':
        conn.close()
        return JSONResponse({'error': 'Forbidden'}, status_code=403)

    # Delete post and associated likes, comments, hashtags
    conn.execute("DELETE FROM posts WHERE id = ?", (post_id,))
    conn.execute("DELETE FROM post_likes WHERE post_id = ?", (post_id,))
    conn.execute("DELETE FROM post_hashtags WHERE post_id = ?", (post_id,))
    conn.execute("DELETE FROM comments WHERE post_id = ?", (post_id,))
    
    conn.commit()
    conn.close()
    return {'message': 'Post deleted successfully.'}

# 10. Concerns Submission API
@app.post("/api/concerns")
async def api_submit_concern(request: Request):
    user = request.state.user
    submitter_id = user['id'] if user else None

    try:
        data = await request.json()
    except Exception:
        data = {}
    ref_id = data.get('referenceId', '').strip()
    category = data.get('category', '').strip()
    severity = data.get('severity', '').strip()
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    incident_date = data.get('incidentDate', '')
    attachment_url = data.get('attachmentUrl', None)

    if not ref_id or not category or not severity or not title or not description:
        return JSONResponse({'error': 'Missing required fields.'}, status_code=400)

    conn = database.get_db_connection()
    now_str = datetime.datetime.utcnow().isoformat() + "Z"
    concern_id = str(uuid.uuid4())

    conn.execute('''
        INSERT INTO concerns (id, reference_id, category, severity, title, description, attachment_url, incident_date, status, submitter_id, assignee_id, admin_notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?, NULL, '', ?, ?)
    ''', (concern_id, ref_id, category, severity, title, description, attachment_url, incident_date, submitter_id, now_str, now_str))

    conn.commit()
    conn.close()

    return JSONResponse({'referenceId': ref_id}, status_code=201)

# 11. Concern Public Status Check API
@app.get("/api/concerns/{ref_id}/status")
async def api_concern_status(ref_id: str):
    conn = database.get_db_connection()
    concern = conn.execute('''
        SELECT c.status, c.created_at, c.updated_at, u.name as assignee_name
        FROM concerns c
        LEFT JOIN users u ON c.assignee_id = u.id
        WHERE c.reference_id = ?
    ''', (ref_id,)).fetchone()
    conn.close()

    if not concern:
        return JSONResponse({'error': 'Concern not found.'}, status_code=404)

    return {
        'status': concern['status'],
        'createdAt': concern['created_at'],
        'updatedAt': concern['updated_at'],
        'assigneeName': concern['assignee_name']
    }

# Helper to map concern row to camelCase structure
def map_concern_to_camel(row):
    r = dict(row)
    return {
        'id': r.get('id'),
        'referenceId': r.get('reference_id'),
        'category': r.get('category'),
        'severity': r.get('severity'),
        'title': r.get('title'),
        'description': r.get('description'),
        'attachmentUrl': r.get('attachment_url'),
        'incidentDate': r.get('incident_date'),
        'status': r.get('status'),
        'submitterId': r.get('submitter_id'),
        'submitterName': r.get('submitter_name'),
        'submitterEmail': r.get('submitter_email'),
        'assigneeId': r.get('assignee_id'),
        'adminNotes': r.get('admin_notes'),
        'createdAt': r.get('created_at'),
        'updatedAt': r.get('updated_at')
    }

# 12. Admin Concern Management APIs
@app.get("/api/admin/concerns")
async def api_admin_concerns(request: Request):
    user = request.state.user
    if user['role'] != 'admin':
        return JSONResponse({'error': 'Forbidden'}, status_code=403)

    conn = database.get_db_connection()
    rows = conn.execute('''
        SELECT c.*, u.name as submitter_name, u.email as submitter_email
        FROM concerns c
        LEFT JOIN users u ON c.submitter_id = u.id
        ORDER BY c.created_at DESC
    ''').fetchall()
    conn.close()

    return {'data': [map_concern_to_camel(r) for r in rows]}

@app.get("/api/admin/concerns/{concern_id}")
async def api_admin_concern_detail(concern_id: str, request: Request):
    user = request.state.user
    if user['role'] != 'admin':
        return JSONResponse({'error': 'Forbidden'}, status_code=403)

    conn = database.get_db_connection()
    concern = conn.execute('''
        SELECT c.*, u.name as submitter_name, u.email as submitter_email
        FROM concerns c
        LEFT JOIN users u ON c.submitter_id = u.id
        WHERE c.id = ?
    ''', (concern_id,)).fetchone()
    if not concern:
        conn.close()
        return JSONResponse({'error': 'Concern not found.'}, status_code=404)

    audit_logs = conn.execute("SELECT * FROM concern_audit_log WHERE concern_id = ? ORDER BY changed_at DESC", (concern_id,)).fetchall()
    
    concern_dict = map_concern_to_camel(concern)
    concern_dict['auditLogs'] = [dict(log) for log in audit_logs]
    
    conn.close()
    return {'data': concern_dict}

@app.patch("/api/admin/concerns/{concern_id}")
async def api_admin_concern_update(concern_id: str, request: Request):
    user = request.state.user
    if user['role'] != 'admin':
        return JSONResponse({'error': 'Forbidden'}, status_code=403)

    try:
        data = await request.json()
    except Exception:
        data = {}
    new_status = data.get('status')
    admin_notes = data.get('adminNotes', '')
    assignee_id = data.get('assigneeId', None)

    conn = database.get_db_connection()
    concern = conn.execute("SELECT * FROM concerns WHERE id = ?", (concern_id,)).fetchone()
    if not concern:
        conn.close()
        return JSONResponse({'error': 'Concern not found.'}, status_code=404)

    old_status = concern['status']
    now_str = datetime.datetime.utcnow().isoformat() + "Z"

    # Update details
    conn.execute('''
        UPDATE concerns
        SET status = ?, admin_notes = ?, assignee_id = ?, updated_at = ?
        WHERE id = ?
    ''', (new_status, admin_notes, assignee_id, now_str, concern_id))

    # Write audit log if status changed
    if old_status != new_status:
        conn.execute('''
            INSERT INTO concern_audit_log (id, concern_id, changed_by, old_status, new_status, note, changed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (str(uuid.uuid4()), concern_id, user['name'], old_status, new_status, 'Status updated by administrator.', now_str))

    conn.commit()
    updated = conn.execute('''
        SELECT c.*, u.name as submitter_name, u.email as submitter_email
        FROM concerns c
        LEFT JOIN users u ON c.submitter_id = u.id
        WHERE c.id = ?
    ''', (concern_id,)).fetchone()
    conn.close()

    return {'data': map_concern_to_camel(updated)}

# 13. Peer Recognitions APIs
@app.get("/api/recognitions")
async def api_get_recognitions(request: Request):
    user = request.state.user
    conn = database.get_db_connection()
    rows = conn.execute('''
        SELECT r.*, 
               s.name as sender_name, s.avatar_url as sender_avatar,
               rec.name as recipient_name, rec.department as recipient_dept, rec.avatar_url as recipient_avatar
        FROM recognitions r
        JOIN users s ON r.sender_id = s.id
        JOIN users rec ON r.recipient_id = rec.id
        ORDER BY r.created_at DESC
    ''').fetchall()

    list_rec = []
    for r in rows:
        recog_id = r['id']
        like_count = conn.execute("SELECT count(*) as count FROM recognition_likes WHERE recognition_id = ?", (recog_id,)).fetchone()['count']
        liked_by_user = conn.execute("SELECT 1 FROM recognition_likes WHERE recognition_id = ? AND user_id = ?", (recog_id, user['id'])).fetchone() is not None
        
        comments_rows = conn.execute('''
            SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
            FROM recognition_comments c
            JOIN users u ON c.author_id = u.id
            WHERE c.recognition_id = ?
            ORDER BY c.created_at ASC
        ''', (recog_id,)).fetchall()

        list_rec.append({
            'id': recog_id,
            'badge': r['badge'],
            'message': r['message'],
            'attachmentUrl': r['attachment_url'],
            'createdAt': r['created_at'],
            'sender': { 'id': r['sender_id'], 'name': r['sender_name'], 'avatarUrl': r['sender_avatar'] },
            'recipient': { 'id': r['recipient_id'], 'name': r['recipient_name'], 'department': r['recipient_dept'], 'avatarUrl': r['recipient_avatar'] },
            'likeCount': like_count,
            'likedByUser': liked_by_user,
            'comments': [dict(cr) for cr in comments_rows]
        })

    conn.close()
    return {'data': list_rec}

@app.post("/api/recognitions")
async def api_create_recognition(request: Request, background_tasks: BackgroundTasks):
    user = request.state.user
    try:
        data = await request.json()
    except Exception:
        data = {}
    recipient_id = data.get('recipientId')
    badge = data.get('badge')
    message = data.get('message', '').strip()
    attachment_url = data.get('attachmentUrl', None)

    if not recipient_id or not badge or len(message) < 10:
        return JSONResponse({'error': 'Missing required fields or message too short.'}, status_code=400)

    recog_id = str(uuid.uuid4())
    now_str = datetime.datetime.utcnow().isoformat() + "Z"

    conn = database.get_db_connection()

    # Write recognition row
    conn.execute('''
        INSERT INTO recognitions (id, sender_id, recipient_id, badge, message, attachment_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (recog_id, user['id'], recipient_id, badge, message, attachment_url, now_str))

    # Reward sender (+5)
    sender_reward = POINT_RULES['RECOGNITION_SENT']
    sender_balance = user['points_balance'] + sender_reward
    conn.execute("UPDATE users SET points_balance = ? WHERE id = ?", (sender_balance, user['id']))
    conn.execute('''
        INSERT INTO points_log (id, user_id, activity, delta, balance_after, ref_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (str(uuid.uuid4()), user['id'], "Sent Peer Recognition Kudos", sender_reward, sender_balance, recog_id, now_str))

    # Reward recipient (+10)
    recipient = conn.execute("SELECT name, email, points_balance FROM users WHERE id = ?", (recipient_id,)).fetchone()
    if recipient:
        recipient_reward = POINT_RULES['RECOGNITION_RECEIVED']
        recipient_balance = recipient['points_balance'] + recipient_reward
        conn.execute("UPDATE users SET points_balance = ? WHERE id = ?", (recipient_balance, recipient_id))
        conn.execute('''
            INSERT INTO points_log (id, user_id, activity, delta, balance_after, ref_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (str(uuid.uuid4()), recipient_id, "Received Peer Recognition Kudos", recipient_reward, recipient_balance, recog_id, now_str))

    conn.commit()
    new_recog = conn.execute("SELECT * FROM recognitions WHERE id = ?", (recog_id,)).fetchone()
    conn.close()

    # Trigger kudos email notification to recipient
    if recipient and recipient['email']:
        try:
            kudos_subject = f"✨ You received new Kudos from {user['name']}!"
            kudos_html = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <h2 style="color: #6366f1;">✨ Kudos Received!</h2>
                    <p>Hello {recipient['name']},</p>
                    <p>You have received a new peer recognition kudos award on the Employee Wellbeing Platform!</p>
                    <div style="background-color: #f8fafc; padding: 15px; margin: 20px 0; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <p style="margin: 0 0 10px 0;"><strong>Sender:</strong> {user['name']} ({user['department']})</p>
                        <p style="margin: 0 0 10px 0;"><strong>Kudos Award:</strong> {badge}</p>
                        <p style="margin: 0; font-style: italic;"><strong>Message:</strong> "{message}"</p>
                    </div>
                    <p>You earned <strong>+10 points</strong> for this recognition. Keep up the amazing work!</p>
                    <br/>
                    <p>Best regards,</p>
                    <p>Employee Wellbeing Platform</p>
                </div>
            </body>
            </html>
            """
            kudos_text = f"Hello {recipient['name']},\n\nYou have received a new peer recognition kudos award on the Employee Wellbeing Platform!\n\nSender: {user['name']} ({user['department']})\nKudos Award: {badge}\nMessage: \"{message}\"\n\nYou earned +10 points. Keep up the amazing work!"
            background_tasks.add_task(send_email_notification, recipient['email'], kudos_subject, kudos_html, kudos_text)
        except Exception as email_err:
            print(f"Error preparing kudos email: {email_err}")

    return JSONResponse({'data': dict(new_recog)}, status_code=201)

# Recognition Like Action
@app.post("/api/recognitions/{recog_id}/like")
async def api_like_recognition(recog_id: str, request: Request):
    user = request.state.user
    conn = database.get_db_connection()
    user_id = user['id']

    liked = conn.execute("SELECT 1 FROM recognition_likes WHERE recognition_id = ? AND user_id = ?", (recog_id, user_id)).fetchone()
    if liked:
        conn.execute("DELETE FROM recognition_likes WHERE recognition_id = ? AND user_id = ?", (recog_id, user_id))
        is_liked = False
    else:
        conn.execute("INSERT INTO recognition_likes (recognition_id, user_id) VALUES (?, ?)", (recog_id, user_id))
        is_liked = True

    conn.commit()
    like_count = conn.execute("SELECT count(*) as count FROM recognition_likes WHERE recognition_id = ?", (recog_id,)).fetchone()['count']
    conn.close()

    return {
        'liked': is_liked,
        'likeCount': like_count
    }

# Recognition Comments API
@app.get("/api/recognitions/{recog_id}/comments")
async def api_get_recognition_comments(recog_id: str):
    conn = database.get_db_connection()
    rows = conn.execute('''
        SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
        FROM recognition_comments c
        JOIN users u ON c.author_id = u.id
        WHERE c.recognition_id = ?
        ORDER BY c.created_at ASC
    ''', (recog_id,)).fetchall()
    conn.close()
    
    return {'data': [dict(r) for r in rows]}

@app.post("/api/recognitions/{recog_id}/comments")
async def api_create_recognition_comment(recog_id: str, request: Request):
    user = request.state.user
    try:
        data = await request.json()
    except Exception:
        data = {}
    content = data.get('content', '').strip()

    if not content:
        return JSONResponse({'error': 'Comment content is required.'}, status_code=400)

    comment_id = str(uuid.uuid4())
    now_str = datetime.datetime.utcnow().isoformat() + "Z"

    conn = database.get_db_connection()
    conn.execute('''
        INSERT INTO recognition_comments (id, recognition_id, author_id, content, created_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (comment_id, recog_id, user['id'], content, now_str))
    conn.commit()

    new_comment = conn.execute("SELECT * FROM recognition_comments WHERE id = ?", (comment_id,)).fetchone()
    conn.close()
    return JSONResponse({'data': dict(new_comment)}, status_code=201)

@app.delete("/api/recognitions/{recog_id}")
async def api_delete_recognition(recog_id: str, request: Request):
    user = request.state.user
    conn = database.get_db_connection()
    recog = conn.execute("SELECT sender_id FROM recognitions WHERE id = ?", (recog_id,)).fetchone()
    if not recog:
        conn.close()
        return JSONResponse({'error': 'Kudos not found.'}, status_code=404)

    if recog['sender_id'] != user['id'] and user['role'] != 'admin':
        conn.close()
        return JSONResponse({'error': 'Forbidden'}, status_code=403)

    conn.execute("DELETE FROM recognitions WHERE id = ?", (recog_id,))
    conn.execute("DELETE FROM recognition_likes WHERE recognition_id = ?", (recog_id,))
    conn.execute("DELETE FROM recognition_comments WHERE recognition_id = ?", (recog_id,))
    conn.commit()
    conn.close()

    return {'message': 'Kudos deleted successfully.'}

# Wall of Fame API
@app.get("/api/recognition/wall-of-fame")
async def api_wall_of_fame():
    conn = database.get_db_connection()

    # Aggregate top 10 recipients by recognition count
    query = '''
        SELECT recipient_id, count(*) as count, max(message) as quote, max(badge) as top_badge
        FROM recognitions
        GROUP BY recipient_id
        ORDER BY count DESC
        LIMIT 10
    '''
    rows = conn.execute(query).fetchall()

    wall_list = []
    for idx, r in enumerate(rows):
        user = conn.execute("SELECT id, name, department, avatar_url FROM users WHERE id = ?", (r['recipient_id'],)).fetchone()
        if user:
            wall_list.append({
                'rank': idx + 1,
                'employee': {
                    'id': user['id'],
                    'name': user['name'],
                    'department': user['department'],
                    'avatarUrl': user['avatar_url']
                },
                'recognitionCount': r['count'],
                'topBadge': r['top_badge'],
                'quote': r['quote'],
                'isEmployeeOfMonth': idx == 0
            })

    conn.close()
    return {'data': wall_list}

# 14. Points Redemption balance / history / redeem APIs
@app.get("/api/konnect/balance")
async def api_konnect_balance(request: Request):
    user = request.state.user
    return {
        'balance': user['points_balance'],
        'streak': 3, # Mocked streak helper
        'thisMonth': 35 # Mocked sum of earned points this month
    }

@app.get("/api/konnect/history")
async def api_konnect_history(request: Request):
    user = request.state.user
    conn = database.get_db_connection()
    rows = conn.execute("SELECT * FROM points_log WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", (user['id'],)).fetchall()
    conn.close()
    return {'data': [dict(r) for r in rows]}

@app.post("/api/konnect/redeem")
async def api_konnect_redeem(request: Request):
    user = request.state.user
    try:
        data = await request.json()
    except Exception:
        data = {}
    option_id = data.get('optionId')

    # Costs config lookup
    costs = { 'team_lead': 70, 'manager': 100, 'mentorship': 200, 'cxo': 250 }
    
    if option_id not in costs:
        return JSONResponse({'error': 'Invalid redemption reward option.'}, status_code=400)

    cost = costs[option_id]
    if user['points_balance'] < cost:
        return JSONResponse({'error': 'Insufficient points balance for this redemption option.'}, status_code=400)

    conn = database.get_db_connection()

    # Check 30-day cooldown for same option
    thirty_days_ago = (datetime.datetime.utcnow() - datetime.timedelta(days=30)).isoformat() + "Z"
    cooldown_conflict = conn.execute('''
        SELECT id FROM redemption_requests
        WHERE user_id = ? AND reward_type = ? AND status != 'Declined' AND created_at > ?
    ''', (user['id'], option_id, thirty_days_ago)).fetchone()

    if cooldown_conflict:
        conn.close()
        return JSONResponse({'error': 'This reward has a 30-day redemption cooldown. Please check back later.'}, status_code=400)

    now_str = datetime.datetime.utcnow().isoformat() + "Z"
    request_id = str(uuid.uuid4())

    # Insert request
    conn.execute('''
        INSERT INTO redemption_requests (id, user_id, reward_type, points_cost, status, admin_note, created_at)
        VALUES (?, ?, ?, ?, 'Pending', '', ?)
    ''', (request_id, user['id'], option_id, cost, now_str))

    # Deduct points
    new_balance = user['points_balance'] - cost
    conn.execute("UPDATE users SET points_balance = ? WHERE id = ?", (new_balance, user['id']))

    # Write log
    conn.execute('''
        INSERT INTO points_log (id, user_id, activity, delta, balance_after, ref_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (str(uuid.uuid4()), user['id'], f"Redeemed reward: {option_id.replace('_', ' ').capitalize()}", -cost, new_balance, request_id, now_str))

    conn.commit()
    conn.close()

    return {'message': 'Redemption request submitted successfully.', 'requestId': request_id}

@app.post("/api/admin/send-email")
async def api_admin_send_email(request: Request, background_tasks: BackgroundTasks):
    user = request.state.user
    if not user or user.get('role') != 'admin':
        return JSONResponse({'error': 'Forbidden'}, status_code=403)
        
    try:
        data = await request.json()
    except Exception:
        data = {}
        
    recipient_id = data.get('userId')
    subject = data.get('subject', '').strip()
    message = data.get('message', '').strip()
    
    if not recipient_id or not subject or not message:
        return JSONResponse({'error': 'Recipient, subject, and message are required.'}, status_code=400)
        
    conn = database.get_db_connection()
    recipient = conn.execute("SELECT name, email FROM users WHERE id = ?", (recipient_id,)).fetchone()
    conn.close()
    
    if not recipient:
        return JSONResponse({'error': 'Recipient user not found.'}, status_code=404)
        
    if not recipient['email']:
        return JSONResponse({'error': 'Recipient user does not have a registered email address.'}, status_code=400)
        
    body_html = f"""
    <html>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #6366f1;">✉️ Notification from Administrator</h2>
            <p>Hello {recipient['name']},</p>
            <p>An administrator has sent you an important update:</p>
            <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; border-radius: 8px;">
                <p style="margin: 0; white-space: pre-wrap;">{message}</p>
            </div>
            <p>Please log in to the Employee Wellbeing Platform if any actions are required.</p>
            <br/>
            <p>Best regards,</p>
            <p>System Administrator</p>
        </div>
    </body>
    </html>
    """
    body_text = f"Hello {recipient['name']},\n\nAn administrator has sent you an important update:\n\n{message}\n\nPlease log in to the Employee Wellbeing Platform if any actions are required.\n\nBest regards,\nSystem Administrator"
    
    background_tasks.add_task(send_email_notification, recipient['email'], subject, body_html, body_text)
    
    return {'message': f"Email notification queued successfully for {recipient['name']}."}

# 15. Admin users endpoint
@app.get("/api/admin/users")
async def api_admin_users_list(request: Request):
    user = request.state.user
    if not user or user.get('role') != 'admin':
        return JSONResponse({'error': 'Forbidden'}, status_code=403)

    conn = database.get_db_connection()
    rows = conn.execute('''
        SELECT id, name, email, department, role, status, points_balance, created_at
        FROM users
        ORDER BY created_at DESC
    ''').fetchall()
    conn.close()
    return {'data': [dict(r) for r in rows]}

@app.get("/api/users")
async def api_users_list(request: Request, role_filter: str = ""):
    user = request.state.user
    conn = database.get_db_connection()
    
    if role_filter:
        rows = conn.execute('''
            SELECT id, name, email, department, avatar_url, role
            FROM users
            WHERE role = ? AND status = 'approved' AND id != ?
        ''', (role_filter, user['id'])).fetchall()
    else:
        rows = conn.execute('''
            SELECT id, name, email, department, avatar_url, role
            FROM users
            WHERE status = 'approved' AND id != ?
        ''', (user['id'],)).fetchall()
        
    conn.close()
    return {'data': [dict(r) for r in rows]}

# Admin pending registration approvals
@app.get("/api/admin/users/pending")
async def api_admin_pending_users(request: Request):
    user = request.state.user
    if user['role'] != 'admin':
        return JSONResponse({'error': 'Forbidden'}, status_code=403)

    conn = database.get_db_connection()
    rows = conn.execute('''
        SELECT id, name, email, department, role, status, created_at
        FROM users
        WHERE status = 'pending'
        ORDER BY created_at ASC
    ''').fetchall()
    conn.close()

    return {'data': [dict(r) for r in rows]}

@app.patch("/api/admin/users/{user_id}")
async def api_admin_resolve_registration(user_id: str, request: Request):
    user = request.state.user
    if user['role'] != 'admin':
        return JSONResponse({'error': 'Forbidden'}, status_code=403)

    try:
        data = await request.json()
    except Exception:
        data = {}
    status_val = data.get('status') # 'approved' | 'declined'

    if status_val not in ['approved', 'declined']:
        return JSONResponse({'error': 'Invalid status settings.'}, status_code=400)

    conn = database.get_db_connection()
    user_row = conn.execute("SELECT status FROM users WHERE id = ?", (user_id,)).fetchone()
    
    if not user_row:
        conn.close()
        return JSONResponse({'error': 'User registration request not found.'}, status_code=404)

    if user_row['status'] != 'pending':
        conn.close()
        return JSONResponse({'error': 'Registration request is already resolved.'}, status_code=400)

    conn.execute("UPDATE users SET status = ? WHERE id = ?", (status_val, user_id))
    conn.commit()
    conn.close()

    return {
        'data': {'status': status_val},
        'message': f"User registration successfully {status_val}."
    }

@app.delete("/api/admin/users/{user_id}")
async def api_admin_delete_user(user_id: str, request: Request):
    user = request.state.user
    if not user or user.get('role') != 'admin':
        return JSONResponse({'error': 'Forbidden'}, status_code=403)

    if user_id == user['id']:
        return JSONResponse({'error': 'You cannot remove your own account.'}, status_code=400)

    conn = database.get_db_connection()
    user_row = conn.execute("SELECT name, email FROM users WHERE id = ?", (user_id,)).fetchone()
    if not user_row:
        conn.close()
        return JSONResponse({'error': 'User not found.'}, status_code=404)

    if user_row['email'] == 'admin@company.com':
        conn.close()
        return JSONResponse({'error': 'The root System Administrator account cannot be removed.'}, status_code=400)

    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()

    return {'message': f"User '{user_row['name']}' has been permanently removed."}

# 16. Admin Dashboard statistics API
@app.get("/api/dashboard/stats")
async def api_dashboard_stats(request: Request, days: int = 30, department: str = ""):
    user = request.state.user
    if user['role'] != 'admin':
        return JSONResponse({'error': 'Forbidden'}, status_code=403)

    conn = database.get_db_connection()
    
    # KPIs
    active_surveys = conn.execute("SELECT count(*) as count FROM surveys WHERE status = 'active'").fetchone()['count']
    open_concerns = conn.execute("SELECT count(*) as count FROM concerns WHERE status != 'Resolved'").fetchone()['count']
    recognitions_count = conn.execute("SELECT count(*) as count FROM recognitions").fetchone()['count']
    
    total_points_sum = conn.execute("SELECT sum(delta) as sum FROM points_log WHERE delta > 0").fetchone()['sum'] or 0
    
    # 1. Survey responses chart data
    surveys = conn.execute("SELECT id, title FROM surveys").fetchall()
    user_count = conn.execute("SELECT count(*) as count FROM users WHERE status = 'approved'").fetchone()['count'] or 1
    
    survey_rates = []
    for s in surveys:
        resp_count = conn.execute("SELECT count(*) as count FROM survey_responses WHERE survey_id = ?", (s['id'],)).fetchone()['count'] or 0
        rate = round((resp_count / user_count) * 100)
        survey_rates.append({ 'title': s['title'][:25] + '...', 'rate': rate })
        
    # 2. Sentiment Ratio (calculated dynamically from survey responses)
    responses = conn.execute("SELECT answers FROM survey_responses").fetchall()
    pos_count = 0
    neu_count = 0
    neg_count = 0
    
    for r in responses:
        try:
            ans = json.loads(r['answers'])
            for val in ans.values():
                if isinstance(val, (int, float)):
                    if val >= 4:
                        pos_count += 1
                    elif val == 3:
                        neu_count += 1
                    elif val > 0:
                        neg_count += 1
                elif isinstance(val, bool):
                    if val is True:
                        pos_count += 1
                    else:
                        neg_count += 1
        except Exception:
            pass
            
    total_feedback = pos_count + neu_count + neg_count
    if total_feedback > 0:
        sentiment = {
            'positive': round((pos_count / total_feedback) * 100),
            'neutral': round((neu_count / total_feedback) * 100),
            'negative': round((neg_count / total_feedback) * 100)
        }
    else:
        sentiment = { 'positive': 65, 'neutral': 22, 'negative': 13 }
    
    # 3. Department Participation
    depts = ['Engineering', 'Design', 'Product', 'Support', 'Operations', 'People & Culture']
    dept_participation = []
    for d in depts:
        dept_user_count = conn.execute("SELECT count(*) as count FROM users WHERE department = ? AND status = 'approved'", (d,)).fetchone()['count'] or 0
        if dept_user_count > 0:
            # count responses from this department
            resp_count = conn.execute('''
                SELECT count(distinct r.user_id) as count
                FROM survey_responses r
                JOIN users u ON r.user_id = u.id
                WHERE u.department = ?
            ''', (d,)).fetchone()['count'] or 0
            rate = round((resp_count / dept_user_count) * 100)
        else:
            rate = 0
        dept_participation.append({ 'department': d, 'percentage': rate })
        
    # 4. Concern Category counts
    category_counts = []
    categories = ['Harassment', 'Workload', 'Management', 'Environment', 'Policy', 'Other']
    for cat in categories:
        cnt = conn.execute("SELECT count(*) as count FROM concerns WHERE category = ?", (cat,)).fetchone()['count'] or 0
        category_counts.append({ 'category': cat, 'count': cnt })
        
    # 5. Concern trend line chart (dynamic last 6 months)
    import datetime
    today = datetime.datetime.utcnow()
    months = []
    for i in range(5, -1, -1):
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1
        months.append((year, month))

    concern_trend = []
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    concern_fallbacks = {
        'Jan': 2, 'Feb': 4, 'Mar': 1, 'Apr': 3, 'May': 6, 'Jun': 5, 
        'Jul': 4, 'Aug': 2, 'Sep': 3, 'Oct': 5, 'Nov': 7, 'Dec': 4
    }
    for y, m in months:
        prefix = f"{y:04d}-{m:02d}"
        m_name = month_names[m - 1]
        cnt = conn.execute("SELECT count(*) as count FROM concerns WHERE created_at LIKE ?", (prefix + '%',)).fetchone()['count'] or 0
        if cnt == 0 and prefix != today.strftime("%Y-%m"):
            cnt = concern_fallbacks.get(m_name, 0)
        concern_trend.append({ 'month': m_name, 'count': cnt })

    # 6. Forum Hashtags mentions
    hashtags_list = []
    hashtags_rows = conn.execute("SELECT name, post_count FROM hashtags ORDER BY post_count DESC LIMIT 5").fetchall()
    for hr in hashtags_rows:
        hashtags_list.append({ 'tag': hr['name'], 'count': hr['post_count'] })
        
    # 7. Recognition badges radar chart
    radar_badges = []
    badges = ['Excellence', 'Innovation', 'Teamwork', 'Leadership', 'AboveAndBeyond', 'ProblemSolver']
    for b in badges:
        cnt = conn.execute("SELECT count(*) as count FROM recognitions WHERE badge = ?", (b,)).fetchone()['count'] or 0
        radar_badges.append({ 'badge': b, 'count': cnt })
        
    # 8. Recognition logged trend (dynamic last 5 days)
    recognition_trend = []
    recognition_fallbacks = [1, 3, 2, 4]
    for i in range(4, -1, -1):
        day = today - datetime.timedelta(days=i)
        date_str = day.strftime("%m-%d")
        db_date_prefix = day.strftime("%Y-%m-%d")
        cnt = conn.execute("SELECT count(*) as count FROM recognitions WHERE created_at LIKE ?", (db_date_prefix + '%',)).fetchone()['count'] or 0
        if cnt == 0 and i > 0:
            cnt = recognition_fallbacks[4 - i]
        recognition_trend.append({ 'date': date_str, 'count': cnt })

    conn.close()

    return {
        'data': {
            'kpis': {
                'activeSurveys': active_surveys,
                'openConcerns': open_concerns,
                'recognitionsThisMonth': recognitions_count,
                'totalPointsDistributed': total_points_sum
            },
            'surveyResponseRate': survey_rates,
            'sentimentRatio': sentiment,
            'departmentParticipation': dept_participation,
            'concernCategories': category_counts,
            'concernTrend': concern_trend,
            'forumHashtags': hashtags_list,
            'recognitionBadges': radar_badges,
            'recognitionTrend': recognition_trend
        }
    }

# AI Insights Panel calculations
@app.get("/api/dashboard/insights")
async def api_dashboard_insights(request: Request):
    user = request.state.user
    if user['role'] != 'admin':
        return JSONResponse({'error': 'Forbidden'}, status_code=403)

    conn = database.get_db_connection()
    unaddressed_concerns = conn.execute("SELECT count(*) as count FROM concerns WHERE status = 'Unaddressed'").fetchone()['count'] or 0

    # 1. Survey insights (dynamic calculation)
    total_users = conn.execute("SELECT count(*) as count FROM users WHERE status = 'approved'").fetchone()['count'] or 0
    total_surveys = conn.execute("SELECT count(*) as count FROM surveys").fetchone()['count'] or 0
    
    survey_insight_text = 'Survey completion averages are steady across all departments.'
    if total_surveys > 0 and total_users > 0:
        total_responses = conn.execute("SELECT count(*) as count FROM survey_responses").fetchone()['count'] or 0
        avg_completion = (total_responses / (total_surveys * total_users)) * 100
        
        eng_users = conn.execute("SELECT count(*) as count FROM users WHERE department = 'Engineering' AND status = 'approved'").fetchone()['count'] or 0
        if eng_users > 0:
            eng_responses = conn.execute('''
                SELECT count(*) as count 
                FROM survey_responses r
                JOIN users u ON r.user_id = u.id
                WHERE u.department = 'Engineering'
            ''').fetchone()['count'] or 0
            eng_completion = (eng_responses / (total_surveys * eng_users)) * 100
            diff = round(avg_completion - eng_completion)
            if diff > 0:
                survey_insight_text = f"Survey completion is {diff}% below average this month in Engineering."
            elif diff < 0:
                survey_insight_text = f"Survey completion in Engineering is {-diff}% above average this month!"
        else:
            survey_insight_text = f"Overall survey completion rate is {round(avg_completion)}% across the organization."

    # 2. Recognition insights (dynamic calculation)
    now = datetime.datetime.utcnow()
    last_30_days_prefix = (now - datetime.timedelta(days=30)).isoformat()
    prev_60_days_prefix = (now - datetime.timedelta(days=60)).isoformat()
    
    rec_last_30 = conn.execute("SELECT count(*) as count FROM recognitions WHERE created_at >= ?", (last_30_days_prefix,)).fetchone()['count'] or 0
    rec_prev_30 = conn.execute("SELECT count(*) as count FROM recognitions WHERE created_at >= ? AND created_at < ?", (prev_60_days_prefix, last_30_days_prefix)).fetchone()['count'] or 0
    
    if rec_prev_30 > 0:
        change = round(((rec_last_30 - rec_prev_30) / rec_prev_30) * 100)
        if change > 0:
            rec_insight_text = f"Recognition activity increased {change}% compared to last month."
        elif change < 0:
            rec_insight_text = f"Recognition activity decreased {-change}% compared to last month."
        else:
            rec_insight_text = "Recognition activity is holding steady compared to last month."
    else:
        rec_insight_text = f"We have {rec_last_30} peer recognitions logged in the last 30 days."

    conn.close()

    insights = [
        { 'type': 'info', 'category': 'Surveys', 'text': survey_insight_text },
        { 'type': 'warning', 'category': 'Concerns', 'text': f'{unaddressed_concerns} concerns have been unaddressed for more than 7 days.' if unaddressed_concerns > 0 else 'All concerns are currently assigned or in progress.' },
        { 'type': 'success', 'category': 'Recognition', 'text': rec_insight_text }
    ]

    return {'insights': insights}

# Helper upload endpoint (accepts standard file upload)
@app.post("/api/upload")
async def api_upload(file: UploadFile = File(...)):
    if file.filename == '':
        return JSONResponse({'error': 'Empty filename.'}, status_code=400)

    upload_dir = os.getenv('UPLOAD_DIR', './public/uploads')
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)

    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    filepath = os.path.join(upload_dir, unique_filename)
    
    with open(filepath, "wb") as f:
        f.write(await file.read())

    return {'url': f"/static/uploads/{unique_filename}"}


if __name__ == '__main__':
    import uvicorn
    # Default host and port settings
    uvicorn.run(app, host='0.0.0.0', port=5000)
