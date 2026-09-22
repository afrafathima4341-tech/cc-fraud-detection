# Real-Time Credit Card Fraud Detection Using Graph Neural Networks

A full-stack fraud detection system leveraging Graph Neural Networks to identify fraudulent credit card transactions in real-time.

## Tech Stack

- **Backend**: Flask, Python 3.11+
- **Frontend**: React, Vite, TailwindCSS
- **Database**: PostgreSQL
- **ML/GNN**: PyTorch, PyTorch Geometric
- **Real-time**: WebSocket
- **Containerization**: Docker, Docker Compose

## Project Structure

```
cc-trnx/
├── backend/                 # Flask API server
│   ├── app/                # Application code
│   │   ├── models.py       # SQLAlchemy ORM models
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   └── config.py       # Configuration
│   ├── requirements.txt
│   └── run.py
├── frontend/                # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/       # API client
│   │   └── store/          # State management
│   ├── package.json
│   └── vite.config.js
├── ml/                      # Machine Learning pipeline
│   ├── train_gnn.py        # GNN model training
│   └── preprocessor.py     # Data preprocessing
├── docker-compose.yml       # Local development setup
└── README.md
```

## Getting Started

### Prerequisites

- Docker & Docker Compose (recommended)
- OR Python 3.11+, Node.js 18+, PostgreSQL 15

### Option 1: Docker (Recommended)

```bash
# Clone the repository
cd cc-trnx

# Build and start services
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop services
docker-compose down
```

Access the application:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **pgAdmin**: http://localhost:5050

### Option 2: Local Development

#### Backend

```bash
# Create virtual environment
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp ../.env.example .env

# Start PostgreSQL (ensure it's running on localhost:5432)
# Then run the backend
python run.py
```

Backend runs on `http://localhost:5000`

#### Frontend

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev
```

Frontend runs on `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Transactions
- `GET /api/transactions` - List transactions (paginated)
- `POST /api/transactions` - Create new transaction
- `GET /api/transactions/<id>` - Get transaction details

### Fraud Alerts
- `GET /api/fraud-alerts` - List fraud alerts
- `POST /api/fraud-alerts/<id>/feedback` - Submit feedback on alert

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Features

- ✅ User authentication with JWT
- ✅ Transaction management
- ✅ Real-time fraud detection (rule-based in Phase 1)
- ✅ WebSocket for live alerts
- ✅ Dashboard with fraud metrics
- ✅ Responsive UI with TailwindCSS
- 🔄 GNN model integration (Phase 3)
- 🔄 Explainable AI (Phase 3)

## Development Phases

### Phase 1: Foundation ✅
- Backend & Frontend setup
- Database schema
- Basic CRUD APIs
- Authentication

### Phase 2: Core APIs (In Progress)
- Transaction endpoints
- Fraud alert system
- Dashboard statistics

### Phase 3: GNN Model
- Graph construction
- GNN training
- Real-time inference
- Explainability

### Phase 4: UI & WebSocket
- Dashboard visualization
- Real-time alerts
- Transaction details

### Phase 5: Testing & Docs
- Unit tests
- Integration tests
- API documentation

## Testing

### Test Authentication Flow

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"testuser","password":"password123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Save the access_token from response
export TOKEN="your-token-here"

# Get current user
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
FLASK_ENV=development
DATABASE_URL=postgresql://fraud_user:fraud_password@localhost:5432/fraud_db
JWT_SECRET_KEY=your-secret-key-change-in-production
VITE_API_URL=http://localhost:5000
```

## Database Schema

### Tables
- `users` - User accounts
- `transactions` - Transaction records
- `fraud_alerts` - Fraud detection results
- `graph_edges` - Graph relationships for GNN

## Next Steps

1. Test the application locally
2. Implement Phase 3: GNN Model training
3. Add WebSocket real-time alerts
4. Build comprehensive test suite
5. Deploy to production

## Contributing

Feel free to fork and submit pull requests.

## License

MIT License
