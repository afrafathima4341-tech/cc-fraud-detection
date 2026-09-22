from flask import request
from flask_socketio import emit, join_room, leave_room
from flask_jwt_extended import decode_token
from backend.app import socketio
import json

# Store connected users
connected_users = {}

@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection."""
    token = request.args.get('token')
    if not token:
        return False

    try:
        # Decode JWT token
        decoded = decode_token(token)
        user_id = decoded['sub']
        connected_users[request.sid] = user_id

        # Join user's room
        join_room(f"user_{user_id}")

        emit('connection', {
            'status': 'connected',
            'message': f'User {user_id} connected',
        })

        print(f"User {user_id} connected (SID: {request.sid})")
        return True

    except Exception as e:
        print(f"Connection failed: {e}")
        return False


@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection."""
    sid = request.sid
    if sid in connected_users:
        user_id = connected_users[sid]
        del connected_users[sid]
        print(f"User {user_id} disconnected (SID: {sid})")


@socketio.on('join_alerts')
def on_join_alerts():
    """Join alerts room."""
    sid = request.sid
    if sid in connected_users:
        user_id = connected_users[sid]
        join_room(f"alerts_{user_id}")
        emit('alert_room_joined', {
            'status': 'success',
            'message': 'Joined alerts room'
        })
        print(f"User {user_id} joined alerts room")


@socketio.on('leave_alerts')
def on_leave_alerts():
    """Leave alerts room."""
    sid = request.sid
    if sid in connected_users:
        user_id = connected_users[sid]
        leave_room(f"alerts_{user_id}")
        emit('alert_room_left', {
            'status': 'success',
            'message': 'Left alerts room'
        })


@socketio.on('ping')
def handle_ping():
    """Handle ping/keep-alive."""
    emit('pong', {'timestamp': datetime.utcnow().isoformat()})


def broadcast_fraud_alert(user_id, alert_data):
    """Broadcast fraud alert to user."""
    socketio.emit(
        'fraud_alert',
        alert_data,
        room=f"alerts_{user_id}",
        namespace='/'
    )


def broadcast_transaction_update(user_id, transaction_data):
    """Broadcast transaction update to user."""
    socketio.emit(
        'transaction_update',
        transaction_data,
        room=f"user_{user_id}",
        namespace='/'
    )


def get_connected_users():
    """Get list of connected users."""
    return list(set(connected_users.values()))


from datetime import datetime
