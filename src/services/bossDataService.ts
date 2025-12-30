import { BossData, Boss } from '@/types/boss'
import { supabase, useCloud, BossRecord } from '@/lib/supabase'
import { defaultBossData } from '@/data/bossData'
import { RealtimeChannel } from '@supabase/supabase-js'

export class BossDataService {
  private groupName: string
  private tableName = 'boss_tracker_data'
  private syncLock: Promise<boolean> | null = null
  private realtimeChannel: RealtimeChannel | null = null

  constructor(groupName: string) {
    this.groupName = groupName
  }

  /**
   * Subscribe to real-time updates from Supabase
   */
  subscribeToUpdates(callback: (bossName: string, bossData: Boss) => void): () => void {
    if (!useCloud || !supabase) {
      console.log('Real-time sync disabled: Supabase not configured')
      return () => {}
    }

    // Clean up existing subscription
    if (this.realtimeChannel) {
      this.realtimeChannel.unsubscribe()
    }

    // Subscribe to changes for this group
    this.realtimeChannel = supabase
      .channel(`boss_tracker_${this.groupName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.tableName,
          filter: `group_name=eq.${this.groupName}`
        },
        (payload) => {
          console.log('Real-time update received:', payload)

          if (payload.new && typeof payload.new === 'object') {
            const record = payload.new as BossRecord
            callback(record.boss_name, {
              name: record.boss_name,
              respawnMinutes: record.respawn_minutes,
              lastKilled: record.last_killed
            })
          }
        }
      )
      .subscribe()

    console.log(`✅ Subscribed to real-time updates for group: ${this.groupName}`)

    // Return unsubscribe function
    return () => {
      if (this.realtimeChannel) {
        this.realtimeChannel.unsubscribe()
        this.realtimeChannel = null
        console.log('Unsubscribed from real-time updates')
      }
    }
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
   * Update a specific boss kill time (single boss update to prevent race conditions)
   */
  async updateBoss(bossData: BossData, bossName: string, killedTime: string | null): Promise<BossData> {
    const updatedData = {
      ...bossData,
      [bossName]: {
        ...bossData[bossName],
        lastKilled: killedTime
      }
    }

    // Save to localStorage immediately
    this.saveToLocalStorage(updatedData)

    // Sync only this specific boss to cloud to avoid race conditions
    if (useCloud && supabase) {
      await this.syncSingleBoss(bossName, updatedData[bossName])
    }

    return updatedData
  }

  /**
   * Sync a single boss to cloud (prevents overwriting other bosses' data)
   */
  private async syncSingleBoss(bossName: string, bossInfo: Boss): Promise<boolean> {
    if (!supabase) return false

    try {
      const now = new Date().toISOString()

      const record: Omit<BossRecord, 'id' | 'created_at'> = {
        group_name: this.groupName,
        boss_name: bossName,
        respawn_minutes: bossInfo.respawnMinutes,
        last_killed: bossInfo.lastKilled,
        updated_at: now
      }

      // Use UPSERT for single boss
      const { error } = await supabase
        .from(this.tableName)
        .upsert([record], {
          onConflict: 'group_name,boss_name',
          ignoreDuplicates: false
        })

      if (error) {
        console.error('Single boss sync error:', error)
        throw error
      }

      console.log(`✅ Synced ${bossName} to cloud`)
      return true
    } catch (error) {
      console.error('Failed to sync single boss:', error)
      return false
    }
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
   * Sync data to cloud (Supabase) with optimistic locking to prevent race conditions
   */
  private async syncToCloud(bossData: BossData): Promise<boolean> {
    if (!useCloud || !supabase) return false

    // Prevent concurrent sync operations (optimistic locking)
    if (this.syncLock) {
      console.log('Sync already in progress, waiting...')
      await this.syncLock
    }

    // Create new sync promise
    this.syncLock = this.performSync(bossData)

    try {
      const result = await this.syncLock
      return result
    } finally {
      this.syncLock = null
    }
  }

  /**
   * Perform actual sync using UPSERT strategy
   */
  private async performSync(bossData: BossData): Promise<boolean> {
    if (!supabase) return false

    try {
      const records: Omit<BossRecord, 'id' | 'created_at'>[] = []
      const now = new Date().toISOString()

      for (const [bossName, bossInfo] of Object.entries(bossData)) {
        records.push({
          group_name: this.groupName,
          boss_name: bossName,
          respawn_minutes: bossInfo.respawnMinutes,
          last_killed: bossInfo.lastKilled,
          updated_at: now
        })
      }

      if (records.length === 0) return true

      // Use UPSERT (insert or update) instead of delete + insert
      // This prevents data loss during concurrent operations
      const { error } = await supabase
        .from(this.tableName)
        .upsert(records, {
          onConflict: 'group_name,boss_name',
          ignoreDuplicates: false
        })

      if (error) {
        console.error('Upsert error:', error)
        throw error
      }

      console.log(`✅ Synced ${records.length} bosses to cloud for group: ${this.groupName}`)
      return true
    } catch (error) {
      console.error('Failed to sync to cloud:', error)
      return false
    }
  }
}