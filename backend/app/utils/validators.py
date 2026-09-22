import re
from functools import wraps
from flask import request, jsonify

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one digit"
    return True, "Valid"

def validate_amount(amount):
    try:
        amt = float(amount)
        if amt < 0:
            return False, "Amount cannot be negative"
        if amt > 1000000:
            return False, "Amount exceeds maximum limit"
        return True, "Valid"
    except (ValueError, TypeError):
        return False, "Amount must be a number"

def validate_transaction_input(data):
    errors = []

    if not data.get("customer_id"):
        errors.append("customer_id is required")
    elif len(str(data["customer_id"])) > 50:
        errors.append("customer_id too long")

    if not data.get("merchant_id"):
        errors.append("merchant_id is required")
    elif len(str(data["merchant_id"])) > 50:
        errors.append("merchant_id too long")

    if not data.get("card_id"):
        errors.append("card_id is required")
    elif len(str(data["card_id"])) > 50:
        errors.append("card_id too long")

    if not data.get("amount"):
        errors.append("amount is required")
    else:
        valid, msg = validate_amount(data["amount"])
        if not valid:
            errors.append(f"amount: {msg}")

    if data.get("merchant_name") and len(str(data["merchant_name"])) > 255:
        errors.append("merchant_name too long")

    if data.get("category") and len(str(data["category"])) > 50:
        errors.append("category too long")

    return errors
