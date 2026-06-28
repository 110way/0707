import unittest
import os
import tempfile
import sqlite3
import json

# Setup temporary environment variables for testing
os.environ['DATABASE_PATH'] = './data/test_app.db'
os.environ['JWT_SECRET'] = 'test_secret_string_key_longer_than_32_characters_long_for_hs256'

import database
import app

class TestEmployeeWellbeing(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Remove test database if exists
        if os.path.exists('./data/test_app.db'):
            os.remove('./data/test_app.db')
        
        # Initialize DB and seed mock data for testing
        database.init_db()
        database.seed_db()

    @classmethod
    def tearDownClass(cls):
        # Remove test database
        if os.path.exists('./data/test_app.db'):
            try:
                os.remove('./data/test_app.db')
            except Exception:
                pass
        # Also check parent directory
        if os.path.exists('./data'):
            try:
                os.rmdir('./data')
            except Exception:
                pass

    def setUp(self):
        from fastapi.testclient import TestClient
        self.app = TestClient(app.app)
        self.app.cookies.clear()

    def test_database_seeding(self):
        # Check if tables exist and are populated
        conn = database.get_db_connection()
        user_row = conn.execute("SELECT count(*) as count FROM users").fetchone()
        survey_row = conn.execute("SELECT count(*) as count FROM surveys").fetchone()
        post_row = conn.execute("SELECT count(*) as count FROM posts").fetchone()
        
        self.assertGreater(user_row['count'], 0)
        self.assertGreater(survey_row['count'], 0)
        self.assertGreater(post_row['count'], 0)
        
        # Verify specific seeded users
        rahul = conn.execute("SELECT * FROM users WHERE email = 'rahul@company.com'").fetchone()
        self.assertIsNotNone(rahul)
        self.assertEqual(rahul['role'], 'employee')
        
        admin = conn.execute("SELECT * FROM users WHERE email = 'admin@company.com'").fetchone()
        self.assertIsNotNone(admin)
        self.assertEqual(admin['role'], 'admin')
        
        conn.close()

    def test_password_hashing(self):
        pwd = "MySecretPassword123!"
        hashed = database.hash_password(pwd)
        self.assertTrue(database.check_password(pwd, hashed))
        self.assertFalse(database.check_password("wrong_password", hashed))

    def test_public_endpoints(self):
        # Login page is public
        response = self.app.get('/login')
        self.assertEqual(response.status_code, 200)

        # Public stats endpoint
        response = self.app.get('/api/public-stats')
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn('data', data)
        self.assertIn('activeSurveys', data['data'])

    def test_unauthorized_endpoints(self):
        # Homepage requires login, should redirect to login page (302)
        response = self.app.get('/', follow_redirects=False)

        self.assertEqual(response.status_code, 302)
        self.assertIn('/login', response.headers.get('location', ''))

        # API calls accept JSON, should return 401
        response = self.app.get('/api/surveys', headers={'Accept': 'application/json'})
        self.assertEqual(response.status_code, 401)

    def test_auth_login_flow(self):
        # Invalid login
        response = self.app.post('/api/auth/login', 
                                 json={'email': 'rahul@company.com', 'password': 'wrong'})
        self.assertEqual(response.status_code, 401)

        # Valid login
        response = self.app.post('/api/auth/login', 
                                 json={'email': 'rahul@company.com', 'password': 'Password123!'})
        self.assertEqual(response.status_code, 200)
        has_token_cookie = 'token' in response.cookies
        self.assertTrue(has_token_cookie)

    def test_auth_register_password_complexity(self):
        # 1. Short password (< 8 chars)
        response = self.app.post('/api/auth/register', json={
            'name': 'Test User', 'email': 'testuser@company.com', 'password': 'P1!'
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('must be at least 8 characters', response.json()['error'])

        # 2. Missing uppercase
        response = self.app.post('/api/auth/register', json={
            'name': 'Test User', 'email': 'testuser@company.com', 'password': 'password123!'
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('uppercase', response.json()['error'])

        # 3. Missing lowercase
        response = self.app.post('/api/auth/register', json={
            'name': 'Test User', 'email': 'testuser@company.com', 'password': 'PASSWORD123!'
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('lowercase', response.json()['error'])

        # 4. Missing number
        response = self.app.post('/api/auth/register', json={
            'name': 'Test User', 'email': 'testuser@company.com', 'password': 'Password!'
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('number', response.json()['error'])

        # 5. Missing special character
        response = self.app.post('/api/auth/register', json={
            'name': 'Test User', 'email': 'testuser@company.com', 'password': 'Password123'
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('special character', response.json()['error'])

        # 6. Valid password
        response = self.app.post('/api/auth/register', json={
            'name': 'Test User', 'email': 'newtestuser@company.com', 'password': 'Password123!'
        })
        self.assertEqual(response.status_code, 201)

    def test_declined_user_cannot_login(self):
        import datetime
        import jwt
        # 1. Register a new user
        reg_res = self.app.post('/api/auth/register', json={
            'name': 'Declined Test User', 'email': 'declined_user@company.com', 'password': 'Password123!'
        })
        self.assertEqual(reg_res.status_code, 201)
        user_id = reg_res.json()['data']['id']

        # 2. Login as admin to decline them
        self.app.post('/api/auth/login', json={'email': 'admin@company.com', 'password': 'Password123!'})
        
        # Decline user
        dec_res = self.app.patch(f'/api/admin/users/{user_id}', json={'status': 'declined'})
        self.assertEqual(dec_res.status_code, 200)

        # 3. Attempt login as the declined user
        login_res = self.app.post('/api/auth/login', json={'email': 'declined_user@company.com', 'password': 'Password123!'})
        self.assertEqual(login_res.status_code, 403)
        self.assertIn('declined', login_res.json()['error'].lower())

        # 4. Attempt to access homepage using a manual token for a declined user
        payload = {
            'id': user_id,
            'email': 'declined_user@company.com',
            'role': 'employee',
            'department': 'Engineering',
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
        }
        token = jwt.encode(payload, app.SECRET_KEY, algorithm='HS256')
        
        self.app.cookies.set('token', token)
        home_res = self.app.get('/', follow_redirects=False)
        self.assertEqual(home_res.status_code, 302) # Redirects to login page


    def test_email_notifications(self):
        # 1. Test Admin Custom Email Trigger
        # Log in as admin
        admin_login = self.app.post('/api/auth/login', json={'email': 'admin@company.com', 'password': 'Password123!'})
        self.assertEqual(admin_login.status_code, 200)

        # Clear any existing log file
        log_path = './data/sent_emails.log'
        if os.path.exists(log_path):
            try:
                os.remove(log_path)
            except Exception:
                pass

        # Fetch some user ID to email (e.g., rahul)
        conn = database.get_db_connection()
        rahul_user = conn.execute("SELECT id FROM users WHERE email = 'rahul@company.com'").fetchone()
        conn.close()

        # Send custom email
        payload = {
            'userId': rahul_user['id'],
            'subject': 'Hello Rahul',
            'message': 'This is a test notification.'
        }
        res = self.app.post('/api/admin/send-email', json=payload)
        self.assertEqual(res.status_code, 200)
        self.assertIn('queued successfully', res.json()['message'])

        # Check local log file
        self.assertTrue(os.path.exists(log_path))
        with open(log_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        self.assertEqual(len(lines), 1)
        log_entry = json.loads(lines[0])
        self.assertEqual(log_entry['subject'], 'Hello Rahul')
        self.assertIn('rahul@company.com', log_entry['to'])

        # 2. Test New Survey Email Trigger
        survey_payload = {
            'title': 'Wellbeing Test Survey',
            'description': 'Description for survey test',
            'deadline': '2026-12-31T23:59:59Z',
            'questions': [{'id': 'q1', 'type': 'rating', 'text': 'How are you?', 'required': True}]
        }
        survey_res = self.app.post('/api/surveys', json=survey_payload)
        self.assertEqual(survey_res.status_code, 201)

        # Check log file again
        with open(log_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        self.assertGreaterEqual(len(lines), 2)
        survey_log = json.loads(lines[-1])
        self.assertIn('Wellbeing Test Survey', survey_log['subject'])

        # 3. Test Peer Recognition Email Trigger
        # Log in as rahul
        rahul_login = self.app.post('/api/auth/login', json={'email': 'rahul@company.com', 'password': 'Password123!'})
        self.assertEqual(rahul_login.status_code, 200)

        # Send recognition to admin
        conn = database.get_db_connection()
        admin_user = conn.execute("SELECT id FROM users WHERE email = 'admin@company.com'").fetchone()
        conn.close()

        recognition_payload = {
            'recipientId': admin_user['id'],
            'badge': 'Teamwork',
            'message': 'Thank you admin for the awesome support!'
        }
        recog_res = self.app.post('/api/recognitions', json=recognition_payload)
        self.assertEqual(recog_res.status_code, 201)

        # Check log file again
        with open(log_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        self.assertGreaterEqual(len(lines), 3)
        recog_log = json.loads(lines[-1])
        self.assertIn('Recognition from Rahul', recog_log['subject'])
        self.assertIn('admin@company.com', recog_log['to'])

        # 4. Test Post Trending Email Trigger
        # Create a post as rahul
        post_res = self.app.post('/api/posts', json={'content': 'My cool post #wellbeing #health'})
        self.assertEqual(post_res.status_code, 201)
        post_id = post_res.json()['data']['id']

        # Log in as elena and like the post (Unique user 1: Elena)
        self.app.post('/api/auth/login', json={'email': 'elena@company.com', 'password': 'Password123!'})
        self.app.post(f'/api/posts/{post_id}/like')

        # Log in as david and like the post (Unique user 2: David)
        self.app.post('/api/auth/login', json={'email': 'david@company.com', 'password': 'Password123!'})
        self.app.post(f'/api/posts/{post_id}/like')

        # Log in as hr and comment on the post (Unique user 3: HR)
        self.app.post('/api/auth/login', json={'email': 'hr@company.com', 'password': 'Password123!'})
        comment_res = self.app.post(f'/api/posts/{post_id}/comments', json={'content': 'Really nice point!'})
        self.assertEqual(comment_res.status_code, 201)

        # Check that unique user engagement triggered trending notification
        with open(log_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        # We expect trending notifications for the author and for all approved employees
        found_author = False
        found_all_users = False
        for line in lines:
            entry = json.loads(line)
            if "Congratulations! Your post is trending" in entry['subject']:
                found_author = True
                self.assertIn('rahul@company.com', entry['to'])
            if "Trending Topic: Check out what is hot" in entry['subject']:
                found_all_users = True

        self.assertTrue(found_author)
        self.assertTrue(found_all_users)

    def test_most_liked_post_email_trigger(self):
        # Log in as rahul
        rahul_login = self.app.post('/api/auth/login', json={'email': 'rahul@company.com', 'password': 'Password123!'})
        self.assertEqual(rahul_login.status_code, 200)

        # Clear database likes/notification flags to start with a clean slate
        conn = database.get_db_connection()
        conn.execute("DELETE FROM post_likes")
        conn.execute("UPDATE posts SET most_liked_notified = 0")
        conn.commit()
        conn.close()

        # Clear any existing log file
        log_path = './data/sent_emails.log'
        if os.path.exists(log_path):
            try:
                os.remove(log_path)
            except Exception:
                pass

        # Create a new post as rahul (this post is created now, so age is 0h, within 48h)
        post_res = self.app.post('/api/posts', json={'content': 'This is a brand new post that will be liked.'})
        self.assertEqual(post_res.status_code, 201)
        post_id = post_res.json()['data']['id']

        # Like the post as rahul (unique user 1)
        # Note: at this point, this post has 1 like, all other posts have 0 likes, so it becomes the most liked!
        like_res = self.app.post(f'/api/posts/{post_id}/like')
        self.assertEqual(like_res.status_code, 200)

        # Verify email is triggered
        self.assertTrue(os.path.exists(log_path))
        with open(log_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        self.assertGreaterEqual(len(lines), 1)
        
        found_most_liked_email = False
        for line in lines:
            entry = json.loads(line)
            if "Top Post on the Forum: Check out the most liked post!" in entry['subject']:
                found_most_liked_email = True
                
        self.assertTrue(found_most_liked_email)

        # Clear log file to check that subsequent likes don't trigger email again
        if os.path.exists(log_path):
            try:
                os.remove(log_path)
            except Exception:
                pass

        # Log in as elena and like the post (unique user 2)
        self.app.post('/api/auth/login', json={'email': 'elena@company.com', 'password': 'Password123!'})
        self.app.post(f'/api/posts/{post_id}/like')

        # Verify NO email is triggered now because most_liked_notified is already 1
        if os.path.exists(log_path):
            with open(log_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            for line in lines:
                entry = json.loads(line)
                self.assertNotEqual(entry['subject'], "Top Post on the Forum: Check out the most liked post!")

        # Test: a post older than 48 hours does not trigger the email
        import datetime
        old_time = (datetime.datetime.utcnow() - datetime.timedelta(days=3)).isoformat() + "Z"
        conn = database.get_db_connection()
        old_post_id = 'old-post-uuid-1234'
        # Insert old post with some user as author
        # First find a valid user_id
        user_row = conn.execute("SELECT id FROM users LIMIT 1").fetchone()
        self.assertIsNotNone(user_row)
        user_id = user_row['id']
        conn.execute("INSERT INTO posts (id, author_id, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?)", 
                     (old_post_id, user_id, 'An old post content', old_time, old_time))
        conn.commit()
        conn.close()

        # Log in as david and like this old post
        self.app.post('/api/auth/login', json={'email': 'david@company.com', 'password': 'Password123!'})
        
        # Clear log path
        if os.path.exists(log_path):
            try:
                os.remove(log_path)
            except Exception:
                pass

        self.app.post(f'/api/posts/{old_post_id}/like')
        
        # Verify NO email is triggered
        if os.path.exists(log_path):
            with open(log_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            for line in lines:
                entry = json.loads(line)
                self.assertNotEqual(entry['subject'], "Top Post on the Forum: Check out the most liked post!")

    def test_registration_approval_email_trigger(self):
        # Register a new user
        reg_res = self.app.post('/api/auth/register', json={
            'name': 'Approval Test User', 
            'email': 'approval_test_user@company.com', 
            'password': 'Password123!'
        })
        self.assertEqual(reg_res.status_code, 201)
        user_id = reg_res.json()['data']['id']

        # Log in as admin
        admin_login = self.app.post('/api/auth/login', json={'email': 'admin@company.com', 'password': 'Password123!'})
        self.assertEqual(admin_login.status_code, 200)

        # Clear any existing log file
        log_path = './data/sent_emails.log'
        if os.path.exists(log_path):
            try:
                os.remove(log_path)
            except Exception:
                pass

        # Approve the user
        app_res = self.app.patch(f'/api/admin/users/{user_id}', json={'status': 'approved'})
        self.assertEqual(app_res.status_code, 200)

        # Check log file to confirm registration approval email was triggered
        self.assertTrue(os.path.exists(log_path))
        with open(log_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        self.assertGreaterEqual(len(lines), 1)

        found_approval_email = False
        for line in lines:
            entry = json.loads(line)
            if "Your registration request has been approved!" in entry['subject']:
                found_approval_email = True
                self.assertIn('approval_test_user@company.com', entry['to'])

        self.assertTrue(found_approval_email)

    def test_engineering_hashtag_email_trigger(self):
        # 1. Log in as rahul
        self.app.post('/api/auth/login', json={'email': 'rahul@company.com', 'password': 'Password123!'})

        # Clear any existing log file
        log_path = './data/sent_emails.log'
        if os.path.exists(log_path):
            try:
                os.remove(log_path)
            except Exception:
                pass

        # 2. Post containing #engineering (case-insensitive check)
        payload = {'content': 'Let us talk about software #engineering best practices!'}
        res = self.app.post('/api/posts', json=payload)
        self.assertEqual(res.status_code, 201)

        # Verify email is triggered
        self.assertTrue(os.path.exists(log_path))
        with open(log_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        self.assertGreaterEqual(len(lines), 1)

        found_eng_email = False
        for line in lines:
            entry = json.loads(line)
            if "New Engineering Discussion" in entry['subject']:
                found_eng_email = True
                # It should email all approved users (e.g. admin@company.com)
                self.assertIn('admin@company.com', entry['to'])
                self.assertIn('rahul@company.com', entry['to'])

        self.assertTrue(found_eng_email)

        # Clear log file again
        if os.path.exists(log_path):
            try:
                os.remove(log_path)
            except Exception:
                pass

        # 3. Post not containing #engineering
        payload = {'content': 'Just a general post about something else #general'}
        res = self.app.post('/api/posts', json=payload)
        self.assertEqual(res.status_code, 201)

        # Verify no engineering email is triggered
        if os.path.exists(log_path):
            with open(log_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            for line in lines:
                entry = json.loads(line)
                self.assertNotIn("New Engineering Discussion", entry['subject'])

    def test_delete_survey_authorization(self):
        # 1. Create a survey as admin
        admin_login = self.app.post('/api/auth/login', json={'email': 'admin@company.com', 'password': 'Password123!'})
        self.assertEqual(admin_login.status_code, 200)

        survey_payload = {
            'title': 'Survey to Delete',
            'description': 'Deletion target survey',
            'deadline': '2026-12-31T23:59:59Z',
            'questions': [{'id': 'q1', 'type': 'yes_no', 'text': 'Delete this?', 'required': True}]
        }
        create_res = self.app.post('/api/surveys', json=survey_payload)
        self.assertEqual(create_res.status_code, 201)
        survey_id = create_res.json()['data']['id']

        # 2. Try to delete as non-admin user (rahul)
        rahul_login = self.app.post('/api/auth/login', json={'email': 'rahul@company.com', 'password': 'Password123!'})
        self.assertEqual(rahul_login.status_code, 200)
        
        delete_fail_res = self.app.delete(f'/api/surveys/{survey_id}')
        self.assertEqual(delete_fail_res.status_code, 403)

        # 3. Delete as admin
        admin_login = self.app.post('/api/auth/login', json={'email': 'admin@company.com', 'password': 'Password123!'})
        self.assertEqual(admin_login.status_code, 200)

        delete_success_res = self.app.delete(f'/api/surveys/{survey_id}')
        self.assertEqual(delete_success_res.status_code, 200)
        self.assertIn('deleted successfully', delete_success_res.json()['message'])

        # 4. Verify survey no longer exists (404 on repeat delete)
        delete_not_found = self.app.delete(f'/api/surveys/{survey_id}')
        self.assertEqual(delete_not_found.status_code, 404)

    def test_expired_survey_behavior(self):
        # 1. Create a survey with a past deadline
        admin_login = self.app.post('/api/auth/login', json={'email': 'admin@company.com', 'password': 'Password123!'})
        self.assertEqual(admin_login.status_code, 200)

        survey_payload = {
            'title': 'Expired Test Survey',
            'description': 'This survey is expired.',
            'deadline': '2020-01-01T00:00:00Z',
            'questions': [{'id': 'q1', 'type': 'yes_no', 'text': 'Are you okay?', 'required': True}]
        }
        create_res = self.app.post('/api/surveys', json=survey_payload)
        self.assertEqual(create_res.status_code, 201)
        survey_id = create_res.json()['data']['id']

        # 2. Try to submit response as rahul (should fail with 400 Bad Request)
        rahul_login = self.app.post('/api/auth/login', json={'email': 'rahul@company.com', 'password': 'Password123!'})
        self.assertEqual(rahul_login.status_code, 200)

        submit_res = self.app.post(f'/api/surveys/{survey_id}/submit', json={'answers': {'q1': True}})
        self.assertEqual(submit_res.status_code, 400)
        self.assertIn('expired', submit_res.json()['error'].lower())

        # 3. Check GET /api/surveys and verify 'isExpired' is True
        get_res = self.app.get('/api/surveys')
        self.assertEqual(get_res.status_code, 200)
        surveys = get_res.json()['data']
        expired_survey = next((s for s in surveys if s['id'] == survey_id), None)
        self.assertIsNotNone(expired_survey)
        self.assertTrue(expired_survey['isExpired'])

        # Clean up by deleting the survey
        admin_login = self.app.post('/api/auth/login', json={'email': 'admin@company.com', 'password': 'Password123!'})
        self.assertEqual(admin_login.status_code, 200)
        self.app.delete(f'/api/surveys/{survey_id}')

    def test_concern_email_notification(self):
        # 1. Login as rahul (employee)
        rahul_login = self.app.post('/api/auth/login', json={'email': 'rahul@company.com', 'password': 'Password123!'})
        self.assertEqual(rahul_login.status_code, 200)

        # 2. Submit a new concern
        log_path = './data/sent_emails.log'
        if os.path.exists(log_path):
            try:
                os.remove(log_path)
            except Exception:
                pass

        concern_payload = {
            'referenceId': 'test-ref-12345',
            'category': 'Workload',
            'severity': 'High',
            'title': 'Test Concern Title',
            'description': 'Test concern description text.',
            'incidentDate': '2026-06-21'
        }
        res = self.app.post('/api/concerns', json=concern_payload)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()['referenceId'], 'test-ref-12345')

        # 3. Check sent_emails.log
        self.assertTrue(os.path.exists(log_path))
        with open(log_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        
        found_concern_email = False
        for line in lines:
            entry = json.loads(line)
            if 'New Concern Raised' in entry['subject']:
                found_concern_email = True
                # It should email all admin/approved users (e.g. admin@company.com, hr@company.com, hr2@company.com)
                self.assertIn('admin@company.com', entry['to'])
                self.assertIn('hr@company.com', entry['to'])
                self.assertIn('hr2@company.com', entry['to'])
                # Description and Category should be in the body text/html
                self.assertIn('Test Concern Title', entry['body_html'])
                self.assertIn('test-ref-12345', entry['body_html'])
                self.assertIn('Workload', entry['body_html'])

        self.assertTrue(found_concern_email)

    def test_points_approval_flow(self):
        # 0. Clear previous email log if exists
        log_path = './data/sent_emails.log'
        if os.path.exists(log_path):
            try:
                os.remove(log_path)
            except Exception:
                pass

        # 1. Fetch admin user id and rahul user id from DB
        conn = database.get_db_connection()
        admin_row = conn.execute("SELECT id FROM users WHERE email = 'admin@company.com'").fetchone()
        rahul_row = conn.execute("SELECT id FROM users WHERE email = 'rahul@company.com'").fetchone()
        conn.close()
        
        self.assertIsNotNone(admin_row)
        self.assertIsNotNone(rahul_row)
        admin_id = admin_row['id']
        rahul_id = rahul_row['id']

        # 2. Login as Rahul (employee)
        rahul_login = self.app.post('/api/auth/login', json={'email': 'rahul@company.com', 'password': 'Password123!'})
        self.assertEqual(rahul_login.status_code, 200)

        # 3. Check initial balance
        balance_res = self.app.get('/api/konnect/balance')
        self.assertEqual(balance_res.status_code, 200)
        initial_balance = balance_res.json()['balance']
        initial_pending = balance_res.json()['pendingBalance']

        # 4. Create recognition (triggers pending points)
        rec_res = self.app.post('/api/recognitions', json={
            'recipientId': admin_id,
            'badge': 'Team Player',
            'message': 'Thank you for the guidance and mentoring!'
        })
        self.assertEqual(rec_res.status_code, 201)

        # 5. Check Rahul's balance again (pending should increase by 5, balance same)
        balance_res2 = self.app.get('/api/konnect/balance')
        self.assertEqual(balance_res2.status_code, 200)
        self.assertEqual(balance_res2.json()['balance'], initial_balance)
        self.assertEqual(balance_res2.json()['pendingBalance'], initial_pending + 5)

        # 6. Login as Admin
        admin_login = self.app.post('/api/auth/login', json={'email': 'admin@company.com', 'password': 'Password123!'})
        self.assertEqual(admin_login.status_code, 200)

        # 7. Get pending points list
        points_list_res = self.app.get('/api/admin/points?status=pending')
        self.assertEqual(points_list_res.status_code, 200)
        pending_requests = points_list_res.json()['data']
        
        # We should find two requests related to this recognition: one for rahul (sent recognition, +5), one for admin (received recognition, +10)
        rahul_req = next((r for r in pending_requests if r['user_id'] == rahul_id), None)
        admin_req = next((r for r in pending_requests if r['user_id'] == admin_id), None)
        
        self.assertIsNotNone(rahul_req)
        self.assertIsNotNone(admin_req)
        self.assertEqual(rahul_req['delta'], 5)
        self.assertEqual(admin_req['delta'], 10)

        # 8. Approve Rahul's request
        approve_res = self.app.patch(f"/api/admin/points/{rahul_req['id']}", json={
            'status': 'approved',
            'admin_notes': 'Great job sending feedback!'
        })
        self.assertEqual(approve_res.status_code, 200)

        # 9. Reject Admin's request
        reject_res = self.app.patch(f"/api/admin/points/{admin_req['id']}", json={
            'status': 'rejected',
            'admin_notes': 'Recognition to admin not approved'
        })
        self.assertEqual(reject_res.status_code, 200)

        # 10. Login back as Rahul to verify points updated
        rahul_login = self.app.post('/api/auth/login', json={'email': 'rahul@company.com', 'password': 'Password123!'})
        self.assertEqual(rahul_login.status_code, 200)

        balance_res3 = self.app.get('/api/konnect/balance')
        self.assertEqual(balance_res3.status_code, 200)
        self.assertEqual(balance_res3.json()['balance'], initial_balance + 5)
        self.assertEqual(balance_res3.json()['pendingBalance'], initial_pending)

        # 11. Verify points_log has the record for Rahul
        conn = database.get_db_connection()
        rahul_log = conn.execute("SELECT * FROM points_log WHERE user_id = ? AND ref_id = ?", (rahul_id, rahul_req['ref_id'])).fetchone()
        admin_log = conn.execute("SELECT * FROM points_log WHERE user_id = ? AND ref_id = ?", (admin_id, admin_req['ref_id'])).fetchone()
        conn.close()

        self.assertIsNotNone(rahul_log)
        self.assertEqual(rahul_log['delta'], 5)
        self.assertIsNone(admin_log)

        # 12. Verify email logs for point approval and point rejection
        self.assertTrue(os.path.exists(log_path))
        with open(log_path, 'r', encoding='utf-8') as f:
            email_lines = f.readlines()
        
        found_approved_email = False
        found_rejected_email = False
        
        for line in email_lines:
            entry = json.loads(line)
            if "Points Award Approved" in entry['subject']:
                found_approved_email = True
                self.assertIn('rahul@company.com', entry['to'])
                self.assertIn('Great job sending feedback!', entry['body_html'])
            elif "Points Award Rejected" in entry['subject']:
                found_rejected_email = True
                self.assertIn('admin@company.com', entry['to'])
                self.assertIn('Recognition to admin not approved', entry['body_html'])
                
        self.assertTrue(found_approved_email)
        self.assertTrue(found_rejected_email)

    def test_edit_post_authorization(self):
        # 1. Login as Rahul (employee)
        login_res = self.app.post('/api/auth/login', json={'email': 'rahul@company.com', 'password': 'Password123!'})
        self.assertEqual(login_res.status_code, 200)

        # 2. Create post with initial hashtags
        post_res = self.app.post('/api/posts', json={'content': 'Initial post content #tagone #tagtwo'})
        self.assertEqual(post_res.status_code, 201)
        post_id = post_res.json()['data']['id']

        # Verify hashtags in database have post_count >= 1
        conn = database.get_db_connection()
        t1 = conn.execute("SELECT post_count FROM hashtags WHERE name = '#tagone'").fetchone()
        t2 = conn.execute("SELECT post_count FROM hashtags WHERE name = '#tagtwo'").fetchone()
        self.assertIsNotNone(t1)
        self.assertIsNotNone(t2)
        initial_t1_count = t1['post_count']
        initial_t2_count = t2['post_count']
        conn.close()

        # 3. Edit post as Rahul (author)
        edit_res = self.app.patch(f'/api/posts/{post_id}', json={'content': 'Updated content #tagone #tagthree'})
        self.assertEqual(edit_res.status_code, 200)
        self.assertEqual(edit_res.json()['data']['content'], 'Updated content #tagone #tagthree')

        # Verify hashtags: #tagtwo post_count decremented, #tagthree created/incremented, #tagone remains
        conn = database.get_db_connection()
        t1_after = conn.execute("SELECT post_count FROM hashtags WHERE name = '#tagone'").fetchone()
        t2_after = conn.execute("SELECT post_count FROM hashtags WHERE name = '#tagtwo'").fetchone()
        t3_after = conn.execute("SELECT post_count FROM hashtags WHERE name = '#tagthree'").fetchone()
        
        self.assertEqual(t1_after['post_count'], initial_t1_count)
        self.assertEqual(t2_after['post_count'], initial_t2_count - 1)
        self.assertIsNotNone(t3_after)
        self.assertGreaterEqual(t3_after['post_count'], 1)
        conn.close()

        # 4. Login as Elena (another employee, not admin, not author)
        login_elena = self.app.post('/api/auth/login', json={'email': 'elena@company.com', 'password': 'Password123!'})
        self.assertEqual(login_elena.status_code, 200)

        # Try to edit Rahul's post
        forbidden_edit_res = self.app.patch(f'/api/posts/{post_id}', json={'content': 'Elena trying to hack'})
        self.assertEqual(forbidden_edit_res.status_code, 403)

        # 5. Login as Admin
        login_admin = self.app.post('/api/auth/login', json={'email': 'admin@company.com', 'password': 'Password123!'})
        self.assertEqual(login_admin.status_code, 200)

        # Edit Rahul's post as Admin
        admin_edit_res = self.app.patch(f'/api/posts/{post_id}', json={'content': 'Admin edited content #tagone'})
        self.assertEqual(admin_edit_res.status_code, 200)
        self.assertEqual(admin_edit_res.json()['data']['content'], 'Admin edited content #tagone')

    def test_concern_submission_rate_limit(self):
        # 1. Login as Rahul (employee)
        login_res = self.app.post('/api/auth/login', json={'email': 'rahul@company.com', 'password': 'Password123!'})
        self.assertEqual(login_res.status_code, 200)

        # Retrieve user id to clear their concerns if any exist initially (so tests are robust)
        conn = database.get_db_connection()
        user_row = conn.execute("SELECT id FROM users WHERE email = 'rahul@company.com'").fetchone()
        self.assertIsNotNone(user_row)
        rahul_id = user_row['id']
        conn.execute("DELETE FROM concerns WHERE submitter_id = ?", (rahul_id,))
        conn.commit()
        conn.close()

        # 2. Submit the first concern (with valid incident date)
        c1_payload = {
            'referenceId': 'test-ref-1',
            'category': 'Harassment',
            'severity': 'Low',
            'title': 'First Concern',
            'description': 'This is the first concern description.',
            'incidentDate': '2026-06-28'
        }
        res1 = self.app.post('/api/concerns', json=c1_payload)
        self.assertEqual(res1.status_code, 201)
        self.assertIn('referenceId', res1.json())

        # 3. Submit the second concern (with valid incident date)
        c2_payload = {
            'referenceId': 'test-ref-2',
            'category': 'Feedback',
            'severity': 'Medium',
            'title': 'Second Concern',
            'description': 'This is the second concern description.',
            'incidentDate': '2026-06-28'
        }
        res2 = self.app.post('/api/concerns', json=c2_payload)
        self.assertEqual(res2.status_code, 201)
        self.assertIn('referenceId', res2.json())

        # 4. Submit the third concern (should be blocked by rate limit)
        c3_payload = {
            'referenceId': 'test-ref-3',
            'category': 'Other',
            'severity': 'High',
            'title': 'Third Concern',
            'description': 'This is the third concern description.',
            'incidentDate': '2026-06-28'
        }
        res3 = self.app.post('/api/concerns', json=c3_payload)
        self.assertEqual(res3.status_code, 400)
        self.assertEqual(res3.json().get('error'), 'You can raise a maximum of 2 concerns in 24 hours.')

        # 5. Age the previous concerns to be older than 24 hours (e.g. 25 hours ago)
        conn = database.get_db_connection()
        import datetime
        twenty_five_hours_ago = (datetime.datetime.utcnow() - datetime.timedelta(hours=25)).isoformat() + "Z"
        conn.execute("UPDATE concerns SET created_at = ? WHERE submitter_id = ?", (twenty_five_hours_ago, rahul_id))
        conn.commit()
        conn.close()

        # 6. Retry submitting the third concern (should now succeed)
        res3_retry = self.app.post('/api/concerns', json=c3_payload)
        self.assertEqual(res3_retry.status_code, 201)
        self.assertIn('referenceId', res3_retry.json())

    def test_concern_submission_date_validation(self):
        # 1. Login as Rahul (employee)
        login_res = self.app.post('/api/auth/login', json={'email': 'rahul@company.com', 'password': 'Password123!'})
        self.assertEqual(login_res.status_code, 200)

        # Retrieve user id to clear their concerns initially
        conn = database.get_db_connection()
        user_row = conn.execute("SELECT id FROM users WHERE email = 'rahul@company.com'").fetchone()
        self.assertIsNotNone(user_row)
        rahul_id = user_row['id']
        conn.execute("DELETE FROM concerns WHERE submitter_id = ?", (rahul_id,))
        conn.commit()
        conn.close()

        # 2. Test missing incidentDate (should fail 400)
        payload_missing_date = {
            'referenceId': 'test-date-ref-1',
            'category': 'Harassment',
            'severity': 'Low',
            'title': 'Test Concern',
            'description': 'Description without date.'
        }
        res_missing = self.app.post('/api/concerns', json=payload_missing_date)
        self.assertEqual(res_missing.status_code, 400)
        self.assertEqual(res_missing.json().get('error'), 'Missing required fields.')

        # 3. Test future incidentDate (should fail 400)
        import datetime
        tomorrow_str = (datetime.datetime.utcnow().date() + datetime.timedelta(days=2)).strftime("%Y-%m-%d")
        payload_future_date = {
            'referenceId': 'test-date-ref-2',
            'category': 'Harassment',
            'severity': 'Low',
            'title': 'Test Concern',
            'description': 'Description with future date.',
            'incidentDate': tomorrow_str
        }
        res_future = self.app.post('/api/concerns', json=payload_future_date)
        self.assertEqual(res_future.status_code, 400)
        self.assertEqual(res_future.json().get('error'), 'Incident date cannot be in the future.')

        # 4. Test valid date (should succeed 201)
        today_str = datetime.datetime.utcnow().date().strftime("%Y-%m-%d")
        payload_valid = {
            'referenceId': 'test-date-ref-3',
            'category': 'Harassment',
            'severity': 'Low',
            'title': 'Test Concern',
            'description': 'Description with valid date.',
            'incidentDate': today_str
        }
        res_valid = self.app.post('/api/concerns', json=payload_valid)
        self.assertEqual(res_valid.status_code, 201)
        self.assertIn('referenceId', res_valid.json())


if __name__ == '__main__':
    unittest.main()

