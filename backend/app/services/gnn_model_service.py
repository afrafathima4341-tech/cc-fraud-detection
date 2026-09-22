import torch
import numpy as np
from pathlib import Path
import pickle
import os

class GNNModelService:
    """Service for loading and using the trained GNN model."""

    def __init__(self):
        self.model = None
        self.scaler = None
        self.graph_data = None
        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self._load_model()

    def _load_model(self):
        """Load the pre-trained model."""
        model_path = Path(__file__).parent.parent.parent / "ml" / "models" / "fraud_detector.pt"
        scaler_path = Path(__file__).parent.parent.parent / "ml" / "models" / "scaler.pkl"
        graph_path = Path(__file__).parent.parent.parent / "ml" / "models" / "graph_data.pkl"

        # Try to load the model if it exists
        if model_path.exists():
            try:
                import torch_geometric
                from ml.gnn_model import FraudDetectionGNN

                self.model = FraudDetectionGNN.load(
                    str(model_path),
                    input_dim=29,  # V1-V28 + amount_scaled
                    hidden_dim=64,
                    num_layers=3,
                )
                self.model.to(self.device)
                print("GNN model loaded successfully")
            except Exception as e:
                print(f"Failed to load GNN model: {e}")
                self.model = None

        if scaler_path.exists():
            try:
                with open(scaler_path, 'rb') as f:
                    self.scaler = pickle.load(f)
                print("Scaler loaded successfully")
            except Exception as e:
                print(f"Failed to load scaler: {e}")

        if graph_path.exists():
            try:
                with open(graph_path, 'rb') as f:
                    self.graph_data = pickle.load(f)
                print("Graph data loaded successfully")
            except Exception as e:
                print(f"Failed to load graph data: {e}")

    def is_model_available(self):
        """Check if the GNN model is available."""
        return self.model is not None

    def predict_fraud_score(self, transaction_features):
        """
        Predict fraud probability using GNN model.
        Falls back to rule-based detection if model not available.

        Args:
            transaction_features: dict with transaction data

        Returns:
            fraud_score: float between 0 and 1
            explanation: dict with reasoning
        """
        if not self.is_model_available():
            return self._rule_based_detection(transaction_features)

        try:
            # Prepare features for the model
            features = self._prepare_features(transaction_features)

            # Run model prediction
            with torch.no_grad():
                input_tensor = torch.FloatTensor(features).unsqueeze(0).to(self.device)
                output = self.model(input_tensor, None)
                fraud_score = output.item()

            explanation = {
                "model": "GNN",
                "score": round(fraud_score, 3),
                "confidence": "high" if fraud_score > 0.8 or fraud_score < 0.2 else "medium",
                "reasoning": self._explain_prediction(transaction_features, fraud_score)
            }

            return fraud_score, str(explanation)

        except Exception as e:
            print(f"Error in GNN prediction: {e}")
            return self._rule_based_detection(transaction_features)

    def _prepare_features(self, transaction_data):
        """Prepare transaction data for model input."""
        # Create a feature vector (simplified version)
        # In a real scenario, you'd use the full feature engineering pipeline
        features = [
            transaction_data.get("amount", 0),
            transaction_data.get("hour", 0),
            transaction_data.get("day", 0),
        ]

        # Pad to expected input size
        while len(features) < 29:
            features.append(0.0)

        return np.array(features[:29], dtype=np.float32)

    def _explain_prediction(self, transaction_data, fraud_score):
        """Generate explanation for the prediction."""
        reasons = []

        if fraud_score > 0.7:
            reasons.append("High fraud risk detected by GNN model")
            if transaction_data.get("amount", 0) > 1000:
                reasons.append("Large transaction amount")
        elif fraud_score > 0.4:
            reasons.append("Moderate fraud risk - unusual pattern detected")
        else:
            reasons.append("Low fraud risk - typical transaction pattern")

        return reasons

    def _rule_based_detection(self, transaction_data):
        """Rule-based fraud detection (fallback when GNN not available)."""
        from backend.app.models import Transaction

        fraud_score = 0.0
        reasons = []

        amount = float(transaction_data.get("amount", 0))

        if amount > 10000:
            fraud_score += 0.3
            reasons.append("Large transaction amount")

        # Check customer history
        recent_txns = Transaction.query.filter(
            Transaction.customer_id == transaction_data.get("customer_id"),
        ).order_by(Transaction.timestamp.desc()).limit(5).all()

        if recent_txns:
            avg_amount = sum(t.amount for t in recent_txns) / len(recent_txns)
            if amount > avg_amount * 3:
                fraud_score += 0.25
                reasons.append("Unusual transaction amount for this customer")

        # Check merchant fraud history
        merchant_fraud = Transaction.query.filter(
            Transaction.merchant_id == transaction_data.get("merchant_id"),
            Transaction.is_fraud_predicted == True
        ).count()

        if merchant_fraud > 5:
            fraud_score += 0.2
            reasons.append("Merchant has history of fraud transactions")

        fraud_score = min(fraud_score + np.random.uniform(0, 0.1), 1.0)

        explanation = {
            "model": "rule-based",
            "score": round(fraud_score, 3),
            "reasons": reasons
        }

        return fraud_score, str(explanation)


# Global model service instance
_model_service = None

def get_model_service():
    """Get or create the global model service instance."""
    global _model_service
    if _model_service is None:
        _model_service = GNNModelService()
    return _model_service
