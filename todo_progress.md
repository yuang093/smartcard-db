# SmartCard DB V2.0 — 專案進度追蹤

> 每項完成後標記 ✅，等待測試確認後才推进下一項。

---

## Phase 1: 環境建置與基礎架構

- [ ] **1.1** 初始化 GitHub Repository，設定 `.gitignore` ← **NOW**
- [ ] **1.2** 撰寫 `docker-compose.yml` (Web, Backend, PostgreSQL)
- [ ] **1.3** 建立資料庫 Schema（Users, Cards, Tags 表，含 Unique 約束）

---

## Phase 2: 使用者認證與管理 (Auth & Tenant)

- [x] **2.1** 實作註冊（Register）API 與頁面 ✅
- [x] **2.2** 實作登入（Login）API 與頁面 ✅
- [ ] **2.3** 實作後台帳號管理頁面
- [ ] **2.4** API Middleware 實作 `user_id` 資料隔離

---

## Phase 3: 核心業務邏輯（上傳與 AI 辨識）

- [ ] **3.1** 測試 MiniMax Vision API 的 OCR 準確度與 JSON 結構化能力
- [ ] **3.2** 實作圖片上傳 API（存放於本地 Docker Volume）
- [ ] **3.3** 實作前端上傳與預覽頁面
- [ ] **3.4** 實作 AI 辨識結果的「人工確認與校對」頁面

---

## Phase 4: 聯絡人管理、防呆與匯出功能

- [ ] **4.1** 實作名片列表與快速搜尋列
- [ ] **4.2** 實作手動標籤（Tags）管理介面（CRUD）
- [ ] **4.3** 實作「重複聯絡人偵測」邏輯與前端提示
- [ ] **4.4** 實作 Excel（`.xlsx`）批次匯出功能
- [ ] **4.5** 實作單筆名片 vCard（`.vcf`）檔案生成與下載功能

---

## Phase 5: 部署與測試

- [ ] **5.1** 配置反向代理，綁定網域 `card.yuang093.cc` 並申請 SSL 憑證
- [ ] **5.2** 手機端實機測試 UI/UX 順暢度
- [ ] **5.3** 確認 Docker 資料庫與圖檔備份機制

---

*最後更新：2026-04-26*