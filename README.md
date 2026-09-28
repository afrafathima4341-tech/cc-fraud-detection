# Real-Time Credit Card Fraud Detection System

A full-stack application for detecting fraudulent credit card transactions using Graph Neural Networks (GNN), Flask REST APIs, React frontend, and real-time WebSocket alerts.

## 🎯 Features

- **Real-time Fraud Detection** - Analyzes transactions instantly using GNN and rule-based detection
- **User Authentication** - JWT token-based login/registration system
- **Transaction Management** - Submit and track credit card transactions
- **Fraud Analytics Dashboard** - View fraud statistics and metrics
- **Real-time Alerts** - WebSocket-powered live fraud notifications
- **Explainability** - Understand why a transaction was flagged as fraudulent
- **SQLite Database** - Auto-initialized, no external DB setup required

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### 1. Clone & Setup

```bash
# Navigate to project
cd cc-trnx

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Run the Application

**Terminal 1 - Start Backend:**
```bash
cd backend
source venv/bin/activate
python3 run.py
```
Backend will run on `http://localhost:5000`

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will run on `http://localhost:5173`

### 3. Login

Open your browser and go to: **http://localhost:5173**

Use these credentials:
- **Email:** `admin@fraud.local`
- **Password:** `Admin@12345`

## 📁 Project Structure

```
cc-trnx/
├── backend/                          # Flask REST API
│   ├── app/
│   │   ├── __init__.py              # App factory, Flask initialization
│   │   ├── config.py                # Configuration (development/production)
│   │   ├── models.py                # SQLAlchemy ORM models
│   │   │   ├── User                 # User accounts
│   │   │   ├── Transaction          # Transaction records
│   │   │   ├── FraudAlert           # Fraud alerts
│   │   │   └── GraphEdge            # Graph relationships
│   │   ├── routes/                  # API endpoints
│   │   │   ├── auth.py              # Login/Register endpoints
│   │   │   ├── transactions.py      # Transaction endpoints
│   │   │   ├── fraud_alerts.py      # Fraud alerts endpoints
│   │   │   └── dashboard.py         # Dashboard/Stats endpoints
│   │   └── services/                # Business logic
│   │       ├── fraud_detector.py    # Real-time fraud detection
│   │       ├── gnn_model_service.py # GNN model loading/prediction
│   │       └── explainability.py    # Explainable AI
│   ├── run.py                       # Flask server entry point
│   ├── requirements.txt             # Python dependencies
│   └── /tmp/fraud_detection.db      # SQLite database (auto-created)
│
├── frontend/                         # React + Vite UI
│   ├── src/
│   │   ├── components/              # Reusable React components
│   │   ├── pages/                   # Page components
│   │   ├── services/                # API client
│   │   ├── App.jsx                  # Main app component
│   │   └── main.jsx                 # React entry point
│   ├── package.json                 # Node dependencies
│   └── vite.config.js               # Vite configuration
│
└── README.md                         # This file
```

## 🔑 Authentication

### Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "username",
    "password": "SecurePass123"
  }'
```

**Response:**
```json
{
  "message": "User registered successfully",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "username",
    "created_at": "2026-09-22T08:40:37"
  }
}
```

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@fraud.local",
    "password": "Admin@12345"
  }'
```

**Response:**
```json
{
  "message": "Login successful",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "admin@fraud.local",
    "username": "admin"
  }
}
```

## 📊 API Endpoints

All endpoints (except `/api/auth/register` and `/api/auth/login`) require JWT token in header:
```
Authorization: Bearer <access_token>
```

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Transactions
- `GET /api/transactions` - List all transactions
- `POST /api/transactions` - Submit new transaction for fraud detection
- `GET /api/transactions/<id>` - Get transaction details

**Create Transaction:**
```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "CUST001",
    "merchant_id": "MERCH001",
    "card_id": "CARD001",
    "amount": 250.50,
    "merchant_name": "Online Store",
    "category": "shopping"
  }'
```

### Fraud Alerts
- `GET /api/fraud-alerts` - List fraud alerts
- `POST /api/fraud-alerts/<id>/feedback` - Mark alert as valid/invalid

### Dashboard
- `GET /api/dashboard/stats` - Get fraud statistics and metrics

**Response:**
```json
{
  "total_transactions": 45,
  "fraud_transactions": 3,
  "fraud_rate": 6.67,
  "total_amount": 10250.50,
  "fraud_amount": 450.00,
  "recent_alerts": [...]
}
```

## 🧠 Fraud Detection

The system uses two detection methods:

### 1. **Rule-Based Detection** (Primary)
Analyzes transactions based on heuristic rules:
- **Transaction Amount** - Flags unusually large transactions
- **Customer History** - Compares against customer's average
- **Merchant Behavior** - Checks if merchant has fraud history
- **Transaction Frequency** - Detects rapid transaction patterns

### 2. **Graph Neural Network** (GNN)
Advanced ML model that:
- Builds graph of customer-merchant-card relationships
- Uses graph patterns to predict fraud probability
- Provides confidence scores (high/medium/low)
- Falls back to rule-based if model unavailable

### Fraud Score Interpretation
```
0.0 - 0.2: ✅ MINIMAL RISK     - Transaction allowed
0.2 - 0.4: ⚠️  LOW RISK        - Transaction allowed with monitoring
0.4 - 0.6: ⚡ MEDIUM RISK      - Monitor closely
0.6 - 0.8: 🔴 HIGH RISK       - Require verification
0.8 - 1.0: 🚫 CRITICAL RISK   - Block immediately
```

## 🔄 How It Works

### Transaction Flow

```
1. User submits transaction via frontend
   ↓
2. Frontend sends POST /api/transactions to backend
   ↓
3. Backend validates transaction data
   ↓
4. Fraud detection service analyzes transaction:
   - Loads GNN model (if available)
   - Falls back to rule-based detection
   - Generates fraud score (0-1)
   - Creates explanation with reasoning
   ↓
5. Results stored in database:
   - Transaction record
   - Fraud score & status
   - Fraud alert (if flagged)
   ↓
6. WebSocket notifies frontend of new alert
   ↓
7. Frontend displays alert in real-time
   ↓
8. User sees fraud detection details & explanation
```

### Explainability

When a transaction is flagged, the system provides:
- **Risk Level** - CRITICAL/HIGH/MEDIUM/LOW/MINIMAL
- **Fraud Factors** - Specific reasons detected
- **Customer Profile** - Transaction history & fraud rate
- **Merchant Profile** - Merchant fraud history
- **Similar Frauds** - Similar flagged transactions
- **Recommendation** - BLOCK/VERIFY/MONITOR/ALLOW

## 🛠 Technology Stack

### Backend
- **Framework:** Flask (Python web framework)
- **Database:** SQLite (auto-initialized)
- **Authentication:** JWT (JSON Web Tokens)
- **ORM:** SQLAlchemy
- **Real-time:** Flask-SocketIO (WebSocket)
- **ML:** PyTorch, NumPy (fraud detection models)
- **API:** RESTful with CORS support

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite (fast development)
- **Styling:** TailwindCSS
- **HTTP Client:** Axios
- **Routing:** React Router
- **Real-time:** Socket.IO client

### Infrastructure
- **Database:** SQLite (/tmp/fraud_detection.db)
- **API Server:** Flask development server (port 5000)
- **Frontend Server:** Vite dev server (port 5173)

## 📝 Environment Variables

Backend uses environment variables from `.env` (auto-created):

```env
FLASK_ENV=development
DATABASE_URL=sqlite:////tmp/fraud_detection.db
JWT_SECRET_KEY=your-secret-key-here
FLASK_DEBUG=1
```

## 🧪 Testing the System

### Test Registration
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "username": "testuser",
    "password": "Test@1234"
  }'
```

### Test Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@test.com",
    "password": "Test@1234"
  }'
```

### Test Fraud Detection
```bash
# Get token first
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@fraud.local","password":"Admin@12345"}' \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

# Submit transaction
curl -X POST http://localhost:5000/api/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": "CUST001",
    "merchant_id": "MERCH001",
    "card_id": "CARD001",
    "amount": 50000,
    "merchant_name": "Luxury Store",
    "category": "shopping"
  }'
```

### View Dashboard Stats
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/dashboard/stats
```

## 🔍 Viewing Logs

**Backend logs:**
```bash
tail -f /tmp/backend.log
```

**Frontend logs:**
```bash
tail -f /tmp/frontend.log
```

## 🛑 Stopping Services

```bash
# Stop backend
pkill -f "python3 run.py"

# Stop frontend
pkill -f "npm run dev"

# Or use Ctrl+C in respective terminals
```

## 📊 Database Schema

### Users Table
```sql
- id (PRIMARY KEY)
- email (UNIQUE)
- username
- password_hash
- created_at
```

### Transactions Table
```sql
- id (PRIMARY KEY)
- user_id (FOREIGN KEY)
- customer_id
- merchant_id
- card_id
- amount
- merchant_name
- category
- fraud_score
- is_fraud_predicted
- created_at
```

### Fraud Alerts Table
```sql
- id (PRIMARY KEY)
- transaction_id (FOREIGN KEY)
- alert_type
- risk_level
- explanation
- created_at
```

## 🚀 Deployment

To run in production:

1. Set environment variables:
   ```bash
   export FLASK_ENV=production
   export JWT_SECRET_KEY=your-very-secure-key
   ```

2. Use production WSGI server:
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:5000 backend.run:app
   ```

3. Build frontend:
   ```bash
   cd frontend
   npm run build
   # Serve dist/ folder with nginx or similar
   ```

## 🐛 Troubleshooting

### Issue: "Login failed"
- **Solution:** Ensure both backend and frontend are running
  ```bash
  # Check backend
  ps aux | grep "python3 run.py"
  
  # Check frontend
  ps aux | grep "npm run dev"
  ```

### Issue: "Backend connection error"
- **Solution:** Restart both services
  ```bash
  pkill -f "python3 run.py"
  pkill -f "npm run dev"
  
  # Restart backend first, then frontend
  ```

### Issue: Database locked
- **Solution:** Delete old database and restart
  ```bash
  rm /tmp/fraud_detection.db
  python3 run.py
  ```

### Issue: Port already in use
- **For port 5000:** `lsof -i :5000` and `kill -9 <PID>`
- **For port 5173:** `lsof -i :5173` and `kill -9 <PID>`

## 👤 Default Admin Account

| Field | Value |
|-------|-------|
| Email | `admin@fraud.local` |
| Username | `admin` |
| Password | `Admin@12345` |

## 📄 License

MIT License - feel free to use this project as a reference

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues or questions, please check the troubleshooting section or create an issue in the repository.

---

**Happy fraud detection! 🔐**
