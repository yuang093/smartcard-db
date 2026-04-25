# SmartCard DB V2.0 — 專案規格書 (SPEC)

## 1. 專案概述

- **名稱**：SmartCard DB
- **類型**：SaaS 名片管理系統（單租戶，本機部署）
- **核心功能**：上傳名片圖片 → AI OCR 解析 → 存入資料庫 → 標籤分類 → 匯出 vCard/Excel
- **目標用戶**：個人業務或小團隊

---

## 2. 技術架構

| 層 | 技術 | 說明 |
|---|---|---|
| 前端 | Next.js 16 (App Router) | TypeScript, TailwindCSS |
| 後端 | FastAPI (Python 3.11) | 非同步 REST API |
| 資料庫 | PostgreSQL 16 | 主資料庫 |
| AI | MiniMax Vision API | 名片 OCR 解析 |
| 部署 | Docker + Docker Compose | 本機容器化 |
| 網域 | Cloudflare Tunnel | card.yuang093.cc |

---

## 3. 資料模型

### 3.1 Users（使用者）
| 欄位 | 型別 | 約束 |
|---|---|---|
| id | UUID | PK |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| hashed_password | VARCHAR(255) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() |

### 3.2 Cards（名片）
| 欄位 | 型別 | 約束 |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → Users.id, NOT NULL |
| name | VARCHAR(255) | |
| company | VARCHAR(255) | |
| title | VARCHAR(255) | |
| phone | VARCHAR(50) | |
| mobile | VARCHAR(50) | |
| email | VARCHAR(255) | |
| address | TEXT | |
| front_image_url | VARCHAR(500) | 名片正面圖檔路徑 |
| back_image_url | VARCHAR(500) | 名片背面圖檔路徑 |
| created_at | TIMESTAMP | DEFAULT NOW() |
| updated_at | TIMESTAMP | |

### 3.3 Tags（標籤）
| 欄位 | 型別 | 約束 |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → Users.id, NOT NULL |
| name | VARCHAR(50) | NOT NULL |
| color | VARCHAR(7) | DEFAULT '#6B7280' |
| UNIQUE | (user_id, name) | 同一使用者不重複 |

### 3.4 CardTags（名片-標籤 關聯表）
| 欄位 | 型別 | 約束 |
|---|---|---|
| card_id | UUID | FK → Cards.id |
| tag_id | UUID | FK → Tags.id |
| PK | (card_id, tag_id) | 複合主鍵 |

---

## 4. API 設計

### Auth
- `POST /api/v1/auth/register` — 註冊（email + password）
- `POST /api/v1/auth/login` — 登入（回傳 JWT）

### Cards
- `GET /api/v1/cards` — 列出当前用户所有名片（支援 ?search=）
- `POST /api/v1/cards` — 新增名片
- `GET /api/v1/cards/{id}` — 取得單張名片
- `PUT /api/v1/cards/{id}` — 更新名片
- `DELETE /api/v1/cards/{id}` — 刪除名片
- `POST /api/v1/cards/upload_and_parse` — 上傳圖片 + AI 解析
- `GET /api/v1/cards/{id}/export/vcard` — 匯出 vCard
- `GET /api/v1/cards/export/excel` — 批次匯出 Excel

### Tags
- `GET /api/v1/tags` — 列出標籤
- `POST /api/v1/tags` — 新增標籤
- `PUT /api/v1/tags/{id}` — 更新標籤
- `DELETE /api/v1/tags/{id}` — 刪除標籤
- `POST /api/v1/cards/{card_id}/tags/{tag_id}` — 關聯標籤到名片
- `DELETE /api/v1/cards/{card_id}/tags/{tag_id}` — 移除標籤

---

## 5. 前端頁面

| 頁面 | 路徑 | 功能 |
|---|---|---|
| 登入 | `/login` | JWT 登入 |
| 註冊 | `/register` | 新帳號 |
| 名片列表 | `/cards` | 搜尋 + 匯出 |
| 上傳名片 | `/cards/upload` | 圖片上傳 + AI 解析 |
| 確認頁 | `/cards/review` | AI 結果校對 + 儲存 |
| 標籤管理 | `/tags` | CRUD |

---

## 6. 安全性

- JWT Bearer Token（過期 7 天）
- 所有 API 需帶 Authorization header
- 後端 Middleware 自動過濾 `user_id` 隔離
- `bcrypt <4.1.0`（密碼雜湊）
- `.env` 不進 Git

---

## 7. Docker 架構

```
smartcard_v2_postgres    ← PostgreSQL 16
smartcard_v2_backend    ← FastAPI (8000)
smartcard_v2_frontend    ← Next.js (3000)
smartcard_v2_cloudflared ← Cloudflare Tunnel
```

- Volumes：`./volumes/pg_data`（PostgreSQL）、`./volumes/uploads`（圖檔）
- 網路：內部 bridge，`backend` 可達 `postgres`，`frontend` 可達 `backend`

---

*最後更新：2026-04-26*