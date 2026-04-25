---

### 4. `api_endpoints.md` (API 路由與規格說明)

```markdown
# API 路由規格 (API Endpoints)

所有 API 路徑都應包含 `/api/v1/` 前綴。除登入/註冊外，所有 Request Headers 必須攜帶驗證 Token (例如 JWT 的 `Authorization: Bearer <token>`)。後端需透過 Token 解析出 `user_id` 來操作資料庫。

## 1. 認證與帳號 (Auth)
- `POST /api/v1/auth/register`: 註冊新帳號 (需考慮是否僅限管理員開放新增)。
- `POST /api/v1/auth/login`: 登入並獲取 Token。
- `GET /api/v1/auth/me`: 獲取當前登入者資訊。

## 2. 名片處理 (Cards)
- `POST /api/v1/cards/upload_and_parse`: 
  - 接收 `multipart/form-data` (正反面圖檔)。
  - 儲存圖片至本地 `./volumes/uploads`。
  - 呼叫 MiniMax 進行辨識。
  - 回傳圖片 URL 與 AI 萃取的 JSON 資料供前端「人工校對」。
- `POST /api/v1/cards`: 確認無誤後，正式將名片資料寫入資料庫 (需執行重複聯絡人檢查)。
- `GET /api/v1/cards`: 獲取名片列表 (支援 `?search=` 與 `?tags=` 查詢參數)。
- `GET /api/v1/cards/{id}`: 獲取單張名片詳細資訊。
- `PUT /api/v1/cards/{id}`: 修改名片資料。
- `DELETE /api/v1/cards/{id}`: 刪除名片。

## 3. 標籤管理 (Tags)
- `GET /api/v1/tags`: 獲取使用者的所有標籤。
- `POST /api/v1/tags`: 新增自訂標籤。
- `PUT /api/v1/tags/{id}`: 修改標籤名稱或顏色。
- `DELETE /api/v1/tags/{id}`: 刪除標籤 (需解除與名片的關聯，但不刪除名片本身)。

## 4. 匯出功能 (Export)
- `GET /api/v1/cards/export/excel`: 匯出當前列表為 `.xlsx` 檔案下載。
- `GET /api/v1/cards/{id}/export/vcard`: 產生單張名片的 `.vcf` 檔案，供匯入 Google/iPhone 通訊錄使用。