from datetime import datetime
from backend.app import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    username = db.Column(db.String(80), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    transactions = db.relationship("Transaction", backref="user", lazy=True, cascade="all, delete-orphan")
    fraud_alerts = db.relationship("FraudAlert", backref="user", lazy=True, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "username": self.username,
            "created_at": self.created_at.isoformat(),
        }


class Transaction(db.Model):
    __tablename__ = "transactions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    customer_id = db.Column(db.String(50), nullable=False, index=True)
    merchant_id = db.Column(db.String(50), nullable=False, index=True)
    card_id = db.Column(db.String(50), nullable=False, index=True)
    amount = db.Column(db.Float, nullable=False)
    merchant_name = db.Column(db.String(255), nullable=True)
    category = db.Column(db.String(50), nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False)
    is_fraud_predicted = db.Column(db.Boolean, default=False, index=True)
    fraud_score = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    fraud_alert = db.relationship("FraudAlert", backref="transaction", uselist=False, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "customer_id": self.customer_id,
            "merchant_id": self.merchant_id,
            "merchant_name": self.merchant_name,
            "card_id": self.card_id,
            "amount": self.amount,
            "category": self.category,
            "timestamp": self.timestamp.isoformat(),
            "is_fraud_predicted": self.is_fraud_predicted,
            "fraud_score": self.fraud_score,
            "created_at": self.created_at.isoformat(),
        }


class FraudAlert(db.Model):
    __tablename__ = "fraud_alerts"

    id = db.Column(db.Integer, primary_key=True)
    transaction_id = db.Column(db.Integer, db.ForeignKey("transactions.id"), nullable=False, unique=True, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    fraud_score = db.Column(db.Float, nullable=False)
    is_confirmed = db.Column(db.Boolean, default=False)
    is_false_positive = db.Column(db.Boolean, default=False)
    explanation = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "transaction_id": self.transaction_id,
            "fraud_score": self.fraud_score,
            "is_confirmed": self.is_confirmed,
            "is_false_positive": self.is_false_positive,
            "explanation": self.explanation,
            "created_at": self.created_at.isoformat(),
        }


class GraphEdge(db.Model):
    __tablename__ = "graph_edges"

    id = db.Column(db.Integer, primary_key=True)
    source_type = db.Column(db.String(50), nullable=False)
    source_id = db.Column(db.String(100), nullable=False)
    target_type = db.Column(db.String(50), nullable=False)
    target_id = db.Column(db.String(100), nullable=False)
    edge_type = db.Column(db.String(50), nullable=False)
    weight = db.Column(db.Float, default=1.0)
    transaction_count = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (db.Index("idx_graph_edge", "source_id", "target_id", "edge_type"),)

    def to_dict(self):
        return {
            "id": self.id,
            "source_type": self.source_type,
            "source_id": self.source_id,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "edge_type": self.edge_type,
            "weight": self.weight,
            "transaction_count": self.transaction_count,
        }
