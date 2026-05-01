# SmartCard DB V2.0 專案進度追蹤 (Todo Progress)

## Phase 1: 環境建置與基礎架構
- [x] 初始化 GitHub Repository，設定 .gitignore。
- [x] 撰寫 docker-compose.yml (Web, Backend, PostgreSQL)。
- [x] 建立資料庫 Schema (含 Users, Cards, Tags 表，防止重複的 Unique 約束設計)。

## Phase 2: 使用者認證與管理 (Auth & Tenant)
- [x] 實作註冊、登入機制。
- [x] 實作後台帳號管理頁面（登出按鈕）。
- [x] API Middleware 實作 user_id 資料隔離。

## Phase 3: 核心業務邏輯 (上傳與 AI 辨識)
- [x] 實作圖片上傳 API (存放於本地 Docker Volume)。
- [x] 實作 MiniMax Vision API 的 OCR 與 JSON 結構化。
- [x] 實作前端上傳與預覽頁面。
- [x] 實作辨識結果的「人工確認與校對」頁面。
- [x] Bug Fix: 修復 AI 辨識後儲存失敗（CardCreate schema + db.add 順序問題）。 (2026-05-01)

## Phase 4: 聯絡人管理、防呆與 UI 優化
4.1 詳情頁優化 (Detail)
- [x] 詳情頁顯示彩色標籤。 (2026-05-01)
- [x] 支援顯示正/背面圖片。 (2026-05-01)
- [x] 實作「備註 (Notes)」文字區塊。 (2026-05-01)
- [x] 加入「一鍵複製電話/Email」按鈕，並支援 Click-to-Call (tel:) 與 Click-to-Email (mailto:)。 (2026-05-01)

4.2 編輯頁優化 (Edit)
- [x] CardUpdate schema 新增 tag_ids 欄位（修復標籤無法更新 Bug）。 (2026-05-01)
- [ ] 編輯名片頁面加入「標籤 (Tags)」的修改與儲存功能。

4.3 列表頁優化 (List)
- [x] 名片列表搜尋加入「標籤」過濾選項。 (2026-05-01)
- [x] 匯出大量名片時加入 Loading 狀態（防重複點擊）。 (2026-05-01)
- [x] 實作「批次操作 (Batch Actions)」，支援多選並進行批次刪除與批次上標籤。 (2026-05-02)

4.4 行動裝置優化 (Mobile UX)
- [x] 手機版 Header 按鈕改為響應式佈局（垂直堆疊、全寬按鈕）。 (2026-05-02)
- [x] 批次操作工具列改為垂直堆疊，選單全寬顯示。 (2026-05-02)
- [x] 詳情 Modal 調整為全寬顯示，避免手機上被截斷。 (2026-05-02)

## Phase 5: 部署、測試與維運 (DevOps)
- [x] 配置反向代理，綁定網域 card.yuang093.cc 並申請 SSL 憑證 (Cloudflare Tunnel)。 (2026-04-28)
- [x] 撰寫自動化備份腳本 (pg_dump + uploads tar)。 (2026-05-02)
- [x] 手機端實機測試 UI/UX 順暢度。 (2026-05-02 ✅)

## Phase 6: 系統管理與監控 (Admin Setup)
- [x] 實作 Admin API Router (/api/v1/admin/)。 (2026-05-02)
- [x] 實作 Admin 前端頁面 (/setup)。 (2026-05-02)
- [x] 系統統計：卡片數、使用者數、標籤數、備份狀態。 (2026-05-02)
- [x] 帳戶管理：新增、刪除、設為管理員。 (2026-05-02)
- [x] RBAC：Navbar 顯示「⚙️ 管理」按鈕（紅色，區分顏色），僅 admin 可見。 (2026-05-02)
- [x] 儲存空間儀表板：圖檔實際大小（MB）。 (2026-05-02)
- [x] 修改密碼功能：Admin 可修改任意帳號密碼。 (2026-05-02)

## 🔜 低優先級擴充項目 (Backlog)
- [ ] 深色模式 (Dark Mode)
- [ ] 多國語言支援 (i18n)
- [ ] Webhook 觸發機制 (新增名片時推播通知)

---

## 最後更新: 2026-05-01 21:08