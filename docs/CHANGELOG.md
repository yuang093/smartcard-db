# 更新日誌 (Changelog)

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

---

## [1.1.0] - 2026-04-26
### Added
- **Phase 1.3**: Database schema with Alembic migrations
  - Users, Cards, Tags, CardTags tables
  - Unique constraints for duplicate detection
  - Async SQLAlchemy with PostgreSQL
- **Phase 2**: Frontend Auth Pages
  - Next.js 14 App Router
  - JWT authentication (login/register)
  - Auth context with localStorage persistence
  - Protected routes

## [1.0.0] - 2026-04-24
### Added
- Initial project setup
- docker-compose.yml with postgres, backend, frontend, cloudflared
- Basic project structure