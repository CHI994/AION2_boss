-- 啟用 boss_tracker_data 表的 Realtime 功能
-- 這允許客戶端訂閱資料庫的即時變更

-- 1. 啟用表的 Realtime 複寫
ALTER TABLE public.boss_tracker_data REPLICA IDENTITY FULL;

-- 2. 啟用表的 Realtime 發布
ALTER PUBLICATION supabase_realtime ADD TABLE public.boss_tracker_data;

-- 成功訊息
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Realtime 功能已啟用！';
    RAISE NOTICE '   - boss_tracker_data 表已設定為 REPLICA IDENTITY FULL';
    RAISE NOTICE '   - 已加入 supabase_realtime 發布';
    RAISE NOTICE '   - 客戶端現在可以訂閱即時更新';
END $$;
