# 更新日誌 (Changelog)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

---

## [1.3.2] - 2026-05-04
### Fixed
- **名片圖片顯示 404** — Next.js rewrite 代理失敗，改用 FastAPI FileResponse API endpoint `/uploads/{filename}` 取代 StaticFiles mount，解決瀏覽器無法載入圖片的問題

## [1.3.1] - 2026-05-03
### Fixed
- **名片重複錯誤處理** — `IntegrityError` → `409` 友善訊息「名片重複」，不再顯示 `HTTP 500`
- **備份系統 Docker CLI** — Dockerfile 安裝 `docker-cli`

### Changed
- **名片列表美化** — 卡片式設計：首字母大頭貼、紫羅蘭漸層、底部橫向按鈕列
- **備份管理美化** — 訊息深色底、紫色標題列、按鈕 SVG icon

## [1.3.0] - 2026-05-03
### Added
- **Phase 4.5: UI 美化** — 登入/註冊漸層背景、浮動光斑動畫、全系統 Hover 效果、統一 inline style
### Added
- **Phase 1.3**: Database schema with Alembic migrations
  - Users, Cards, Tags, CardTags tables
  - Unique constraints for duplicate detection
  - Async SQLAlchemy with PostgreSQL
- **Phase 2**: Frontend Auth Pages
  - Next.js 14 App Router
  - JWT authentication (login/register)
  - Auth context with localStorage persistence
