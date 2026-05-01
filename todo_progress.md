# 專案進度追蹤 (Todo Progress)

## Phase 1: 環境建置與基礎架構
- [x] 初始化 GitHub Repository，設定 `.gitignore`。 ✅
- [x] 撰寫 `docker-compose.yml` (Web, Backend, PostgreSQL)。 ✅
- [x] 建立資料庫 Schema (含 Users, Cards, Tags 表，以及防止重複的 Unique 約束設計)。 ✅

## Phase 2: 使用者認證與管理 (Auth & Tenant)
- [x] 實作註冊、登入機制。 ✅
- [x] 實作後台帳號管理頁面（登出按鈕）。 ✅
- [x] API Middleware 實作 `user_id` 資料隔離。 ✅

## Phase 3: 核心業務邏輯 (上傳與 AI 辨識)
- [x] 實作圖片上傳 API (存放於本地 Docker Volume)。 ✅
- [x] 實作 MiniMax Vision API 的 OCR 與 JSON 結構化。 ✅
- [x] 實作前端上傳與預覽頁面。 ✅
- [x] 實作辨識結果的「人工確認與校對」頁面。 ✅
- [x] Bug Fix: 修復 AI 辨識後儲存失敗（CardCreate schema + db.add 順序問題）。 ✅ (2026-05-01)
- [x] Phase 3 完整流程測試成功。 ✅ (2026-05-01)

## Phase 4: 聯絡人管理、防呆與 UI 優化

### 4.1 詳情頁優化 (Detail)
- [x] 支援顯示正/背面圖片
- [x] 加入「一鍵複製電話/Email」快捷按鈕
- [x] 詳情頁顯示彩色標籤 ✅ (2026-05-01)

### 4.2 編輯頁優化 (Edit)
- [x] 編輯名片頁面加入「標籤 (Tags)」的修改與儲存功能
- [x] 詳情頁顯示彩色標籤
- [x] CardUpdate schema 新增 tag_ids 欄位（修復標籤無法更新的 Bug） ✅ (2026-05-01)

### 4.3 列表頁優化 (List)
- [x] 名片列表搜尋加入「標籤」過濾選項 ✅ (2026-05-01)
- [ ] 匯出大量名片時加入進度條 (Progress Bar) 或 Loading 狀態提示

### 4.4 行動裝置優化 (Mobile UX)
- [ ] 手機版 UI 調整（按鈕大小、排版、彈窗）

## Phase 5: 部署與測試
- [x] 配置反向代理，綁定網域 `card.yuang093.cc` 並申請 SSL 憑證。 ✅ (Cloudflare Tunnel)
- [ ] 手機端實機測試 UI/UX 順暢度。（尚未測試）
- [ ] 確認 Docker 資料庫與圖檔備份機制。（尚未實作）

---

## 🔜 低優先級擴充項目（暫不列入當前 Todo）
- 深色模式
- 多國語言支援

---

## 📝 任務執行準則
- 每次只執行一個最小任務
- 給出程式碼與測試檢查表後，必須等待回覆「測試成功」才能進行下一步

---

## 最後更新: 2026-05-01 05:30