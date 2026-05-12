#!/bin/bash
set -e

PROJECT_DIR="/opt/teamhub_backup_20260512_112252/frontend"
LOG_FILE="/tmp/deploy-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "$PROJECT_DIR"
cd "$PROJECT_DIR"

echo "[deploy] start" | tee -a "$LOG_FILE"

npm ci >> "$LOG_FILE" 2>&1
echo "[deploy] npm ci ok"

npm run build >> "$LOG_FILE" 2>&1
echo "[deploy] build ok"

if [ -f "dist/index.html" ]; then
  echo "[deploy] success: $(find dist -type f | wc -l) files"
else
  echo "[deploy] fail: dist/index.html missing"
  exit 1
fi
