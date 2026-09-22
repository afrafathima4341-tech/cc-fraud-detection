from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_socketio import SocketIO

db = SQLAlchemy()
jwt = JWTManager()
socketio = SocketIO()


def create_app(config_name="development"):
    app = Flask(__name__)

    from backend.app.config import config
    app.config.from_object(config[config_name])

    db.init_app(app)
    jwt.init_app(app)
    CORS(app)
    socketio.init_app(app, cors_allowed_origins="*")

    with app.app_context():
        from backend.app import models
        db.create_all()

        from backend.app.routes import auth_bp, transactions_bp, fraud_alerts_bp, dashboard_bp
        app.register_blueprint(auth_bp)
        app.register_blueprint(transactions_bp)
        app.register_blueprint(fraud_alerts_bp)
        app.register_blueprint(dashboard_bp)

    return app
