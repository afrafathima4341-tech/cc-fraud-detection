import pytest
from app import create_app, db, socketio
from app.models import User


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

    def test_socket_auth_receives_live_events(self, app, client):
        register_response = client.post('/api/auth/register', json={
            'email': 'socket@example.com',
            'username': 'socketuser',
            'password': 'SecurePass123'
        })
        token = register_response.get_json()['access_token']
        socket_client = socketio.test_client(app, auth={'token': token})

        assert socket_client.is_connected()
        assert any(event['name'] == 'connection' for event in socket_client.get_received())

        socket_client.emit('join_alerts')
        assert any(event['name'] == 'alert_room_joined' for event in socket_client.get_received())

        socketio.emit('transaction_update', {'id': 10}, room='user_1')
        assert any(
            event['name'] == 'transaction_update' and event['args'][0]['id'] == 10
            for event in socket_client.get_received()
        )

        socketio.emit('fraud_alert', {'alert_id': 20}, room='alerts_1')
        assert any(
            event['name'] == 'fraud_alert' and event['args'][0]['alert_id'] == 20
            for event in socket_client.get_received()
        )
        socket_client.disconnect()

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
