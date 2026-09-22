import random
from backend.app.models import Transaction, GraphEdge

def detect_fraud(transaction):
    """
    Real-time fraud detection using GNN.
    Phase 1: Placeholder with rule-based heuristics
    Phase 3: Will be replaced with actual GNN model
    """

    fraud_score = 0.0
    reasons = []

    if transaction.amount > 10000:
        fraud_score += 0.3
        reasons.append("Large transaction amount")

    recent_transactions = Transaction.query.filter(
        Transaction.customer_id == transaction.customer_id,
        Transaction.timestamp < transaction.timestamp
    ).order_by(Transaction.timestamp.desc()).limit(5).all()

    if len(recent_transactions) > 0:
        avg_amount = sum(t.amount for t in recent_transactions) / len(recent_transactions)
        if transaction.amount > avg_amount * 3:
            fraud_score += 0.25
            reasons.append("Unusual transaction amount for this customer")

    merchant_fraud_count = Transaction.query.filter(
        Transaction.merchant_id == transaction.merchant_id,
        Transaction.is_fraud_predicted == True
    ).count()

    if merchant_fraud_count > 5:
        fraud_score += 0.2
        reasons.append("Merchant has history of fraud transactions")

    fraud_score = min(fraud_score + random.uniform(0, 0.15), 1.0)

    explanation = {
        "score": round(fraud_score, 3),
        "reasons": reasons,
        "model": "rule-based-heuristic"
    }

    return fraud_score, str(explanation)
