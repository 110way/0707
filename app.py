import os
import datetime
import json
import uuid
import jwt
from fastapi import FastAPI, Request, Response, Depends, HTTPException, status, Form, UploadFile, File, BackgroundTasks
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.gzip import GZipMiddleware
from dotenv import load_dotenv

if os.path.exists(".env.local"):
    load_dotenv(".env.local")
else:
    load_dotenv()

import database

app = FastAPI(title=os.getenv('NEXT_PUBLIC_APP_NAME', 'Employee Wellbeing Platform'))
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Initialize DB on start
database.init_db()

# Point Rules
POINT_RULES = {
    'SURVEY_COMPLETE': 5,
    'RECOGNITION_RECEIVED': 15
}

TRENDING_THRESHOLD = 35

SECRET_KEY = os.getenv('JWT_SECRET', 'supersecretlongstringforwellbeingapp123456')

# Setup Static directories
if not os.path.exists("static"):
    os.makedirs("static")
if not os.path.exists("static/css"):
    os.makedirs("static/css")
if not os.path.exists("static/js"):
    os.makedirs("static/js")

# Cacheable StaticFiles to add Cache-Control headers
class CacheableStaticFiles(StaticFiles):
    def file_response(self, *args, **kwargs):
        response = super().file_response(*args, **kwargs)
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response

# Mount static files
app.mount("/static", CacheableStaticFiles(directory="static"), name="static")

# Mount public/uploads for files uploaded by /api/upload
upload_dir = os.getenv('UPLOAD_DIR', './public/uploads')
if not os.path.exists(upload_dir):
    os.makedirs(upload_dir)
app.mount("/static/uploads", StaticFiles(directory=upload_dir), name="uploads")

# Setup templates
templates = Jinja2Templates(directory="templates")

@app.get('/favicon.ico', include_in_schema=False)
async def favicon():
    return Response(status_code=204)


# --- EMAIL NOTIFICATION UTILITIES ---

import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

def extract_fallback_color(css_color: str) -> str:
    if not css_color:
        return "#4f46e5"
    css_color = css_color.strip()
    if css_color.startswith('#'):
        return css_color
    if 'linear-gradient' in css_color:
        import re
        hex_colors = re.findall(r'#[0-9a-fA-F]{3,6}', css_color)
        if hex_colors:
            return hex_colors[0]
    return "#4f46e5"

def build_premium_email_html(title: str, preheader: str, hero_icon: str, header_color: str, content_html: str, action_url: str = None, action_text: str = None) -> str:
    # Force a minimal professional slate theme for the main card border
    fallback_color = "#64748b"
    
    # Strip emojis and icons
    import re
    emoji_pattern = re.compile(r'[\U00010000-\U0010ffff\u2600-\u27bf\u2300-\u23ff\u2b50-\u2b55\u200d\ufe0f]')
    title = emoji_pattern.sub('', title).replace('  ', ' ').strip()
    preheader = emoji_pattern.sub('', preheader).replace('  ', ' ').strip()
    content_html = emoji_pattern.sub('', content_html).replace('  ', ' ').strip()
    
    # Post-process content_html to convert all custom email styles to Direct Admin (slate/gray minimal) style
    import re
    
    # 1. Standardize main highlight tables (width="100%" tables containing style border-radius/margin)
    def replace_table_style(match):
        tag_name = match.group(1)
        attrs_before = match.group(2)
        style = match.group(3)
        attrs_after = match.group(4)
        
        if tag_name.lower() == 'table' and ('border-radius' in style or 'background-color' in style or 'border-left' in style):
            return f'<{tag_name}{attrs_before}style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #64748b; border-radius: 16px; margin: 24px 0;"{attrs_after}>'
        return match.group(0)

    content_html = re.sub(
        r'<(\w+)([^>]*?)style="([^"]*?)"([^>]*?)>',
        replace_table_style,
        content_html,
        flags=re.IGNORECASE
    )
    
    # 2. Standardize pill badges/tags (bgcolor attribute / custom colors on table cells)
    content_html = re.sub(
        r'bgcolor="#(?:fce7f3|f3e8ff|fdf2f8|ffedd5|ecfdf5|fef2f2)"',
        'bgcolor="#f1f5f9"',
        content_html,
        flags=re.IGNORECASE
    )
    content_html = re.sub(
        r'background-color:\s*#(?:fce7f3|f3e8ff|fdf2f8|ffedd5|ecfdf5|fef2f2);?',
        'background-color: #f1f5f9;',
        content_html,
        flags=re.IGNORECASE
    )
    content_html = re.sub(
        r'color:\s*#(?:9d174d|7c3aed|db2777|ea580c|065f46|991b1b|b91c1c|059669|047857);?',
        'color: #475569;',
        content_html,
        flags=re.IGNORECASE
    )
    content_html = re.sub(
        r'border-left:\s*4px\s+solid\s+#[a-fA-F0-9]{3,6};?',
        'border-left: 4px solid #64748b;',
        content_html,
        flags=re.IGNORECASE
    )
    
    # 3. Standardize text colors inside headers/paragraphs/quote marks
    content_html = re.sub(
        r'color:\s*#(?:581c87|065f46|9d174d|991b1b|059669|047857);?',
        'color: #0f172a;',
        content_html,
        flags=re.IGNORECASE
    )
    content_html = re.sub(
        r'color:\s*#(?:fbcfe8|fde68a|bae6fd|e7e5e4);?',
        'color: #cbd5e1;',
        content_html,
        flags=re.IGNORECASE
    )
    content_html = re.sub(
        r'color:\s*#(?:9d174d|78350f|0369a1|44403c);?',
        'color: #334155;',
        content_html,
        flags=re.IGNORECASE
    )
    
    action_button_html = ""
    if action_url and action_text:
        action_button_html = f"""
        <table border="0" cellspacing="0" cellpadding="0" align="left" style="margin: 28px 0 10px 0;">
            <tr>
                <td align="center" bgcolor="#0f172a" style="border-radius: 12px; background-color: #0f172a; padding: 12px 28px;">
                    <a href="{action_url}" style="color: #ffffff; display: inline-block; font-family: 'Inter', Arial, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; letter-spacing: -0.01em; line-height: 100%;">
                        {action_text}
                    </a>
                </td>
            </tr>
        </table>
        """
        
    html = f"""<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!--[if !mso]><!-->
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <!--<![endif]-->
    <title>{title}</title>
    <!--[if mso]>
    <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
    </noscript>
    <![endif]-->
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;600;700;800&display=swap');
        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
            -webkit-font-smoothing: antialiased;
        }}
    </style>
    <!--[if mso]>
    <style type="text/css">
        body, table, td, p, a, h1, h2, h3, h4, h5, h6, span {{
            font-family: Arial, Helvetica, sans-serif !important;
        }}
    </style>
    <![endif]-->
</head>
<body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 0;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; table-layout: fixed; padding: 40px 0 40px 0;">
        <tr>
            <td align="center">
                <!--[if (gte mso 9)|(IE)]>
                <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
                    <tr>
                        <td align="center" valign="top" width="600">
                <![endif]-->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; border-top: 4px solid {fallback_color}; border-collapse: separate; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
                    
                    <!-- Preheader -->
                    <tr>
                        <td style="display:none !important; visibility:hidden; opacity:0; color:transparent; height:0; width:0; mso-hide:all; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; overflow: hidden;">
                            {preheader}
                        </td>
                    </tr>
                    
                    <!-- Header -->
                    <tr>
                        <td align="left" style="padding: 40px 48px 24px 48px; background-color: #ffffff;">
                            <h1 style="margin: 0; font-family: 'Outfit', 'Inter', sans-serif; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; line-height: 130%; color: #0f172a;">{title}</h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 0px 48px 40px 48px; color: #334155; font-size: 15px; line-height: 170%; font-family: 'Inter', sans-serif;">
                            <div style="font-family: 'Inter', sans-serif; font-size: 15px; line-height: 170%; color: #334155;">
                                {content_html}
                            </div>
                            {action_button_html}
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td align="left" bgcolor="#ffffff" style="background-color: #ffffff; padding: 32px 48px; border-top: 1px solid #f1f5f9; border-bottom-left-radius: 20px; border-bottom-right-radius: 20px;">
                            <p style="margin: 0; font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; line-height: 140%;">Konnect Wellbeing &bull; TSQE</p>
                        </td>
                    </tr>
                    
                </table>
                <!--[if (gte mso 9)|(IE)]>
                        </td>
                    </tr>
                </table>
                <![endif]-->
            </td>
        </tr>
    </table>
</body>
</html>
"""
    return html

# Email notification helper (sends real SMTP if configured, always appends to data/sent_emails.log)
def send_email_notification(to_emails: list | str, subject: str, body_html: str, body_text: str = "") -> bool:
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = os.getenv("SMTP_PORT", "1025")
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")
    smtp_from = os.getenv("SMTP_FROM", "no-reply@company.com")
    
    if isinstance(to_emails, str):
        to_list = [to_emails]
    else:
        to_list = to_emails
        
    to_list = list(dict.fromkeys([e.strip() for e in to_list if isinstance(e, str) and e.strip()]))
        
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
        
        # Extract bare hostname if formatted as URL (e.g. smtp://host)
        host = smtp_host
        if "://" in host:
            host = host.split("://", 1)[1]
        if "/" in host:
            host = host.split("/", 1)[0]
        if ":" in host:
            host_parts = host.split(":", 1)
            host = host_parts[0]
            if not smtp_port and len(host_parts) > 1:
                try:
                    port = int(host_parts[1])
                except ValueError:
                    pass

        if smtp_user and smtp_pass:
            print(f"Connecting to SMTP server at {host}:{port} with authentication as {smtp_user}...")
        else:
            print(f"Connecting to SMTP server at {host}:{port} without authentication...")
            
        server = smtplib.SMTP(host, port, timeout=3)
        
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
        print(f"SMTP delivery failed ({smtp_err}). Email logged to sent_emails.log (mock delivery fallback)")
        return True

# Check if post has crossed trending threshold of unique users count (threshold = 35)
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
            author_content = f"""
            <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello <strong>{post['author_name']}</strong>,</p>
            <p style="color: #475569; font-size: 15px;">Congratulations! Your post on the Employee Wellbeing forum has caught everyone's attention and is now officially trending!</p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 16px; margin: 24px 0;">
                <tr>
                    <td valign="top" style="padding: 20px 0 0 20px; font-family: Georgia, serif; font-size: 48px; color: #e7e5e4; line-height: 1; width: 30px;">
                        “
                    </td>
                    <td valign="top" style="padding: 24px 24px 24px 8px; font-style: italic; color: #44403c; font-size: 16px; line-height: 160%; font-family: 'Inter', Arial, sans-serif;">
                        {post['content']}
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0 30px 0;">
                <tr>
                    <td bgcolor="#ffedd5" style="background-color: #ffedd5; color: #ea580c; padding: 6px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; font-family: 'Outfit', 'Inter', Arial, sans-serif; line-height: 100%;">
                        🔥 TRENDING TOPIC
                    </td>
                    <td width="8">&nbsp;</td>
                    <td bgcolor="#f1f5f9" style="background-color: #f1f5f9; color: #475569; padding: 6px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; font-family: 'Outfit', 'Inter', Arial, sans-serif; line-height: 100%;">
                        👥 {unique_count} TEAM ENGAGEMENTS
                    </td>
                </tr>
            </table>
            <p style="color: #475569; font-size: 15px;">Keep sharing and connecting with your colleagues to support a healthy, communicative workplace culture!</p>
            """
            author_html = build_premium_email_html(
                title="Your Post is Trending!",
                preheader="Congratulations! Your post is gaining lots of traction.",
                hero_icon="🔥",
                header_color="linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                content_html=author_content,
                action_url="http://localhost:3000/forum",
                action_text="View Your Post"
            )
            author_text = f"Hello {post['author_name']},\n\nCongratulations! Your post on the Employee Wellbeing forum is now trending!\n\nPost Content: \"{post['content']}\"\n\nIt has been engaged with by {unique_count} unique team members. Check it out on the platform!"
            background_tasks.add_task(send_email_notification, post['author_email'], author_subject, author_html, author_text)
            
        # 2. Notify all employees
        if all_emails:
            users_subject = f"Trending Topic: Check out what is hot on the Wellbeing Forum!"
            users_content = f"""
            <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello Team,</p>
            <p style="color: #475569; font-size: 15px;">A post by <strong>{post['author_name']}</strong> is currently trending on the Employee Wellbeing Forum! Check out what your colleagues are talking about:</p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 16px; margin: 24px 0;">
                <tr>
                    <td valign="top" style="padding: 20px 0 0 20px; font-family: Georgia, serif; font-size: 48px; color: #e7e5e4; line-height: 1; width: 30px;">
                        “
                    </td>
                    <td valign="top" style="padding: 24px 24px 24px 8px; font-style: italic; color: #44403c; font-size: 16px; line-height: 160%; font-family: 'Inter', Arial, sans-serif;">
                        {post['content']}
                    </td>
                </tr>
            </table>
            <table border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0 30px 0;">
                <tr>
                    <td bgcolor="#ffedd5" style="background-color: #ffedd5; color: #ea580c; padding: 6px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; font-family: 'Outfit', 'Inter', Arial, sans-serif; line-height: 100%;">
                        TRENDING TOPIC
                    </td>
                    <td width="8">&nbsp;</td>
                    <td bgcolor="#f1f5f9" style="background-color: #f1f5f9; color: #475569; padding: 6px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; font-family: 'Outfit', 'Inter', Arial, sans-serif; line-height: 100%;">
                        JOIN THE DISCUSSION
                    </td>
                </tr>
            </table>
            <p style="color: #475569; font-size: 15px;">Log in to like, comment, and share your own experiences with the team.</p>
            """
            users_html = build_premium_email_html(
                title="Trending on the Forum",
                preheader="Check out what is hot on the Wellbeing Forum!",
                hero_icon="🔥",
                header_color="linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                content_html=users_content,
                action_url="http://localhost:3000/forum",
                action_text="Join the Conversation"
            )
            users_text = f"Hello,\n\nA post by {post['author_name']} is currently trending on the Employee Wellbeing Forum!\n\nPost Content: \"{post['content']}\"\n\nJoin the conversation, leave a like or comment, and connect with your team!"
            background_tasks.add_task(send_email_notification, all_emails, users_subject, users_html, users_text)
    else:
        conn.close()

# Check if post has become the most liked post within 48 hours of its creation (Disabled)
# def check_and_trigger_most_liked_post(post_id: str, background_tasks: BackgroundTasks):
#     pass

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
        "/static",
        "/favicon.ico"
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
    user = request.state.user
    limit_reached = False
    if user:
        conn = database.get_db_connection()
        twenty_four_hours_ago = (datetime.datetime.utcnow() - datetime.timedelta(hours=24)).isoformat() + "Z"
        recent_count = conn.execute('''
            SELECT COUNT(*) as count FROM concerns
            WHERE submitter_id = ? AND created_at >= ?
        ''', (user['id'], twenty_four_hours_ago)).fetchone()['count']
        conn.close()
        if recent_count >= 2:
            limit_reached = True
    return render_template(request, 'concerns.html', {'active_page': 'concerns', 'limit_reached': limit_reached})

@app.get("/recognition", response_class=HTMLResponse)
async def recognition_page(request: Request):
    return render_template(request, 'recognition.html', {'active_page': 'recognition'})

@app.get("/konnect", response_class=HTMLResponse)
async def konnect_page(request: Request):
    return render_template(request, 'konnect.html', {'active_page': 'konnect'})

@app.get("/playportal", response_class=HTMLResponse)
async def playportal_page(request: Request):
    return render_template(request, 'playportal.html', {'active_page': 'playportal'})

@app.get("/help", response_class=HTMLResponse)
async def help_page(request: Request):
    return render_template(request, 'help.html', {'active_page': 'help'})


# --- TASK COLLABORATION ENDPOINTS ---

@app.get("/task-collab", response_class=HTMLResponse)
async def task_collab_page(request: Request):
    return render_template(request, 'task_collab.html', {'active_page': 'task_collab'})

@app.get("/api/collab-tasks")
async def api_get_collab_tasks(request: Request):
    user = request.state.user
    if not user:
        return JSONResponse({'error': 'Unauthorized'}, status_code=401)
    
    conn = database.get_db_connection()
    tasks_rows = conn.execute('''
        SELECT t.*, u.name as author_name, u.department as author_dept
        FROM collab_tasks t
        JOIN users u ON t.created_by = u.id
        ORDER BY t.created_at DESC
    ''').fetchall()
    
    tasks = []
    for r in tasks_rows:
        task = dict(r)
        task_id = task['id']
        
        # If creator, get all applications
        if task['created_by'] == user['id']:
            app_rows = conn.execute('''
                SELECT a.*, u.name as user_name, u.department as user_dept
                FROM collab_applications a
                JOIN users u ON a.user_id = u.id
                WHERE a.task_id = ?
            ''', (task_id,)).fetchall()
            
            # Parse required skills from task (case-insensitive keyword matching)
            req_skills = [s.strip().lower() for s in task['skills_required'].split(',') if s.strip()]
            
            apps = []
            for a in app_rows:
                app_dict = dict(a)
                app_skills_lower = app_dict['skills'].lower()
                matches = 0
                for skill in req_skills:
                    if skill in app_skills_lower:
                        matches += 1
                app_dict['match_score'] = matches
                apps.append(app_dict)
                
            # Sort by match_score descending (most relevant first), then by created_at descending
            apps.sort(key=lambda x: (x['match_score'], x['created_at']), reverse=True)
            
            task['applications'] = apps
            task['my_application'] = None
        else:
            # If not creator, get only my application if exists
            my_app = conn.execute('''
                SELECT * FROM collab_applications
                WHERE task_id = ? AND user_id = ?
            ''', (task_id, user['id'])).fetchone()
            task['applications'] = []
            task['my_application'] = dict(my_app) if my_app else None
            
        tasks.append(task)
        
    conn.close()
    return {'tasks': tasks}

@app.post("/api/collab-tasks")
async def api_create_collab_task(request: Request, background_tasks: BackgroundTasks):
    user = request.state.user
    if not user:
        return JSONResponse({'error': 'Unauthorized'}, status_code=401)
        
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({'error': 'Invalid JSON body'}, status_code=400)
        
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    skills_required = data.get('skills_required', '').strip()
    send_to_all = bool(data.get('sendToAll', False))
    custom_recipients = data.get('recipients', '')
    
    if not title or not description or not skills_required:
        return JSONResponse({'error': 'Title, description, and required skills are all required.'}, status_code=400)
        
    conn = database.get_db_connection()
    task_id = str(uuid.uuid4())
    now_str = datetime.datetime.utcnow().isoformat() + "Z"
    
    conn.execute('''
        INSERT INTO collab_tasks (id, title, description, skills_required, status, created_by, created_at)
        VALUES (?, ?, ?, ?, 'open', ?, ?)
    ''', (task_id, title, description, skills_required, user['id'], now_str))
    
    conn.commit()
    conn.close()

    # Trigger emails if any recipients are specified
    try:
        recipient_emails = []
        if send_to_all:
            conn_emails = database.get_db_connection()
            user_rows = conn_emails.execute("SELECT email FROM users WHERE status = 'approved'").fetchall()
            conn_emails.close()
            recipient_emails = [r['email'] for r in user_rows if r['email']]
        else:
            if isinstance(custom_recipients, str):
                recipient_emails = [email.strip() for email in custom_recipients.split(',') if email.strip()]
            elif isinstance(custom_recipients, list):
                recipient_emails = [email.strip() for email in custom_recipients if email.strip()]

        if recipient_emails:
            subject = f"New Collaboration Task: {title}"
            email_content = f"""
            <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello Team,</p>
            <p style="color: #475569; font-size: 15px;">A new task collaboration request has been posted by <strong>{user['name']}</strong>:</p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #faf5ff; border: 1px solid #f3e8ff; border-radius: 16px; margin: 24px 0;">
                <tr>
                    <td style="padding: 24px; font-family: 'Inter', Arial, sans-serif;">
                        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #581c87; font-family: 'Outfit', 'Inter', Arial, sans-serif;">{title}</h3>
                        <div style="margin: 0 0 16px 0; font-size: 14px; color: #4b5563; line-height: 160%;">{description}</div>
                        <div style="border-top: 1px solid #f3e8ff; padding-top: 14px; margin-top: 12px;">
                            <span style="font-weight: bold; font-size: 12px; color: #7c3aed; font-family: 'Outfit', 'Inter', Arial, sans-serif;">Required Skills: {skills_required}</span>
                        </div>
                    </td>
                </tr>
            </table>
            <p style="color: #475569; font-size: 15px;">If you have the matching skills, please log in to the Employee Wellbeing Portal to offer your collaboration help.</p>
            """

            html_body = build_premium_email_html(
                title="New Task Collaboration",
                preheader=f"A new collaboration task is available from {user['name']}.",
                hero_icon="💼",
                header_color="linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                content_html=email_content,
                action_url="http://localhost:3000/collab",
                action_text="View Collaboration Tasks"
            )
            text_body = f"Hello Team,\n\nA new task collaboration request has been posted by {user['name']}:\n\nTitle: {title}\nDescription: {description.replace('<br>', '\n')}\nRequired Skills: {skills_required}"
            background_tasks.add_task(send_email_notification, recipient_emails, subject, html_body, text_body)
    except Exception as email_err:
        print(f"Error preparing task collaboration email notifications: {email_err}")

    return {'id': task_id, 'status': 'open'}

@app.post("/api/collab-tasks/{task_id}/apply")
async def api_apply_collab_task(task_id: str, request: Request):
    user = request.state.user
    if not user:
        return JSONResponse({'error': 'Unauthorized'}, status_code=401)
        
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({'error': 'Invalid JSON body'}, status_code=400)
        
    skills = data.get('skills', '').strip()
    pitch = data.get('pitch', '').strip()
    if not skills:
        return JSONResponse({'error': 'Skills are required.'}, status_code=400)
        
    conn = database.get_db_connection()
    task = conn.execute("SELECT * FROM collab_tasks WHERE id = ?", (task_id,)).fetchone()
    if not task:
        conn.close()
        return JSONResponse({'error': 'Task not found'}, status_code=404)
        
    if task['status'] != 'open':
        conn.close()
        return JSONResponse({'error': 'Task is no longer accepting collaborators.'}, status_code=400)
        
    if task['created_by'] == user['id']:
        conn.close()
        return JSONResponse({'error': 'You cannot collaborate on your own task.'}, status_code=400)
        
    # Check duplicate
    existing = conn.execute("SELECT 1 FROM collab_applications WHERE task_id = ? AND user_id = ?", (task_id, user['id'])).fetchone()
    if existing:
        conn.close()
        return JSONResponse({'error': 'You have already offered to collaborate on this task.'}, status_code=400)
        
    app_id = str(uuid.uuid4())
    now_str = datetime.datetime.utcnow().isoformat() + "Z"
    
    conn.execute('''
        INSERT INTO collab_applications (id, task_id, user_id, skills, pitch, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)
    ''', (app_id, task_id, user['id'], skills, pitch, now_str))
    
    conn.commit()
    conn.close()
    return {'id': app_id, 'status': 'pending'}

@app.post("/api/collab-applications/{application_id}/status")
async def api_update_collab_application_status(application_id: str, request: Request):
    user = request.state.user
    if not user:
        return JSONResponse({'error': 'Unauthorized'}, status_code=401)
        
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({'error': 'Invalid JSON body'}, status_code=400)
        
    status_val = data.get('status', '').strip()
    if status_val not in ('accepted', 'rejected'):
        return JSONResponse({'error': 'Invalid status. Must be accepted or rejected.'}, status_code=400)
        
    conn = database.get_db_connection()
    app_row = conn.execute("SELECT * FROM collab_applications WHERE id = ?", (application_id,)).fetchone()
    if not app_row:
        conn.close()
        return JSONResponse({'error': 'Application not found'}, status_code=404)
        
    task = conn.execute("SELECT * FROM collab_tasks WHERE id = ?", (app_row['task_id'],)).fetchone()
    if not task:
        conn.close()
        return JSONResponse({'error': 'Associated task not found'}, status_code=404)
        
    if task['created_by'] != user['id']:
        conn.close()
        return JSONResponse({'error': 'Unauthorized to manage applications for this task'}, status_code=403)
        
    if task['status'] != 'open':
        conn.close()
        return JSONResponse({'error': 'Associated task is not open'}, status_code=400)
        
    conn.execute("UPDATE collab_applications SET status = ? WHERE id = ?", (status_val, application_id))
    conn.commit()
    conn.close()
    return {'id': application_id, 'status': status_val}

@app.post("/api/collab-tasks/{task_id}/complete")
async def api_complete_collab_task(task_id: str, request: Request):
    user = request.state.user
    if not user:
        return JSONResponse({'error': 'Unauthorized'}, status_code=401)
        
    try:
        data = await request.json()
    except Exception:
        return JSONResponse({'error': 'Invalid JSON body'}, status_code=400)
        
    feedback_positive = bool(data.get('feedback_positive', False))
    
    conn = database.get_db_connection()
    task = conn.execute("SELECT * FROM collab_tasks WHERE id = ?", (task_id,)).fetchone()
    if not task:
        conn.close()
        return JSONResponse({'error': 'Task not found'}, status_code=404)
        
    if task['created_by'] != user['id']:
        conn.close()
        return JSONResponse({'error': 'Unauthorized to update this task'}, status_code=403)
        
    if task['status'] != 'open':
        conn.close()
        return JSONResponse({'error': 'Task is not open'}, status_code=400)
        
    new_status = 'completed' if feedback_positive else 'closed'
    conn.execute("UPDATE collab_tasks SET status = ? WHERE id = ?", (new_status, task_id))
    
    # If feedback is positive, award 20 points to each accepted collaborator
    reward_points = 20
    now_str = datetime.datetime.utcnow().isoformat() + "Z"
    
    if feedback_positive:
        accepted_apps = conn.execute('''
            SELECT a.*, u.email, u.name, u.points_balance
            FROM collab_applications a
            JOIN users u ON a.user_id = u.id
            WHERE a.task_id = ? AND a.status = 'accepted'
        ''', (task_id,)).fetchall()
        
        for app in accepted_apps:
            collab_user_id = app['user_id']
            curr_balance = app['points_balance']
            new_balance = curr_balance + reward_points
            
            # 1. Update user points balance
            conn.execute("UPDATE users SET points_balance = ? WHERE id = ?", (new_balance, collab_user_id))
            
            # 2. Log to points_log
            conn.execute('''
                INSERT INTO points_log (id, user_id, activity, delta, balance_after, ref_id, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (str(uuid.uuid4()), collab_user_id, f"Collaboration on task: {task['title']}", reward_points, new_balance, task_id, now_str))
            
            # 3. Insert points_approval_requests with status 'approved'
            conn.execute('''
                INSERT INTO points_approval_requests (id, user_id, activity, delta, ref_id, status, created_at, updated_at, admin_notes)
                VALUES (?, ?, ?, ?, ?, 'approved', ?, ?, 'Automatically approved collaboration reward')
            ''', (str(uuid.uuid4()), collab_user_id, f"Collaboration on task: {task['title']}", reward_points, task_id, now_str, now_str))
            
            # 4. Send email notification
            email_body_html = f"""
            <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello {app['name']},</p>
            <p style="color: #475569; font-size: 15px;">Congratulations! You have received <strong>+{reward_points} reward points</strong> for your helpful collaboration on the task: <strong>{task['title']}</strong>.</p>
            <p style="color: #475569; font-size: 15px;">Thank you for contributing your skills to the team!</p>
            """
            email_body_text = f"Hello {app['name']},\n\nCongratulations! You have received +{reward_points} reward points for your helpful collaboration on the task: \"{task['title']}\".\n\nThank you for contributing your skills to the team!"
            
            send_email_notification(
                to_emails=app['email'],
                subject=f"Collaboration Reward: +{reward_points} points earned!",
                body_html=build_premium_email_html(
                    title="Collaboration Reward Earned!",
                    preheader=f"You earned +{reward_points} points for helping on a task",
                    hero_icon="🤝",
                    header_color="linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    content_html=email_body_html
                ),
                body_text=email_body_text
            )
            
    conn.commit()
    conn.close()
    return {'status': new_status}


# New endpoint: list images for Play Portal slideshow
@app.get("/api/playportal/images")
async def get_playportal_images(category: str = None):
    """Return URLs of images located in static/images or subfolders for the slideshow."""
    if category:
        img_dir = os.path.join("static", "images", category)
        url_prefix = f"/static/images/{category}"
    else:
        img_dir = os.path.join("static", "images")
        url_prefix = "/static/images"
        
    if not os.path.isdir(img_dir):
        return {"images": []}
    files = [f for f in os.listdir(img_dir) if f.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp"))]
    files.sort()
    urls = [f"{url_prefix}/{filename}" for filename in files]
    return {"images": urls}


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

@app.get("/admin/points", response_class=HTMLResponse)
async def admin_points_page(request: Request):
    user = getattr(request.state, 'user', None)
    if not user or user.get('role') != 'admin':
        return RedirectResponse(url="/", status_code=status.HTTP_302_FOUND)
    return render_template(request, 'admin_points.html', {'active_page': 'admin_points'})



# --- API ENDPOINTS ---

@app.get("/swagger", include_in_schema=False)
async def swagger_ui():
    return get_swagger_ui_html(openapi_url=app.openapi_url, title="Swagger UI")

@app.get("/redoc", include_in_schema=False)
async def redoc():
    return get_redoc_html(openapi_url=app.openapi_url, title="ReDoc")

# 1. Login API
@app.post("/api/auth/login")
async def api_login(request: Request, response: Response):
    try:
        data = await request.json()
    except Exception:
        data = {}
    email = data.get('email', '').strip().lower()

    if not email:
        return JSONResponse({'error': 'Email is required.'}, status_code=400)

    conn = database.get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()

    if not user:
        return JSONResponse({'error': 'No account found with this email address.'}, status_code=401)

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

    if not name or not email:
        return JSONResponse({'error': 'Name and email are required.'}, status_code=400)

    if not email.endswith('@company.com'):
        return JSONResponse({'error': 'Please use your company email address (e.g. name@company.com).'}, status_code=400)

    conn = database.get_db_connection()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        conn.close()
        return JSONResponse({'error': 'An account with this email address already exists.'}, status_code=400)

    user_id = str(uuid.uuid4())
    now_str = datetime.datetime.utcnow().isoformat() + "Z"

    # No password — role/department assigned by admin on approval
    conn.execute('''
        INSERT INTO users (id, name, email, password_hash, role, roles, department, points_balance, created_at, status)
        VALUES (?, ?, ?, '', 'employee', '["employee"]', '', 0, ?, 'pending')
    ''', (user_id, name, email, now_str))

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
    surveys = conn.execute("SELECT status, deadline FROM surveys WHERE status = 'active'").fetchall()
    surveys_count = sum(1 for s in surveys if not is_survey_expired(s['status'], s['deadline']))
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

# 3.1 Live Home Updates API
@app.get("/api/home-updates")
async def api_home_updates(request: Request):
    user = request.state.user
    if not user:
        return JSONResponse({'error': 'Unauthorized'}, status_code=401)
        
    conn = database.get_db_connection()
    try:
        # 1. Latest open survey
        now_str = datetime.datetime.utcnow().isoformat() + "Z"
        survey_row = conn.execute('''
            SELECT id, title, deadline
            FROM surveys
            WHERE status = 'active' AND (deadline IS NULL OR deadline = '' OR deadline >= ?)
            ORDER BY created_at DESC LIMIT 1
        ''', (now_str,)).fetchone()
        
        survey = None
        if survey_row:
            survey = {
                'id': survey_row['id'],
                'title': survey_row['title'],
                'deadline': survey_row['deadline'],
                'points': 5  # Fixed SURVEY_COMPLETE value from POINT_RULES
            }
            
        # 2. Trending post forum
        post_row = conn.execute('''
            SELECT p.id, p.content, u.name as author_name,
                   ((SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) + 
                    (SELECT COUNT(*) FROM comments WHERE post_id = p.id)) as score
            FROM posts p
            JOIN users u ON p.author_id = u.id
            ORDER BY score DESC, p.created_at DESC LIMIT 1
        ''').fetchone()
        
        post = None
        if post_row:
            import re
            content_preview = re.sub('<[^<]+?>', '', post_row['content'])
            if len(content_preview) > 60:
                content_preview = content_preview[:60] + "..."
            post = {
                'id': post_row['id'],
                'content': content_preview,
                'author_name': post_row['author_name'],
                'score': post_row['score']
            }
            
        # 3. Open task collab
        task_row = conn.execute('''
            SELECT t.id, t.title, u.name as author_name
            FROM collab_tasks t
            JOIN users u ON t.created_by = u.id
            WHERE t.status != 'completed'
            ORDER BY t.created_at DESC LIMIT 1
        ''').fetchone()
        
        task = None
        if task_row:
            task = {
                'id': task_row['id'],
                'title': task_row['title'],
                'author_name': task_row['author_name'],
                'reward_points': 20  # Fixed reward for task collab completion
            }
            
        # 4. Top reward points collector
        top_user_row = conn.execute('''
            SELECT name, points_balance
            FROM users
            WHERE role = 'employee' AND status = 'approved'
            ORDER BY points_balance DESC, name ASC LIMIT 1
        ''').fetchone()
        
        top_user = None
        if top_user_row:
            top_user = dict(top_user_row)
            
        # 5. Latest Peer Recognition
        recognition_row = conn.execute('''
            SELECT r.badge, r.message, u1.name as sender_name, u2.name as recipient_name
            FROM recognitions r
            JOIN users u1 ON r.sender_id = u1.id
            JOIN users u2 ON r.recipient_id = u2.id
            ORDER BY r.created_at DESC LIMIT 1
        ''').fetchone()
        
        recognition = None
        if recognition_row:
            recognition = dict(recognition_row)
            
        return {
            'status': 'success',
            'data': {
                'latest_survey': survey,
                'trending_post': post,
                'open_task_collab': task,
                'top_collector': top_user,
                'latest_recognition': recognition
            }
        }
    except Exception as e:
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        conn.close()

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


def is_survey_expired(status: str, deadline: str) -> bool:
    if status == 'expired':
        return True
    if not deadline:
        return False
    try:
        if deadline.endswith('Z'):
            dt = datetime.datetime.fromisoformat(deadline[:-1] + '+00:00')
        else:
            dt = datetime.datetime.fromisoformat(deadline)
        if dt.tzinfo is not None:
            return datetime.datetime.now(datetime.timezone.utc) > dt
        else:
            return datetime.datetime.utcnow() > dt
    except Exception:
        return False


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
            'isExpired': is_survey_expired(r['status'], r['deadline']),
            'questionCount': q_count,
            'pointsReward': POINT_RULES['SURVEY_COMPLETE'], # Default reward or loaded from DB if configured
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
        send_to_all = bool(data.get('sendToAll', False))
        custom_recipients = data.get('recipients', '')
        
        recipient_emails = []
        if send_to_all:
            conn = database.get_db_connection()
            user_rows = conn.execute("SELECT email FROM users WHERE status = 'approved'").fetchall()
            conn.close()
            recipient_emails = [r['email'] for r in user_rows if r['email']]
        else:
            if isinstance(custom_recipients, str):
                recipient_emails = [email.strip() for email in custom_recipients.split(',') if email.strip()]
            elif isinstance(custom_recipients, list):
                recipient_emails = [email.strip() for email in custom_recipients if email.strip()]

        if recipient_emails:
            survey_subject = f"New Survey Available: {new_survey['title']}"
            survey_content = f"""
            <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello,</p>
            <p style="color: #475569; font-size: 15px;">A new wellbeing survey has been published on the Employee Wellbeing Platform and is waiting for your response.</p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #faf5ff; border: 1px solid #f3e8ff; border-radius: 16px; margin: 24px 0;">
                <tr>
                    <td style="padding: 24px; font-family: 'Inter', Arial, sans-serif;">
                        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #581c87; font-family: 'Outfit', 'Inter', Arial, sans-serif;">{new_survey['title']}</h3>
                        <p style="margin: 0 0 16px 0; font-size: 14px; color: #4b5563; line-height: 160%;">{new_survey['description']}</p>
                        <table border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #f3e8ff; padding-top: 14px; margin-top: 12px; width: 100%;">
                            <tr>
                                <td>
                                    <table border="0" cellpadding="0" cellspacing="0" style="display: inline-block; vertical-align: middle;">
                                        <tr>
                                            <td bgcolor="#f3e8ff" style="background-color: #f3e8ff; color: #7c3aed; padding: 6px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; font-family: 'Outfit', 'Inter', Arial, sans-serif; line-height: 100%;">
                                                Reward: {POINT_RULES['SURVEY_COMPLETE']} Points
                                            </td>
                                            <td width="8">&nbsp;</td>
                                            <td bgcolor="#fdf2f8" style="background-color: #fdf2f8; color: #db2777; padding: 6px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; font-family: 'Outfit', 'Inter', Arial, sans-serif; line-height: 100%;">
                                                Deadline: {new_survey['deadline']}
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            <p style="color: #475569; font-size: 15px;">Completing surveys helps us improve workplace culture and earns you Konnect points which you can redeem for manager 1:1s, mentorship sessions, and more.</p>
            """

            survey_html = build_premium_email_html(
                title="New Wellbeing Survey",
                preheader="A new survey is available. Earn points by sharing your feedback.",
                hero_icon="📋",
                header_color="linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                content_html=survey_content,
                action_url="http://localhost:3000/surveys",
                action_text="Take Survey"
            )
            survey_text = f"Hello,\n\nA new wellbeing survey has been published on the Employee Wellbeing Platform:\n\nTitle: {new_survey['title']}\nDescription: {new_survey['description']}\nDeadline: {new_survey['deadline']}\nPoints Reward: {POINT_RULES['SURVEY_COMPLETE']} Points\n\nPlease log in and complete the survey to earn your wellbeing points. Thanks!"
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

# 4b. Delete Survey API
@app.delete("/api/surveys/{survey_id}")
async def api_delete_survey(survey_id: str, request: Request):
    user = request.state.user
    if not user or user.get('role') != 'admin':
        return JSONResponse({'error': 'Forbidden'}, status_code=403)
        
    conn = database.get_db_connection()
    survey = conn.execute("SELECT id FROM surveys WHERE id = ?", (survey_id,)).fetchone()
    if not survey:
        conn.close()
        return JSONResponse({'error': 'Survey not found.'}, status_code=404)
        
    # Delete associated responses and the survey
    conn.execute("DELETE FROM survey_responses WHERE survey_id = ?", (survey_id,))
    conn.execute("DELETE FROM surveys WHERE id = ?", (survey_id,))
    conn.commit()
    conn.close()
    
    return JSONResponse({'message': 'Survey deleted successfully.'})

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

    # Check if expired
    if is_survey_expired(survey['status'], survey['deadline']):
        conn.close()
        return JSONResponse({'error': 'Survey has expired and is no longer accepting responses.'}, status_code=400)

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

    # Update user's points balance in database
    user_row = conn.execute("SELECT points_balance FROM users WHERE id = ?", (user['id'],)).fetchone()
    new_balance = user_row['points_balance'] + points_reward
    conn.execute("UPDATE users SET points_balance = ? WHERE id = ?", (new_balance, user['id']))

    # Log to points_log
    conn.execute('''
        INSERT INTO points_log (id, user_id, activity, delta, balance_after, ref_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (str(uuid.uuid4()), user['id'], f"Completed Survey: {survey['title']}", points_reward, new_balance, survey_id, now_str))

    # Insert into points_approval_requests with status 'approved' directly
    conn.execute('''
        INSERT INTO points_approval_requests (id, user_id, activity, delta, ref_id, status, created_at, updated_at, admin_notes)
        VALUES (?, ?, ?, ?, ?, 'approved', ?, ?, 'Automatically approved upon submission')
    ''', (str(uuid.uuid4()), user['id'], f"Completed Survey: {survey['title']}", points_reward, survey_id, now_str, now_str))

    conn.commit()
    conn.close()

    return {'pendingApproval': False, 'pointsReward': points_reward, 'pointsEarned': points_reward}

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
        SELECT p.*, u.name as author_name, u.department as author_dept, u.avatar_url as author_avatar,
               (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) as like_count,
               EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) as liked_by_user,
               (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) as comment_count
        FROM posts p
        JOIN users u ON p.author_id = u.id
    '''
    params = [user['id']]
    
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
    
    post_ids = [r['id'] for r in rows]
    hashtags_by_post = {}
    if post_ids:
        placeholders = ','.join('?' for _ in post_ids)
        tag_rows = conn.execute(f'''
            SELECT ph.post_id, h.name FROM hashtags h
            JOIN post_hashtags ph ON h.id = ph.hashtag_id
            WHERE ph.post_id IN ({placeholders})
        ''', post_ids).fetchall()
        for tr in tag_rows:
            hashtags_by_post.setdefault(tr['post_id'], []).append(tr['name'])

    posts_list = []
    for r in rows:
        post_id = r['id']
        hashtags = hashtags_by_post.get(post_id, [])

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
            'likeCount': r['like_count'],
            'likedByUser': bool(r['liked_by_user']),
            'commentCount': r['comment_count'],
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
async def api_create_post(request: Request, background_tasks: BackgroundTasks):
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

    # Points award for posting is removed

    conn.commit()
    new_post = conn.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
    conn.close()

    # Notify users about new forum post if configured
    try:
        send_to_all = bool(data.get('sendToAll', False))
        custom_recipients = data.get('recipients', '')
        
        recipient_emails = []
        if send_to_all:
            conn_emails = database.get_db_connection()
            user_rows = conn_emails.execute("SELECT email FROM users WHERE status = 'approved'").fetchall()
            conn_emails.close()
            recipient_emails = [r['email'] for r in user_rows if r['email']]
        else:
            if isinstance(custom_recipients, str):
                recipient_emails = [email.strip() for email in custom_recipients.split(',') if email.strip()]
            elif isinstance(custom_recipients, list):
                recipient_emails = [email.strip() for email in custom_recipients if email.strip()]
                
        if recipient_emails:
            subject = f"New Forum Discussion: Post by {user['name']}"
            email_content = f"""
            <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello Team,</p>
            <p style="color: #475569; font-size: 15px;">A new forum discussion has been posted on the open forum by <strong>{user['name']}</strong>:</p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 16px; margin: 24px 0;">
                <tr>
                    <td valign="top" style="padding: 20px 0 0 20px; font-family: Georgia, serif; font-size: 48px; color: #bae6fd; line-height: 1; width: 30px;">
                        “
                    </td>
                    <td valign="top" style="padding: 24px 24px 24px 8px; font-style: italic; color: #0369a1; font-size: 16px; line-height: 160%; font-family: 'Inter', Arial, sans-serif;">
                        {content}
                    </td>
                </tr>
            </table>
            <p style="color: #475569; font-size: 15px;">Join the discussion, share your thoughts, and stay connected with the team!</p>
            """

            html_body = build_premium_email_html(
                title="New Forum Post",
                preheader=f"A new post is available from {user['name']}.",
                hero_icon="💬",
                header_color="linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                content_html=email_content,
                action_url="http://localhost:3000/forum",
                action_text="View Forum"
            )
            text_body = f"Hello Team,\n\nA new discussion has been posted on the open forum by {user['name']}:\n\n\"{content}\"\n\nJoin the discussion on the platform!"
            background_tasks.add_task(send_email_notification, recipient_emails, subject, html_body, text_body)
    except Exception as email_err:
        print(f"Error sending forum email notification: {email_err}")

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

@app.patch("/api/posts/{post_id}")
async def api_edit_post(post_id: str, request: Request):
    user = request.state.user
    try:
        data = await request.json()
    except Exception:
        data = {}
    content = data.get('content', '').strip()
    if not content:
        return JSONResponse({'error': 'Content is required.'}, status_code=400)

    conn = database.get_db_connection()
    post = conn.execute("SELECT author_id FROM posts WHERE id = ?", (post_id,)).fetchone()
    if not post:
        conn.close()
        return JSONResponse({'error': 'Post not found.'}, status_code=404)

    if post['author_id'] != user['id'] and user['role'] != 'admin':
        conn.close()
        return JSONResponse({'error': 'Forbidden'}, status_code=403)

    now_str = datetime.datetime.utcnow().isoformat() + "Z"

    # Update post content and updated_at
    conn.execute('''
        UPDATE posts
        SET content = ?, updated_at = ?
        WHERE id = ?
    ''', (content, now_str, post_id))

    # Update hashtags
    old_tags_rows = conn.execute('''
        SELECT h.id, h.name, h.post_count 
        FROM hashtags h
        JOIN post_hashtags ph ON h.id = ph.hashtag_id
        WHERE ph.post_id = ?
    ''', (post_id,)).fetchall()
    old_tags_dict = {row['name']: row for row in old_tags_rows}

    import re
    new_tags_list = list(set(t.lower() for t in re.findall(r'#\w+', content)))
    new_tags_set = set(new_tags_list)
    old_tags_set = set(old_tags_dict.keys())

    tags_to_remove = old_tags_set - new_tags_set
    for t_name in tags_to_remove:
        tag_row = old_tags_dict[t_name]
        conn.execute("DELETE FROM post_hashtags WHERE post_id = ? AND hashtag_id = ?", (post_id, tag_row['id']))
        new_count = max(0, tag_row['post_count'] - 1)
        conn.execute("UPDATE hashtags SET post_count = ? WHERE id = ?", (new_count, tag_row['id']))

    tags_to_add = new_tags_set - old_tags_set
    for t_name in tags_to_add:
        tag_row = conn.execute("SELECT id, post_count FROM hashtags WHERE name = ?", (t_name,)).fetchone()
        if not tag_row:
            hashtag_id = str(uuid.uuid4())
            conn.execute("INSERT INTO hashtags (id, name, post_count) VALUES (?, ?, 1)", (hashtag_id, t_name))
        else:
            hashtag_id = tag_row['id']
            conn.execute("UPDATE hashtags SET post_count = ? WHERE id = ?", (tag_row['post_count'] + 1, hashtag_id))
        
        conn.execute("INSERT INTO post_hashtags (post_id, hashtag_id) VALUES (?, ?)", (post_id, hashtag_id))

    conn.commit()
    updated_post = conn.execute("SELECT * FROM posts WHERE id = ?", (post_id,)).fetchone()
    conn.close()

    return {'message': 'Post updated successfully.', 'data': dict(updated_post)}


# 10. Concerns Submission API
@app.post("/api/concerns")
async def api_submit_concern(request: Request, background_tasks: BackgroundTasks):
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

    if not ref_id or not category or not severity or not title or not description or not incident_date:
        return JSONResponse({'error': 'Missing required fields.'}, status_code=400)

    # Validate incident date is not in the future
    try:
        parsed_date = datetime.datetime.strptime(incident_date, "%Y-%m-%d").date()
        tomorrow = datetime.datetime.utcnow().date() + datetime.timedelta(days=1)
        if parsed_date > tomorrow:
            return JSONResponse({'error': 'Incident date cannot be in the future.'}, status_code=400)
    except ValueError:
        return JSONResponse({'error': 'Invalid incident date format.'}, status_code=400)

    conn = database.get_db_connection()

    # Rate limit check: Maximum 2 concerns in 24 hours per user
    if submitter_id:
        twenty_four_hours_ago = (datetime.datetime.utcnow() - datetime.timedelta(hours=24)).isoformat() + "Z"
        recent_count = conn.execute('''
            SELECT COUNT(*) as count FROM concerns
            WHERE submitter_id = ? AND created_at >= ?
        ''', (submitter_id, twenty_four_hours_ago)).fetchone()['count']
        if recent_count >= 2:
            conn.close()
            return JSONResponse({'error': 'You can raise a maximum of 2 concerns in 24 hours.'}, status_code=400)

    now_str = datetime.datetime.utcnow().isoformat() + "Z"
    concern_id = str(uuid.uuid4())

    conn.execute('''
        INSERT INTO concerns (id, reference_id, category, severity, title, description, attachment_url, incident_date, status, submitter_id, assignee_id, admin_notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Open', ?, NULL, '', ?, ?)
    ''', (concern_id, ref_id, category, severity, title, description, attachment_url, incident_date, submitter_id, now_str, now_str))

    conn.commit()

    # Trigger email notifications to all active/approved administrators
    try:
        admin_rows = conn.execute("SELECT email FROM users WHERE status = 'approved' AND role = 'admin'").fetchall()
        admin_emails = [r['email'] for r in admin_rows if r['email']]
        
        if admin_emails:
            concern_subject = f"New Concern Raised: {title}"
            concern_content = f"""
            <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello,</p>
            <p style="color: #475569; font-size: 15px;">A new employee concern has been raised on the Employee Wellbeing Platform and requires your attention.</p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #faf5ff; border: 1px solid #f3e8ff; border-radius: 16px; margin: 24px 0;">
                <tr>
                    <td style="padding: 24px; font-family: 'Inter', Arial, sans-serif;">
                        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #581c87; font-family: 'Outfit', 'Inter', Arial, sans-serif;">{title}</h3>
                        <p style="margin: 0 0 16px 0; font-size: 14px; color: #4b5563; line-height: 160%;">{description}</p>
                        <table border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #f3e8ff; padding-top: 14px; margin-top: 12px; width: 100%;">
                            <tr>
                                <td>
                                    <table border="0" cellpadding="0" cellspacing="0" style="display: inline-block; vertical-align: middle;">
                                        <tr>
                                            <td bgcolor="#f3e8ff" style="background-color: #f3e8ff; color: #7c3aed; padding: 6px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; font-family: 'Outfit', 'Inter', Arial, sans-serif; line-height: 100%;">
                                                Category: {category}
                                            </td>
                                            <td width="8">&nbsp;</td>
                                            <td bgcolor="#fdf2f8" style="background-color: #fdf2f8; color: #db2777; padding: 6px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; font-family: 'Outfit', 'Inter', Arial, sans-serif; line-height: 100%;">
                                                Severity: {severity}
                                            </td>
                                            <td width="8">&nbsp;</td>
                                            <td bgcolor="#f1f5f9" style="background-color: #f1f5f9; color: #475569; padding: 6px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; font-family: 'Outfit', 'Inter', Arial, sans-serif; line-height: 100%;">
                                                Ref ID: {ref_id}
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            <p style="color: #475569; font-size: 15px;">Please review the concern and assign or resolve it as soon as possible.</p>
            """

            concern_html = build_premium_email_html(
                title="New Concern Submitted",
                preheader=f"A new {severity.lower()} severity concern has been raised.",
                hero_icon="⚠️",
                header_color="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                content_html=concern_content,
                action_url="http://localhost:3000/concerns",
                action_text="View Concerns"
            )
            concern_text = f"Hello,\n\nA new concern has been raised:\n\nReference ID: {ref_id}\nTitle: {title}\nCategory: {category}\nSeverity: {severity}\nDescription: {description}\n\nPlease review it in the portal. Thanks!"
            
            background_tasks.add_task(send_email_notification, admin_emails, concern_subject, concern_html, concern_text)
    except Exception as err:
        print(f"Error preparing concern notification emails: {err}")

    # Check if the limit is reached after this submission
    limit_reached_after = False
    if submitter_id:
        twenty_four_hours_ago = (datetime.datetime.utcnow() - datetime.timedelta(hours=24)).isoformat() + "Z"
        recent_count_after = conn.execute('''
            SELECT COUNT(*) as count FROM concerns
            WHERE submitter_id = ? AND created_at >= ?
        ''', (submitter_id, twenty_four_hours_ago)).fetchone()['count']
        if recent_count_after >= 2:
            limit_reached_after = True

    conn.close()
    return JSONResponse({'referenceId': ref_id, 'limitReached': limit_reached_after}, status_code=201)

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
               rec.name as recipient_name, rec.department as recipient_dept, rec.avatar_url as recipient_avatar,
               (SELECT count(*) FROM recognition_likes rl WHERE rl.recognition_id = r.id) as like_count,
               EXISTS(SELECT 1 FROM recognition_likes rl WHERE rl.recognition_id = r.id AND rl.user_id = ?) as liked_by_user
        FROM recognitions r
        JOIN users s ON r.sender_id = s.id
        JOIN users rec ON r.recipient_id = rec.id
        ORDER BY r.created_at DESC
    ''', (user['id'],)).fetchall()

    recog_ids = [r['id'] for r in rows]
    comments_by_recog = {}
    if recog_ids:
        placeholders = ','.join('?' for _ in recog_ids)
        comments_rows = conn.execute(f'''
            SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
            FROM recognition_comments c
            JOIN users u ON c.author_id = u.id
            WHERE c.recognition_id IN ({placeholders})
            ORDER BY c.created_at ASC
        ''', recog_ids).fetchall()
        for cr in comments_rows:
            c_dict = {
                'id': cr['id'],
                'recognitionId': cr['recognition_id'],
                'content': cr['content'],
                'createdAt': cr['created_at'],
                'author': {
                    'id': cr['author_id'],
                    'name': cr['author_name'],
                    'avatarUrl': cr['author_avatar']
                }
            }
            comments_by_recog.setdefault(cr['recognition_id'], []).append(c_dict)

    list_rec = []
    for r in rows:
        recog_id = r['id']
        comments = comments_by_recog.get(recog_id, [])

        list_rec.append({
            'id': recog_id,
            'badge': r['badge'],
            'message': r['message'],
            'attachmentUrl': r['attachment_url'],
            'createdAt': r['created_at'],
            'sender': { 'id': r['sender_id'], 'name': r['sender_name'], 'avatarUrl': r['sender_avatar'] },
            'recipient': { 'id': r['recipient_id'], 'name': r['recipient_name'], 'department': r['recipient_dept'], 'avatarUrl': r['recipient_avatar'] },
            'likeCount': r['like_count'],
            'likedByUser': bool(r['liked_by_user']),
            'comments': comments
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

    # Fetch recipient first to avoid UnboundLocalError
    recipient = conn.execute("SELECT name, email, points_balance FROM users WHERE id = ?", (recipient_id,)).fetchone()

    # Write recognition row
    conn.execute('''
        INSERT INTO recognitions (id, sender_id, recipient_id, badge, message, attachment_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (recog_id, user['id'], recipient_id, badge, message, attachment_url, now_str))

    # Points award for sender is removed

    # Reward recipient (+10) - Pending
    if recipient:
        recipient_reward = POINT_RULES['RECOGNITION_RECEIVED']
        conn.execute('''
            INSERT INTO points_approval_requests (id, user_id, activity, delta, ref_id, status, created_at, updated_at, admin_notes)
            VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, '')
        ''', (str(uuid.uuid4()), recipient_id, f"Received Recognition from {user['name']}", recipient_reward, recog_id, now_str, now_str))

    conn.commit()
    new_recog = conn.execute("SELECT * FROM recognitions WHERE id = ?", (recog_id,)).fetchone()
    conn.close()

    # Trigger recognition email notification to recipient
    if recipient and recipient['email']:
        try:
            recog_subject = f"You received a new Recognition from {user['name']}!"
            recog_content = f"""
            <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello <strong>{recipient['name']}</strong>,</p>
            <p style="color: #475569; font-size: 15px;">You have received a new peer recognition award on the Employee Wellbeing Platform!</p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 16px; margin: 24px 0;">
                <tr>
                    <td style="padding: 24px; font-family: 'Inter', Arial, sans-serif;">
                        <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                            <tr>
                                <td bgcolor="#fce7f3" style="background-color: #fce7f3; color: #9d174d; padding: 6px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; font-family: 'Outfit', 'Inter', Arial, sans-serif; line-height: 100%; border: 1px solid #fbcfe8;">
                                    {badge} Badge
                                </td>
                            </tr>
                        </table>
                        <p style="margin: 0 0 12px 0; font-size: 14px; color: #475569; font-family: 'Inter', sans-serif;"><strong>From:</strong> {user['name']} &bull; <span style="font-weight: 600; color: #64748b;">{user['department']}</span></p>
                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 12px;">
                            <tr>
                                <td valign="top" style="font-family: Georgia, serif; font-size: 48px; color: #fbcfe8; line-height: 1; width: 25px; padding-top: 5px;">
                                    “
                                </td>
                                <td valign="top" style="font-style: italic; color: #9d174d; font-size: 16px; line-height: 160%; font-family: 'Inter', Arial, sans-serif;">
                                    {message}
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
            <p style="color: #475569; font-size: 15px;">You earned <strong>+{POINT_RULES['RECOGNITION_RECEIVED']} points</strong> for this recognition. Keep up the amazing work!</p>
            """

            recog_html = build_premium_email_html(
                title="Recognition Received!",
                preheader="Congratulations! You have received a peer recognition award.",
                hero_icon="✨",
                header_color="linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
                content_html=recog_content,
                action_url="http://localhost:3000/recognition",
                action_text="View Recognition"
            )
            recog_text = f"Hello {recipient['name']},\n\nYou have received a new peer recognition award on the Employee Wellbeing Platform!\n\nSender: {user['name']} ({user['department']})\nRecognition Award: {badge}\nMessage: \"{message}\"\n\nYou earned +{POINT_RULES['RECOGNITION_RECEIVED']} points. Keep up the amazing work!"
            background_tasks.add_task(send_email_notification, recipient['email'], recog_subject, recog_html, recog_text)
        except Exception as email_err:
            print(f"Error preparing recognition email: {email_err}")

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
    
    comments = []
    for r in rows:
        comments.append({
            'id': r['id'],
            'recognitionId': r['recognition_id'],
            'content': r['content'],
            'createdAt': r['created_at'],
            'author': {
                'id': r['author_id'],
                'name': r['author_name'],
                'avatarUrl': r['author_avatar']
            }
        })
    return {'data': comments}

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

    cr = conn.execute('''
        SELECT c.*, u.name as author_name, u.avatar_url as author_avatar
        FROM recognition_comments c
        JOIN users u ON c.author_id = u.id
        WHERE c.id = ?
    ''', (comment_id,)).fetchone()
    conn.close()

    if not cr:
        return JSONResponse({'error': 'Failed to retrieve created comment.'}, status_code=500)

    c_dict = {
        'id': cr['id'],
        'recognitionId': cr['recognition_id'],
        'content': cr['content'],
        'createdAt': cr['created_at'],
        'author': {
            'id': cr['author_id'],
            'name': cr['author_name'],
            'avatarUrl': cr['author_avatar']
        }
    }
    return JSONResponse({'data': c_dict}, status_code=201)

@app.delete("/api/recognitions/{recog_id}")
async def api_delete_recognition(recog_id: str, request: Request):
    user = request.state.user
    conn = database.get_db_connection()
    recog = conn.execute("SELECT sender_id FROM recognitions WHERE id = ?", (recog_id,)).fetchone()
    if not recog:
        conn.close()
        return JSONResponse({'error': 'Recognition not found.'}, status_code=404)

    if recog['sender_id'] != user['id'] and user['role'] != 'admin':
        conn.close()
        return JSONResponse({'error': 'Forbidden'}, status_code=403)

    conn.execute("DELETE FROM recognitions WHERE id = ?", (recog_id,))
    conn.execute("DELETE FROM recognition_likes WHERE recognition_id = ?", (recog_id,))
    conn.execute("DELETE FROM recognition_comments WHERE recognition_id = ?", (recog_id,))
    conn.commit()
    conn.close()

    return {'message': 'Recognition deleted successfully.'}

# Wall of Fame API
@app.get("/api/recognition/wall-of-fame")
async def api_wall_of_fame():
    conn = database.get_db_connection()

    # Aggregate top 10 recipients by recognition count
    query = '''
        SELECT r.recipient_id, count(*) as count, max(r.message) as quote, max(r.badge) as top_badge,
               u.name as recipient_name, u.department as recipient_dept, u.avatar_url as recipient_avatar
        FROM recognitions r
        JOIN users u ON r.recipient_id = u.id
        GROUP BY r.recipient_id
        ORDER BY count DESC
        LIMIT 10
    '''
    rows = conn.execute(query).fetchall()

    wall_list = []
    for idx, r in enumerate(rows):
        wall_list.append({
            'rank': idx + 1,
            'employee': {
                'id': r['recipient_id'],
                'name': r['recipient_name'],
                'department': r['recipient_dept'],
                'avatarUrl': r['recipient_avatar']
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
    conn = database.get_db_connection()
    pending_sum = conn.execute("SELECT COALESCE(SUM(delta), 0) as sum FROM points_approval_requests WHERE user_id = ? AND status = 'pending'", (user['id'],)).fetchone()['sum']
    conn.close()
    return {
        'balance': user['points_balance'],
        'pendingBalance': pending_sum,
        'streak': 3, # Mocked streak helper
        'thisMonth': 35 # Mocked sum of earned points this month
    }

@app.get("/api/konnect/leaderboard")
async def api_konnect_leaderboard(request: Request):
    user = request.state.user
    if not user or user.get('role') != 'admin':
        return JSONResponse({'error': 'Forbidden'}, status_code=403)
        
    conn = database.get_db_connection()
    rows = conn.execute('''
        SELECT id, name, email, department, points_balance
        FROM users
        WHERE status = 'approved'
        ORDER BY points_balance DESC
    ''').fetchall()
    conn.close()
    return {'data': [dict(r) for r in rows]}

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

    costs = {
        'cl_connect': 50,
        'ad_coffee': 75,
        'director_dialogue': 100,
        'ed_exchange': 150
    }
    
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
        
    body_content = f"""
    <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello <strong>{recipient['name']}</strong>,</p>
    <p style="color: #475569; font-size: 15px;">An administrator has sent you an important update:</p>
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #64748b; border-radius: 16px; margin: 24px 0;">
        <tr>
            <td style="padding: 24px; color: #334155; font-size: 15px; line-height: 160%; font-family: 'Inter', Arial, sans-serif; white-space: pre-wrap;">
                {message}
            </td>
        </tr>
    </table>
    <p style="color: #475569; font-size: 15px;">Please log in to the Employee Wellbeing Platform if any actions are required.</p>
    """

    body_html = build_premium_email_html(
        title="Message from Administrator",
        preheader="An administrator has sent you an update.",
        hero_icon="✉️",
        header_color="linear-gradient(135deg, #64748b 0%, #475569 100%)",
        content_html=body_content,
        action_url="http://localhost:3000/",
        action_text="Log In to Platform"
    )
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
async def api_admin_resolve_registration(user_id: str, request: Request, background_tasks: BackgroundTasks):
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
    user_row = conn.execute("SELECT name, email, status FROM users WHERE id = ?", (user_id,)).fetchone()
    
    if not user_row:
        conn.close()
        return JSONResponse({'error': 'User registration request not found.'}, status_code=404)

    if user_row['status'] != 'pending':
        conn.close()
        return JSONResponse({'error': 'Registration request is already resolved.'}, status_code=400)

    conn.execute("UPDATE users SET status = ?, role = COALESCE(NULLIF(?, ''), role) WHERE id = ?",
                 (status_val, data.get('role', ''), user_id))
    conn.commit()
    conn.close()

    if status_val == 'approved' and user_row['email']:
        subject = "Your registration request has been approved!"
        app_content = f"""
        <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello <strong>{user_row['name']}</strong>,</p>
        <p style="color: #475569; font-size: 15px;">We are pleased to inform you that your registration request on the Employee Wellbeing Platform has been approved by an administrator.</p>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-left: 4px solid #10b981; border-radius: 16px; margin: 24px 0;">
            <tr>
                <td style="padding: 24px; font-family: 'Inter', Arial, sans-serif;">
                    <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #065f46; font-family: 'Outfit', 'Inter', Arial, sans-serif;">Access Granted</h4>
                    <p style="margin: 0; font-size: 14px; color: #047857; line-height: 160%;">You can now log in using your registered email and password to complete wellbeing check-ins, participate in surveys, praise peers, and earn reward points.</p>
                </td>
            </tr>
        </table>
        <p style="color: #475569; font-size: 15px;">Please log in to your account to get started and set up your wellness profile.</p>
        """

        html_body = build_premium_email_html(
            title="Registration Approved!",
            preheader="Your account has been approved by the administrator.",
            hero_icon="✅",
            header_color="linear-gradient(135deg, #10b981 0%, #059669 100%)",
            content_html=app_content,
            action_url="http://localhost:3000/login",
            action_text="Get Started"
        )
        text_body = f"Hello {user_row['name']},\n\nWe are pleased to inform you that your registration request on the Employee Wellbeing Platform has been approved by an administrator.\n\nYou can now log in using your registered email and password to get started.\n\nBest regards,\nPeople & Culture Team"
        background_tasks.add_task(send_email_notification, user_row['email'], subject, html_body, text_body)

    return {
        'data': {'status': status_val},
        'message': f"User registration successfully {status_val}."
    }

@app.patch("/api/admin/users/{user_id}/role")
async def api_admin_update_role(user_id: str, request: Request):
    """Admin can update role and/or department of any approved user."""
    user = request.state.user
    if not user or user.get('role') != 'admin':
        return JSONResponse({'error': 'Forbidden'}, status_code=403)
    try:
        data = await request.json()
    except Exception:
        data = {}
    role = data.get('role', '').strip()
    department = data.get('department', '').strip()
    if not role and not department:
        return JSONResponse({'error': 'Provide at least role or department to update.'}, status_code=400)
    if role and role not in ('employee', 'admin'):
        return JSONResponse({'error': 'Invalid role. Must be employee or admin.'}, status_code=400)

    conn = database.get_db_connection()
    target = conn.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,)).fetchone()
    if not target:
        conn.close()
        return JSONResponse({'error': 'User not found.'}, status_code=404)
    if target['email'] in ('admin@company.com', 'rahul.naik@ubs.com') and role == 'employee':
        conn.close()
        return JSONResponse({'error': 'Cannot demote the root System Administrator.'}, status_code=400)

    updates, params = [], []
    if role:
        updates.append('role = ?')
        params.append(role)
    if department:
        updates.append('department = ?')
        params.append(department)
    params.append(user_id)
    conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = ?", params)
    conn.commit()
    conn.close()
    return {'message': f"User '{target['name']}' updated successfully.", 'data': {'role': role, 'department': department}}


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

    if user_row['email'] in ('admin@company.com', 'rahul.naik@ubs.com'):
        conn.close()
        return JSONResponse({'error': 'The root System Administrator account cannot be removed.'}, status_code=400)

    conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()

    return {'message': f"User '{user_row['name']}' has been permanently removed."}

# Admin points approval requests directory
@app.get("/api/admin/points")
async def api_admin_points_list(request: Request, status: str = ""):
    user = request.state.user
    if not user or user.get('role') != 'admin':
        return JSONResponse({'error': 'Forbidden'}, status_code=403)

    conn = database.get_db_connection()
    query = '''
        SELECT pr.*, u.name as user_name, u.email as user_email, u.department as user_dept
        FROM points_approval_requests pr
        JOIN users u ON pr.user_id = u.id
    '''
    params = []
    if status:
        query += ' WHERE pr.status = ?'
        params.append(status)
    query += ' ORDER BY pr.created_at DESC'

    rows = conn.execute(query, params).fetchall()
    conn.close()
    return {'data': [dict(r) for r in rows]}

@app.patch("/api/admin/points/{request_id}")
async def api_admin_resolve_point_request(request_id: str, request: Request, background_tasks: BackgroundTasks):
    user = request.state.user
    if not user or user.get('role') != 'admin':
        return JSONResponse({'error': 'Forbidden'}, status_code=403)

    try:
        data = await request.json()
    except Exception:
        data = {}

    status_val = data.get('status') # 'approved' | 'rejected'
    admin_notes = data.get('admin_notes', '').strip()

    if status_val not in ['approved', 'rejected']:
        return JSONResponse({'error': 'Invalid status settings.'}, status_code=400)

    conn = database.get_db_connection()
    req_row = conn.execute("SELECT * FROM points_approval_requests WHERE id = ?", (request_id,)).fetchone()
    
    if not req_row:
        conn.close()
        return JSONResponse({'error': 'Points request not found.'}, status_code=404)

    if req_row['status'] != 'pending':
        conn.close()
        return JSONResponse({'error': 'Points request is already resolved.'}, status_code=400)

    now_str = datetime.datetime.utcnow().isoformat() + "Z"

    # Fetch targeted user
    target_user = conn.execute("SELECT * FROM users WHERE id = ?", (req_row['user_id'],)).fetchone()
    if not target_user:
        conn.close()
        return JSONResponse({'error': 'Associated user not found.'}, status_code=404)

    if status_val == 'approved':
        # Approve and add balance
        new_balance = target_user['points_balance'] + req_row['delta']
        conn.execute("UPDATE users SET points_balance = ? WHERE id = ?", (new_balance, target_user['id']))
        # Log to points_log
        conn.execute('''
            INSERT INTO points_log (id, user_id, activity, delta, balance_after, ref_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (str(uuid.uuid4()), target_user['id'], req_row['activity'], req_row['delta'], new_balance, req_row['ref_id'], now_str))
    
    # Update points approval request status
    conn.execute('''
        UPDATE points_approval_requests
        SET status = ?, admin_notes = ?, updated_at = ?
        WHERE id = ?
    ''', (status_val, admin_notes, now_str, request_id))
    
    conn.commit()
    conn.close()

    # Trigger email notification to user
    if target_user['email']:
        try:
            if status_val == 'approved':
                subject = f"Points Award Approved: +{req_row['delta']} points earned!"
                email_content = f"""
                <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello <strong>{target_user['name']}</strong>,</p>
                <p style="color: #475569; font-size: 15px;">Your wellbeing points award has been approved by an administrator!</p>
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-left: 4px solid #10b981; border-radius: 16px; margin: 24px 0;">
                    <tr>
                        <td style="padding: 24px; font-family: 'Inter', Arial, sans-serif;">
                            <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #065f46; font-family: 'Outfit', 'Inter', Arial, sans-serif;">Points Approved</h4>
                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #047857; line-height: 160%;"><strong>Activity:</strong> {req_row['activity']}</p>
                            <p style="margin: 0; font-size: 14px; color: #047857; line-height: 160%;"><strong>Points Added:</strong> +{req_row['delta']} Points</p>
                        </td>
                    </tr>
                </table>
                """
                if admin_notes:
                    email_content += f'<p style="color: #475569; font-size: 15px;"><strong>Administrator Feedback:</strong> "{admin_notes}"</p>'
                email_content += '<p style="color: #475569; font-size: 15px;">Keep participating in workplace wellbeing activities to earn more points!</p>'
                
                html_body = build_premium_email_html(
                    title="Points Approved!",
                    preheader=f"You earned +{req_row['delta']} points.",
                    hero_icon="🌿",
                    header_color="linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    content_html=email_content,
                    action_url="http://localhost:3000/konnect",
                    action_text="View Rewards Balance"
                )
                text_body = f"Hello {target_user['name']},\n\nYour points award has been approved by an administrator!\n\nActivity: {req_row['activity']}\nPoints Added: +{req_row['delta']} Points\n\nBest regards,\nPeople & Culture Team"
            else:
                subject = f"Points Award Rejected"
                email_content = f"""
                <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello <strong>{target_user['name']}</strong>,</p>
                <p style="color: #475569; font-size: 15px;">An administrator has reviewed your wellbeing points request and declined it.</p>
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef2f2; border: 1px solid #fee2e2; border-left: 4px solid #ef4444; border-radius: 16px; margin: 24px 0;">
                    <tr>
                        <td style="padding: 24px; font-family: 'Inter', Arial, sans-serif;">
                            <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #991b1b; font-family: 'Outfit', 'Inter', Arial, sans-serif;">Request Declined</h4>
                            <p style="margin: 0 0 8px 0; font-size: 14px; color: #b91c1c; line-height: 160%;"><strong>Activity:</strong> {req_row['activity']}</p>
                            <p style="margin: 0; font-size: 14px; color: #b91c1c; line-height: 160%;"><strong>Points Requested:</strong> {req_row['delta']} Points</p>
                        </td>
                    </tr>
                </table>
                """
                if admin_notes:
                    email_content += f'<p style="color: #475569; font-size: 15px;"><strong>Reason for rejection:</strong> "{admin_notes}"</p>'
                
                html_body = build_premium_email_html(
                    title="Points Declined",
                    preheader="Your points request has been rejected.",
                    hero_icon="❌",
                    header_color="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    content_html=email_content,
                    action_url="http://localhost:3000/konnect",
                    action_text="View Rewards Balance"
                )
                text_body = f"Hello {target_user['name']},\n\nAn administrator has reviewed and declined your points award request.\n\nActivity: {req_row['activity']}\n\nBest regards,\nPeople & Culture Team"
            
            background_tasks.add_task(send_email_notification, target_user['email'], subject, html_body, text_body)
        except Exception as email_err:
            print(f"Error sending points approval/rejection email: {email_err}")

    return {
        'status': status_val,
        'message': f"Points request has been successfully {status_val}."
    }

# 16. Admin Dashboard statistics API
@app.get("/api/dashboard/stats")
async def api_dashboard_stats(request: Request, days: int = 30, department: str = ""):
    user = request.state.user
    if user['role'] != 'admin':
        return JSONResponse({'error': 'Forbidden'}, status_code=403)

    conn = database.get_db_connection()
    
    # KPIs
    surveys = conn.execute("SELECT status, deadline FROM surveys WHERE status = 'active'").fetchall()
    active_surveys = sum(1 for s in surveys if not is_survey_expired(s['status'], s['deadline']))
    open_concerns = conn.execute("SELECT count(*) as count FROM concerns WHERE status != 'Resolved'").fetchone()['count']
    recognitions_count = conn.execute("SELECT count(*) as count FROM recognitions").fetchone()['count']
    
    total_points_sum = conn.execute("SELECT sum(delta) as sum FROM points_log WHERE delta > 0").fetchone()['sum'] or 0
    
    # 1. Survey responses chart data
    surveys = conn.execute("SELECT id, title FROM surveys").fetchall()
    user_count = conn.execute("SELECT count(*) as count FROM users WHERE status = 'approved'").fetchone()['count'] or 1
    
    survey_counts = {r['survey_id']: r['count'] for r in conn.execute("SELECT survey_id, count(*) as count FROM survey_responses GROUP BY survey_id").fetchall()}
    survey_rates = []
    for s in surveys:
        resp_count = survey_counts.get(s['id'], 0)
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
    dept_user_rows = conn.execute("SELECT department, count(*) as count FROM users WHERE status = 'approved' GROUP BY department").fetchall()
    dept_user_counts = {r['department']: r['count'] for r in dept_user_rows}
    
    dept_resp_rows = conn.execute('''
        SELECT u.department, count(distinct r.user_id) as count
        FROM survey_responses r
        JOIN users u ON r.user_id = u.id
        GROUP BY u.department
    ''').fetchall()
    dept_resp_counts = {r['department']: r['count'] for r in dept_resp_rows}
    
    dept_participation = []
    for d in depts:
        dept_user_count = dept_user_counts.get(d, 0)
        if dept_user_count > 0:
            resp_count = dept_resp_counts.get(d, 0)
            rate = round((resp_count / dept_user_count) * 100)
        else:
            rate = 0
        dept_participation.append({ 'department': d, 'percentage': rate })
        
    # 4. Concern Category counts
    category_rows = conn.execute("SELECT category, count(*) as count FROM concerns GROUP BY category").fetchall()
    category_map = {r['category']: r['count'] for r in category_rows}
    category_counts = []
    categories = ['Harassment', 'Workload', 'Management', 'Environment', 'Policy', 'Other']
    for cat in categories:
        cnt = category_map.get(cat, 0)
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

    concern_trend_rows = conn.execute("SELECT substr(created_at, 1, 7) as ym, count(*) as count FROM concerns GROUP BY ym").fetchall()
    concern_trend_map = {r['ym']: r['count'] for r in concern_trend_rows}
    concern_trend = []
    month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    concern_fallbacks = {
        'Jan': 2, 'Feb': 4, 'Mar': 1, 'Apr': 3, 'May': 6, 'Jun': 5, 
        'Jul': 4, 'Aug': 2, 'Sep': 3, 'Oct': 5, 'Nov': 7, 'Dec': 4
    }
    for y, m in months:
        prefix = f"{y:04d}-{m:02d}"
        m_name = month_names[m - 1]
        cnt = concern_trend_map.get(prefix, 0)
        if cnt == 0 and prefix != today.strftime("%Y-%m"):
            cnt = concern_fallbacks.get(m_name, 0)
        concern_trend.append({ 'month': m_name, 'count': cnt })

    # 6. Forum Hashtags mentions
    hashtags_list = []
    hashtags_rows = conn.execute("SELECT name, post_count FROM hashtags ORDER BY post_count DESC LIMIT 5").fetchall()
    for hr in hashtags_rows:
        hashtags_list.append({ 'tag': hr['name'], 'count': hr['post_count'] })
        
    # 7. Recognition badges radar chart
    badge_rows = conn.execute("SELECT badge, count(*) as count FROM recognitions GROUP BY badge").fetchall()
    badge_map = {r['badge']: r['count'] for r in badge_rows}
    radar_badges = []
    badges = ['Excellence', 'Innovation', 'Teamwork', 'Leadership', 'AboveAndBeyond', 'ProblemSolver']
    for b in badges:
        cnt = badge_map.get(b, 0)
        radar_badges.append({ 'badge': b, 'count': cnt })
        
    # 8. Recognition logged trend (dynamic last 5 days)
    rec_trend_rows = conn.execute("SELECT substr(created_at, 1, 10) as dt, count(*) as count FROM recognitions GROUP BY dt").fetchall()
    rec_trend_map = {r['dt']: r['count'] for r in rec_trend_rows}
    recognition_trend = []
    recognition_fallbacks = [1, 3, 2, 4]
    for i in range(4, -1, -1):
        day = today - datetime.timedelta(days=i)
        date_str = day.strftime("%m-%d")
        db_date_prefix = day.strftime("%Y-%m-%d")
        cnt = rec_trend_map.get(db_date_prefix, 0)
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


# --- DEVELOPER EMAIL PREVIEW WORKSPACE ---
@app.get("/dev/email-previews", response_class=HTMLResponse)
async def dev_email_previews_page(request: Request):
    email_types = [
        ("survey_publish", "1. New Survey Published"),
        ("recog_received", "2. Peer Recognition Received"),
        ("points_approved", "3. Points Request Approved"),
        ("points_declined", "4. Points Request Declined"),
        ("concern_raised", "5. New Concern Raised"),
        ("engineering_post", "6. New Engineering Post"),
        ("register_approved", "7. Registration Approved"),
        ("admin_msg", "8. Message from Admin"),
        ("trending_author", "9. Post Trending (Author)"),
        ("trending_broadcast", "10. Trending Topic Alert"),
        ("most_liked", "11. Most Liked Post Alert")
    ]
    
    links_html = ""
    for k, v in email_types:
        links_html += f"""
        <button id="link-{k}" onclick="selectEmail('{k}', '{v}')" class="email-link w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:bg-slate-800 text-slate-300 flex items-center justify-between">
            <span>{v}</span>
            <span class="text-xs opacity-50">→</span>
        </button>
        """

    page_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Email Previews Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body {{ font-family: 'Inter', sans-serif; }}
    </style>
</head>
<body class="bg-slate-900 text-white min-h-screen flex flex-col">
    <header class="bg-slate-950 border-b border-slate-800 px-8 py-4 flex items-center justify-between shadow-md">
        <div class="flex items-center gap-3">
            <span class="text-2xl">✉️</span>
            <div>
                <h1 class="text-xl font-bold text-slate-100">Email Previews Dashboard</h1>
                <p class="text-xs text-slate-400">Preview and test all email notification layouts</p>
            </div>
        </div>
        <div class="text-xs bg-indigo-600 px-3 py-1.5 rounded-full font-semibold">Developer Mode</div>
    </header>

    <div class="flex flex-1 overflow-hidden">
        <aside class="w-80 bg-slate-950 border-r border-slate-800 flex flex-col p-6 overflow-y-auto">
            <h2 class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Email Notifications (11)</h2>
            <nav class="space-y-1">
                {links_html}
            </nav>
        </aside>

        <main class="flex-1 bg-slate-900 p-8 flex flex-col">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-bold text-slate-200" id="preview-title">Select an email to preview</h2>
                <div class="flex gap-2">
                    <button onclick="resizePreview('mobile')" class="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-350">Mobile (375px)</button>
                    <button onclick="resizePreview('desktop')" class="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-350">Desktop (100%)</button>
                </div>
            </div>
            <div class="flex-1 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex justify-center items-center relative">
                <iframe id="preview-iframe" class="w-full h-full transition-all duration-300 bg-[#f8fafc]" src="about:blank"></iframe>
            </div>
        </main>
    </div>

    <script>
        function selectEmail(type, title) {{
            document.getElementById('preview-title').textContent = title;
            document.getElementById('preview-iframe').src = '/dev/email-previews/' + type;
            
            document.querySelectorAll('.email-link').forEach(link => {{
                link.classList.remove('bg-indigo-600', 'text-white');
                link.classList.add('hover:bg-slate-800', 'text-slate-300');
            }});
            const activeLink = document.getElementById('link-' + type);
            if (activeLink) {{
                activeLink.classList.remove('hover:bg-slate-800', 'text-slate-300');
                activeLink.classList.add('bg-indigo-600', 'text-white');
            }}
        }}
        
        function resizePreview(size) {{
            const iframe = document.getElementById('preview-iframe');
            if (size === 'mobile') {{
                iframe.style.maxWidth = '375px';
            }} else {{
                iframe.style.maxWidth = '100%';
            }}
        }}
        
        window.onload = () => {{
            const firstLink = document.querySelector('.email-link');
            if (firstLink) {{
                firstLink.click();
            }}
        }};
    </script>
</body>
</html>
"""
    return HTMLResponse(content=page_html)

@app.get("/dev/email-previews/{email_type}", response_class=HTMLResponse)
async def dev_email_preview_render(email_type: str):
    if email_type == "survey_publish":
        survey_content = """
        <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello Team,</p>
        <p style="color: #475569; font-size: 15px;">A new wellbeing survey has been published. Earn points by sharing your feedback:</p>
        <p style="margin: 0 0 16px 0; font-size: 14px; color: #4b5563; line-height: 160%;"><strong>Title:</strong> Mid-Year Health Check-In<br><strong>Description:</strong> Share your thoughts on stress levels, team resources, and suggestions for wellness activities.<br><strong>Deadline:</strong> July 15, 2026</p>
        <table border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #f3e8ff; padding-top: 14px; margin-top: 12px; width: 100%;">
            <tr>
                <td>
                    <table border="0" cellpadding="0" cellspacing="0" style="display: inline-block; vertical-align: middle;">
                        <tr>
                            <td bgcolor="#f3e8ff" style="background-color: #f3e8ff; color: #7c3aed; padding: 6px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; font-family: 'Outfit', 'Inter', Arial, sans-serif; line-height: 100%;">
                                🎁 Reward: 5 Points
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        """
        html = build_premium_email_html(
            title="New Wellbeing Survey",
            preheader="A new survey is available. Earn points by sharing your feedback.",
            hero_icon="📋",
            header_color="linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
            content_html=survey_content,
            action_url="http://localhost:3000/surveys",
            action_text="Take Survey"
        )
    elif email_type == "recog_received":
        recog_content = """
        <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello <strong>Rahul</strong>,</p>
        <p style="color: #475569; font-size: 15px;">You have received a new peer recognition award on the Employee Wellbeing Platform!</p>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 16px; margin: 24px 0;">
            <tr>
                <td style="padding: 24px; font-family: 'Inter', Arial, sans-serif;">
                    <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
                        <tr>
                            <td bgcolor="#fce7f3" style="background-color: #fce7f3; color: #9d174d; padding: 6px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; font-family: 'Outfit', 'Inter', Arial, sans-serif; line-height: 100%; border: 1px solid #fbcfe8;">
                                🏆 Team Player Badge
                            </td>
                        </tr>
                    </table>
                    <p style="margin: 0 0 12px 0; font-size: 14px; color: #475569; font-family: 'Inter', sans-serif;"><strong>From:</strong> Elena Petrova &bull; <span style="font-weight: 600; color: #64748b;">Engineering</span></p>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td valign="top" style="font-style: italic; color: #9d174d; font-size: 16px; line-height: 160%; font-family: 'Inter', Arial, sans-serif;">
                                "Thank you so much for help debugging the system issues late on Friday! You saved the release!"
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <p style="color: #475569; font-size: 15px;">You earned <strong>+15 points</strong> for this recognition. Keep up the amazing work!</p>
        """
        html = build_premium_email_html(
            title="Recognition Received!",
            preheader="Congratulations! You have received a peer recognition award.",
            hero_icon="✨",
            header_color="linear-gradient(135deg, #ec4899 0%, #db2777 100%)",
            content_html=recog_content,
            action_url="http://localhost:3000/recognition",
            action_text="View Recognition"
        )
    elif email_type == "points_approved":
        content = """
        <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello <strong>Rahul</strong>,</p>
        <p style="color: #475569; font-size: 15px;">Your wellbeing points award has been approved by an administrator!</p>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-left: 4px solid #10b981; border-radius: 16px; margin: 24px 0;">
            <tr>
                <td style="padding: 24px; font-family: 'Inter', Arial, sans-serif;">
                    <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #065f46; font-family: 'Outfit', 'Inter', Arial, sans-serif;">Points Approved</h4>
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #047857; line-height: 160%;"><strong>Activity:</strong> Completed Survey: Stress Levels Survey</p>
                    <p style="margin: 0; font-size: 14px; color: #047857; line-height: 160%;"><strong>Points Added:</strong> +5 Points</p>
                </td>
            </tr>
        </table>
        """
        html = build_premium_email_html(
            title="Points Award Approved",
            preheader="Your wellbeing points award has been approved.",
            hero_icon="🌿",
            header_color="linear-gradient(135deg, #10b981 0%, #059669 100%)",
            content_html=content,
            action_url="http://localhost:3000/konnect",
            action_text="View Rewards Balance"
        )
    elif email_type == "points_declined":
        content = """
        <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello <strong>Rahul</strong>,</p>
        <p style="color: #475569; font-size: 15px;">An administrator has reviewed and declined your points award request.</p>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef2f2; border: 1px solid #fee2e2; border-left: 4px solid #ef4444; border-radius: 16px; margin: 24px 0;">
            <tr>
                <td style="padding: 24px; font-family: 'Inter', Arial, sans-serif;">
                    <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #991b1b; font-family: 'Outfit', 'Inter', Arial, sans-serif;">Request Declined</h4>
                    <p style="margin: 0 0 8px 0; font-size: 14px; color: #b91c1c; line-height: 160%;"><strong>Activity:</strong> Custom submission for Wellness Marathon</p>
                    <p style="margin: 0; font-size: 14px; color: #b91c1c; line-height: 160%;"><strong>Points Requested:</strong> 50 Points</p>
                </td>
            </tr>
        </table>
        <p style="color: #475569; font-size: 15px;"><strong>Reason for rejection:</strong> "No proof of attendance uploaded."</p>
        """
        html = build_premium_email_html(
            title="Points Declined",
            preheader="Your points request has been rejected.",
            hero_icon="❌",
            header_color="linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
            content_html=content,
            action_url="http://localhost:3000/konnect",
            action_text="View Rewards Balance"
        )
    elif email_type == "concern_raised":
        content = """
        <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello HR Team,</p>
        <p style="color: #475569; font-size: 15px;">A new concern has been raised on the Employee Wellbeing Platform:</p>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 16px; margin: 24px 0;">
            <tr>
                <td style="padding: 24px; font-family: 'Inter', Arial, sans-serif;">
                    <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #78350f; font-family: 'Outfit', 'Inter', Arial, sans-serif;">Concern Details</h4>
                    <p style="margin: 0 0 6px 0; font-size: 14px; color: #451a03; line-height: 150%;"><strong>Reference ID:</strong> cn_828399120</p>
                    <p style="margin: 0 0 6px 0; font-size: 14px; color: #451a03; line-height: 150%;"><strong>Category:</strong> Workload & Stress</p>
                    <p style="margin: 0 0 6px 0; font-size: 14px; color: #451a03; line-height: 150%;"><strong>Severity:</strong> High</p>
                    <p style="margin: 0; font-size: 14px; color: #451a03; line-height: 150%;"><strong>Description:</strong> "Multiple team members have been working until midnight to hit the project deadline. Stress levels are extremely high and burnout is imminent."</p>
                </td>
            </tr>
        </table>
        """
        html = build_premium_email_html(
            title="New Concern Submitted",
            preheader="A new concern has been raised.",
            hero_icon="⚠️",
            header_color="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
            content_html=content,
            action_url="http://localhost:3000/concerns",
            action_text="View Concerns"
        )
    elif email_type == "engineering_post":
        content = """
        <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello Team,</p>
        <p style="color: #475569; font-size: 15px;">A new post with <strong>#engineering</strong> has been shared by Rahul Naik:</p>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 16px; margin: 24px 0;">
            <tr>
                <td style="padding: 24px; font-family: 'Inter', Arial, sans-serif; font-style: italic; color: #0369a1; font-size: 16px; line-height: 160%;">
                    "Just finished writing clean mocks for the SMTP email pipeline! Check out the pull request in repo #engineering"
                </td>
            </tr>
        </table>
        """
        html = build_premium_email_html(
            title="New Engineering Post",
            preheader="A new post with #engineering is available.",
            hero_icon="⚙️",
            header_color="linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            content_html=content,
            action_url="http://localhost:3000/forum",
            action_text="View Forum"
        )
    elif email_type == "register_approved":
        content = """
        <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello <strong>Rahul</strong>,</p>
        <p style="color: #475569; font-size: 15px;">We are pleased to inform you that your registration request on the Employee Wellbeing Platform has been approved by an administrator.</p>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ecfdf5; border: 1px solid #d1fae5; border-left: 4px solid #10b981; border-radius: 16px; margin: 24px 0;">
            <tr>
                <td style="padding: 24px; font-family: 'Inter', Arial, sans-serif;">
                    <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 700; color: #065f46; font-family: 'Outfit', 'Inter', Arial, sans-serif;">Access Granted</h4>
                    <p style="margin: 0; font-size: 14px; color: #047857; line-height: 160%;">You can now log in using your registered email and password to complete wellbeing check-ins, participate in surveys, praise peers, and earn reward points.</p>
                </td>
            </tr>
        </table>
        """
        html = build_premium_email_html(
            title="Registration Approved!",
            preheader="Your account has been approved by the administrator.",
            hero_icon="✅",
            header_color="linear-gradient(135deg, #10b981 0%, #059669 100%)",
            content_html=content,
            action_url="http://localhost:3000/login",
            action_text="Get Started"
        )
    elif email_type == "admin_msg":
        content = """
        <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello <strong>Rahul</strong>,</p>
        <p style="color: #475569; font-size: 15px;">An administrator has sent you an important update:</p>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #64748b; border-radius: 16px; margin: 24px 0;">
            <tr>
                <td style="padding: 24px; color: #334155; font-size: 15px; line-height: 160%; font-family: 'Inter', Arial, sans-serif; white-space: pre-wrap;">Please make sure to complete the quarterly wellness check-in before next Friday. Your feedback is crucial for our upcoming Q3 HR wellness initiatives planning. Thanks!</td>
            </tr>
        </table>
        """
        html = build_premium_email_html(
            title="Message from Administrator",
            preheader="An administrator has sent you an update.",
            hero_icon="✉️",
            header_color="linear-gradient(135deg, #64748b 0%, #475569 100%)",
            content_html=content,
            action_url="http://localhost:3000/",
            action_text="Log In to Platform"
        )
    elif email_type == "trending_author":
        content = """
        <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello <strong>Rahul</strong>,</p>
        <p style="color: #475569; font-size: 15px;">Congratulations! Your post on the Employee Wellbeing forum has caught everyone's attention and is now officially trending!</p>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 16px; margin: 24px 0;">
            <tr>
                <td valign="top" style="padding: 24px; font-style: italic; color: #44403c; font-size: 16px; line-height: 160%; font-family: 'Inter', Arial, sans-serif;">
                    "What are your best hacks for maintaining screen-time limits during remote work? Let's compile a list!"
                </td>
            </tr>
        </table>
        <table border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0 30px 0;">
            <tr>
                <td bgcolor="#ffedd5" style="background-color: #ffedd5; color: #ea580c; padding: 6px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; font-family: 'Outfit', 'Inter', Arial, sans-serif; line-height: 100%;">
                    🔥 TRENDING TOPIC
                </td>
                <td width="8">&nbsp;</td>
                <td bgcolor="#f1f5f9" style="background-color: #f1f5f9; color: #475569; padding: 6px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; font-family: 'Outfit', 'Inter', Arial, sans-serif; line-height: 100%;">
                    👥 22 TEAM ENGAGEMENTS
                </td>
            </tr>
        </table>
        """
        html = build_premium_email_html(
            title="Your Post is Trending!",
            preheader="Congratulations! Your post is gaining lots of traction.",
            hero_icon="🔥",
            header_color="linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
            content_html=content,
            action_url="http://localhost:3000/forum",
            action_text="View Your Post"
        )
    elif email_type == "trending_broadcast":
        content = """
        <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello Team,</p>
        <p style="color: #475569; font-size: 15px;">A post by <strong>Rahul Naik</strong> is currently trending on the Employee Wellbeing Forum! Check out what your colleagues are talking about:</p>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 16px; margin: 24px 0;">
            <tr>
                <td valign="top" style="padding: 24px; font-style: italic; color: #44403c; font-size: 16px; line-height: 160%; font-family: 'Inter', Arial, sans-serif;">
                    "What are your best hacks for maintaining screen-time limits during remote work? Let's compile a list!"
                </td>
            </tr>
        </table>
        """
        html = build_premium_email_html(
            title="Trending on the Forum",
            preheader="Check out what is hot on the Wellbeing Forum!",
            hero_icon="🔥",
            header_color="linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
            content_html=content,
            action_url="http://localhost:3000/forum",
            action_text="Join the Conversation"
        )
    elif email_type == "most_liked":
        content = """
        <p style="margin-top: 0; font-size: 16px; color: #1e293b;">Hello Team,</p>
        <p style="color: #475569; font-size: 15px;">A post by <strong>Rahul Naik</strong> has become the most liked post on the Wellbeing Forum within 48 hours of creation!</p>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fafaf9; border: 1px solid #e7e5e4; border-radius: 16px; margin: 24px 0;">
            <tr>
                <td valign="top" style="padding: 24px; font-style: italic; color: #44403c; font-size: 16px; line-height: 160%; font-family: 'Inter', Arial, sans-serif;">
                    "What are your best hacks for maintaining screen-time limits during remote work? Let's compile a list!"
                </td>
            </tr>
        </table>
        <table border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0 30px 0;">
            <tr>
                <td bgcolor="#fef9c3" style="background-color: #fef9c3; color: #ca8a04; padding: 6px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; font-family: 'Outfit', 'Inter', Arial, sans-serif; line-height: 100%;">
                    🏆 TOP POST
                </td>
                <td width="8">&nbsp;</td>
                <td bgcolor="#f1f5f9" style="background-color: #f1f5f9; color: #475569; padding: 6px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; font-family: 'Outfit', 'Inter', Arial, sans-serif; line-height: 100%;">
                    ❤️ 48 LIKES
                </td>
            </tr>
        </table>
        """
        html = build_premium_email_html(
            title="Most Liked Post on the Forum!",
            preheader="A post has become the top-liked post in the last 48 hours.",
            hero_icon="🏆",
            header_color="linear-gradient(135deg, #eab308 0%, #ca8a04 100%)",
            content_html=content,
            action_url="http://localhost:3000/forum",
            action_text="View Top Post"
        )
    else:
        html = "<h2>Preview not found</h2>"
    return HTMLResponse(content=html)


if __name__ == '__main__':
    import uvicorn
    # Default host and port settings
    uvicorn.run(app, host='0.0.0.0', port=3000)
