"""
Explainability module for fraud detection predictions.
Provides interpretable explanations for why a transaction was flagged as fraudulent.
"""

from app.models import Transaction, FraudAlert
from datetime import timedelta, timezone, datetime
from sqlalchemy import func

class FraudExplainer:
    """Explains fraud detection decisions."""

    @staticmethod
    def explain_fraud_prediction(transaction, fraud_score):
        """
        Generate a detailed explanation for a fraud prediction.

        Args:
            transaction: Transaction object
            fraud_score: Predicted fraud probability (0-1)

        Returns:
            dict: Detailed explanation with reasoning
        """
        explanation = {
            "transaction_id": transaction.id,
            "fraud_score": round(fraud_score, 3),
            "risk_level": FraudExplainer._get_risk_level(fraud_score),
            "factors": [],
            "similar_frauds": [],
            "customer_profile": {},
            "merchant_profile": {},
        }

        # Analyze transaction amount
        amount_factor = FraudExplainer._analyze_amount(transaction)
        if amount_factor:
            explanation["factors"].append(amount_factor)

        # Analyze temporal patterns
        temporal_factor = FraudExplainer._analyze_temporal_pattern(transaction)
        if temporal_factor:
            explanation["factors"].append(temporal_factor)

        # Analyze customer behavior
        customer_profile, behavior_factor = FraudExplainer._analyze_customer_behavior(transaction)
        explanation["customer_profile"] = customer_profile
        if behavior_factor:
            explanation["factors"].append(behavior_factor)

        # Analyze merchant
        merchant_profile, merchant_factor = FraudExplainer._analyze_merchant(transaction)
        explanation["merchant_profile"] = merchant_profile
        if merchant_factor:
            explanation["factors"].append(merchant_factor)

        # Find similar frauds
        similar_frauds = FraudExplainer._find_similar_transactions(transaction, fraud_score)
        explanation["similar_frauds"] = similar_frauds

        # Overall recommendation
        explanation["recommendation"] = FraudExplainer._get_recommendation(fraud_score, explanation)

        return explanation

    @staticmethod
    def _get_risk_level(fraud_score):
        """Classify fraud score into risk level."""
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

    @staticmethod
    def _analyze_amount(transaction):
        """Analyze if transaction amount is anomalous."""
        # Get customer's average transaction
        customer_txns = Transaction.query.filter_by(
            customer_id=transaction.customer_id
        ).order_by(Transaction.created_at.desc()).limit(100).all()

        if not customer_txns:
            return None

        amounts = [t.amount for t in customer_txns if t.id != transaction.id]
        if not amounts:
            return None

        avg_amount = sum(amounts) / len(amounts)
        std_dev = (sum((x - avg_amount) ** 2 for x in amounts) / len(amounts)) ** 0.5

        zscore = (transaction.amount - avg_amount) / std_dev if std_dev > 0 else 0

        if abs(zscore) > 2:
            return {
                "factor": "UNUSUAL_AMOUNT",
                "description": f"Transaction amount ${transaction.amount:.2f} deviates significantly from customer average (${avg_amount:.2f})",
                "z_score": round(zscore, 2),
                "severity": "HIGH" if abs(zscore) > 3 else "MEDIUM",
            }
        return None

    @staticmethod
    def _analyze_temporal_pattern(transaction):
        """Analyze temporal patterns."""
        customer_txns = Transaction.query.filter_by(
            customer_id=transaction.customer_id
        ).order_by(Transaction.created_at.desc()).limit(50).all()

        if len(customer_txns) < 5:
            return None

        # Check for rapid transactions
        recent = [t for t in customer_txns if (transaction.timestamp - t.timestamp).total_seconds() < 3600]
        if len(recent) > 5:
            return {
                "factor": "RAPID_TRANSACTIONS",
                "description": f"Customer made {len(recent)} transactions in the last hour",
                "count": len(recent),
                "severity": "MEDIUM",
            }

        # Check for unusual time
        hour = transaction.timestamp.hour
        typical_hours = [t.timestamp.hour for t in customer_txns[:20]]
        if hour not in typical_hours and len(set(typical_hours)) > 3:
            return {
                "factor": "UNUSUAL_TIME",
                "description": f"Transaction at {hour:02d}:00, unusual for this customer",
                "severity": "LOW",
            }

        return None

    @staticmethod
    def _analyze_customer_behavior(transaction):
        """Analyze customer behavior patterns."""
        customer_txns = Transaction.query.filter_by(
            customer_id=transaction.customer_id
        ).all()

        profile = {
            "transaction_count": len(customer_txns),
            "avg_amount": 0,
            "fraud_rate": 0,
            "total_spent": 0,
        }

        if customer_txns:
            amounts = [t.amount for t in customer_txns]
            profile["avg_amount"] = round(sum(amounts) / len(amounts), 2)
            profile["total_spent"] = round(sum(amounts), 2)

            frauds = sum(1 for t in customer_txns if t.is_fraud_predicted)
            profile["fraud_rate"] = round(frauds / len(customer_txns) * 100, 2)

        factor = None
        if profile["fraud_rate"] > 10:
            factor = {
                "factor": "HIGH_FRAUD_HISTORY",
                "description": f"Customer has {profile['fraud_rate']}% fraud rate in history",
                "severity": "MEDIUM",
            }

        return profile, factor

    @staticmethod
    def _analyze_merchant(transaction):
        """Analyze merchant characteristics."""
        merchant_txns = Transaction.query.filter_by(
            merchant_id=transaction.merchant_id
        ).all()

        profile = {
            "merchant_name": transaction.merchant_name,
            "transaction_count": len(merchant_txns),
            "fraud_count": 0,
            "fraud_rate": 0,
        }

        if merchant_txns:
            frauds = sum(1 for t in merchant_txns if t.is_fraud_predicted)
            profile["fraud_count"] = frauds
            profile["fraud_rate"] = round(frauds / len(merchant_txns) * 100, 2)

        factor = None
        if profile["fraud_rate"] > 5:
            factor = {
                "factor": "RISKY_MERCHANT",
                "description": f"Merchant has {profile['fraud_rate']}% fraud rate",
                "severity": "MEDIUM",
            }

        return profile, factor

    @staticmethod
    def _find_similar_transactions(transaction, fraud_score):
        """Find similar transactions that were flagged as fraud."""
        similar = Transaction.query.filter(
            Transaction.customer_id == transaction.customer_id,
            Transaction.is_fraud_predicted == True,
            Transaction.id != transaction.id,
            Transaction.amount > transaction.amount * 0.8,
            Transaction.amount < transaction.amount * 1.2,
        ).order_by(Transaction.created_at.desc()).limit(3).all()

        return [{
            "transaction_id": t.id,
            "amount": t.amount,
            "merchant": t.merchant_name,
            "timestamp": t.timestamp.isoformat(),
        } for t in similar]

    @staticmethod
    def _get_recommendation(fraud_score, explanation):
        """Get recommendation based on fraud score and factors."""
        if fraud_score > 0.8:
            return "BLOCK_IMMEDIATELY"
        elif fraud_score > 0.6:
            return "REQUIRE_VERIFICATION"
        elif fraud_score > 0.4:
            return "MONITOR_CLOSELY"
        else:
            return "ALLOW_WITH_MONITORING"
