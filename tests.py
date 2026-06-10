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


if __name__ == '__main__':
    unittest.main()

