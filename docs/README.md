# SmartCard DB (智慧名片管理系統)

專為個人與團隊設計的名片管理系統。具備多帳號隔離、MiniMax AI 圖片辨識、重複聯絡人偵測，並支援一鍵匯出至 iOS/Google 通訊錄，提供極致的手機端操作體驗。

## 系統需求
- Docker & Docker Compose
- Node.js & Python 3.10+ (開發環境)
- **MiniMax API Key** (或相容之 VLM 視覺模型金鑰，用於名片 OCR 辨識)

## 部署教學 (Docker)
本專案運行於本地 Docker 環境 (Mac mini)。

1. **取得程式碼**
   ```bash
   git clone https://github.com/yuang093/smartcard-db.git
   cd smartcard-db