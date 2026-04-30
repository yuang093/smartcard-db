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
- [x] **Bug Fix**: 修復 AI 辨識後儲存失敗（CardCreate schema + db.add 順序問題）。 ✅ (2026-05-01)
- [ ] Phase 3 完成，標記為已結案。

## Phase 4: 聯絡人管理、防呆與匯出功能
- [x] 實作名片列表與快速搜尋列。 ✅
- [x] **實作手動標籤 (Tags) 管理介面 (CRUD)**。 ✅
- [x] **實作「重複聯絡人偵測」邏輯與前端提示**。（已簡化） ✅
- [x] 實作 Excel (`.xlsx`) 批次匯出功能。 ✅
- [x] **實作單筆名片 vCard (`.vcf`) 檔案生成與下載功能**。 ✅

## Phase 5: 部署與測試
- [x] 配置反向代理，綁定網域 `card.yuang093.cc` 並申請 SSL 憑證。 ✅ (Cloudflare Tunnel)
- [ ] 手機端實機測試 UI/UX 順暢度。（尚未測試）
- [ ] 確認 Docker 資料庫與圖檔備份機制。（尚未實作）

---

## 🔜 Phase 6: UI/UX 優化（下一階段建議）

### 高優先級
- [ ] 編輯名片頁面加入「標籤」修改功能
- [ ] 手機響應式設計優化（目前列表在手機上是否正常顯示？）
- [ ] 名片詳情頁支援顯示正/背面圖片

### 中優先級
- [ ] 匯出進度條（大量名片匯出時的使用者體驗）
- [ ] 搜尋加入「標籤」過濾條件
- [ ] 名片詳情頁加入「複製電話/Email一鍵按鈕」

### 低優先級
- [ ] 深色模式
- [ ] 多國語言支援

---

## 🐛 待修復問題

- [ ] Phase 3 的完整流程（從上傳到儲存）尚待更多測試確認穩定性

---

## 最後更新: 2026-05-01 05:24
