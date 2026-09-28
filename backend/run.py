import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, socketio

app = create_app(os.getenv("FLASK_ENV", "development"))

if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "1") == "1"
    socketio.run(app, host="0.0.0.0", port=5000, debug=debug, allow_unsafe_werkzeug=True)
