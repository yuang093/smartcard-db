#!/bin/bash
# ===================================================================
# SmartCard DB 自動化備份腳本
# 功能：備份 PostgreSQL + 上傳圖檔
# 使用方式：./backup.sh
# Cron 建議：每天 02:00 執行
# ===================================================================

set -e

# 設定
CONTAINER_NAME="smartcard_v2_postgres"
BACKUP_DIR="/Users/taeyeon093.bot/.openclaw/workspace/smartcard-db-docker/backups"
DATE=$(date +%Y-%m-%d_%H%M%S)
DB_NAME="smartcard"
DB_USER="smartcard"

# 建立備份目錄
mkdir -p "$BACKUP_DIR"

echo "[$(date)] ===== SmartCard DB 備份開始 ====="

# ── 1. 備份 PostgreSQL ──────────────────────────────────────────────
echo "[$(date)] 1. 備份資料庫..."
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" -F c -b > "$BACKUP_DIR/smartcard_db_$DATE.dump"
if [ -f "$BACKUP_DIR/smartcard_db_$DATE.dump" ]; then
    DB_SIZE=$(du -h "$BACKUP_DIR/smartcard_db_$DATE.dump" | cut -f1)
    echo "    ✓ 資料庫備份完成: smartcard_db_$DATE.dump ($DB_SIZE)"
else
    echo "    ✗ 資料庫備份失敗！"
    exit 1
fi

# ── 2. 備份上傳圖檔 ──────────────────────────────────────────────
echo "[$(date)] 2. 備份上傳圖檔..."
UPLOADS_DIR="/Users/taeyeon093.bot/.openclaw/workspace/smartcard-db-docker/volumes/uploads"
if [ -d "$UPLOADS_DIR" ]; then
    tar -czf "$BACKUP_DIR/smartcard_uploads_$DATE.tar.gz" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")" 2>/dev/null || true
    if [ -f "$BACKUP_DIR/smartcard_uploads_$DATE.tar.gz" ]; then
        UPLOAD_SIZE=$(du -h "$BACKUP_DIR/smartcard_uploads_$DATE.tar.gz" | cut -f1)
        echo "    ✓ 圖檔備份完成: smartcard_uploads_$DATE.tar.gz ($UPLOAD_SIZE)"
    else
        echo "    ⚠ 圖檔備份失敗或資料夾為空（忽略）"
    fi
else
    echo "    ⚠ 上傳資料夾不存在（忽略）"
fi

# ── 3. 清理舊備份（保留 7 天）─────────────────────────────────
echo "[$(date)] 3. 清理 7 天前舊備份..."
find "$BACKUP_DIR" -name "smartcard_*.dump" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "smartcard_*.tar.gz" -mtime +7 -delete 2>/dev/null || true
echo "    ✓ 清理完成"

# ── 4. 顯示備份狀態 ──────────────────────────────────────────────
echo ""
echo "[$(date)] ===== 備份完成 ====="
echo "備份位置: $BACKUP_DIR"
echo ""
echo "現有備份檔案："
ls -lh "$BACKUP_DIR" | grep smartcard_ | tail -10

# ── 5. 顯示資料庫統計 ──────────────────────────────────────────
CARD_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM cards;" 2>/dev/null | tr -d ' ')
USER_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d ' ')
TAG_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM tags;" 2>/dev/null | tr -d ' ')
echo ""
echo "資料庫統計：卡片=$CARD_COUNT 使用者=$USER_COUNT 標籤=$TAG_COUNT"