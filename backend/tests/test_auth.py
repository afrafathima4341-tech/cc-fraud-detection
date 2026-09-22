import pytest
from backend.app import create_app, db
from backend.app.models import User


@pytest.fixture
def app():
    """Create test app."""
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


class TestAuthentication:
    """Test authentication endpoints."""

    def test_register_user(self, client):
        """Test user registration."""
        response = client.post('/api/auth/register', json={
            'email': 'test@example.com',
            'username': 'testuser',
            'password': 'SecurePass123'
        })
        assert response.status_code == 201
        data = response.get_json()
        assert 'access_token' in data
        assert data['user']['email'] == 'test@example.com'

    def test_register_duplicate_email(self, client):
        """Test registration with duplicate email."""
        client.post('/api/auth/register', json={
            'email': 'test@example.com',
            'username': 'testuser1',
            'password': 'SecurePass123'
        })
        response = client.post('/api/auth/register', json={
            'email': 'test@example.com',
            'username': 'testuser2',
            'password': 'SecurePass123'
        })
        assert response.status_code == 409

    def test_login(self, client):
        """Test user login."""
        client.post('/api/auth/register', json={
            'email': 'test@example.com',
            'username': 'testuser',
            'password': 'SecurePass123'
        })
        response = client.post('/api/auth/login', json={
            'email': 'test@example.com',
            'password': 'SecurePass123'
        })
        assert response.status_code == 200
        data = response.get_json()
        assert 'access_token' in data

    def test_login_invalid_password(self, client):
        """Test login with invalid password."""
        client.post('/api/auth/register', json={
            'email': 'test@example.com',
            'username': 'testuser',
            'password': 'SecurePass123'
        })
        response = client.post('/api/auth/login', json={
            'email': 'test@example.com',
            'password': 'WrongPassword'
        })
        assert response.status_code == 401

    def test_get_current_user(self, client):
        """Test getting current user."""
        reg_response = client.post('/api/auth/register', json={
            'email': 'test@example.com',
            'username': 'testuser',
            'password': 'SecurePass123'
        })
        token = reg_response.get_json()['access_token']

        response = client.get(
            '/api/auth/me',
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        assert response.get_json()['email'] == 'test@example.com'

    def test_unauthorized_access(self, client):
        """Test accessing protected endpoint without token."""
        response = client.get('/api/transactions')
        assert response.status_code == 401
