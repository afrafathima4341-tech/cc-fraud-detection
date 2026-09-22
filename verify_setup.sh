#!/bin/bash

echo "🔍 Verifying Fraud Detection System Setup..."
echo ""

# Check Python
echo "✓ Checking Python..."
python3 --version || { echo "❌ Python 3 not found"; exit 1; }

# Check Node
echo "✓ Checking Node.js..."
node --version || { echo "❌ Node.js not found"; exit 1; }

# Check Docker
echo "✓ Checking Docker..."
docker --version || { echo "⚠️  Docker not found (optional for local dev)"; }

# Check directories
echo ""
echo "✓ Checking project structure..."
[ -d "backend" ] && echo "  ✓ backend/" || echo "  ❌ backend/ missing"
[ -d "frontend" ] && echo "  ✓ frontend/" || echo "  ❌ frontend/ missing"
[ -f "docker-compose.yml" ] && echo "  ✓ docker-compose.yml" || echo "  ❌ docker-compose.yml missing"
[ -f "backend/requirements.txt" ] && echo "  ✓ backend/requirements.txt" || echo "  ❌ requirements.txt missing"
[ -f "frontend/package.json" ] && echo "  ✓ frontend/package.json" || echo "  ❌ package.json missing"

# Check key files
echo ""
echo "✓ Checking key files..."
[ -f "backend/app/models.py" ] && echo "  ✓ Backend models" || echo "  ❌ Missing"
[ -f "frontend/src/App.jsx" ] && echo "  ✓ Frontend App" || echo "  ❌ Missing"
[ -f "README.md" ] && echo "  ✓ README" || echo "  ❌ Missing"

echo ""
echo "✅ Setup verification complete!"
echo ""
echo "Next steps:"
echo "  1. Read QUICK_START.md for quick start guide"
echo "  2. Read README.md for full documentation"
echo "  3. Run: docker-compose up -d"
echo "  4. Access frontend at http://localhost:5173"
