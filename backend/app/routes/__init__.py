from flask import Blueprint

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
transactions_bp = Blueprint("transactions", __name__, url_prefix="/api/transactions")
fraud_alerts_bp = Blueprint("fraud_alerts", __name__, url_prefix="/api/fraud-alerts")
dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")

from backend.app.routes import auth, transactions, fraud_alerts, dashboard

auth_bp.add_url_rule("/register", "register", auth.register, methods=["POST"])
auth_bp.add_url_rule("/login", "login", auth.login, methods=["POST"])
auth_bp.add_url_rule("/me", "get_current_user", auth.get_current_user, methods=["GET"])

transactions_bp.add_url_rule("", "list_transactions", transactions.list_transactions, methods=["GET"])
transactions_bp.add_url_rule("/<int:transaction_id>", "get_transaction", transactions.get_transaction, methods=["GET"])
transactions_bp.add_url_rule("", "create_transaction", transactions.create_transaction, methods=["POST"])

fraud_alerts_bp.add_url_rule("", "list_fraud_alerts", fraud_alerts.list_fraud_alerts, methods=["GET"])
fraud_alerts_bp.add_url_rule("/<int:alert_id>/feedback", "submit_feedback", fraud_alerts.submit_feedback, methods=["POST"])

dashboard_bp.add_url_rule("/stats", "get_stats", dashboard.get_stats, methods=["GET"])
