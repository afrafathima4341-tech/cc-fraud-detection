"""
Routes for Investigator Case Management and Incident Triage Workflows.
Supports status updates, priority escalation, actions (freeze card, block merchant), and incident report CSV export.
"""
from flask import request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timezone
import csv
import io
from app import db
from app.models import InvestigationCase, Transaction, User


@jwt_required()
def list_cases():
    """List investigation cases with status/priority filters and pagination."""
    user_id = get_jwt_identity()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 20, type=int)
    status_filter = request.args.get("status", None)
    priority_filter = request.args.get("priority", None)

    query = InvestigationCase.query.filter_by(user_id=user_id)

    if status_filter:
        query = query.filter_by(status=status_filter.upper())
    if priority_filter:
        query = query.filter_by(priority=priority_filter.upper())

    cases_paginated = query.order_by(InvestigationCase.created_at.desc()).paginate(page=page, per_page=per_page)

    return jsonify({
        "total": cases_paginated.total,
        "pages": cases_paginated.pages,
        "current_page": page,
        "cases": [c.to_dict() for c in cases_paginated.items]
    }), 200


@jwt_required()
def create_case():
    """Open a new investigation case for a suspicious transaction."""
    user_id = get_jwt_identity()
    data = request.get_json() or {}

    transaction_id = data.get("transaction_id")
    if not transaction_id:
        return jsonify({"message": "transaction_id is required"}), 400

    tx = Transaction.query.filter_by(id=transaction_id, user_id=user_id).first()
    if not tx:
        return jsonify({"message": "Transaction not found"}), 404

    # Generate unique case number
    case_count = InvestigationCase.query.filter_by(user_id=user_id).count()
    case_number = f"CASE-{datetime.now().year}-{case_count + 1001:04d}"

    priority = data.get("priority", "HIGH" if tx.is_fraud_predicted else "MEDIUM")
    notes = data.get("notes", f"Investigating anomalous transaction #{tx.id} of {tx.amount} {tx.currency}")

    case = InvestigationCase(
        user_id=user_id,
        transaction_id=tx.id,
        case_number=case_number,
        priority=priority,
        status="OPEN",
        assigned_analyst=data.get("assigned_analyst", "Lead Risk Analyst"),
        action_taken=data.get("action_taken", "NONE"),
        notes=notes
    )

    db.session.add(case)
    db.session.commit()

    return jsonify({
        "message": "Investigation case opened successfully",
        "case": case.to_dict()
    }), 201


@jwt_required()
def get_case(case_id):
    """Retrieve details of a specific investigation case."""
    user_id = get_jwt_identity()
    case = InvestigationCase.query.filter_by(id=case_id, user_id=user_id).first()

    if not case:
        return jsonify({"message": "Investigation case not found"}), 404

    return jsonify(case.to_dict()), 200


@jwt_required()
def update_case(case_id):
    """Update case status, notes, or triage actions taken."""
    user_id = get_jwt_identity()
    case = InvestigationCase.query.filter_by(id=case_id, user_id=user_id).first()

    if not case:
        return jsonify({"message": "Investigation case not found"}), 404

    data = request.get_json() or {}

    if "status" in data:
        case.status = data["status"].upper()
    if "priority" in data:
        case.priority = data["priority"].upper()
    if "assigned_analyst" in data:
        case.assigned_analyst = data["assigned_analyst"]
    if "action_taken" in data:
        case.action_taken = data["action_taken"].upper()
    if "notes" in data:
        case.notes = data["notes"]

    db.session.commit()

    return jsonify({
        "message": "Investigation case updated successfully",
        "case": case.to_dict()
    }), 200


@jwt_required()
def export_cases_csv():
    """Export investigation cases as a CSV audit report."""
    user_id = get_jwt_identity()
    cases = InvestigationCase.query.filter_by(user_id=user_id).order_by(InvestigationCase.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Case Number", "Status", "Priority", "Assigned Analyst",
        "Action Taken", "Transaction ID", "Amount", "Currency",
        "Customer ID", "Merchant ID", "Created At", "Notes"
    ])

    for c in cases:
        tx = c.transaction
        writer.writerow([
            c.case_number,
            c.status,
            c.priority,
            c.assigned_analyst,
            c.action_taken,
            c.transaction_id,
            tx.amount if tx else "",
            tx.currency if tx else "",
            tx.customer_id if tx else "",
            tx.merchant_id if tx else "",
            c.created_at.isoformat(),
            c.notes.replace("\n", " ") if c.notes else ""
        ])

    output.seek(0)
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=fraud_cases_report.csv"}
    )
