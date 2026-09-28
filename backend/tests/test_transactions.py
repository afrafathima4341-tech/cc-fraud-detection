import pytest
from datetime import datetime
from app import create_app, db
from app.models import User, Transaction
from app.utils.validators import validate_transaction_input, validate_amount


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


@pytest.fixture
def authenticated_user(client):
    """Create authenticated user and return token."""
    response = client.post('/api/auth/register', json={
        'email': 'test@example.com',
        'username': 'testuser',
        'password': 'SecurePass123'
    })
    return response.get_json()['access_token']


class TestTransactions:
    """Test transaction endpoints."""

    def test_create_transaction(self, client, authenticated_user):
        """Test creating a transaction."""
        response = client.post(
            '/api/transactions',
            json={
                'customer_id': 'CUST001',
                'merchant_id': 'MERCH001',
                'card_id': 'CARD001',
                'card_network': 'Visa',
                'amount': 150.50,
                'merchant_name': 'Online Store',
                'category': 'shopping'
            },
            headers={'Authorization': f'Bearer {authenticated_user}'}
        )
        assert response.status_code == 201
        data = response.get_json()
        assert data['transaction']['amount'] == 150.50
        assert data['transaction']['card_network'] == 'Visa'
        assert 'fraud_score' in data['transaction']

    def test_card_network_must_be_supported(self, client, authenticated_user):
        response = client.post(
            '/api/transactions',
            json={
                'customer_id': 'CUST_CARD',
                'merchant_id': 'MERCH_CARD',
                'card_id': 'CARD001',
                'card_network': 'Unknown Network',
                'amount': 500,
                'channel': 'Card',
            },
            headers={'Authorization': f'Bearer {authenticated_user}'}
        )
        assert response.status_code == 400
        assert 'card_network must be Visa, RuPay, Mastercard, or American Express' in response.get_json()['errors']

    def test_create_upi_transaction(self, client, authenticated_user):
        response = client.post(
            '/api/transactions',
            json={
                'customer_id': 'CUST_UPI',
                'merchant_id': 'MERCH_UPI',
                'amount': 1250.00,
                'channel': 'UPI',
                'upi_id': 'customer@okaxis',
                'payer_bank': 'Axis Bank',
                'merchant_bank': 'HDFC Bank',
            },
            headers={'Authorization': f'Bearer {authenticated_user}'}
        )
        assert response.status_code == 201
        transaction = response.get_json()['transaction']
        assert transaction['currency'] == 'INR'
        assert transaction['card_id'] == ''
        assert transaction['upi_id'] == 'customer@okaxis'
        assert transaction['payer_bank'] == 'Axis Bank'
        assert transaction['merchant_bank'] == 'HDFC Bank'

    def test_upi_transaction_requires_valid_upi_id(self, client, authenticated_user):
        response = client.post(
            '/api/transactions',
            json={
                'customer_id': 'CUST_UPI',
                'merchant_id': 'MERCH_UPI',
                'amount': 1250.00,
                'channel': 'UPI',
                'upi_id': 'not-a-upi-id',
            },
            headers={'Authorization': f'Bearer {authenticated_user}'}
        )
        assert response.status_code == 400
        assert 'upi_id must be a valid UPI address' in response.get_json()['errors']
        assert 'payer_bank is required for UPI transactions' in response.get_json()['errors']

    def test_dashboard_amounts_are_grouped_by_currency(self, client, authenticated_user):
        headers = {'Authorization': f'Bearer {authenticated_user}'}
        for transaction in [
            {'customer_id': 'CUST_INR', 'merchant_id': 'MERCH_INR', 'card_id': 'CARD_INR', 'amount': 500, 'currency': 'INR'},
            {'customer_id': 'CUST_USD', 'merchant_id': 'MERCH_USD', 'card_id': 'CARD_USD', 'amount': 20, 'currency': 'USD'},
        ]:
            response = client.post('/api/transactions', json=transaction, headers=headers)
            assert response.status_code == 201

        response = client.get('/api/dashboard/stats', headers=headers)
        assert response.status_code == 200
        assert response.get_json()['amount_by_currency'] == {'INR': 500.0, 'USD': 20.0}

    def test_list_transactions(self, client, authenticated_user):
        """Test listing transactions."""
        # Create a transaction
        client.post(
            '/api/transactions',
            json={
                'customer_id': 'CUST001',
                'merchant_id': 'MERCH001',
                'card_id': 'CARD001',
                'amount': 100.00,
            },
            headers={'Authorization': f'Bearer {authenticated_user}'}
        )

        response = client.get(
            '/api/transactions',
            headers={'Authorization': f'Bearer {authenticated_user}'}
        )
        assert response.status_code == 200
        data = response.get_json()
        assert data['total'] == 1
        assert len(data['transactions']) == 1

    def test_get_transaction(self, client, authenticated_user):
        """Test getting a specific transaction."""
        create_response = client.post(
            '/api/transactions',
            json={
                'customer_id': 'CUST001',
                'merchant_id': 'MERCH001',
                'card_id': 'CARD001',
                'amount': 100.00,
            },
            headers={'Authorization': f'Bearer {authenticated_user}'}
        )
        transaction_id = create_response.get_json()['transaction']['id']

        response = client.get(
            f'/api/transactions/{transaction_id}',
            headers={'Authorization': f'Bearer {authenticated_user}'}
        )
        assert response.status_code == 200
        assert response.get_json()['id'] == transaction_id

    def test_transaction_filtering_by_fraud(self, client, authenticated_user):
        """Test filtering transactions by fraud status."""
        client.post(
            '/api/transactions',
            json={
                'customer_id': 'CUST001',
                'merchant_id': 'MERCH001',
                'card_id': 'CARD001',
                'amount': 15000.00,  # Large amount likely to be flagged as fraud
            },
            headers={'Authorization': f'Bearer {authenticated_user}'}
        )

        response = client.get(
            '/api/transactions?is_fraud=true',
            headers={'Authorization': f'Bearer {authenticated_user}'}
        )
        assert response.status_code == 200

    def test_missing_required_fields(self, client, authenticated_user):
        """Test creating transaction with missing fields."""
        response = client.post(
            '/api/transactions',
            json={
                'customer_id': 'CUST001',
                'merchant_id': 'MERCH001',
                # Missing card_id and amount
            },
            headers={'Authorization': f'Bearer {authenticated_user}'}
        )
        assert response.status_code == 400


class TestValidators:
    """Test validation functions."""

    def test_validate_amount_positive(self):
        """Test validating positive amount."""
        valid, msg = validate_amount(100.50)
        assert valid

    def test_validate_amount_negative(self):
        """Test validating negative amount."""
        valid, msg = validate_amount(-50)
        assert not valid

    def test_validate_amount_too_large(self):
        """Test validating very large amount."""
        valid, msg = validate_amount(2000000)
        assert not valid

    def test_validate_transaction_input(self):
        """Test transaction input validation."""
        errors = validate_transaction_input({
            'customer_id': 'CUST001',
            'merchant_id': 'MERCH001',
            'card_id': 'CARD001',
            'amount': 100.00
        })
        assert len(errors) == 0

    def test_validate_transaction_input_missing_field(self):
        """Test transaction validation with missing field."""
        errors = validate_transaction_input({
            'customer_id': 'CUST001',
            'amount': 100.00
        })
        assert len(errors) > 0
