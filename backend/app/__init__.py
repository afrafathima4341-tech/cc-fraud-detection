from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_socketio import SocketIO
from sqlalchemy import inspect, text
import os

db = SQLAlchemy()
jwt = JWTManager()
socketio = SocketIO()


def create_app(config_name="development"):
    app = Flask(__name__)

    from app.config import config
    app.config.from_object(config[config_name])

    # Initialize config hooks
    config[config_name].init_app(app)

    db.init_app(app)
    jwt.init_app(app)

    # Restrict CORS to configured origins in production
    cors_origins = app.config.get("CORS_ALLOWED_ORIGINS")
    if not cors_origins:
        cors_origins = os.getenv("CORS_ALLOWED_ORIGINS", "*")
    CORS(app, origins=cors_origins if cors_origins != "*" else "*")

    socketio.init_app(app, cors_allowed_origins=cors_origins if cors_origins != "*" else "*")

    from app import models  # Import models
    from app import websocket_events
    from app.routes import auth_bp, transactions_bp, fraud_alerts_bp, dashboard_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(fraud_alerts_bp)
    app.register_blueprint(dashboard_bp)

    with app.app_context():
        db.create_all()
        transaction_columns = {
            column["name"] for column in inspect(db.engine).get_columns("transactions")
        }
        with db.engine.begin() as connection:
            if "upi_id" not in transaction_columns:
                connection.execute(text("ALTER TABLE transactions ADD COLUMN upi_id VARCHAR(100)"))
            if "payer_bank" not in transaction_columns:
                connection.execute(text("ALTER TABLE transactions ADD COLUMN payer_bank VARCHAR(100)"))
            if "card_network" not in transaction_columns:
                connection.execute(text("ALTER TABLE transactions ADD COLUMN card_network VARCHAR(30)"))

    return app
