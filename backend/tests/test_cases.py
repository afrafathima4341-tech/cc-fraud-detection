import pytest
from app import create_app, db
from app.models import InvestigationCase, Transaction, User
from datetime import datetime, timezone


@pytest.fixture
def app():
    """Create test application context with isolated SQLite schema."""
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


class TestCaseManagement:
    """Test suite for investigator case management, triage workflows, and CSV export."""

    @pytest.fixture
    def auth_token(self, client):
        """Create a user and return auth token."""
        user = User(email="analyst@axioma.ai", username="analyst_bob")
        user.set_password("Investigator@123")
        db.session.add(user)
        db.session.commit()

        login_res = client.post("/api/auth/login", json={
            "email": "analyst@axioma.ai",
            "password": "Investigator@123"
        })
        return login_res.get_json()["access_token"]

    @pytest.fixture
    def test_transaction(self, auth_token):
        user = User.query.filter_by(email="analyst@axioma.ai").first()
        tx = Transaction(
            user_id=user.id,
            customer_id="CUST_SUSPECT_01",
            merchant_id="MERCH_RISKY_99",
            card_id="CARD_1111",
            amount=85000.0,
            channel="UPI",
            currency="INR",
            timestamp=datetime.now(timezone.utc),
            is_fraud_predicted=True,
            fraud_score=0.92
        )
        db.session.add(tx)
        db.session.commit()
        return tx

    def test_create_investigation_case(self, client, auth_token, test_transaction):
        """Test creating an investigation case for suspicious transaction."""
        headers = {"Authorization": f"Bearer {auth_token}"}
        res = client.post("/api/cases", headers=headers, json={
            "transaction_id": test_transaction.id,
            "priority": "CRITICAL",
            "notes": "Large unusual INR spike"
        })
        assert res.status_code == 201
        data = res.get_json()
        assert data["message"] == "Investigation case opened successfully"
        assert "CASE-" in data["case"]["case_number"]
        assert data["case"]["priority"] == "CRITICAL"
        assert data["case"]["status"] == "OPEN"

    def test_list_and_filter_cases(self, client, auth_token, test_transaction):
        """Test listing cases with filter support."""
        headers = {"Authorization": f"Bearer {auth_token}"}
        client.post("/api/cases", headers=headers, json={
            "transaction_id": test_transaction.id,
            "priority": "HIGH"
        })

        res = client.get("/api/cases?priority=HIGH", headers=headers)
        assert res.status_code == 200
        data = res.get_json()
        assert data["total"] >= 1
        assert len(data["cases"]) >= 1

    def test_update_case_status_and_action(self, client, auth_token, test_transaction):
        """Test updating triage action and case resolution."""
        headers = {"Authorization": f"Bearer {auth_token}"}
        create_res = client.post("/api/cases", headers=headers, json={
            "transaction_id": test_transaction.id
        })
        case_id = create_res.get_json()["case"]["id"]

        patch_res = client.patch(f"/api/cases/{case_id}", headers=headers, json={
            "status": "RESOLVED_FRAUD",
            "action_taken": "CARD_FROZEN",
            "notes": "Confirmed stolen UPI credentials. Card blocked."
        })
        assert patch_res.status_code == 200
        updated = patch_res.get_json()["case"]
        assert updated["status"] == "RESOLVED_FRAUD"
        assert updated["action_taken"] == "CARD_FROZEN"

    def test_export_cases_csv(self, client, auth_token, test_transaction):
        """Test exporting audit CSV report."""
        headers = {"Authorization": f"Bearer {auth_token}"}
        client.post("/api/cases", headers=headers, json={
            "transaction_id": test_transaction.id
        })

        res = client.get("/api/cases/export/csv", headers=headers)
        assert res.status_code == 200
        assert "text/csv" in res.content_type
        assert b"Case Number,Status,Priority" in res.data
