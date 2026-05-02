# Smartcard DB - Changelog

All notable changes to this project will be documented in this file.

## [v1.3.0] - 2026-05-03

### Added
- **Phase 4.5: UI 美化 (UI Beautification)** — 全系統視覺煥然一新
  - 登入/註冊頁面：漸層背景 + 浮動光斑動畫 + 玻璃拟态卡片
  - Header 圖示化：加入品牌 icon 與統一風格按鈕
  - 全系統 Hover 效果：按鈕 hover 變色 + 上浮 transform
  - 統一 inline style 樣式系統（移除 Tailwind className）
  - Emoji icon 統一納入按鈕（🎵 登出、📥 匯出、🏷️ 標籤等）

### Changed
- 所有頁面全面採用 inline style 統一樣式系統
- 手機版完整響應式優化（Header / 詳情 Modal / 批次操作）

### Fixed
- Admin 頁面 `/setup` UI 優化（移除巢狀 JSX 解析錯誤）
- `frontend/package.json` 新增 `standalone` output 模式支援

### Removed
- 移除所有 `.bak` / `.new` 備份檔案

## [v1.2.1] - 2026-05-02

### Fixed
- Admin API: 修復 `create_user` 函式內重複 `from app.models import User` 導致 `UnboundLocalError`
- Admin API: 新增 `PATCH /users/{user_id}/password` 修改密碼端點
- Frontend: 將所有 `http://localhost:8000` 改為相對路徑 `/api`，支援 Tunnel 環境
- Frontend: 修復 `/setup` 頁面 `React.Fragment` 巢狀 JSX 解析錯誤

### Added
- Admin 頁面：修改密碼功能（藍色按鈕展開輸入框）
- `/cards` 頁面：直接內建「⚙️ 管理」按鈕（RBAC，僅 admin 可見）

## [v1.2.0] - 2026-05-02

### Added
- **Phase 6: Admin System** — `/setup` 管理後台
  - `/api/v1/admin/stats` — 系統統計 (卡片/用戶/標籤數)
  - `/api/v1/admin/users` — 用戶管理 (CRUD + 設為管理員)
  - `/api/v1/admin/backup/status` — 備份狀態查詢
  - 帳戶管理：新增、刪除、設為管理員
  - 備份腳本：`scripts/backup.sh` + `scripts/restore.sh`

### Fixed
- `.gitignore` — 正確排除 `volumes/pg_data/` 及其備份資料夾

## [v1.1.2] - 2026-05-01

### Fixed
- 修補 `notes` 欄位：資料庫缺少 `notes` 欄位導致 500 錯誤 (`ALTER TABLE cards ADD COLUMN notes TEXT`)
- 模型初始化：修正 `backend/app/models/__init__.py` 確保 SQLAlchemy 正確解析 Model 關聯

### Changed
- 新增名片流程：統一使用 AI 辨識上傳，移除手動新增按鈕

### Fixed
- Cloudflare Tunnel Token 已設定，網站正常對外服務

## [v1.1.0] - 2026-04-28

### Added
- AI名片辨識功能 (MiniMax-VL-01)
  - `/cards/upload` - 上傳名片頁面
  - `/cards/review` - AI解析結果校對頁面
  - 自動圖片壓縮 (Canvas API, <500KB)
- 新增名片流程：首頁 → 登入 → AI上傳 → 辨識 → 校對 → 存檔
- 編輯名片時可選擇標籤

### Fixed
- MiniMax API 端點: `api.minimaxi.com` → `api.minimax.io`
- MiniMax 模型名稱: `MiniMax-VL-02` → `MiniMax-VL-01`
- 前端 token 讀取: `access_token` → `smartcard_auth`
- `lib/api.ts`: 加入 `default export` 修復 build error
- `lib/api.ts`: 加入 `clearToken`/`getToken` 函數
- `/cards` → `/api/v1/cards` 完整路徑修正
- Navbar import 問題
- 名片 API 路徑不完整導致 404

### Changed
- 圖片上傳流程: 直接上傳 → 先壓縮再上傳
- 名片頁面: 「新增名片」按鈕改為「AI 辨識新增」+ 「手動新增名片」雙按鈕

## [v1.0.0] - 2026-04-26 (Initial)

### Added
- Smartcard DB Docker 部署完成
- PostgreSQL + FastAPI + Next.js 架構
- JWT 用戶認證系統
- 名片 CRUD 基本功能
- Docker Compose 多容器部署