from flask import request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db
from app.models import User
from app.utils.validators import validate_email, validate_password


def register():
    data = request.get_json()

    if not data or not data.get("email") or not data.get("password") or not data.get("username"):
        return jsonify({"message": "Missing required fields"}), 400

    # Validate email format
    if not validate_email(data["email"]):
        return jsonify({"message": "Invalid email format"}), 400

    # Validate password strength
    valid, msg = validate_password(data["password"])
    if not valid:
        return jsonify({"message": msg}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"message": "Email already exists"}), 409

    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"message": "Username already exists"}), 409

    user = User(email=data["email"], username=data["username"])
    user.set_password(data["password"])

    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "User registered successfully",
        "access_token": access_token,
        "user": user.to_dict()
    }), 201


def login():
    data = request.get_json()

    if not data or not data.get("email") or not data.get("password"):
        return jsonify({"message": "Missing email or password"}), 400

    user = User.query.filter_by(email=data["email"]).first()

    if not user or not user.check_password(data["password"]):
        return jsonify({"message": "Invalid email or password"}), 401

    access_token = create_access_token(identity=str(user.id))

    return jsonify({
        "message": "Login successful",
        "access_token": access_token,
        "user": user.to_dict()
    }), 200


@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"message": "User not found"}), 404

    return jsonify(user.to_dict()), 200
