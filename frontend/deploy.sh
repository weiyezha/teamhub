#!/bin/bash
# TeamHub 前端构建脚本（服务器端执行）
set -e

PROJECT_DIR="/opt/teamhub/frontend"
LOG_FILE="/tmp/deploy-$(date +%Y%m%d-%H%M%S).log"

mkdir -p "$(dirname "$LOG_FILE")"
cd "$PROJECT_DIR"

echo "[deploy] 开始前端构建..." | tee -a "$LOG_FILE"

echo "[deploy] 安装依赖..." | tee -a "$LOG_FILE"
npm ci >> "$LOG_FILE" 2>&1

echo "[deploy] 构建生产包..." | tee -a "$LOG_FILE"
npm run build >> "$LOG_FILE" 2>&1

if [ -f "dist/index.html" ]; then
  FILE_COUNT=$(find dist -type f | wc -l)
  echo "[deploy] ✅ 构建成功: ${FILE_COUNT} 个文件" | tee -a "$LOG_FILE"
else
  echo "[deploy] ❌ 构建失败: dist/index.html 不存在" | tee -a "$LOG_FILE"
  exit 1
fi
