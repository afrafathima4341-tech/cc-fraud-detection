from backend.app.services.gnn_model_service import get_model_service

def detect_fraud(transaction):
    """
    Real-time fraud detection using GNN model.
    Uses trained GNN if available, falls back to rule-based detection.

    Args:
        transaction: Transaction object

    Returns:
        fraud_score: float between 0 and 1
        explanation: str with detailed explanation
    """
    model_service = get_model_service()

    transaction_data = {
        "customer_id": transaction.customer_id,
        "merchant_id": transaction.merchant_id,
        "card_id": transaction.card_id,
        "amount": transaction.amount,
        "merchant_name": transaction.merchant_name,
        "category": transaction.category,
    }

    fraud_score, explanation = model_service.predict_fraud_score(transaction_data)
    return fraud_score, explanation
