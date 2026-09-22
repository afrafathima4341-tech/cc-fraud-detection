from flask import jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from backend.app import db
from backend.app.models import Transaction, FraudAlert

@jwt_required()
def get_stats():
    user_id = get_jwt_identity()

    total_transactions = Transaction.query.filter_by(user_id=user_id).count()
    fraud_transactions = Transaction.query.filter_by(user_id=user_id, is_fraud_predicted=True).count()
    false_positives = FraudAlert.query.filter_by(user_id=user_id, is_false_positive=True).count()

    total_amount = db.session.query(func.sum(Transaction.amount)).filter_by(user_id=user_id).scalar() or 0.0
    fraud_amount = db.session.query(func.sum(Transaction.amount)).filter_by(
        user_id=user_id, is_fraud_predicted=True
    ).scalar() or 0.0

    avg_fraud_score = db.session.query(func.avg(FraudAlert.fraud_score)).filter_by(
        user_id=user_id
    ).scalar() or 0.0

    return jsonify({
        "total_transactions": total_transactions,
        "fraud_transactions": fraud_transactions,
        "false_positives": false_positives,
        "total_amount": float(total_amount),
        "fraud_amount": float(fraud_amount),
        "avg_fraud_score": float(avg_fraud_score),
        "fraud_percentage": round((fraud_transactions / total_transactions * 100) if total_transactions > 0 else 0, 2)
    }), 200
