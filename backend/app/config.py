import os
import sys
from datetime import timedelta

_DEFAULT_DEV_SECRET = "dev-secret-key-change-in-production"

class Config:
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", _DEFAULT_DEV_SECRET)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=30)

    @classmethod
    def init_app(cls, app):
        pass

    @classmethod
    def _validate_secret(cls, config_name):
        """Fail closed if the JWT secret is the insecure default in production."""
        secret = os.getenv("JWT_SECRET_KEY", _DEFAULT_DEV_SECRET)
        if config_name == "production" and secret == _DEFAULT_DEV_SECRET:
            print(
                "FATAL: JWT_SECRET_KEY is set to the insecure default. "
                "Set the JWT_SECRET_KEY environment variable before running in production.",
                file=sys.stderr,
            )
            sys.exit(1)

def _default_database_url():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    db_dir = os.path.join(base_dir, "data")
    os.makedirs(db_dir, exist_ok=True)
    db_path = os.path.join(db_dir, "fraud_detection.db")
    return "sqlite:///" + db_path.replace("\\", "/")

class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", _default_database_url())

    @classmethod
    def init_app(cls, app):
        # Warn loudly but don't block development
        if os.getenv("JWT_SECRET_KEY", _DEFAULT_DEV_SECRET) == _DEFAULT_DEV_SECRET:
            print(
                "WARNING: Using default JWT secret in development. "
                "Set JWT_SECRET_KEY before deploying.",
                file=sys.stderr,
            )

class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")

    @classmethod
    def init_app(cls, app):
        cls._validate_secret("production")

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
