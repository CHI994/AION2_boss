# AION2 Boss追蹤器

一個現代化的AION2（永恆紀元2）Boss重生時間追蹤應用，支援雲端同步功能。

## 功能特色

- ✨ 即時Boss重生倒計時
- 🔄 自動週期計算和時間調整
- 🚨 5分鐘重生提醒通知
- ☁️ 雲端資料同步 (跨設備存取)
- 💾 本地儲存備援
- 🎨 現代化深色主題界面
- 📱 響應式設計 (支援桌面和移動設備)

## 快速開始

### 本地開發

1. 安裝依賴
```bash
npm install
```

2. 啟動開發伺服器
```bash
npm run dev
```

3. 在瀏覽器中開啟 http://localhost:8080

### 雲端同步設定 (可選)

要啟用跨設備同步功能：

1. 前往 [Supabase](https://supabase.com) 建立專案
2. 複製專案的 URL 和 API Key
3. 建立 `.env` 檔案：
```bash
cp .env.example .env
```
4. 編輯 `.env` 檔案，填入您的 Supabase 配置：
```env
VITE_SUPABASE_URL=您的專案URL
VITE_SUPABASE_ANON_KEY=您的API密鑰
```

5. 在 Supabase SQL 編輯器中執行以下 SQL 建立資料表：
```sql
CREATE TABLE boss_tracker_data (
  id SERIAL PRIMARY KEY,
  group_name VARCHAR(50) NOT NULL,
  boss_name VARCHAR(100) NOT NULL,
  respawn_minutes INTEGER NOT NULL,
  last_killed TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 建立索引以提升查詢效能
CREATE INDEX idx_boss_tracker_group_name ON boss_tracker_data(group_name);
CREATE INDEX idx_boss_tracker_boss_name ON boss_tracker_data(boss_name);
```

## 使用說明

### 基本操作

1. **選擇伺服器群組**：從首頁選擇您的伺服器
2. **記錄擊殺時間**：點擊Boss列表中的 ⏰ 圖示
3. **手動輸入時間**：支援多種格式：
   - `hhmmss` (例：143045)
   - `mmddhhmmss` (例：1225143045)
   - `HH:MM` (例：14:30)
   - `MM/DD HH:MM` (例：12/25 14:30)

### 智能時間處理

系統會自動調整輸入的時間到最合理的重生週期：
- 未來時間：自動向前推算到過去
- 過於久遠的時間：自動向前推算到近期週期

### 同步狀態指示

右上角顯示目前的同步狀態：
- 🌩️ 同步中... (黃色)
- ☁️ 雲端 (綠色) - 雲端同步已啟用
- ☁️ 本地 (灰色) - 僅本地儲存

## 技術架構

- **前端框架**：React + TypeScript
- **建構工具**：Vite
- **UI 組件**：shadcn/ui + Radix UI
- **樣式系統**：Tailwind CSS
- **資料庫**：Supabase (PostgreSQL)
- **本地儲存**：LocalStorage (備援)

## 部署

### 本地建構

```bash
# 建構生產版本
npm run build

# 預覽建構結果
npm run preview
```

生產檔案將在 `dist/` 目錄中生成。

## 授權

此專案採用 MIT 授權條款。
