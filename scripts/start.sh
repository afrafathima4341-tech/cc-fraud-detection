#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  trap - EXIT INT TERM
  for pid in "$FRONTEND_PID" "$BACKEND_PID"; do
    if [[ -n "$pid" ]]; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  for pid in "$FRONTEND_PID" "$BACKEND_PID"; do
    if [[ -n "$pid" ]]; then
      wait "$pid" 2>/dev/null || true
    fi
  done
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

printf '\033[1;34m[1/2] Starting backend server...\033[0m\n'
cd "$ROOT_DIR/backend"
source venv/bin/activate
python3 run.py > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"
sleep 2

printf '\033[1;34m[2/2] Starting frontend server...\033[0m\n'
cd "$ROOT_DIR/frontend"
npm run dev -- --host 0.0.0.0 > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID)"
sleep 2

printf '\nApplication started.\n'
printf 'Frontend: http://localhost:5174\n'
printf 'Backend:  http://localhost:5000\n'
printf 'Logs:     /tmp/backend.log and /tmp/frontend.log\n'
printf 'Press Ctrl+C to stop.\n'
wait "$BACKEND_PID" "$FRONTEND_PID"
