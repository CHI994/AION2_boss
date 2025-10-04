import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://wjtwzsmipmzyguljjteh.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqdHd6c21pcG16eWd1bGpqdGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2ODMyNjksImV4cCI6MjA3MzI1OTI2OX0.t90BPQh870v2ix8Mw8ypRd4DOf6ayAM3GJvSNyJYoGg'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSync() {
  try {
    console.log('🔍 檢查雲端資料庫連線...')

    // 查詢所有 BOSS 資料
    const { data, error } = await supabase
      .from('boss_tracker_data')
      .select('*')
      .order('respawn_minutes', { ascending: true })

    if (error) {
      console.error('❌ 查詢失敗:', error.message)
      return
    }

    console.log(`✅ 連線成功！找到 ${data.length} 筆資料`)
    console.log('\n📊 資料庫中的 BOSS 列表：')

    // 按群組分類顯示
    const groups = {}
    data.forEach(boss => {
      if (!groups[boss.group_name]) {
        groups[boss.group_name] = []
      }
      groups[boss.group_name].push(boss)
    })

    Object.keys(groups).forEach(groupName => {
      console.log(`\n🏷️  群組: ${groupName}`)
      console.log(`   共 ${groups[groupName].length} 個 BOSS`)

      // 檢查新增的 BOSS
      const newBosses = ['拉何', '霸拉克', '巴倫', '黑卡頓']
      const deletedBosses = ['費德', '瑪杜克']

      const foundNew = groups[groupName].filter(b => newBosses.includes(b.boss_name))
      const foundDeleted = groups[groupName].filter(b => deletedBosses.includes(b.boss_name))

      if (foundNew.length > 0) {
        console.log(`   ✅ 找到新增的 BOSS: ${foundNew.map(b => b.boss_name).join(', ')}`)
      }

      if (foundDeleted.length > 0) {
        console.log(`   ⚠️  還存在應刪除的 BOSS: ${foundDeleted.map(b => b.boss_name).join(', ')}`)
      }

      if (foundNew.length === 0 && foundDeleted.length === 0) {
        console.log(`   ℹ️  未發現新增或刪除的 BOSS（可能尚未同步）`)
      }
    })

    // 如果沒有任何資料
    if (data.length === 0) {
      console.log('\n⚠️  資料庫是空的！')
      console.log('   原因可能是：')
      console.log('   1. 尚未在應用程式中記錄任何 BOSS 擊殺時間')
      console.log('   2. 資料尚未同步到雲端')
      console.log('   3. 使用的是本地 localStorage 而非雲端同步')
    }

  } catch (err) {
    console.error('❌ 發生錯誤:', err.message)
  }
}

checkSync()
