from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from backend.app import db
from backend.app.models import FraudAlert

@jwt_required()
def list_fraud_alerts():
    user_id = get_jwt_identity()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    alerts = FraudAlert.query.filter_by(user_id=user_id).paginate(page=page, per_page=per_page)

    return jsonify({
        "total": alerts.total,
        "pages": alerts.pages,
        "current_page": page,
        "alerts": [a.to_dict() for a in alerts.items]
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
