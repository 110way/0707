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
        
        # Initialize DB
        database.init_db()

    @classmethod
    def tearDownClass(cls):
        # Remove test database
        if os.path.exists('./data/test_app.db'):
            os.remove('./data/test_app.db')
        # Also check parent directory
        if os.path.exists('./data'):
            try:
                os.rmdir('./data')
            except Exception:
                pass

    def setUp(self):
        from fastapi.testclient import TestClient
        self.app = TestClient(app.app)

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

        # 3. Test Kudos Recognition Email Trigger
        # Log in as rahul
        rahul_login = self.app.post('/api/auth/login', json={'email': 'rahul@company.com', 'password': 'Password123!'})
        self.assertEqual(rahul_login.status_code, 200)

        # Send kudos to admin
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
        self.assertIn('Kudos from Rahul', recog_log['subject'])
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


if __name__ == '__main__':
    unittest.main()

