#!/usr/bin/env bash
set -euo pipefail

# ============================================
# DomApp Deploy Script
# Deploys backend, frontend, and bot via Docker
# ============================================

SERVER="root@51.38.119.218"
REMOTE_DIR="/opt/domapp"
SSH_PASSWORD="DpXWg9oz38fO"

echo "============================================"
echo "  DomApp Deploy"
echo "  Server: ${SERVER}"
echo "  Remote: ${REMOTE_DIR}"
echo "============================================"

# Check for sshpass
SSHPASS_AVAILABLE=false
if command -v sshpass &>/dev/null; then
  SSHPASS_AVAILABLE=true
  echo "[INFO] sshpass detected, using password authentication"
else
  echo "[WARN] sshpass not found. Attempting SSH key authentication..."
fi

# Step 1: Rsync project to server (excluding unnecessary files)
echo ""
echo "[1/4] Rsyncing project to server..."

RSYNC_CMD="rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '__pycache__' \
  --exclude '.env' \
  --exclude '.git' \
  --exclude '*.pyc' \
  --exclude '.DS_Store' \
  ./ \"${SERVER}:${REMOTE_DIR}/\""

if [ "$SSHPASS_AVAILABLE" = true ]; then
  SSHPASS="${SSH_PASSWORD}" sshpass -e eval "${RSYNC_CMD}"
else
  eval "${RSYNC_CMD}"
fi

# Step 2: SSH into server and deploy
echo ""
echo "[2/4] Connecting to server..."

SSH_SCRIPT=$(cat << 'ENDSSH'
  set -euo pipefail

  cd /opt/domapp

  # Step 3: Copy .env.production to .env if .env doesn't exist
  echo "[3/4] Setting up environment..."
  if [ ! -f .env ]; then
    if [ -f .env.production ]; then
      cp .env.production .env
      echo "  -> Created .env from .env.production"
    else
      echo "  -> ERROR: .env.production not found!"
      exit 1
    fi
  else
    echo "  -> .env already exists, skipping"
  fi

  # Step 4: Pull latest images and restart containers
  echo "[4/4] Deploying with Docker..."
  docker-compose down || true
  docker-compose up --build -d

  # Print status
  echo ""
  echo "============================================"
  echo "  Deployment complete!"
  echo "============================================"
  docker-compose ps
ENDSSH
)

if [ "$SSHPASS_AVAILABLE" = true ]; then
  SSHPASS="${SSH_PASSWORD}" sshpass -e ssh -o StrictHostKeyChecking=no "${SERVER}" "${SSH_SCRIPT}"
else
  ssh -o StrictHostKeyChecking=no "${SERVER}" "${SSH_SCRIPT}"
fi

echo ""
echo "Done."
