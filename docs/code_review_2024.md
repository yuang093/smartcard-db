# SmartCard DB - 最新代碼檢查報告 (2024)

## 🔴 發現的嚴重問題

### 問題 1: 登入頁面使用 FormData + username 字段 ❌ **CRITICAL**

**文件:** `/frontend/app/(auth)/login/page.tsx` (第 16-23 行)

```typescript
const formData = new FormData();
formData.append("username", email);  // ❌ 錯誤：使用 "username" 而不是 "email"
formData.append("password", password);

const res = await fetch("/api/v1/auth/login", {
  method: "POST",
  body: formData,  // ❌ FormData 而不是 JSON
});
```

**問題分析:**

1. **字段名稱錯誤:** 後端期望 `email` 字段，但前端發送 `username`
2. **格式不匹配:** 
   - 前端發送 `FormData (multipart/form-data)`
   - 後端期望 `JSON application/json`
3. **Pydantic 驗證失敗:** `UserLoginRequest` 需要 `email` 和 `password`，無法解析 FormData

**後果:** 
- ❌ 登入 **100% 失敗**
- 後端會返回 422 Unprocessable Entity (驗證錯誤)
- 錯誤訊息顯示不清楚


---

### 問題 2: 前端使用 native fetch 而不是 axios

**文件:** `/frontend/app/(auth)/login/page.tsx`

```typescript
const res = await fetch("/api/v1/auth/login", {  // ❌ 使用 fetch
  method: "POST",
  body: formData,
});
```

**問題:**
- 不使用設定好的 axios 實例 (`api.ts`)
- 沒有 JWT 攔截器支持
- 沒有統一的錯誤處理
- 與 API 客戶端不一致


---

### 問題 3: 後端登入端點不支持 FormData

**文件:** `/backend/app/api/auth/router.py` (第 44-57 行)

```python
@router.post("/login", response_model=TokenResponse)
async def login(req: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate and return a JWT access token."""
    # UserLoginRequest 期望 JSON: {"email": "...", "password": "..."}
```

**問題:**
- `UserLoginRequest` 是 Pydantic BaseModel
- 只能解析 `application/json`，不能解析 `multipart/form-data`
- 無法自動解析 FormData 發來的數據


---

## 📊 問題對比

| 項目 | 註冊頁面 ✅ | 登入頁面 ❌ |
|------|-----------|-----------|
| 使用 axios api | ✅ 是 | ❌ 否 (native fetch) |
| 格式 | JSON ✅ | FormData ❌ |
| 字段名稱 | email ✅ | username ❌ |
| 錯誤處理 | 完善 ✅ | 基礎 ⚠️ |
| 測試狀態 | 應該工作 ✅ | 不會工作 ❌ |


---

## 🛠️ 修復方案

### 方案 A: 統一使用 axios + JSON (推薦)

**文件:** `/frontend/app/(auth)/login/page.tsx`

```typescript
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import api from "@/lib/api";  // ✅ 使用 axios 客戶端

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    toast.loading("登入中...", { id: "login-toast" });

    try {
      // ✅ 修正: 使用 axios，發送 JSON
      const res = await api.post<{ access_token: string }>(
        "/auth/login",
        {
          email,    // ✅ 字段名稱正確
          password,
        }
      );

      const token = res.data.access_token;
      localStorage.setItem("access_token", token);
      
      // ✅ 可選: 也保存到 Cookie
      document.cookie = `access_token=${token}; path=/; max-age=604800; SameSite=Lax`;

      toast.success("登入成功！", { id: "login-toast" });
      router.push("/cards");

    } catch (error: any) {
      console.error("[Login Error]", error);
      
      // ✅ 改進的錯誤處理
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;

      if (status === 401) {
        toast.error("Email 或密碼錯誤", { id: "login-toast" });
      } else if (status === 422) {
        toast.error("輸入格式錯誤，請檢查 Email 和密碼", { id: "login-toast" });
      } else if (detail) {
        toast.error(detail, { id: "login-toast" });
      } else {
        toast.error("登入失敗，請稍後再試", { id: "login-toast" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-indigo-600">SmartCard DB</h1>
          <p className="text-gray-500 mt-1">智慧名片管理系統</p>
        </div>

        {/* ✅ 改: 使用 form 標籤，但防止預設行為 */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 block w-full px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300"
          >
            {loading ? "登入中..." : "登入"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          還沒有帳戶？{" "}
          <Link href="/register" className="text-indigo-600 hover:underline font-medium">
            立即註冊
          </Link>
        </p>
      </div>
    </div>
  );
}
```

**改進重點:**
1. ✅ 使用 axios `api.post()` 而不是 `fetch`
2. ✅ 發送 JSON `{email, password}` 而不是 FormData
3. ✅ 完整的錯誤處理
4. ✅ Toast 提示更清楚
5. ✅ 與註冊頁面風格一致


---

### 替代方案 B: 後端支持 FormData (OAuth2PasswordRequestForm)

如果前端堅持使用 FormData，可以在後端修改：

```python
from fastapi import Form
from fastapi.security import HTTPBearer

@router.post("/login", response_model=TokenResponse)
async def login(
    email: str = Form(...),        # ✅ 從 FormData 解析
    password: str = Form(...),
    db: AsyncSession = Depends(get_db),
):
    """Authenticate using FormData"""
    # ... rest of code
```

**但不推薦**, 原因:
- 違反 REST API 最佳實踐
- 會破壞 API 文檔 (Swagger)
- 與公開的 API schema 不一致


---

## 🔍 詳細的錯誤流程

### 當前流程 (錯誤):

```
1. 前端發送:
   POST /api/v1/auth/login
   Content-Type: multipart/form-data
   Body: username=test@example.com&password=pass123

2. 後端期望:
   POST /api/v1/auth/login
   Content-Type: application/json
   Body: {"email":"test@example.com","password":"pass123"}

3. Pydantic 驗證失敗:
   - 期望 "email" 字段，收到 "username"
   - 期望 JSON，收到 multipart
   
4. 後端返回: 422 Unprocessable Entity
   {
     "detail": [
       {
         "type": "missing",
         "loc": ["body", "email"],
         "msg": "Field required"
       }
     ]
   }

5. 前端錯誤處理:
   - 嘗試解析 res.json() ❌ 可能成功
   - 檢查 err.detail (可能是數組，不是字符串)
   - 顯示錯誤訊息 ⚠️ 但可能有問題
```

### 修復後流程 (正確):

```
1. 前端發送:
   POST /api/v1/auth/login
   Content-Type: application/json
   Body: {"email":"test@example.com","password":"pass123"}

2. 後端期望完全匹配 ✅

3. Pydantic 驗證成功 ✅

4. 後端執行登入邏輯 ✅
   - 查詢用戶
   - 驗證密碼
   - 生成 JWT

5. 後端返回:
   200 OK
   {
     "access_token": "eyJ...",
     "token_type": "bearer"
   }

6. 前端保存 token 並跳轉 ✅
```


---

## 📋 修復檢查清單

- [ ] 備份原始登入頁面
- [ ] 複製修復後的登入頁面代碼
- [ ] 確認使用 axios `api` 實例
- [ ] 確認發送 JSON `{email, password}`
- [ ] 確認字段名稱為 "email"
- [ ] 確認有完整的錯誤處理
- [ ] 重啟前端容器
- [ ] 清除瀏覽器快取 (Ctrl+Shift+R)
- [ ] 打開開發者工具 Network 標籤
- [ ] 測試登入功能
- [ ] 驗證 Console 中沒有 422 錯誤


---

## 🧪 測試步驟

### 1. 驗證後端期望的格式

在 Terminal 中執行:

```bash
# 正確的登入格式 (應該返回 200 + token)
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# 應該返回: {"access_token":"eyJ...","token_type":"bearer"}

# 錯誤的登入格式 (應該返回 422)
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com","password":"password123"}'
# 應該返回: {"detail":[{"type":"missing","loc":["body","email"]...}]}
```

### 2. 修改前端後測試

1. 打開 http://localhost:3000/login
2. 打開開發者工具 (F12) → Network 標籤
3. 輸入已註冊的 email 和密碼
4. 點擊登入
5. 查看 Network 中的請求:
   - Request Headers 應該顯示 `Content-Type: application/json`
   - Request Payload 應該顯示 `{email: "...", password: "..."}`
   - Response 應該是 `200 OK` 和 `{access_token: "..."}`


---

## 📝 總結

### 當前代碼問題:

| 位置 | 問題 | 嚴重性 |
|------|------|--------|
| 登入頁 FormData | 格式不匹配 | 🔴 CRITICAL |
| 登入頁 username | 字段名錯誤 | 🔴 CRITICAL |
| 登入頁 fetch | 不使用 axios | 🟠 MEDIUM |
| 後端登入 | 不支持 FormData | ❌ 無法工作 |

### 修復優先級:

1. **立即修複:** 使用 axios + JSON + email 字段
2. **建議:** 確保前後端格式完全一致
3. **可選:** 後端添加日誌和更好的錯誤消息


---

## ⚠️ 為什麼現在登入失敗?

當用戶點擊登入時:

```
1. 前端創建 FormData
2. 添加 "username" 和 "password" 字段
3. fetch 發送 multipart/form-data
4. 後端期望 JSON with "email" 字段
5. Pydantic 無法驗證 (422 錯誤)
6. 前端顯示 "登入失敗" 或其他模糊的錯誤

👉 結果: 沒有用戶能成功登入!
```

這是一個很容易忽略的錯誤，但完全破壞了登入功能。
