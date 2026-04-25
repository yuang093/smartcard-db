# 專案進度追蹤 (Todo Progress)

- [ ] **Phase 1: 環境建置與基礎架構**
  - [ ] 初始化 GitHub Repository，設定 `.gitignore`。
  - [ ] 撰寫 `docker-compose.yml` (Web, Backend, PostgreSQL)。
  - [ ] 建立資料庫 Schema (含 Users, Cards, Tags 表，以及防止重複的 Unique 約束設計)。

- [ ] **Phase 2: 使用者認證與管理 (Auth & Tenant)**
  - [ ] 實作註冊、登入機制。
  - [ ] 實作後台帳號管理頁面。
  - [ ] API Middleware 實作 `user_id` 資料隔離。

- [ ] **Phase 3: 核心業務邏輯 (上傳與 AI 辨識)**
  - [ ] **測試與驗證 MiniMax Vision API 的 OCR 準確度與 JSON 結構化能力**。
  - [ ] 實作圖片上傳 API (存放於本地 Docker Volume)。
  - [ ] 實作前端上傳與預覽頁面。
  - [ ] 實作辨識結果的「人工確認與校對」頁面。

- [ ] **Phase 4: 聯絡人管理、防呆與匯出功能**
  - [ ] 實作名片列表與快速搜尋列。
  - [ ] **實作手動標籤 (Tags) 管理介面 (CRUD)**。
  - [ ] **實作「重複聯絡人偵測」邏輯與前端提示**。
  - [ ] 實作 Excel (`.xlsx`) 批次匯出功能。
  - [ ] **實作單筆名片 vCard (`.vcf`) 檔案生成與下載功能**。

- [ ] **Phase 5: 部署與測試**
  - [ ] 配置反向代理，綁定網域 `card.yuang093.cc` 並申請 SSL 憑證。
  - [ ] 手機端實機測試 UI/UX 順暢度。
  - [ ] 確認 Docker 資料庫與圖檔備份機制。