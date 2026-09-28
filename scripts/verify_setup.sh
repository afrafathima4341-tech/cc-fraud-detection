#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

echo "Verifying AXIOMA fraud demo setup..."

python3 --version || { echo "Python 3 not found"; exit 1; }
node --version || { echo "Node.js not found"; exit 1; }
if command -v docker >/dev/null 2>&1; then
  docker --version
else
  echo "Docker not found (optional for local development)."
fi

for path in backend frontend scripts; do
  if [[ -d "$path" ]]; then
    echo "OK: $path/"
  else
    echo "Missing directory: $path/"
    exit 1
  fi
done

for path in docker-compose.yml backend/requirements.txt frontend/package.json backend/app/models.py frontend/src/App.jsx README.md scripts/demo.sh scripts/demo.ps1 scripts/start.sh; do
  if [[ -f "$path" ]]; then
    echo "OK: $path"
  else
    echo "Missing file: $path"
    exit 1
  fi
done

echo "Setup verification complete."
echo "Run the demo with: ./scripts/demo.sh"
echo "On Windows PowerShell: .\\scripts\\demo.ps1"
