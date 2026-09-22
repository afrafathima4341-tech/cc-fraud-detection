from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import desc
from backend.app import db
from backend.app.models import FraudAlert, Transaction

@jwt_required()
def list_fraud_alerts():
    user_id = get_jwt_identity()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    status_filter = request.args.get("status", None)  # confirmed, false_positive, unreviewed

    query = FraudAlert.query.filter_by(user_id=user_id)

    if status_filter == "confirmed":
        query = query.filter_by(is_confirmed=True)
    elif status_filter == "false_positive":
        query = query.filter_by(is_false_positive=True)
    elif status_filter == "unreviewed":
        query = query.filter(
            (FraudAlert.is_confirmed == False) & (FraudAlert.is_false_positive == False)
        )

    alerts = query.order_by(desc(FraudAlert.created_at)).paginate(page=page, per_page=per_page)

    # Include transaction details with each alert
    alerts_with_tx = []
    for alert in alerts.items:
        alert_dict = alert.to_dict()
        if alert.transaction:
            alert_dict["transaction"] = alert.transaction.to_dict()
        alerts_with_tx.append(alert_dict)

    return jsonify({
        "total": alerts.total,
        "pages": alerts.pages,
        "current_page": page,
        "alerts": alerts_with_tx
    }), 200


@jwt_required()
def submit_feedback(alert_id):
    user_id = get_jwt_identity()
    data = request.get_json()

    alert = FraudAlert.query.filter_by(id=alert_id, user_id=user_id).first()

    if not alert:
        return jsonify({"message": "Alert not found"}), 404

    if "is_confirmed" in data:
        alert.is_confirmed = bool(data["is_confirmed"])

    if "is_false_positive" in data:
        alert.is_false_positive = bool(data["is_false_positive"])

    db.session.commit()

    return jsonify({
        "message": "Feedback submitted",
        "alert": alert.to_dict()
    }), 200


@jwt_required()
def get_alert_summary():
    user_id = get_jwt_identity()

    total_alerts = FraudAlert.query.filter_by(user_id=user_id).count()
    confirmed = FraudAlert.query.filter_by(user_id=user_id, is_confirmed=True).count()
    false_positives = FraudAlert.query.filter_by(user_id=user_id, is_false_positive=True).count()
    unreviewed = total_alerts - confirmed - false_positives

    recent_alerts = FraudAlert.query.filter_by(user_id=user_id).order_by(
        FraudAlert.created_at.desc()
    ).limit(5).all()

    avg_fraud_score = db.session.query(
        db.func.avg(FraudAlert.fraud_score)
    ).filter_by(user_id=user_id).scalar() or 0.0

    high_risk = FraudAlert.query.filter(
        FraudAlert.user_id == user_id,
        FraudAlert.fraud_score > 0.8
    ).count()

    return jsonify({
        "total_alerts": total_alerts,
        "confirmed": confirmed,
        "false_positives": false_positives,
        "unreviewed": unreviewed,
        "avg_fraud_score": float(avg_fraud_score),
        "high_risk_count": high_risk,
        "recent_alerts": [a.to_dict() for a in recent_alerts],
    }), 200
