# 資料庫結構設計 (Database Schema)

本系統採用 PostgreSQL，並嚴格執行多租戶 (Multi-tenant) 的資料隔離。所有與名片、標籤相關的資料表，都必須帶有 `user_id` 作為外鍵 (Foreign Key)。

## 1. 使用者表 (Users)
負責系統登入與權限管理。
- `id`: UUID (Primary Key)
- `email`: VARCHAR (Unique, 登入帳號)
- `password_hash`: VARCHAR
- `role`: VARCHAR (預設為 'user'，可設為 'admin')
- `created_at`: TIMESTAMP

## 2. 名片表 (Cards)
儲存 AI 辨識後並經人工確認的名片實體資料。
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key 關聯 Users.id)
- `name`: VARCHAR (姓名)
- `company`: VARCHAR (公司名稱)
- `title`: VARCHAR (職稱)
- `phone`: VARCHAR (公司電話)
- `mobile`: VARCHAR (行動電話)
- `email`: VARCHAR (電子信箱)
- `address`: TEXT (地址)
- `front_image_url`: VARCHAR (正面圖檔於本地的相對路徑)
- `back_image_url`: VARCHAR (反面圖檔於本地的相對路徑，可為 Null)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

> **⚠️ 重複偵測機制 (Unique Constraints)**：
> 系統必須在寫入前，比對同一 `user_id` 下，是否有相同的 `name` + `company`，或相同的 `email`。若有，需在前端拋出「重複聯絡人」的確認提示。

## 3. 標籤表 (Tags)
使用者自訂的名片分類標籤。
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key 關聯 Users.id)
- `name`: VARCHAR (標籤名稱，例如：'供應商', 'VIP')
- `color`: VARCHAR (標籤在 UI 上顯示的顏色色碼)

## 4. 名片標籤關聯表 (Card_Tags)
處理名片與標籤之間的多對多 (M:N) 關聯。
- `card_id`: UUID (Foreign Key)
- `tag_id`: UUID (Foreign Key)