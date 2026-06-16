import os
import sqlite3
import uuid
import json
import datetime
import bcrypt

DATABASE_PATH = os.getenv('DATABASE_PATH', './data/app.db')

def get_db_connection():
    # Make sure parent directory exists
    dir_name = os.path.dirname(DATABASE_PATH)
    if dir_name and not os.path.exists(dir_name):
        os.makedirs(dir_name)
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(10)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def check_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            roles TEXT NOT NULL DEFAULT '["employee"]',
            department TEXT NOT NULL,
            avatar_url TEXT,
            points_balance INTEGER NOT NULL DEFAULT 0,
            login_dates TEXT DEFAULT '[]',
            status TEXT NOT NULL DEFAULT 'approved',
            created_at TEXT NOT NULL
        )
    ''')

    # 2. Surveys
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS surveys (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            deadline TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active',
            created_by TEXT NOT NULL,
            questions TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    # 3. Survey Responses
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS survey_responses (
            id TEXT PRIMARY KEY,
            survey_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            answers TEXT NOT NULL DEFAULT '[]',
            submitted_at TEXT NOT NULL,
            UNIQUE(survey_id, user_id)
        )
    ''')

    # 4. Posts
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY,
            author_id TEXT NOT NULL,
            content TEXT NOT NULL,
            image_url TEXT,
            is_pinned INTEGER NOT NULL DEFAULT 0,
            trending_notified INTEGER NOT NULL DEFAULT 0,
            most_liked_notified INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    # 5. Hashtags
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS hashtags (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            post_count INTEGER NOT NULL DEFAULT 0
        )
    ''')

    # 6. Post Hashtags
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS post_hashtags (
            post_id TEXT NOT NULL,
            hashtag_id TEXT NOT NULL,
            PRIMARY KEY(post_id, hashtag_id)
        )
    ''')

    # 7. Post Likes
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS post_likes (
            post_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            PRIMARY KEY(post_id, user_id)
        )
    ''')

    # 8. Comments
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            post_id TEXT NOT NULL,
            author_id TEXT NOT NULL,
            parent_id TEXT,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')

    # 9. Concerns
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS concerns (
            id TEXT PRIMARY KEY,
            reference_id TEXT NOT NULL UNIQUE,
            category TEXT NOT NULL,
            severity TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            attachment_url TEXT,
            incident_date TEXT,
            status TEXT NOT NULL DEFAULT 'Open',
            submitter_id TEXT,
            assignee_id TEXT,
            admin_notes TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    # 10. Concern Audit Log
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS concern_audit_log (
            id TEXT PRIMARY KEY,
            concern_id TEXT NOT NULL,
            changed_by TEXT NOT NULL,
            old_status TEXT NOT NULL,
            new_status TEXT NOT NULL,
            note TEXT,
            changed_at TEXT NOT NULL
        )
    ''')

    # 11. Recognitions
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recognitions (
            id TEXT PRIMARY KEY,
            sender_id TEXT NOT NULL,
            recipient_id TEXT NOT NULL,
            badge TEXT NOT NULL,
            message TEXT NOT NULL,
            attachment_url TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    # 12. Recognition Likes
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recognition_likes (
            recognition_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            PRIMARY KEY(recognition_id, user_id)
        )
    ''')

    # 13. Recognition Comments
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS recognition_comments (
            id TEXT PRIMARY KEY,
            recognition_id TEXT NOT NULL,
            author_id TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')

    # 14. Points Log
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS points_log (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            activity TEXT NOT NULL,
            delta INTEGER NOT NULL,
            balance_after INTEGER NOT NULL,
            ref_id TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    # 15. Redemption Requests
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS redemption_requests (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            reward_type TEXT NOT NULL,
            points_cost INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            admin_note TEXT,
            created_at TEXT NOT NULL
        )
    ''')

    # Migration: Add trending_notified column to posts if not exists
    try:
        cursor.execute("ALTER TABLE posts ADD COLUMN trending_notified INTEGER NOT NULL DEFAULT 0")
    except sqlite3.OperationalError:
        pass

    # Migration: Add most_liked_notified column to posts if not exists
    try:
        cursor.execute("ALTER TABLE posts ADD COLUMN most_liked_notified INTEGER NOT NULL DEFAULT 0")
    except sqlite3.OperationalError:
        pass

    conn.commit()

    # Seed check
    cursor.execute("SELECT count(*) as count FROM users")
    row = cursor.fetchone()
    if row and row['count'] > 0:
        conn.close()
        return

    # Seed DB
    print("Seeding database...")
    password_hash = hash_password("Password123!")
    now_str = datetime.datetime.utcnow().isoformat() + "Z"

    # Insert Users
    users_data = [
        # Admin
        { 'id': str(uuid.uuid4()), 'name': 'System Administrator', 'email': 'admin@company.com', 'role': 'admin', 'roles': '["employee", "admin"]', 'department': 'Operations', 'points_balance': 200 },
        { 'id': str(uuid.uuid4()), 'name': 'Marcus Chen', 'email': 'hr@company.com', 'role': 'admin', 'roles': '["employee", "admin"]', 'department': 'People & Culture', 'points_balance': 120 },
        { 'id': str(uuid.uuid4()), 'name': 'Amina Diop', 'email': 'hr2@company.com', 'role': 'admin', 'roles': '["employee", "admin"]', 'department': 'People & Culture', 'points_balance': 150 },
        # Employees
        { 'id': str(uuid.uuid4()), 'name': 'Rahul Naik', 'email': 'rahul@company.com', 'role': 'employee', 'roles': '["employee", "admin"]', 'department': 'Engineering', 'points_balance': 145 },
        { 'id': str(uuid.uuid4()), 'name': 'Elena Rostova', 'email': 'elena@company.com', 'role': 'employee', 'roles': '["employee"]', 'department': 'Design', 'points_balance': 210 },
        { 'id': str(uuid.uuid4()), 'name': 'David Kim', 'email': 'david@company.com', 'role': 'employee', 'roles': '["employee"]', 'department': 'Product', 'points_balance': 110 },
        { 'id': str(uuid.uuid4()), 'name': 'Sarah Jenkins', 'email': 'sarah@company.com', 'role': 'employee', 'roles': '["employee"]', 'department': 'Marketing', 'points_balance': 180 },
        { 'id': str(uuid.uuid4()), 'name': 'John Doe', 'email': 'john@company.com', 'role': 'employee', 'roles': '["employee"]', 'department': 'Engineering', 'points_balance': 80 },
        { 'id': str(uuid.uuid4()), 'name': 'Jane Smith', 'email': 'jane@company.com', 'role': 'employee', 'roles': '["employee"]', 'department': 'Engineering', 'points_balance': 95 },
        { 'id': str(uuid.uuid4()), 'name': 'Bob Johnson', 'email': 'bob@company.com', 'role': 'employee', 'roles': '["employee"]', 'department': 'Sales', 'points_balance': 60 },
        { 'id': str(uuid.uuid4()), 'name': 'Alice Williams', 'email': 'alice@company.com', 'role': 'employee', 'roles': '["employee"]', 'department': 'Sales', 'points_balance': 75 },
        { 'id': str(uuid.uuid4()), 'name': 'Charlie Brown', 'email': 'charlie@company.com', 'role': 'employee', 'roles': '["employee"]', 'department': 'Support', 'points_balance': 90 },
        { 'id': str(uuid.uuid4()), 'name': 'Diana Prince', 'email': 'diana@company.com', 'role': 'employee', 'roles': '["employee"]', 'department': 'Legal', 'points_balance': 140 },
    ]

    for u in users_data:
        cursor.execute('''
            INSERT INTO users (id, name, email, password_hash, role, roles, department, points_balance, created_at, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')
        ''', (u['id'], u['name'], u['email'], password_hash, u['role'], u['roles'], u['department'], u['points_balance'], now_str))

    # Get some reference users
    conn.commit()
    
    # Reload user IDs
    cursor.execute("SELECT id, email, role FROM users")
    db_users = {r['email']: r['id'] for r in cursor.fetchall()}
    
    admin_id = db_users['admin@company.com']
    hr_id = db_users['hr@company.com']
    rahul_id = db_users['rahul@company.com']
    elena_id = db_users['elena@company.com']
    david_id = db_users['david@company.com']
    sarah_id = db_users['sarah@company.com']
    jane_id = db_users['jane@company.com']
    charlie_id = db_users['charlie@company.com']
    diana_id = db_users['diana@company.com']
    john_id = db_users['john@company.com']
    bob_id = db_users['bob@company.com']

    # 4. Create Surveys
    surveys_data = [
        {
            'id': str(uuid.uuid4()),
            'title': 'Q3 Workplace Wellbeing & Health Check',
            'description': 'Help us understand your current work-life balance, mental wellness, and physical comfort at the office or remote setups.',
            'deadline': (datetime.datetime.utcnow() + datetime.timedelta(days=5)).isoformat() + "Z",
            'status': 'active',
            'created_by': hr_id,
            'questions': json.dumps([
                { 'id': 'q1', 'type': 'rating', 'text': 'How would you rate your overall work-life balance this quarter?', 'required': True },
                { 'id': 'q2', 'type': 'radio', 'text': 'Which workspace arrangement best describes your current setup?', 'required': True, 'options': ['Fully Remote', 'Hybrid (1-2 days in office)', 'Hybrid (3-4 days in office)', 'Fully In-Office'] },
                { 'id': 'q3', 'type': 'checkbox', 'text': 'Which wellness challenges have you experienced recently? (Select all that apply)', 'required': False, 'options': ['Digital fatigue', 'Physical discomfort/poor ergonomics', 'Lack of social connection', 'Workload pressure', 'None'] },
                { 'id': 'q4', 'type': 'long_text', 'text': 'Do you have any suggestions on how we can improve support for mental and physical wellbeing?', 'required': False },
            ])
        },
        {
            'id': str(uuid.uuid4()),
            'title': 'Hybrid Work Culture Feedback',
            'description': 'Quick check-in regarding our new hybrid scheduling framework and team alignment.',
            'deadline': (datetime.datetime.utcnow() + datetime.timedelta(days=15)).isoformat() + "Z",
            'status': 'active',
            'created_by': hr_id,
            'questions': json.dumps([
                { 'id': 'sq1', 'type': 'yes_no', 'text': 'Do you feel productive working under the current hybrid framework?', 'required': True },
                { 'id': 'sq2', 'type': 'rating', 'text': 'How would you rate communication and collaboration within your hybrid team?', 'required': True },
                { 'id': 'sq3', 'type': 'short_text', 'text': 'What is the biggest blocker you face in your hybrid setup?', 'required': False },
                { 'id': 'sq4', 'type': 'radio', 'text': 'How many days per week would be your ideal office presence?', 'required': False, 'options': ['0 days', '1-2 days', '3-4 days', '5 days'] },
            ])
        },
        {
            'id': str(uuid.uuid4()),
            'title': 'Office Ergonomics Assessment',
            'description': 'Evaluating chair comfort, desk heights, and monitor setup across our physical locations.',
            'deadline': (datetime.datetime.utcnow() - datetime.timedelta(days=4)).isoformat() + "Z",
            'status': 'expired',
            'created_by': hr_id,
            'questions': json.dumps([
                { 'id': 'eq1', 'type': 'rating', 'text': 'How comfortable is your office desk and chair setup?', 'required': True },
                { 'id': 'eq2', 'type': 'yes_no', 'text': 'Have you experienced any physical pain or strain due to your workplace ergonomics?', 'required': True },
                { 'id': 'eq3', 'type': 'checkbox', 'text': 'Which ergonomic enhancements do you need? (Select all that apply)', 'required': False, 'options': ['Keyboard wrist rest', 'Vertical mouse', 'Monitor riser arm', 'Ergonomic chair tuning', 'None'] },
                { 'id': 'eq4', 'type': 'long_text', 'text': 'Please detail any specific physical setup discomfort you are experiencing.', 'required': False },
            ])
        }
    ]

    for s in surveys_data:
        cursor.execute('''
            INSERT INTO surveys (id, title, description, deadline, status, created_by, questions, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (s['id'], s['title'], s['description'], s['deadline'], s['status'], s['created_by'], s['questions'], now_str, now_str))

    # Submit response for rahul to second survey (completed)
    cursor.execute('''
        INSERT INTO survey_responses (id, survey_id, user_id, answers, submitted_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (str(uuid.uuid4()), surveys_data[1]['id'], rahul_id, json.dumps({ 'sq1': True, 'sq2': 4, 'sq3': 'None' }), now_str))

    # 5. Create Forum Posts
    posts_data = [
        { 'id': str(uuid.uuid4()), 'author_id': elena_id, 'content': 'Just wrapping up a huge session redesigning our employee onboarding portals! Focused extensively on micro-interactions and high accessibility. Would love any feedback on the dashboard navigation when it rolls out next week. Happy Friday team! 🚀✨', 'tags': ['#design', '#onboarding', '#ux', '#fridayvibes'], 'is_pinned': 1 },
        { 'id': str(uuid.uuid4()), 'author_id': david_id, 'content': 'Had a wonderful lunch chat today with our engineering leads about balancing velocity and code health. It is so important to set realistic sprint goals to avoid developer burnout. Mental wellbeing needs to be built into our actual operational processes, not just an afterthought!', 'tags': ['#wellbeing', '#agile', '#burnout', '#engineering'], 'is_pinned': 0 },
        { 'id': str(uuid.uuid4()), 'author_id': hr_id, 'content': 'Friendly reminder that our Q3 Wellbeing surveys are now active! Completing them gets you 20 Konnect points which you can redeem for 1:1 sessions with managers or mentorship meetings. Make your voice heard!', 'tags': ['#culture', '#wellbeing', '#feedback'], 'is_pinned': 0 },
        { 'id': str(uuid.uuid4()), 'author_id': sarah_id, 'content': 'Loving the hybrid work flexibility. Being able to skip the morning commute twice a week has done wonders for my sleep and daily routine.', 'tags': ['#hybrid', '#wellbeing', '#productivity'], 'is_pinned': 0 },
        { 'id': str(uuid.uuid4()), 'author_id': jane_id, 'content': 'Are there any plans to do a corporate yoga or meditation group session? I think it would be a nice break for teams.', 'tags': ['#yoga', '#health', '#mindfulness'], 'is_pinned': 0 },
        { 'id': str(uuid.uuid4()), 'author_id': charlie_id, 'content': 'Shoutout to the support team for closing out a massive backlog this week under heavy volume. You guys are heroes!', 'tags': ['#support', '#teamwork', '#shoutout'], 'is_pinned': 0 },
        { 'id': str(uuid.uuid4()), 'author_id': rahul_id, 'content': 'Tips for reducing screen strain: follow the 20-20-20 rule. Every 20 minutes, look at something 20 feet away for 20 seconds. It works!', 'tags': ['#ergonomics', '#health', '#screenstrain'], 'is_pinned': 0 },
        { 'id': str(uuid.uuid4()), 'author_id': diana_id, 'content': 'Can we setup a hashtag for sharing healthy lunch recipes? Healthy eating has such a huge impact on our concentration.', 'tags': ['#nutrition', '#health', '#lunch'], 'is_pinned': 0 },
        { 'id': str(uuid.uuid4()), 'author_id': john_id, 'content': 'Really appreciate our new management transparency around company goals. It makes planning sprints so much clearer.', 'tags': ['#culture', '#management', '#alignment'], 'is_pinned': 0 },
        { 'id': str(uuid.uuid4()), 'author_id': bob_id, 'content': 'Is anyone up for a weekend hiking trip? Thinking about doing the local park trails next Saturday.', 'tags': ['#fitness', '#social', '#hiking'], 'is_pinned': 0 },
        { 'id': str(uuid.uuid4()), 'author_id': hr_id, 'content': 'Make sure your chairs are at the right height. Knees should be at a 90 degree angle and feet flat on the floor.', 'tags': ['#ergonomics', '#wellness'], 'is_pinned': 0 },
        { 'id': str(uuid.uuid4()), 'author_id': elena_id, 'content': 'We should implement a no-meeting Friday policy to give everyone focus blocks.', 'tags': ['#focus', '#productivity', '#burnout'], 'is_pinned': 0 },
        { 'id': str(uuid.uuid4()), 'author_id': rahul_id, 'content': 'Had an amazing mentorship discussion with Marcus today. Highly suggest redeeming points for career chats.', 'tags': ['#mentorship', '#konnect', '#career'], 'is_pinned': 0 },
        { 'id': str(uuid.uuid4()), 'author_id': admin_id, 'content': 'Our team is growing! Excited to welcome three new developers joining next Monday.', 'tags': ['#growth', '#engineering', '#hiring'], 'is_pinned': 0 },
        { 'id': str(uuid.uuid4()), 'author_id': admin_id, 'content': 'Reminder: The office gym has new lockers and showers open for use. Fit wellness into your day!', 'tags': ['#fitness', '#office', '#wellness'], 'is_pinned': 0 },
    ]

    for p in posts_data:
        cursor.execute('''
            INSERT INTO posts (id, author_id, content, is_pinned, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (p['id'], p['author_id'], p['content'], p['is_pinned'], now_str, now_str))

        # Insert Hashtags & Joins
        for tag_name in p['tags']:
            # Find or insert hashtag
            cursor.execute("SELECT id, post_count FROM hashtags WHERE name = ?", (tag_name,))
            tag_row = cursor.fetchone()
            if not tag_row:
                hashtag_id = str(uuid.uuid4())
                cursor.execute("INSERT INTO hashtags (id, name, post_count) VALUES (?, ?, 1)", (hashtag_id, tag_name))
            else:
                hashtag_id = tag_row['id']
                cursor.execute("UPDATE hashtags SET post_count = ? WHERE id = ?", (tag_row['post_count'] + 1, hashtag_id))

            cursor.execute("INSERT OR IGNORE INTO post_hashtags (post_id, hashtag_id) VALUES (?, ?)", (p['id'], hashtag_id))

    # Add comments to the first post
    first_post_id = posts_data[0]['id']
    cursor.execute('''
        INSERT INTO comments (id, post_id, author_id, parent_id, content, created_at)
        VALUES (?, ?, ?, NULL, ?, ?)
    ''', (str(uuid.uuid4()), first_post_id, rahul_id, 'Looks awesome Elena! Can’t wait to play around with the new navigation. The accessibility improvements are highly appreciated.', now_str))

    # 6. Create Peer Recognitions
    recognitions_data = [
        { 'sender': elena_id, 'recipient': rahul_id, 'badge': 'ProblemSolver', 'message': 'A huge shout-out to Rahul for helping me debug a massive hydration issue on the Next.js pages late last night. He walked me through the server/client boundaries and solved it in 20 minutes. Total lifesaver! 🎯🙌' },
        { 'sender': rahul_id, 'recipient': hr_id, 'badge': 'Teamwork', 'message': 'Thanks Marcus for organizing the team wellness workshop this Wednesday. It was really grounding to take a step back from coding and talk about stress management tools with everyone. Super appreciate your effort!' },
        { 'sender': db_users['hr2@company.com'], 'recipient': elena_id, 'badge': 'Excellence', 'message': 'Elena consistently raises the bar with her design mocks. The feedback system UI is incredibly clean, intuitive, and beautiful. Thank you for always executing with absolute excellence! 🏆' },
        { 'sender': rahul_id, 'recipient': david_id, 'badge': 'Innovation', 'message': 'David brought up a fantastic suggestion for scheduling sprint checkins that avoids fatigue. Thanks for the innovation!' },
        { 'sender': elena_id, 'recipient': sarah_id, 'badge': 'AboveAndBeyond', 'message': 'Sarah took over two of my presentation tasks when I had a dental appointment. Really went above and beyond, thank you!' },
        { 'sender': admin_id, 'recipient': hr_id, 'badge': 'Leadership', 'message': 'Marcus did an exceptional job scaling the people onboarding process. Led the team with empathy.' },
        { 'sender': jane_id, 'recipient': rahul_id, 'badge': 'Teamwork', 'message': 'Rahul helped me set up my local database script and lint rules. Extremely patient and helpful.' },
        { 'sender': charlie_id, 'recipient': elena_id, 'badge': 'ProblemSolver', 'message': 'Elena solved the grid layout bug that was shifting items on mobile viewports. Lifesaver!' },
        { 'sender': bob_id, 'recipient': admin_id, 'badge': 'Excellence', 'message': 'Thanks admin for resolving the office desk allocations. The double monitor setup is perfect.' },
        { 'sender': rahul_id, 'recipient': charlie_id, 'badge': 'Teamwork', 'message': 'Charlie helped wrap up support docs for our clients. Exceptional teamwork.' },
    ]

    for r in recognitions_data:
        cursor.execute('''
            INSERT INTO recognitions (id, sender_id, recipient_id, badge, message, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (str(uuid.uuid4()), r['sender'], r['recipient'], r['badge'], r['message'], now_str))

    # 7. Create Anonymous Concerns
    concerns_data = [
        { 'reference_id': '8fbd0291-a1dc-4921-965a-8b8398e090f7', 'category': 'Workload', 'severity': 'High', 'title': 'Severe burnout in Engineering Team C', 'description': 'Sprint planning commitments have doubled over the last three cycles without any team capacity changes. Several members are working over weekends and late nights to hit artificial deadlines, leading to severe fatigue and negative sentiments.', 'status': 'In Progress', 'assignee_id': hr_id, 'admin_notes': 'Spoke with Team C lead regarding sprint loads. Investigating capacity allocations and potential delivery date postponements.' },
        { 'reference_id': '2e7208d1-d2ab-4720-994b-4b2a60ceefb3', 'category': 'Environment', 'severity': 'Medium', 'title': 'Air conditioning issues on Floor 3 West Wing', 'description': 'The air conditioning in the West Wing of Floor 3 is malfunctioning. It gets extremely cold in the afternoons, making it hard to sit and focus. Several teammates have complained.', 'status': 'Open', 'assignee_id': None, 'admin_notes': '' },
        { 'reference_id': 'd603a11b-fa2e-4b28-ba20-22c3e1e44f80', 'category': 'Management', 'severity': 'Critical', 'title': 'Retaliatory behavior from supervisor', 'description': 'After bringing up scheduling conflicts due to family requirements, my direct supervisor began excluding me from project planning threads and removed two of my critical clients. I feel my career growth is being actively harmed for requesting hybrid accommodation.', 'status': 'Unaddressed', 'assignee_id': None, 'admin_notes': 'Critical case. Needs direct HR escalation and investigation.' },
        { 'reference_id': '6b2a09c2-55fa-44e2-a09c-e58f0cb18a4a', 'category': 'Policy', 'severity': 'Low', 'title': 'Lack of clarity in work-from-anywhere policy', 'description': 'We are told we can work from anywhere for up to 30 days a year, but the process to request it is not defined anywhere in the HR portal. Can we document this explicitly?', 'status': 'Resolved', 'assignee_id': hr_id, 'admin_notes': 'Policy guide published on internal Wiki page on June 2nd. Closed ticket.' },
        { 'reference_id': 'ef9b0d12-1d54-472a-96df-00c8f12a970e', 'category': 'Harassment', 'severity': 'Critical', 'title': 'Bullying in daily slack calls', 'description': 'One engineer has made multiple derogatory remarks regarding my accents during daily syncs. It has happened thrice, and other teammates noticed but nobody commented.', 'status': 'Open', 'assignee_id': hr_id, 'admin_notes': 'Interviewing ticket owner when they reach out. Setting meetings with Slack channels team lead.' },
    ]

    for c in concerns_data:
        cursor.execute('''
            INSERT INTO concerns (id, reference_id, category, severity, title, description, status, assignee_id, admin_notes, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (str(uuid.uuid4()), c['reference_id'], c['category'], c['severity'], c['title'], c['description'], c['status'], c['assignee_id'], c['admin_notes'], now_str, now_str))

    # 8. Create Points Logs for default users
    for u in users_data:
        cursor.execute('''
            INSERT INTO points_log (id, user_id, activity, delta, balance_after, ref_id, created_at)
            VALUES (?, ?, ?, ?, ?, NULL, ?)
        ''', (str(uuid.uuid4()), u['id'], 'Initial Profile Seeding Points', u['points_balance'], u['points_balance'], now_str))

    conn.commit()
    conn.close()
    print("Database seeding completed.")

if __name__ == '__main__':
    init_db()
