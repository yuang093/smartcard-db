# Smartcard DB - Changelog

All notable changes to this project will be documented in this file.

## [v1.1.1] - 2026-04-28

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