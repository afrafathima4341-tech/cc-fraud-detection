#!/bin/bash
set -e

echo "=== AXIOMA Fraud Demo ==="
echo "Starting backend & frontend..."
./start.sh &
DEMO_PID=$!

# Wait for backend to be ready
echo "Waiting for backend..."
for i in {1..30}; do
  if curl -s http://localhost:5000/api/auth/login -o /dev/null -w "%{http_code}" | grep -q 405; then
    echo "Backend is up"
    break
  fi
  echo "  ...$i"
  sleep 1
done

echo "Logging in..."

# First, try to register the admin user (ignore if already exists)
REG_RESP=$(curl -s -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fraud.local","password":"Admin@12345","username":"admin"}')

# Now try to log in
LOGIN_RESP=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fraud.local","password":"Admin@12345"}')
TOKEN=$(echo "$LOGIN_RESP" | python3 -c "import sys,json; data=json.load(sys.stdin); print(data.get('access_token',''))")

if [ -z "$TOKEN" ]; then
  echo "Login failed. Response: $LOGIN_RESP"
  kill $DEMO_PID
  exit 1
fi

echo "Seeding demo transactions..."

SEED=(
'{"customer_id":"CUST001","merchant_id":"MERCH001","card_id":"CARD001","card_last4":"1001","amount":120.50,"merchant_name":"Coffee Shop","merchant_bank":"Local Bank","merchant_location":"San Francisco","category":"food","channel":"pos","currency":"USD","ip_address":"203.0.113.10","device_id":"dev-001"}'
'{"customer_id":"CUST002","merchant_id":"MERCH002","card_id":"CARD002","card_last4":"2002","amount":45000,"merchant_name":"Luxury Watches","merchant_bank":"Global Bank","merchant_location":"New York","category":"shopping","channel":"online","currency":"USD","ip_address":"198.51.100.22","device_id":"dev-002"}'
'{"customer_id":"CUST001","merchant_id":"MERCH003","card_id":"CARD001","card_last4":"1001","amount":5.99,"merchant_name":"Grocery","merchant_bank":"Local Bank","merchant_location":"San Francisco","category":"food","channel":"online","currency":"USD","ip_address":"203.0.113.10","device_id":"dev-001"}'
'{"customer_id":"CUST003","merchant_id":"MERCH004","card_id":"CARD003","card_last4":"3003","amount":2500,"merchant_name":"Electronics Hub","merchant_bank":"Tech Bank","merchant_location":"Austin","category":"electronics","channel":"pos","currency":"USD","ip_address":"192.0.2.45","device_id":"dev-003"}'
)

for tx in "${SEED[@]}"; do
  RESP=$(curl -s -X POST http://localhost:5000/api/transactions \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$tx")
  MSG=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('message','UNKNOWN'))" 2>/dev/null)
  if [ "$MSG" = "Transaction created" ]; then
    echo "  seeded"
  else
    echo "  ERROR seeding: $MSG"
  fi
  sleep 0.5
done

echo "Starting real-time transaction simulator..."
echo "  Transactions will appear every 2 seconds with real and fraud mix"

(
  MERCHANTS=("Coffee Shop" "Luxury Watches" "Grocery" "Electronics Hub" "Book Store" "Gas Station" "Restaurant" "Clothing" "Jewelry" "Hotel")
  CATEGORIES=("food" "shopping" "food" "electronics" "shopping" "transport" "food" "shopping" "shopping" "travel")
  CUSTOMERS=("CUST001" "CUST002" "CUST003" "CUST004" "CUST005")
  while true; do
    # Randomly pick data
    idx=$((RANDOM % 10))
    cust_idx=$((RANDOM % 5))
    amt=$((RANDOM % 50000 + 10))
    # Make some transactions high-risk to trigger fraud
    if [ $((RANDOM % 5)) -eq 0 ]; then
      amt=$((RANDOM % 100000 + 50000))
    fi
    
    MERCHANT_NAME=${MERCHANTS[$idx]}
    CATEGORY=${CATEGORIES[$idx]}
    CUSTOMER_ID=${CUSTOMERS[$cust_idx]}
    
    curl -s -X POST http://localhost:5000/api/transactions \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"customer_id\":\"$CUSTOMER_ID\",\"merchant_id\":\"MERCH${idx}01\",\"card_id\":\"CARD${idx}01\",\"card_last4\":\"${idx}001\",\"amount\":$amt,\"merchant_name\":\"$MERCHANT_NAME\",\"merchant_bank\":\"Bank${idx}\",\"merchant_location\":\"City${idx}\",\"category\":\"$CATEGORY\",\"channel\":\"$( [ $((RANDOM % 2)) -eq 0 ] && echo 'pos' || echo 'online')\",\"currency\":\"USD\",\"ip_address\":\"192.168.1.$((RANDOM % 255))\",\"device_id\":\"dev-$((RANDOM % 100))\"}" > /dev/null &
    
    # Fixed 2 second interval
    sleep 2
  done
) &

echo ""
echo "Demo ready!"
echo "Open http://localhost:5174"
echo "Login with admin@fraud.local / Admin@12345"
echo ""
echo "Press Ctrl+C to stop"
wait $DEMO_PID
