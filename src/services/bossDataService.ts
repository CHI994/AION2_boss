import { BossData, Boss } from '@/types/boss'
import { supabase, useCloud, BossRecord } from '@/lib/supabase'
import { defaultBossData } from '@/data/bossData'

export class BossDataService {
  private groupName: string
  private tableName = 'boss_tracker_data'
  
  constructor(groupName: string) {
    this.groupName = groupName
  }

  /**
   * Load boss data from cloud (priority) or localStorage (fallback)
   */
  async loadData(): Promise<BossData> {
    const standardBosses = defaultBossData
    let loadedData: BossData = {}

    // Try to load from cloud first
    if (useCloud && supabase) {
      try {
        const { data, error } = await supabase
          .from(this.tableName)
          .select('*')
          .eq('group_name', this.groupName)

        if (error) throw error

        if (data && data.length > 0) {
          // Convert cloud data to BossData format
          for (const record of data as BossRecord[]) {
            loadedData[record.boss_name] = {
              name: record.boss_name,
              respawnMinutes: record.respawn_minutes,
              lastKilled: record.last_killed
            }
          }
        }
      } catch (error) {
        console.error('Failed to load from cloud:', error)
        // Fall back to localStorage
        loadedData = this.loadFromLocalStorage()
      }
    } else {
      // Load from localStorage if cloud is not available
      loadedData = this.loadFromLocalStorage()
    }

    // Ensure all standard bosses exist with correct respawn times
    const unifiedData: BossData = {}
    for (const [bossName, bossConfig] of Object.entries(standardBosses)) {
      if (loadedData[bossName]) {
        // Keep existing time data but use standard respawn minutes
        unifiedData[bossName] = {
          ...bossConfig,
          respawnMinutes: bossConfig.respawnMinutes, // Force standard respawn time
          lastKilled: loadedData[bossName].lastKilled
        }
      } else {
        // New boss, use default config
        unifiedData[bossName] = { ...bossConfig }
      }
    }

    // Save unified data
    this.saveToLocalStorage(unifiedData)
    if (useCloud) {
      await this.syncToCloud(unifiedData)
    }

    return unifiedData
  }

  /**
   * Save boss data to both cloud and localStorage
   */
  async saveData(bossData: BossData): Promise<boolean> {
    // Save to localStorage immediately
    this.saveToLocalStorage(bossData)
    
    // Sync to cloud if available
    if (useCloud && supabase) {
      return await this.syncToCloud(bossData)
    }
    
    return true
  }

  /**
   * Update a specific boss kill time
   */
  async updateBoss(bossData: BossData, bossName: string, killedTime: string | null): Promise<BossData> {
    const updatedData = {
      ...bossData,
      [bossName]: {
        ...bossData[bossName],
        lastKilled: killedTime
      }
    }

    await this.saveData(updatedData)
    return updatedData
  }

  /**
   * Load data from localStorage
   */
  private loadFromLocalStorage(): BossData {
    try {
      const saved = localStorage.getItem(`boss-data-${this.groupName}`)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error)
    }
    return {}
  }

  /**
   * Save data to localStorage
   */
  private saveToLocalStorage(bossData: BossData): void {
    try {
      localStorage.setItem(`boss-data-${this.groupName}`, JSON.stringify(bossData))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }

  /**
   * Sync data to cloud (Supabase)
   */
  private async syncToCloud(bossData: BossData): Promise<boolean> {
    if (!useCloud || !supabase) return false

    try {
      // Delete existing records for this group
      const { error: deleteError } = await supabase
        .from(this.tableName)
        .delete()
        .eq('group_name', this.groupName)

      if (deleteError) throw deleteError

      // Insert new records
      const records: Omit<BossRecord, 'id' | 'created_at'>[] = []
      for (const [bossName, bossData] of Object.entries(bossData)) {
        records.push({
          group_name: this.groupName,
          boss_name: bossName,
          respawn_minutes: bossData.respawnMinutes,
          last_killed: bossData.lastKilled,
          updated_at: new Date().toISOString()
        })
      }

      if (records.length > 0) {
        const { error: insertError } = await supabase
          .from(this.tableName)
          .insert(records)

        if (insertError) throw insertError
      }

      return true
    } catch (error) {
      console.error('Failed to sync to cloud:', error)
      return false
    }
  }
}