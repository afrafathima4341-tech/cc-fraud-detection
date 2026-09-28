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

    channel = str(data.get("channel") or "Card").strip().lower()
    card_required = channel in {"card", "pos", "credit card", "debit card"}
    if card_required and not data.get("card_id"):
        errors.append("card_id is required")
    elif data.get("card_id") and len(str(data["card_id"])) > 50:
        errors.append("card_id too long")

    if not data.get("amount"):
        errors.append("amount is required")
    else:
        valid, msg = validate_amount(data["amount"])
        if not valid:
            errors.append(f"amount: {msg}")

    if data.get("merchant_name") and len(str(data["merchant_name"])) > 255:
        errors.append("merchant_name too long")

    if data.get("merchant_bank") and len(str(data["merchant_bank"])) > 255:
        errors.append("merchant_bank too long")

    if data.get("merchant_location") and len(str(data["merchant_location"])) > 255:
        errors.append("merchant_location too long")

    if data.get("card_last4") and not re.match(r'^\d{4}$', str(data["card_last4"])):
        errors.append("card_last4 must be 4 digits")

    valid_card_networks = {"visa", "rupay", "mastercard", "american express"}
    card_network = str(data.get("card_network") or "").strip()
    if len(card_network) > 30:
        errors.append("card_network too long")
    elif card_network and card_network.lower() not in valid_card_networks:
        errors.append("card_network must be Visa, RuPay, Mastercard, or American Express")

    if channel == "upi":
        upi_id = str(data.get("upi_id") or "")
        if not upi_id:
            errors.append("upi_id is required for UPI transactions")
        elif len(upi_id) > 100 or not re.match(r'^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$', upi_id):
            errors.append("upi_id must be a valid UPI address")
        if not data.get("payer_bank"):
            errors.append("payer_bank is required for UPI transactions")

    if data.get("payer_bank") and len(str(data["payer_bank"])) > 100:
        errors.append("payer_bank too long")

    if data.get("channel") and len(str(data["channel"])) > 50:
        errors.append("channel too long")

    if data.get("currency") and len(str(data["currency"])) > 10:
        errors.append("currency too long")

    if data.get("ip_address") and len(str(data["ip_address"])) > 50:
        errors.append("ip_address too long")

    if data.get("device_id") and len(str(data["device_id"])) > 100:
        errors.append("device_id too long")

    if data.get("category") and len(str(data["category"])) > 50:
        errors.append("category too long")

    return errors
