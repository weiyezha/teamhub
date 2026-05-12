#!/bin/bash
# TeamHub 自动备份脚本
# 建议添加到 crontab: 0 3 * * * /opt/teamhub/deploy/backup.sh

set -e

APP_DIR="/opt/teamhub"
BACKUP_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# 1. 备份 SQLite 数据库
echo "[$(date)] 备份数据库..."
cp "$APP_DIR/backend/teamhub.db" "$BACKUP_DIR/teamhub_${DATE}.db"

# 2. 备份上传文件
echo "[$(date)] 备份上传文件..."
tar -czf "$BACKUP_DIR/uploads_${DATE}.tar.gz" -C "$APP_DIR" backend/uploads 2>/dev/null || true

# 3. 清理旧备份
echo "[$(date)] 清理 ${RETENTION_DAYS} 天前的备份..."
find "$BACKUP_DIR" -name "teamhub_*.db" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "uploads_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date)] 备份完成: teamhub_${DATE}.db"
