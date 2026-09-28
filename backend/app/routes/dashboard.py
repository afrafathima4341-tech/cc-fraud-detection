from flask import jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func
from datetime import datetime, timedelta, timezone
from app import db
from app.models import Transaction, FraudAlert, User

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

    # Calculate 24-hour change
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    txns_24h = Transaction.query.filter(
        Transaction.user_id == user_id,
        Transaction.created_at >= yesterday
    ).count()
    fraud_24h = Transaction.query.filter(
        Transaction.user_id == user_id,
        Transaction.created_at >= yesterday,
        Transaction.is_fraud_predicted == True
    ).count()

    return jsonify({
        "total_transactions": total_transactions,
        "fraud_transactions": fraud_transactions,
        "false_positives": false_positives,
        "total_amount": float(total_amount),
        "fraud_amount": float(fraud_amount),
        "avg_fraud_score": float(avg_fraud_score),
        "fraud_percentage": round((fraud_transactions / total_transactions * 100) if total_transactions > 0 else 0, 2),
        "transactions_24h": txns_24h,
        "fraud_24h": fraud_24h,
    }), 200


@jwt_required()
def get_fraud_distribution():
    user_id = get_jwt_identity()

    high_risk = Transaction.query.filter(
        Transaction.user_id == user_id,
        Transaction.fraud_score > 0.7
    ).count()
    medium_risk = Transaction.query.filter(
        Transaction.user_id == user_id,
        Transaction.fraud_score > 0.3,
        Transaction.fraud_score <= 0.7
    ).count()
    low_risk = Transaction.query.filter(
        Transaction.user_id == user_id,
        Transaction.fraud_score <= 0.3
    ).count()

    return jsonify({
        "high_risk": high_risk,
        "medium_risk": medium_risk,
        "low_risk": low_risk,
        "total": high_risk + medium_risk + low_risk,
    }), 200


@jwt_required()
def get_trend_data():
    user_id = get_jwt_identity()
    days = request.args.get("days", 30, type=int)

    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Get daily stats
    daily_stats = db.session.query(
        func.date(Transaction.created_at).label("date"),
        func.count(Transaction.id).label("total"),
        func.count(
            db.case((Transaction.is_fraud_predicted == True, 1))
        ).label("fraud_count"),
        func.sum(Transaction.amount).label("amount"),
    ).filter(
        Transaction.user_id == user_id,
        Transaction.created_at >= start_date
    ).group_by(
        func.date(Transaction.created_at)
    ).order_by(
        func.date(Transaction.created_at)
    ).all()

    return jsonify([{
        "date": str(stat[0]),
        "transactions": stat[1],
        "fraud": stat[2],
        "amount": float(stat[3] or 0),
    } for stat in daily_stats]), 200


@jwt_required()
def get_risk_categories():
    user_id = get_jwt_identity()

    risk_data = db.session.query(
        Transaction.category,
        func.count(Transaction.id).label("count"),
        func.count(
            db.case((Transaction.is_fraud_predicted == True, 1))
        ).label("fraud_count"),
        func.avg(Transaction.fraud_score).label("avg_score"),
    ).filter_by(user_id=user_id).group_by(
        Transaction.category
    ).order_by(
        func.count(
            db.case((Transaction.is_fraud_predicted == True, 1))
        ).desc()
    ).all()

    return jsonify([{
        "category": stat[0] or "unknown",
        "transaction_count": stat[1],
        "fraud_count": stat[2],
        "avg_fraud_score": float(stat[3] or 0),
        "fraud_rate": round((stat[2] / stat[1] * 100) if stat[1] > 0 else 0, 2),
    } for stat in risk_data]), 200
