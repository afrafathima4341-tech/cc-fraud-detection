# Credit Card Fraud Detection - API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All endpoints require JWT token in the `Authorization` header:
```
Authorization: Bearer <access_token>
```

---

## Authentication Endpoints

### Register User
Create a new user account.

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "SecurePass123"
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe",
    "created_at": "2024-01-15T10:30:00"
  }
}
```

### Login
Authenticate user and get access token.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

### Get Current User
Retrieve current authenticated user.

**Endpoint:** `GET /auth/me`

**Response (200 OK):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "johndoe",
  "created_at": "2024-01-15T10:30:00"
}
```

---

## Transaction Endpoints

### List Transactions
Get paginated list of transactions with optional filtering.

**Endpoint:** `GET /transactions`

**Query Parameters:**
- `page` (int, default: 1) - Page number
- `per_page` (int, default: 20) - Items per page
- `is_fraud` (bool) - Filter by fraud status
- `start_date` (ISO date string) - Start date filter
- `end_date` (ISO date string) - End date filter
- `min_amount` (float) - Minimum amount
- `max_amount` (float) - Maximum amount
- `customer_id` (string) - Filter by customer
- `merchant_id` (string) - Filter by merchant
- `sort_by` (string: created_at, amount, fraud_score) - Sort field
- `sort_order` (string: asc, desc) - Sort order

**Response (200 OK):**
```json
{
  "total": 150,
  "pages": 8,
  "current_page": 1,
  "per_page": 20,
  "transactions": [
    {
      "id": 1,
      "customer_id": "CUST001",
      "merchant_id": "MERCH001",
      "merchant_name": "Online Store",
      "card_id": "CARD001",
      "amount": 150.50,
      "category": "shopping",
      "timestamp": "2024-01-15T10:30:00",
      "is_fraud_predicted": false,
      "fraud_score": 0.125,
      "created_at": "2024-01-15T10:30:00"
    }
  ]
}
```

### Create Transaction
Submit a new transaction for fraud detection.

**Endpoint:** `POST /transactions`

**Request Body:**
```json
{
  "customer_id": "CUST001",
  "merchant_id": "MERCH001",
  "card_id": "CARD001",
  "amount": 150.50,
  "merchant_name": "Online Store",
  "category": "shopping",
  "timestamp": "2024-01-15T10:30:00"
}
```

**Response (201 Created):**
```json
{
  "message": "Transaction created",
  "transaction": {
    "id": 1,
    "customer_id": "CUST001",
    "merchant_id": "MERCH001",
    "amount": 150.50,
    "is_fraud_predicted": false,
    "fraud_score": 0.125,
    "created_at": "2024-01-15T10:30:00"
  }
}
```

### Get Transaction
Retrieve details of a specific transaction.

**Endpoint:** `GET /transactions/<id>`

**Response (200 OK):**
```json
{
  "id": 1,
  "customer_id": "CUST001",
  "merchant_id": "MERCH001",
  "merchant_name": "Online Store",
  "card_id": "CARD001",
  "amount": 150.50,
  "category": "shopping",
  "timestamp": "2024-01-15T10:30:00",
  "is_fraud_predicted": false,
  "fraud_score": 0.125,
  "created_at": "2024-01-15T10:30:00"
}
```

### Get Transaction Analytics
Get analytics for transactions over a period.

**Endpoint:** `GET /transactions/analytics/overview`

**Query Parameters:**
- `period` (string: 7d, 30d, 90d) - Time period

**Response (200 OK):**
```json
{
  "period": "7d",
  "total_transactions": 150,
  "fraud_count": 8,
  "average_amount": 250.50,
  "fraud_amount": 5000.00,
  "fraud_rate": 5.33,
  "high_risk_count": 3,
  "medium_risk_count": 5,
  "low_risk_count": 142
}
```

### Get Merchant Statistics
Get top merchants with fraud analysis.

**Endpoint:** `GET /transactions/analytics/merchants`

**Response (200 OK):**
```json
[
  {
    "merchant_id": "MERCH001",
    "merchant_name": "Online Store",
    "transaction_count": 150,
    "total_amount": 50000.00,
    "fraud_count": 5,
    "avg_fraud_score": 0.25,
    "fraud_rate": 3.33
  }
]
```

### Get Customer Statistics
Get high-risk customers.

**Endpoint:** `GET /transactions/analytics/customers`

**Response (200 OK):**
```json
[
  {
    "customer_id": "CUST001",
    "transaction_count": 50,
    "total_amount": 10000.00,
    "fraud_count": 2,
    "avg_fraud_score": 0.15,
    "fraud_rate": 4.0
  }
]
```

---

## Fraud Alert Endpoints

### List Fraud Alerts
Get paginated list of fraud alerts.

**Endpoint:** `GET /fraud-alerts`

**Query Parameters:**
- `page` (int, default: 1) - Page number
- `per_page` (int, default: 20) - Items per page
- `status` (string: confirmed, false_positive, unreviewed) - Filter by status

**Response (200 OK):**
```json
{
  "total": 8,
  "pages": 1,
  "current_page": 1,
  "alerts": [
    {
      "id": 1,
      "transaction_id": 1,
      "fraud_score": 0.85,
      "is_confirmed": false,
      "is_false_positive": false,
      "explanation": "Rule-based detection triggered...",
      "created_at": "2024-01-15T10:30:00",
      "transaction": {
        "id": 1,
        "customer_id": "CUST001",
        "amount": 5000.00
      }
    }
  ]
}
```

### Submit Alert Feedback
Mark an alert as confirmed fraud or false positive.

**Endpoint:** `POST /fraud-alerts/<id>/feedback`

**Request Body:**
```json
{
  "is_confirmed": true,
  "is_false_positive": false
}
```

**Response (200 OK):**
```json
{
  "message": "Feedback submitted",
  "alert": {
    "id": 1,
    "fraud_score": 0.85,
    "is_confirmed": true,
    "is_false_positive": false
  }
}
```

### Get Alert Explanation
Get detailed explanation for a fraud alert.

**Endpoint:** `GET /fraud-alerts/<id>/explanation`

**Response (200 OK):**
```json
{
  "transaction_id": 1,
  "fraud_score": 0.85,
  "risk_level": "HIGH",
  "factors": [
    {
      "factor": "UNUSUAL_AMOUNT",
      "description": "Transaction amount $5000 deviates significantly from customer average",
      "z_score": 2.5,
      "severity": "HIGH"
    }
  ],
  "customer_profile": {
    "transaction_count": 50,
    "avg_amount": 250,
    "fraud_rate": 4.0,
    "total_spent": 12500
  },
  "merchant_profile": {
    "merchant_name": "Online Store",
    "transaction_count": 500,
    "fraud_count": 15,
    "fraud_rate": 3.0
  },
  "similar_frauds": [
    {
      "transaction_id": 5,
      "amount": 4800,
      "merchant": "Online Store",
      "timestamp": "2024-01-10T15:20:00"
    }
  ],
  "recommendation": "BLOCK_IMMEDIATELY"
}
```

### Get Alert Summary
Get overview of all fraud alerts.

**Endpoint:** `GET /fraud-alerts/summary/overview`

**Response (200 OK):**
```json
{
  "total_alerts": 8,
  "confirmed": 6,
  "false_positives": 1,
  "unreviewed": 1,
  "avg_fraud_score": 0.65,
  "high_risk_count": 3,
  "recent_alerts": [...]
}
```

---

## Dashboard Endpoints

### Get Dashboard Statistics
Get key fraud detection metrics.

**Endpoint:** `GET /dashboard/stats`

**Response (200 OK):**
```json
{
  "total_transactions": 150,
  "fraud_transactions": 8,
  "false_positives": 1,
  "total_amount": 50000.00,
  "fraud_amount": 5000.00,
  "avg_fraud_score": 0.45,
  "fraud_percentage": 5.33,
  "transactions_24h": 25,
  "fraud_24h": 2
}
```

### Get Fraud Distribution
Get breakdown of transactions by risk level.

**Endpoint:** `GET /dashboard/fraud-distribution`

**Response (200 OK):**
```json
{
  "high_risk": 3,
  "medium_risk": 5,
  "low_risk": 142,
  "total": 150
}
```

### Get Trends
Get transaction trends over time.

**Endpoint:** `GET /dashboard/trends`

**Query Parameters:**
- `days` (int, default: 30) - Number of days

**Response (200 OK):**
```json
[
  {
    "date": "2024-01-15",
    "transactions": 10,
    "fraud": 1,
    "amount": 2500.00
  }
]
```

### Get Risk Categories
Get fraud breakdown by transaction category.

**Endpoint:** `GET /dashboard/risk-categories`

**Response (200 OK):**
```json
[
  {
    "category": "shopping",
    "transaction_count": 100,
    "fraud_count": 5,
    "avg_fraud_score": 0.25,
    "fraud_rate": 5.0
  }
]
```

---

## WebSocket Events

### Connection
```javascript
io('http://localhost:5000', {
  query: { token: '<jwt_token>' }
})
```

### Events

**fraud_alert** - Emitted when fraud is detected
```json
{
  "alert_id": 1,
  "transaction_id": 1,
  "fraud_score": 0.85,
  "merchant": "Online Store",
  "amount": 5000.00,
  "customer_id": "CUST001",
  "timestamp": "2024-01-15T10:30:00",
  "risk_level": "HIGH"
}
```

**transaction_update** - Emitted when new transaction is added
```json
{
  "id": 1,
  "customer_id": "CUST001",
  "merchant_id": "MERCH001",
  "amount": 150.50,
  "fraud_score": 0.125,
  "is_fraud_predicted": false
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "message": "Validation failed",
  "errors": ["email is required", "password too short"]
}
```

### 401 Unauthorized
```json
{
  "message": "Invalid email or password"
}
```

### 404 Not Found
```json
{
  "message": "Transaction not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Error creating transaction: ..."
}
```

---

## Testing

Run tests:
```bash
pytest backend/tests/ -v
```

With coverage:
```bash
pytest backend/tests/ --cov=backend/app --cov-report=html
```

---

## Rate Limiting
No rate limiting implemented in Phase 1. Add in production:
- 100 requests per minute per user
- 1000 requests per hour per user
