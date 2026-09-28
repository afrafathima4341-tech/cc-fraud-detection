from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta, timezone
from sqlalchemy import or_, and_
from app import db, socketio
from app.models import Transaction, FraudAlert
from app.utils.validators import validate_transaction_input


def _get_risk_level(fraud_score):
    """Categorize fraud score into risk level."""
    if fraud_score > 0.8:
        return "CRITICAL"
    elif fraud_score > 0.6:
        return "HIGH"
    elif fraud_score > 0.4:
        return "MEDIUM"
    elif fraud_score > 0.2:
        return "LOW"
    else:
        return "MINIMAL"

@jwt_required()
def list_transactions():
    user_id = get_jwt_identity()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    # Filtering parameters
    is_fraud = request.args.get("is_fraud", None)
    start_date = request.args.get("start_date", None)
    end_date = request.args.get("end_date", None)
    min_amount = request.args.get("min_amount", None, type=float)
    max_amount = request.args.get("max_amount", None, type=float)
    customer_id = request.args.get("customer_id", None)
    merchant_id = request.args.get("merchant_id", None)
    sort_by = request.args.get("sort_by", "created_at")
    sort_order = request.args.get("sort_order", "desc")

    query = Transaction.query.filter_by(user_id=user_id)

    if is_fraud is not None:
        is_fraud_bool = is_fraud.lower() == "true"
        query = query.filter_by(is_fraud_predicted=is_fraud_bool)

    if start_date:
        query = query.filter(Transaction.timestamp >= datetime.fromisoformat(start_date))

    if end_date:
        query = query.filter(Transaction.timestamp <= datetime.fromisoformat(end_date))

    if min_amount is not None:
        query = query.filter(Transaction.amount >= min_amount)

    if max_amount is not None:
        query = query.filter(Transaction.amount <= max_amount)

    if customer_id:
        query = query.filter(Transaction.customer_id == customer_id)

    if merchant_id:
        query = query.filter(Transaction.merchant_id == merchant_id)

    # Sorting
    if sort_by == "amount":
        order_col = Transaction.amount
    elif sort_by == "fraud_score":
        order_col = Transaction.fraud_score
    else:
        order_col = Transaction.created_at

    if sort_order.lower() == "asc":
        query = query.order_by(order_col.asc())
    else:
        query = query.order_by(order_col.desc())

    transactions = query.paginate(page=page, per_page=per_page)

    return jsonify({
        "total": transactions.total,
        "pages": transactions.pages,
        "current_page": page,
        "per_page": per_page,
        "transactions": [t.to_dict() for t in transactions.items]
    }), 200


@jwt_required()
def get_transaction(transaction_id):
    user_id = get_jwt_identity()
    transaction = Transaction.query.filter_by(id=transaction_id, user_id=user_id).first()

    if not transaction:
        return jsonify({"message": "Transaction not found"}), 404

    return jsonify(transaction.to_dict()), 200


@jwt_required()
def create_transaction():
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return jsonify({"message": "Request body is required"}), 400

    # Validate input
    validation_errors = validate_transaction_input(data)
    if validation_errors:
        return jsonify({"message": "Validation failed", "errors": validation_errors}), 400

    try:
        transaction = Transaction(
            user_id=user_id,
            customer_id=data["customer_id"],
            merchant_id=data["merchant_id"],
            card_id=data["card_id"],
            amount=float(data["amount"]),
            merchant_name=data.get("merchant_name"),
            merchant_bank=data.get("merchant_bank"),
            merchant_location=data.get("merchant_location"),
            category=data.get("category"),
            card_last4=data.get("card_last4"),
            channel=data.get("channel"),
            currency=data.get("currency", "USD"),
            ip_address=data.get("ip_address"),
            device_id=data.get("device_id"),
            timestamp=datetime.fromisoformat(data.get("timestamp", datetime.now(timezone.utc).isoformat())),
        )

        db.session.add(transaction)
        db.session.flush()

        from app.services.fraud_detector import detect_fraud
        from app.websocket_events import broadcast_fraud_alert, broadcast_transaction_update

        fraud_score, explanation = detect_fraud(transaction)
        transaction.fraud_score = fraud_score
        transaction.is_fraud_predicted = fraud_score > 0.5

        fraud_alert = None
        if transaction.is_fraud_predicted:
            fraud_alert = FraudAlert(
                transaction_id=transaction.id,
                user_id=user_id,
                fraud_score=fraud_score,
                explanation=explanation
            )
            db.session.add(fraud_alert)

        db.session.commit()

        # Emit WebSocket events
        transaction_data = transaction.to_dict()
        broadcast_transaction_update(user_id, transaction_data)

        if transaction.is_fraud_predicted and fraud_alert:
            alert_data = {
                "alert_id": fraud_alert.id,
                "transaction_id": transaction.id,
                "fraud_score": round(fraud_score, 3),
                "risk_level": _get_risk_level(fraud_score),
                "amount": transaction.amount,
                "currency": transaction.currency,
                "customer_id": transaction.customer_id,
                "card_id": transaction.card_id,
                "card_last4": transaction.card_last4,
                "merchant_id": transaction.merchant_id,
                "merchant_name": transaction.merchant_name,
                "merchant_bank": transaction.merchant_bank,
                "merchant_location": transaction.merchant_location,
                "merchant_category": transaction.category,
                "channel": transaction.channel,
                "ip_address": transaction.ip_address,
                "device_id": transaction.device_id,
                "timestamp": transaction.timestamp.isoformat(),
                "created_at": transaction.created_at.isoformat(),
                "explanation": explanation,
            }
            broadcast_fraud_alert(user_id, alert_data)

        return jsonify({
            "message": "Transaction created",
            "transaction": transaction.to_dict()
        }), 201

    except ValueError as e:
        return jsonify({"message": f"Invalid input: {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error creating transaction: {str(e)}"}), 500


@jwt_required()
def get_transaction_analytics():
    user_id = get_jwt_identity()
    period = request.args.get("period", "7d")  # 7d, 30d, 90d

    # Parse period
    if period == "7d":
        days = 7
    elif period == "30d":
        days = 30
    elif period == "90d":
        days = 90
    else:
        days = 7

    start_date = datetime.now(timezone.utc) - timedelta(days=days)

    transactions = Transaction.query.filter(
        Transaction.user_id == user_id,
        Transaction.created_at >= start_date
    ).all()

    if not transactions:
        return jsonify({
            "period": period,
            "total_transactions": 0,
            "fraud_count": 0,
            "average_amount": 0,
            "fraud_amount": 0,
            "high_risk_count": 0,
            "medium_risk_count": 0,
            "low_risk_count": 0,
        }), 200

    fraud_txns = [t for t in transactions if t.is_fraud_predicted]
    high_risk = [t for t in transactions if t.fraud_score > 0.7]
    medium_risk = [t for t in transactions if 0.3 < t.fraud_score <= 0.7]
    low_risk = [t for t in transactions if t.fraud_score <= 0.3]

    total_amount = sum(t.amount for t in transactions)
    fraud_amount = sum(t.amount for t in fraud_txns)

    return jsonify({
        "period": period,
        "total_transactions": len(transactions),
        "fraud_count": len(fraud_txns),
        "average_amount": total_amount / len(transactions),
        "fraud_amount": fraud_amount,
        "fraud_rate": round((len(fraud_txns) / len(transactions)) * 100, 2),
        "high_risk_count": len(high_risk),
        "medium_risk_count": len(medium_risk),
        "low_risk_count": len(low_risk),
    }), 200


@jwt_required()
def get_merchant_stats():
    user_id = get_jwt_identity()

    merchants = db.session.query(
        Transaction.merchant_id,
        Transaction.merchant_name,
        db.func.count(Transaction.id).label("transaction_count"),
        db.func.sum(Transaction.amount).label("total_amount"),
        db.func.count(
            db.case((Transaction.is_fraud_predicted == True, 1))
        ).label("fraud_count"),
        db.func.avg(Transaction.fraud_score).label("avg_fraud_score"),
    ).filter_by(user_id=user_id).group_by(
        Transaction.merchant_id, Transaction.merchant_name
    ).order_by(
        db.func.count(Transaction.id).desc()
    ).limit(20).all()

    return jsonify([{
        "merchant_id": m[0],
        "merchant_name": m[1],
        "transaction_count": m[2],
        "total_amount": float(m[3] or 0),
        "fraud_count": m[4],
        "avg_fraud_score": float(m[5] or 0),
        "fraud_rate": round((m[4] / m[2] * 100) if m[2] > 0 else 0, 2),
    } for m in merchants]), 200


@jwt_required()
def get_customer_stats():
    user_id = get_jwt_identity()

    customers = db.session.query(
        Transaction.customer_id,
        db.func.count(Transaction.id).label("transaction_count"),
        db.func.sum(Transaction.amount).label("total_amount"),
        db.func.count(
            db.case((Transaction.is_fraud_predicted == True, 1))
        ).label("fraud_count"),
        db.func.avg(Transaction.fraud_score).label("avg_fraud_score"),
    ).filter_by(user_id=user_id).group_by(
        Transaction.customer_id
    ).order_by(
        db.func.count(db.case((Transaction.is_fraud_predicted == True, 1))).desc()
    ).limit(20).all()

    return jsonify([{
        "customer_id": c[0],
        "transaction_count": c[1],
        "total_amount": float(c[2] or 0),
        "fraud_count": c[3],
        "avg_fraud_score": float(c[4] or 0),
        "fraud_rate": round((c[3] / c[1] * 100) if c[1] > 0 else 0, 2),
    } for c in customers]), 200
