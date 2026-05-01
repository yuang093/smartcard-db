#!/bin/bash
# ===================================================================
# SmartCard DB 還原腳本
# 功能：從備份還原 PostgreSQL + 圖檔
# 使用方式：./restore.sh smartcard_db_2026-05-02_023419.dump
# ===================================================================

set -e

if [ -z "$1" ]; then
    echo "使用方法：./restore.sh <備份檔案名稱>"
    echo ""
    echo "可用備份檔案："
    ls -lh /Users/taeyeon093.bot/.openclaw/workspace/smartcard-db-docker/backups/smartcard_db_*.dump 2>/dev/null | awk '{print $9}' | xargs -n1 basename
    exit 1
fi

BACKUP_FILE="$1"
BACKUP_DIR="/Users/taeyeon093.bot/.openclaw/workspace/smartcard-db-docker/backups"
CONTAINER_NAME="smartcard_v2_postgres"
DB_NAME="smartcard"
DB_USER="smartcard"

if [ ! -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    echo "錯誤：備份檔案不存在 - $BACKUP_DIR/$BACKUP_FILE"
    exit 1
fi

echo "[$(date)] ===== SmartCard DB 還原開始 ====="
echo "使用備份：$BACKUP_FILE"
echo ""

# 警告
echo "⚠️  警告：此操作將覆蓋目前所有資料！"
read -p "確定要繼續嗎？(yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "取消還原。"
    exit 0
fi

# 停止相關容器
echo "[$(date)] 停止容器..."
docker-compose -f /Users/taeyeon093.bot/.openclaw/workspace/smartcard-db-docker/docker-compose.yml stop backend frontend 2>/dev/null || true

# 還原資料庫
echo "[$(date)] 還原資料庫..."
docker exec -i "$CONTAINER_NAME" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists < "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "    ✓ 資料庫還原完成"
else
    echo "    ✗ 資料庫還原失敗！"
    exit 1
fi

# 啟動容器
echo "[$(date)] 啟動容器..."
docker-compose -f /Users/taeyeon093.bot/.openclaw/workspace/smartcard-db-docker/docker-compose.yml start backend frontend 2>/dev/null || true

echo ""
echo "[$(date)] ===== 還原完成 ====="
echo "請確認網站正常運作後，清理舊容器殘留。"