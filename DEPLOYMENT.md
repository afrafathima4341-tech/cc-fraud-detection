# Deployment Guide

## Prerequisites
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)
- Python 3.11+ (if running locally)
- Node.js 18+ (if running locally)

---

## Local Development

### 1. Clone Repository
```bash
git clone <repository-url>
cd cc-trnx
```

### 2. Using Docker Compose (Recommended)
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

Access:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- PgAdmin: http://localhost:5050

### 3. Local Setup (Without Docker)

#### Backend Setup
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
FLASK_ENV=development
DATABASE_URL=postgresql://fraud_user:fraud_password@localhost:5432/fraud_db
JWT_SECRET_KEY=your-secret-key-change-in-production
EOF

# Run database migrations (if using migrations)
# flask db upgrade

# Start backend
python run.py
```

#### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cat > .env.local << EOF
VITE_API_URL=http://localhost:5000
EOF

# Start development server
npm run dev
```

#### Database Setup
```bash
# PostgreSQL should be running on localhost:5432
# Create database and user
psql -U postgres << EOF
CREATE USER fraud_user WITH PASSWORD 'fraud_password';
CREATE DATABASE fraud_db OWNER fraud_user;
EOF
```

---

## Production Deployment

### 1. Prepare Environment

#### AWS EC2 / DigitalOcean Droplet
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Production Docker Compose

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    environment:
      FLASK_ENV: production
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
    restart: always
    volumes:
      - ./ml/models:/app/ml/models

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    environment:
      VITE_API_URL: https://api.yourdomain.com
    ports:
      - "5173:80"
    restart: always

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
      - frontend
    restart: always

volumes:
  postgres_data:
```

### 3. Environment Variables

Create `.env.prod`:
```bash
# Database
DB_USER=fraud_user
DB_PASSWORD=<secure-password>
DB_NAME=fraud_db

# Flask
FLASK_ENV=production
JWT_SECRET_KEY=<secure-random-key>

# Optional
ADMIN_EMAIL=admin@yourdomain.com
LOG_LEVEL=INFO
```

Generate secure keys:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 4. Nginx Configuration

Create `nginx.conf`:
```nginx
upstream backend {
    server backend:5000;
}

upstream frontend {
    server frontend:5173;
}

server {
    listen 80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # API routes
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
    }
}
```

### 5. SSL Certificates

Using Let's Encrypt with Certbot:
```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

certbot certonly --standalone -d yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/key.pem
```

### 6. Deploy

```bash
# Pull latest code
git pull origin main

# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Run migrations if needed
docker-compose -f docker-compose.prod.yml exec backend flask db upgrade
```

### 7. Backups

Automatic database backups:
```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backups/fraud_detection"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/fraud_db_$DATE.sql"

mkdir -p $BACKUP_DIR

docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump \
  -U fraud_user fraud_db > $BACKUP_FILE

gzip $BACKUP_FILE

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

Add to crontab:
```bash
0 2 * * * /path/to/backup.sh
```

---

## Monitoring

### Health Checks

```bash
# Check backend health
curl http://localhost:5000/api/dashboard/stats

# Check database
docker-compose exec postgres psql -U fraud_user -d fraud_db -c "SELECT count(*) FROM transactions;"

# Check frontend
curl http://localhost:5173
```

### Logging

View container logs:
```bash
# Backend logs
docker-compose logs backend

# Database logs
docker-compose logs postgres

# Frontend logs
docker-compose logs frontend
```

### Performance Monitoring

Install monitoring stack (optional):
```bash
# Prometheus + Grafana
docker-compose -f docker-compose.monitoring.yml up -d
```

---

## Scaling

### Load Balancing

Use AWS ALB or nginx upstream:
```nginx
upstream backend {
    server backend1:5000;
    server backend2:5000;
    server backend3:5000;
}
```

### Database Optimization

```sql
-- Index frequently queried columns
CREATE INDEX idx_customer_fraud ON transactions(customer_id, is_fraud_predicted);
CREATE INDEX idx_merchant_fraud ON transactions(merchant_id, is_fraud_predicted);

-- Archive old data
CREATE TABLE transactions_archive AS 
SELECT * FROM transactions WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM transactions WHERE created_at < NOW() - INTERVAL '1 year';
```

### Caching

Add Redis:
```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
```

---

## Troubleshooting

### Database Connection Failed
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check logs
docker-compose logs postgres

# Verify connection
docker-compose exec postgres psql -U fraud_user -d fraud_db -c "SELECT 1"
```

### Backend Won't Start
```bash
# Check logs
docker-compose logs backend

# Rebuild image
docker-compose build --no-cache backend

# Restart
docker-compose up -d backend
```

### High Fraud Score False Positives
- Retrain GNN model with updated dataset
- Adjust fraud threshold from 0.5 to 0.6+
- Review feedback from users

---

## Security Checklist

- [ ] Change default database password
- [ ] Generate strong JWT_SECRET_KEY
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure firewall (allow only ports 80, 443, 5432)
- [ ] Set strong database backups
- [ ] Enable database encryption at rest
- [ ] Implement rate limiting
- [ ] Set up monitoring & alerts
- [ ] Configure CORS properly (not * in production)
- [ ] Enable audit logging
- [ ] Regular security updates

---

## Support & Maintenance

- Monitor logs regularly
- Update dependencies monthly
- Retrain GNN model quarterly with new data
- Back up database daily
- Test disaster recovery procedures
