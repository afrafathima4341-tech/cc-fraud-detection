from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from backend.app import db, socketio
from backend.app.models import Transaction, FraudAlert

@jwt_required()
def list_transactions():
    user_id = get_jwt_identity()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)

    transactions = Transaction.query.filter_by(user_id=user_id).paginate(page=page, per_page=per_page)

    return jsonify({
        "total": transactions.total,
        "pages": transactions.pages,
        "current_page": page,
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

    required_fields = ["customer_id", "merchant_id", "card_id", "amount"]
    if not data or not all(field in data for field in required_fields):
        return jsonify({"message": "Missing required fields"}), 400

    try:
        transaction = Transaction(
            user_id=user_id,
            customer_id=data["customer_id"],
            merchant_id=data["merchant_id"],
            card_id=data["card_id"],
            amount=float(data["amount"]),
            merchant_name=data.get("merchant_name"),
            category=data.get("category"),
            timestamp=datetime.fromisoformat(data.get("timestamp", datetime.utcnow().isoformat())),
        )

        db.session.add(transaction)
        db.session.flush()

        from backend.app.services.fraud_detector import detect_fraud
        fraud_score, explanation = detect_fraud(transaction)
        transaction.fraud_score = fraud_score
        transaction.is_fraud_predicted = fraud_score > 0.5

        if transaction.is_fraud_predicted:
            fraud_alert = FraudAlert(
                transaction_id=transaction.id,
                user_id=user_id,
                fraud_score=fraud_score,
                explanation=explanation
            )
            db.session.add(fraud_alert)
            socketio.emit("fraud_alert", {
                "transaction_id": transaction.id,
                "fraud_score": fraud_score,
                "merchant": transaction.merchant_name,
                "amount": transaction.amount
            }, broadcast=True)

        db.session.commit()

        return jsonify({
            "message": "Transaction created",
            "transaction": transaction.to_dict()
        }), 201

    except ValueError as e:
        return jsonify({"message": f"Invalid input: {str(e)}"}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": f"Error creating transaction: {str(e)}"}), 500
