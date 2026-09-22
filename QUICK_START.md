# Quick Start Guide

## 🚀 Start with Docker Compose (Easiest)

```bash
# 1. Clone/navigate to project
cd /home/yasin/cc-trnx

# 2. Start all services
docker-compose up -d

# 3. Wait a few seconds for database to be ready
sleep 10

# 4. Check services are running
docker-compose ps

# 5. Open browser
# Frontend: http://localhost:5173
# Backend API: http://localhost:5000
# pgAdmin: http://localhost:5050 (admin@admin.com / admin)
```

## 📝 Test the Application

### 1. Register a new user

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "username": "testuser",
    "password": "password123"
  }'
```

Response will include `access_token`. Save it:
```bash
export TOKEN="your-access-token-here"
```

### 2. Get dashboard stats

```bash
curl http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Create a test transaction

```bash
curl -X POST http://localhost:5000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "customer_id": "CUST001",
    "merchant_id": "MERCH001",
    "card_id": "CARD001",
    "amount": 150.50,
    "merchant_name": "Online Store",
    "category": "shopping",
    "timestamp": "'$(date -Iseconds)'"
  }'
```

### 4. List transactions

```bash
curl http://localhost:5000/api/transactions \
  -H "Authorization: Bearer $TOKEN"
```

### 5. View in browser

Open http://localhost:5173 and login with your test credentials

## 🛑 Stop Services

```bash
docker-compose down
```

## 📊 Database Access

PgAdmin is available at: http://localhost:5050
- Email: admin@admin.com
- Password: admin

To connect to the database:
1. Click "Add New Server"
2. Name: "Fraud Detection DB"
3. Connection tab:
   - Host: postgres
   - Port: 5432
   - Username: fraud_user
   - Password: fraud_password
   - Database: fraud_db

## 🔧 Local Development (Without Docker)

### Backend

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start PostgreSQL (you need this running separately)
# Then start backend
python run.py
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

## 📚 API Documentation

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| GET | /api/auth/me | Get current user |
| GET | /api/transactions | List transactions |
| POST | /api/transactions | Create transaction |
| GET | /api/transactions/<id> | Get transaction |
| GET | /api/fraud-alerts | List fraud alerts |
| POST | /api/fraud-alerts/<id>/feedback | Submit feedback |
| GET | /api/dashboard/stats | Get stats |

## 🐛 Troubleshooting

### Port already in use
```bash
# Kill process using port
lsof -ti:5000 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
lsof -ti:5432 | xargs kill -9  # Database
```

### Database connection error
```bash
# Check if PostgreSQL container is running
docker-compose ps

# View logs
docker-compose logs postgres

# Restart PostgreSQL
docker-compose restart postgres
```

### Frontend can't connect to backend
- Make sure backend is running: http://localhost:5000/api/dashboard/stats
- Check CORS is enabled in Flask
- Verify proxy settings in vite.config.js

## ✨ Next Steps

- Run unit tests
- Implement GNN model (Phase 3)
- Add WebSocket real-time alerts (Phase 5)
- Deploy to production
