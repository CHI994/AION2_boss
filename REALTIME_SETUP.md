# AION2 Boss追蹤器 - 即時同步功能設定指南

## 🎯 修復內容

本次更新修復了兩個重要問題：

### ✅ 問題 1: 同時輸入造成資料覆蓋
**修復方式**: 改為只更新單一 Boss 的資料，而非整個資料表
- 之前：每次更新會上傳所有 24 個 Boss 的資料
- 現在：只上傳被更新的那一個 Boss

### ✅ 問題 2: 不同設備無法即時看到更新
**修復方式**: 加入 Supabase Realtime 訂閱功能
- 之前：只在頁面載入時讀取一次資料
- 現在：即時監聽雲端資料變更，自動更新畫面

---

## 🔧 需要執行的設定步驟

### 步驟 1: 在 Supabase 啟用 Realtime 功能

1. 前往你的 Supabase 專案 Dashboard
   - https://supabase.com/dashboard/project/xzwlvpmvqntxdopllkof

2. 點擊左側選單的 **SQL Editor** 📝

3. 點擊 **New query**

4. 複製並執行以下 SQL：

```sql
-- 啟用 boss_tracker_data 表的 Realtime 功能

-- 1. 啟用表的 Realtime 複寫
ALTER TABLE public.boss_tracker_data REPLICA IDENTITY FULL;

-- 2. 啟用表的 Realtime 發布
ALTER PUBLICATION supabase_realtime ADD TABLE public.boss_tracker_data;
```

5. 點擊 **Run** 執行

6. 確認執行成功（沒有錯誤訊息）

### 步驟 2: 或者使用 Supabase Dashboard 啟用（更簡單）

1. 前往 **Database** → **Replication**

2. 找到 `boss_tracker_data` 表

3. 開啟 **Realtime** 開關 ✅

---

## 🧪 測試即時同步功能

### 測試步驟：

1. **開啟兩個瀏覽器視窗**
   - 視窗 A: http://localhost:8080
   - 視窗 B: http://localhost:8080（或用手機開啟）

2. **測試同步**
   - 在視窗 A 記錄一個 Boss 的擊殺時間
   - 幾秒內，視窗 B 應該會：
     - 自動更新該 Boss 的時間
     - 顯示通知：「🔄 即時更新 - XXX 的資料已從其他設備更新」

3. **測試沒有資料覆蓋**
   - 在視窗 A 更新 Boss1
   - 同時在視窗 B 更新 Boss2
   - 兩個 Boss 的時間都應該正確保存

---

## 📊 功能說明

### 單一 Boss 更新機制

**舊版本問題**:
```
設備 A 更新 Boss1 → 上傳全部 24 個 Boss
設備 B 更新 Boss2 → 上傳全部 24 個 Boss
結果: Boss1 的更新被覆蓋！❌
```

**新版本修復**:
```
設備 A 更新 Boss1 → 只上傳 Boss1 的資料
設備 B 更新 Boss2 → 只上傳 Boss2 的資料
結果: 兩個 Boss 都正確更新！✅
```

### 即時同步機制

**舊版本問題**:
```
設備 A 記錄時間 → 上傳到雲端
設備 B → 需要手動重新整理才能看到
```

**新版本修復**:
```
設備 A 記錄時間 → 上傳到雲端 → Realtime 通知
設備 B → 自動收到更新並顯示通知 ✅
```

---

## 🎉 預期效果

完成設定後，你應該能看到：

✅ 多人同時更新不同 Boss 不會互相覆蓋
✅ 在手機更新後，電腦立即看到變化
✅ 在電腦更新後，手機立即看到變化
✅ 畫面右上角顯示「☁️ 雲端」（綠色）
✅ 更新時顯示即時同步通知

---

## 📝 技術細節

### 修改的檔案：

1. **bossDataService.ts**
   - 新增 `subscribeToUpdates()` - 訂閱即時更新
   - 新增 `syncSingleBoss()` - 只同步單一 Boss
   - 修改 `updateBoss()` - 使用單一 Boss 同步

2. **BossTracker.tsx**
   - 加入 Realtime 訂閱
   - 修改 `recordCurrentTime()` - 使用新的更新機制
   - 加入即時更新通知

3. **Supabase 資料庫**
   - 啟用 Realtime 複寫
   - 啟用 Realtime 發布

---

## ⚠️ 重要提醒

- 完成 SQL 執行後，**無需重新啟動應用**
- Realtime 功能會自動生效
- 如果沒有看到即時更新，請檢查：
  1. Supabase Realtime 是否已啟用
  2. 瀏覽器控制台是否有錯誤訊息
  3. 網路連線是否正常

---

## 🚀 部署到線上

完成本地測試後，需要部署到 Vercel：

```bash
# 提交更新
git add .
git commit -m "修復跨設備同步問題並加入 Realtime 功能"
git push

# 部署到 Vercel
vercel --prod
```

部署完成後，線上版本也會擁有即時同步功能！
