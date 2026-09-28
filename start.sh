#!/bin/bash

echo "════════════════════════════════════════════════════════════════"
echo "    🚀 Starting Credit Card Fraud Detection Application"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Start Backend
echo -e "${BLUE}[1/2] Starting Backend Server...${NC}"
cd /home/yasin/cc-trnx/backend
source venv/bin/activate
python3 run.py > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"
sleep 2

# Start Frontend
echo -e "${BLUE}[2/2] Starting Frontend Server...${NC}"
cd /home/yasin/cc-trnx/frontend
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"
sleep 2

echo ""
echo "════════════════════════════════════════════════════════════════"
echo -e "${GREEN}🎉 APPLICATION STARTED SUCCESSFULLY!${NC}"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "📍 Access the application at:"
echo -e "  ${BLUE}Frontend:  http://localhost:5174${NC}"
echo -e "  ${BLUE}Backend:   http://localhost:5000${NC}"
echo ""
echo "📊 Logs:"
echo "  Backend:  tail -f /tmp/backend.log"
echo "  Frontend: tail -f /tmp/frontend.log"
echo ""
echo "🛑 To stop the application:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "════════════════════════════════════════════════════════════════"

# Keep script running
wait
