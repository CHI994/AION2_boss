-- Boss Tracker 資料庫初始化
-- 創建 boss_tracker_data 表用於跨裝置同步

CREATE TABLE IF NOT EXISTS public.boss_tracker_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    group_name TEXT NOT NULL,
    boss_name TEXT NOT NULL,
    respawn_minutes INTEGER NOT NULL,
    last_killed TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(group_name, boss_name)
);

-- 創建索引以提高查詢效能
CREATE INDEX IF NOT EXISTS idx_boss_tracker_data_group_name
    ON public.boss_tracker_data(group_name);

CREATE INDEX IF NOT EXISTS idx_boss_tracker_data_boss_name
    ON public.boss_tracker_data(boss_name);

CREATE INDEX IF NOT EXISTS idx_boss_tracker_data_created_at
    ON public.boss_tracker_data(created_at DESC);

-- 禁用 Row Level Security (RLS) 讓所有用戶都能讀寫
ALTER TABLE public.boss_tracker_data DISABLE ROW LEVEL SECURITY;

-- 授予權限給已認證用戶
GRANT ALL ON public.boss_tracker_data TO authenticated;
GRANT ALL ON public.boss_tracker_data TO anon;

-- 成功訊息
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Boss Tracker 資料庫初始化完成！';
    RAISE NOTICE '   - 創建了 boss_tracker_data 表';
    RAISE NOTICE '   - 設置了必要的索引';
    RAISE NOTICE '   - 禁用了 RLS 以簡化存取';
    RAISE NOTICE '   - 授予了讀寫權限';
END $$;