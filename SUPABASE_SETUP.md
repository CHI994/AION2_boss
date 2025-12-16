# AION2 Boss追蹤器 - Supabase 雲端同步設定指南

## 步驟 1: 建立 Supabase 專案

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 點擊 **New Project**
3. 填寫專案資訊：
   - **Name**: `aion2-boss-tracker`（或您喜歡的名稱）
   - **Database Password**: 設定一個強密碼（請記住此密碼）
   - **Region**: 選擇 `Northeast Asia (Tokyo)` 或最近的區域
4. 點擊 **Create new project** 並等待專案建立完成（約 1-2 分鐘）

## 步驟 2: 取得 API 金鑰

1. 在專案儀表板中，點擊左側選單的 **Settings** ⚙️
2. 選擇 **API**
3. 找到以下兩個資訊：
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 步驟 3: 建立資料表

1. 點擊左側選單的 **SQL Editor** 📝
2. 點擊 **New query**
3. 複製 `init-boss-tracker-db.sql` 檔案的內容並貼上
4. 點擊 **Run** 執行 SQL
5. 確認看到成功訊息：✅ Boss Tracker 資料庫初始化完成！

## 步驟 4: 設定本地環境變數

1. 在專案根目錄建立 `.env` 檔案：
```bash
cp .env.example .env
```

2. 編輯 `.env` 檔案，填入您的 Supabase 配置：
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 步驟 5: 測試連線

1. 啟動開發伺服器：
```bash
npm run dev
```

2. 打開瀏覽器查看控制台（F12）
   - 如果看到 ✅ 綠色的「☁️ 雲端」標示，表示連線成功
   - 如果看到 ⚠️ 警告訊息，請檢查環境變數是否正確

## 驗證資料同步

1. 在應用程式中記錄一個 Boss 擊殺時間
2. 前往 Supabase Dashboard → **Table Editor**
3. 選擇 `boss_tracker_data` 表
4. 確認可以看到剛才記錄的資料

## 常見問題

### Q: 無法連線到 Supabase？
A: 請確認：
- 環境變數格式正確（無多餘空格）
- Project URL 和 API Key 複製完整
- 已重新啟動開發伺服器

### Q: 資料沒有同步？
A: 請檢查：
- 瀏覽器控制台是否有錯誤訊息
- Supabase 專案是否正常運行
- 網路連線是否正常

### Q: 想要停用雲端同步？
A: 刪除或重新命名 `.env` 檔案，應用程式會自動切換到本地儲存模式

## 安全性說明

- `.env` 檔案已加入 `.gitignore`，不會被提交到 Git
- `anon key` 是公開金鑰，可以安全地用於前端
- 已禁用 RLS 以簡化開發，生產環境建議啟用適當的安全規則

## 需要協助？

如有任何問題，請參考：
- [Supabase 官方文件](https://supabase.com/docs)
- [專案 README](./README.md)
