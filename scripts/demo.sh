#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
API_BASE="${AXIOMA_API_BASE:-http://localhost:5000/api}"
FRONTEND_URL="${AXIOMA_FRONTEND_URL:-http://localhost:5174}"
DEMO_EMAIL="${AXIOMA_DEMO_EMAIL:-admin@fraud.local}"
DEMO_PASSWORD="${AXIOMA_DEMO_PASSWORD:-Admin@12345}"
DEMO_USERNAME="${AXIOMA_DEMO_USERNAME:-admin}"
DEMO_INTERVAL="${AXIOMA_DEMO_INTERVAL:-2}"
SIMULATOR_PID=""
START_PID=""

cleanup() {
  trap - EXIT INT TERM
  if [[ -n "$SIMULATOR_PID" ]]; then
    kill "$SIMULATOR_PID" 2>/dev/null || true
    wait "$SIMULATOR_PID" 2>/dev/null || true
  fi
  if [[ -n "$START_PID" ]]; then
    # Send SIGTERM to start.sh so its cleanup trap terminates backend & frontend
    kill -TERM "$START_PID" 2>/dev/null || true
    wait "$START_PID" 2>/dev/null || true
    pkill -f "python3 run.py" 2>/dev/null || true
    pkill -f "vite --host" 2>/dev/null || true
  fi
  echo "Demo stopped."
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

echo "=== AXIOMA Real-time Fraud Demo ==="
echo "Starting backend and frontend..."
(cd "$ROOT_DIR" && exec "$SCRIPT_DIR/start.sh") &
START_PID=$!

backend_status() {
  curl -sS --max-time 2 -o /dev/null -w '%{http_code}' "$API_BASE/auth/login" 2>/dev/null || true
}

echo "Waiting for backend..."
backend_ready=false
for ((attempt = 1; attempt <= 30; attempt++)); do
  if [[ "$(backend_status)" == "405" ]]; then
    backend_ready=true
    break
  fi
  if ! kill -0 "$START_PID" 2>/dev/null; then
    break
  fi
  sleep 1
done
if [[ "$backend_ready" != true ]]; then
  echo "Backend did not become ready. Check /tmp/backend.log" >&2
  exit 1
fi

register_payload="$(python3 -c 'import json,sys; print(json.dumps({"email":sys.argv[1],"username":sys.argv[2],"password":sys.argv[3]}))' "$DEMO_EMAIL" "$DEMO_USERNAME" "$DEMO_PASSWORD")"
curl -sS --max-time 10 -X POST "$API_BASE/auth/register" \
  -H 'Content-Type: application/json' -d "$register_payload" -o /dev/null || true

login_payload="$(python3 -c 'import json,sys; print(json.dumps({"email":sys.argv[1],"password":sys.argv[2]}))' "$DEMO_EMAIL" "$DEMO_PASSWORD")"
login_response="$(curl -sS --max-time 10 -X POST "$API_BASE/auth/login" \
  -H 'Content-Type: application/json' -d "$login_payload")"
TOKEN="$(printf '%s' "$login_response" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("access_token", ""))')"
if [[ -z "$TOKEN" ]]; then
  echo "Demo login failed: $login_response" >&2
  exit 1
fi

seed_transactions=(
'{"customer_id":"CUST001","merchant_id":"MERCH001","card_id":"CARD001","card_last4":"1001","card_network":"Visa","amount":120.50,"merchant_name":"Coffee Shop","merchant_bank":"HDFC Bank","merchant_location":"Mumbai","category":"food","channel":"Card","currency":"INR","ip_address":"203.0.113.10","device_id":"dev-001"}'
'{"customer_id":"CUST002","merchant_id":"MERCH002","card_id":"CARD002","card_last4":"2002","card_network":"RuPay","amount":45000,"merchant_name":"Luxury Watches","merchant_bank":"ICICI Bank","merchant_location":"Delhi","category":"shopping","channel":"Card","currency":"INR","ip_address":"198.51.100.22","device_id":"dev-002"}'
'{"customer_id":"CUST001","merchant_id":"MERCH003","card_id":"","amount":5.99,"merchant_name":"Grocery","merchant_bank":"State Bank of India","merchant_location":"Mumbai","category":"food","channel":"UPI","upi_id":"demo@okaxis","payer_bank":"Axis Bank","currency":"INR","ip_address":"203.0.113.10","device_id":"dev-001"}'
'{"customer_id":"CUST003","merchant_id":"MERCH004","card_id":"","amount":2500,"merchant_name":"Electronics Hub","merchant_bank":"Kotak Mahindra Bank","merchant_location":"Bengaluru","category":"electronics","channel":"Net Banking","currency":"INR","ip_address":"192.0.2.45","device_id":"dev-003"}'
)

echo "Seeding demo transactions..."
for transaction in "${seed_transactions[@]}"; do
  response="$(curl -sS --max-time 20 -X POST "$API_BASE/transactions" \
    -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$transaction")"
  printf '%s' "$response" | python3 -c 'import json,sys; body=json.load(sys.stdin); tx=body.get("transaction"); print("  TX #{} | INR {:,.2f} | {}".format(tx["id"], tx["amount"], tx["channel"]) if tx else "  Request rejected: " + body.get("message", "unknown error"))'
  sleep 0.5
done

echo ""
echo "Open $FRONTEND_URL and log in with $DEMO_EMAIL / $DEMO_PASSWORD"
echo "Keep the dashboard open. INR transactions arrive every ${DEMO_INTERVAL}s."
echo "The stream includes UPI, card, and net-banking payments."
echo "Press Ctrl+C to stop."
echo ""

merchants=("Cedar Cafe" "Metro Mart" "Lotus Electronics" "Indigo Books" "Riverfront Hotel" "City Pharmacy")
categories=("food" "groceries" "electronics" "books" "travel" "health")
customers=("CUST1001" "CUST1002" "CUST1003" "CUST1004" "CUST1005")
banks=("State Bank of India" "HDFC Bank" "ICICI Bank" "Axis Bank" "Kotak Mahindra Bank" "Punjab National Bank")
cities=("Mumbai" "Bengaluru" "Delhi" "Hyderabad" "Chennai" "Pune")
sequence=0

(
  while true; do
    sequence=$((sequence + 1))
    index=$(((sequence - 1) % ${#merchants[@]}))
    customer_index=$(((sequence - 1) % ${#customers[@]}))
    bank_index=$(((sequence - 1) % ${#banks[@]}))
    amount=$((RANDOM % 50000 + 10))
    if (( RANDOM % 5 == 0 )); then
      amount=$((RANDOM % 100000 + 50000))
    fi

    channel=""
    card_id=""
    card_last4=""
    card_network=""
    upi_id=""
    payer_bank=""
    case $((sequence % 3)) in
      0)
        channel="UPI"
        upi_id="demo${sequence}@okaxis"
        payer_bank="${banks[$bank_index]}"
        ;;
      1)
        channel="Card"
        card_id="CARD$(printf '%03d' "$((customer_index + 1))")"
        card_last4="$(printf '%04d' "$((sequence % 10000))")"
        case $(((sequence - 1) / 3 % 3)) in
          0) card_network="Visa" ;;
          1) card_network="RuPay" ;;
          *) card_network="Mastercard" ;;
        esac
        ;;
      *) channel="Net Banking" ;;
    esac

    payload="$(python3 -c 'import json,sys; print(json.dumps({"customer_id":sys.argv[1],"merchant_id":sys.argv[2],"card_id":sys.argv[3],"card_last4":sys.argv[4],"card_network":sys.argv[5],"amount":float(sys.argv[6]),"merchant_name":sys.argv[7],"merchant_bank":sys.argv[8],"merchant_location":sys.argv[9],"category":sys.argv[10],"channel":sys.argv[11],"currency":"INR","upi_id":sys.argv[12],"payer_bank":sys.argv[13]}))' \
      "${customers[$customer_index]}" "MERCH$(printf '%03d' "$((index + 1))")" "$card_id" "$card_last4" "$card_network" "$amount" \
      "${merchants[$index]}" "${banks[$bank_index]}" "${cities[$index]}" "${categories[$index]}" "$channel" "$upi_id" "$payer_bank")"

    response="$(curl -sS --max-time 20 -X POST "$API_BASE/transactions" \
      -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "$payload")"
    printf '%s' "$response" | python3 -c 'import json,sys; body=json.load(sys.stdin); tx=body.get("transaction"); print("TX #{} | INR {:,.2f} | {} | {} | {} (risk {:.2f})".format(tx["id"], tx["amount"], tx["channel"], tx.get("merchant_name", "Merchant"), "FLAGGED" if tx["is_fraud_predicted"] else "approved", tx["fraud_score"]) if tx else "Request rejected: " + body.get("message", "unknown error"))'
    sleep "$DEMO_INTERVAL"
  done
) &
SIMULATOR_PID=$!
wait "$START_PID"
