from flask import Blueprint

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")
transactions_bp = Blueprint("transactions", __name__, url_prefix="/api/transactions")
fraud_alerts_bp = Blueprint("fraud_alerts", __name__, url_prefix="/api/fraud-alerts")
dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")

from app.routes import auth, transactions, fraud_alerts, dashboard

auth_bp.add_url_rule("/register", "register", auth.register, methods=["POST"])
auth_bp.add_url_rule("/login", "login", auth.login, methods=["POST"])
auth_bp.add_url_rule("/me", "get_current_user", auth.get_current_user, methods=["GET"])

transactions_bp.add_url_rule("", "list_transactions", transactions.list_transactions, methods=["GET"])
transactions_bp.add_url_rule("/<int:transaction_id>", "get_transaction", transactions.get_transaction, methods=["GET"])
transactions_bp.add_url_rule("", "create_transaction", transactions.create_transaction, methods=["POST"])
transactions_bp.add_url_rule("/analytics/overview", "get_transaction_analytics", transactions.get_transaction_analytics, methods=["GET"])
transactions_bp.add_url_rule("/analytics/merchants", "get_merchant_stats", transactions.get_merchant_stats, methods=["GET"])
transactions_bp.add_url_rule("/analytics/customers", "get_customer_stats", transactions.get_customer_stats, methods=["GET"])

fraud_alerts_bp.add_url_rule("", "list_fraud_alerts", fraud_alerts.list_fraud_alerts, methods=["GET"])
fraud_alerts_bp.add_url_rule("/<int:alert_id>/feedback", "submit_feedback", fraud_alerts.submit_feedback, methods=["POST"])
fraud_alerts_bp.add_url_rule("/<int:alert_id>/explanation", "get_alert_explanation", fraud_alerts.get_alert_explanation, methods=["GET"])
fraud_alerts_bp.add_url_rule("/summary/overview", "get_alert_summary", fraud_alerts.get_alert_summary, methods=["GET"])

dashboard_bp.add_url_rule("/stats", "get_stats", dashboard.get_stats, methods=["GET"])
dashboard_bp.add_url_rule("/fraud-distribution", "get_fraud_distribution", dashboard.get_fraud_distribution, methods=["GET"])
dashboard_bp.add_url_rule("/trends", "get_trend_data", dashboard.get_trend_data, methods=["GET"])
dashboard_bp.add_url_rule("/risk-categories", "get_risk_categories", dashboard.get_risk_categories, methods=["GET"])
