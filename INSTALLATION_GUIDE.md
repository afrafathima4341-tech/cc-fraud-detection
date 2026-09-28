# Installation Guide

## Current Environment Check

Your WSL2 environment is missing:
- ❌ Docker & Docker Compose
- ❌ Node.js
- ❌ PostgreSQL
- ⚠️ pip (Python package manager)
- ✅ Python 3.12.3

This guide will help you install everything needed.

---

## Option 1: Install via Windows Package Manager (Recommended for WSL2)

### Step 1: Enable WSL2
```bash
# In PowerShell (as Administrator)
wsl --install
wsl --set-default-version 2
```

### Step 2: Install Windows Tools

#### A. Docker Desktop (with WSL2 integration)
- Download: https://www.docker.com/products/docker-desktop
- Install and enable WSL2 integration in settings
- Verify in WSL2:
```bash
docker --version
```

#### B. Node.js
```bash
# In WSL2
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

#### C. PostgreSQL
```bash
# In WSL2
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
psql --version

# Start PostgreSQL
sudo service postgresql start

# Create database user
sudo -u postgres createuser fraud_user -P
sudo -u postgres createdb fraud_db -O fraud_user
```

#### D. Python pip
```bash
# In WSL2
sudo apt-get install -y python3-pip python3-venv
pip3 --version
```

---

## Option 2: Docker + Docker Compose (Fastest)

If you have Docker Desktop installed with WSL2:

```bash
cd /home/yasin/cc-trnx
docker-compose up -d

# Verify services
docker-compose ps

# Access application
# Frontend:  http://localhost:5173
# Backend:   http://localhost:5000
# PgAdmin:   http://localhost:5050
```

---

## Option 3: Manual Local Installation (For WSL2)

### 3.1 Backend Setup

```bash
# Navigate to backend
cd /home/yasin/cc-trnx/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install pip inside venv
python -m ensurepip --upgrade

# Install dependencies
pip install -r requirements.txt

# Verify Flask installation
python -c "import flask; print(flask.__version__)"
```

### 3.2 Database Setup

```bash
# Start PostgreSQL
sudo service postgresql start

# Create database and user
sudo -u postgres psql << EOF
CREATE USER fraud_user WITH PASSWORD 'fraud_password';
CREATE DATABASE fraud_db OWNER fraud_user;
EOF

# Verify connection
psql -U fraud_user -d fraud_db -h localhost -c "SELECT 1"
```

### 3.3 Environment Setup

```bash
# In /home/yasin/cc-trnx/backend
cat > .env << EOF
FLASK_ENV=development
DATABASE_URL=postgresql://fraud_user:fraud_password@localhost:5432/fraud_db
JWT_SECRET_KEY=dev-secret-key-change-in-production
EOF
```

### 3.4 Run Backend

```bash
# Activate venv (if not already)
source venv/bin/activate

# Start Flask
python run.py

# Should see:
# * Running on http://127.0.0.1:5000
```

### 3.5 Frontend Setup (In another terminal)

```bash
# Install Node first
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Navigate to frontend
cd /home/yasin/cc-trnx/frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Should see:
# VITE v5.0.7  ready in X ms
# ➜  Local:   http://localhost:5173
```

---

## Installation Command Summary

### For Ubuntu/WSL2:

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Python tools
sudo apt-get install -y python3-pip python3-venv

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Docker (optional, but recommended)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

---

## Quick Test After Installation

### Test 1: Check all tools
```bash
python3 --version    # Should be 3.11+
node --version       # Should be 18+
psql --version       # Should be PostgreSQL 12+
docker --version     # Should be 20.x+
pip --version        # Should be 21+
```

### Test 2: Run backend tests
```bash
cd /home/yasin/cc-trnx/backend
source venv/bin/activate
pytest tests/ -v
```

### Test 3: Access the application
- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Database: Use psql or pgAdmin

---

## Troubleshooting

### Issue: pip not found
```bash
# Solution
sudo apt-get install -y python3-pip
# Or inside venv
python -m ensurepip --upgrade
```

### Issue: PostgreSQL won't connect
```bash
# Start the service
sudo service postgresql start

# Check status
sudo service postgresql status

# Reset if needed
sudo service postgresql restart
```

### Issue: Node modules not installing
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Issue: Port already in use
```bash
# Find process using port
lsof -ti:5000    # For backend
lsof -ti:5173    # For frontend

# Kill the process
kill -9 <PID>

# Or change port in vite.config.js or Flask
```

### Issue: Database connection error
```bash
# Check database is running
sudo service postgresql status

# Verify credentials
psql -U fraud_user -d fraud_db -h localhost

# If password issues, reset
sudo -u postgres psql
ALTER USER fraud_user WITH PASSWORD 'fraud_password';
```

---

## Docker Quick Setup (If Available)

```bash
# In project root
docker-compose up -d

# Check services
docker-compose ps

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## Getting Help

If you encounter issues:

1. Check the relevant log file:
   - Backend: See Flask console output
   - Frontend: Check npm console
   - Database: `sudo tail -f /var/log/postgresql/postgresql-*.log`

2. Verify environment variables:
   ```bash
   env | grep DATABASE_URL
   env | grep FLASK_ENV
   ```

3. Test connectivity:
   ```bash
   # Database
   psql -U fraud_user -d fraud_db -h localhost -c "SELECT 1"
   
   # Backend API
   curl http://localhost:5000/api/dashboard/stats
   
   # Frontend
   curl http://localhost:5173
   ```

---

## Recommended Installation Path

For WSL2 users, the fastest path is:

1. **Install Docker Desktop** (includes Docker + Docker Compose)
2. **Run via Docker Compose**: `docker-compose up -d`
3. **Access** the application

If Docker isn't available or you prefer local:

1. Install Python, Node, PostgreSQL (instructions above)
2. Run backend and frontend separately
3. Both should work on localhost

---

## What Each Tool Does

| Tool | Purpose | Installation |
|------|---------|--------------|
| Python 3.11+ | Backend runtime | Built-in WSL2 |
| pip | Python package manager | `apt-get install python3-pip` |
| Node.js 18+ | Frontend runtime | `apt-get install nodejs` |
| PostgreSQL 15 | Database | `apt-get install postgresql` |
| Docker | Containerization (optional) | Download Docker Desktop |
| Docker Compose | Multi-container orchestration | Part of Docker Desktop |

---

## Next Steps

Once all tools are installed:

1. **Run with Docker** (recommended):
   ```bash
   docker-compose up -d
   ```

2. **Or run locally**:
   ```bash
   # Terminal 1: Backend
   cd backend && source venv/bin/activate && python run.py
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

3. **Access the app**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - Database UI: http://localhost:5050 (if using pgAdmin)

4. **Test the system**:
   ```bash
   pytest backend/tests/ -v
   ```

---

**Ready to run the project!** 🚀
