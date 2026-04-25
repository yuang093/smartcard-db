---

### 3. `deployment_backup.md` (部署環境與備份規範)

```markdown
# 部署與備份規範 (Deployment & Backup)

本專案運行於 Mac mini M4 的 Docker 環境，並綁定網域 `card.yuang093.cc`。資料的安全與備份是最高指導原則。

## 目錄結構與 Docker Volume
確保 `docker-compose.yml` 中正確掛載以下 Volume，以確保容器重啟時資料不遺失：
- PostgreSQL 資料庫：掛載至 `./volumes/pg_data`
- 名片上傳圖檔：掛載至 `./volumes/uploads`

## 網域與反向代理配置
- 內部 Web 服務跑在指定 Port (例如 3000)。
- 使用 Nginx 或 Traefik 作為 Reverse Proxy，將 `card.yuang093.cc` 流量導向該 Port。
- 必須配置 SSL (HTTPS) 以保護登入與資料傳輸安全。

## ⚠️ 嚴格的資料備份規範 (SOP)
在提供任何涉及刪除容器 (`docker rm`)、移除檔案、或變更資料夾結構的指令前，必須先提醒並引導完成以下資料備份：

1. **備份資料庫**：
   執行 pg_dump 將 PostgreSQL 資料匯出為 .sql 檔案。
   ```bash
   docker exec -t <postgres_container_name> pg_dumpall -c -U <db_user> > dump_`date +%Y-%m-%d`.sql

2. 備份上傳圖檔：
將 ./volumes/uploads 資料夾壓縮備份。
tar -czvf uploads_backup_`date +%Y-%m-%d`.tar.gz ./volumes/uploads
