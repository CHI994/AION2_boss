import { createClient } from '@supabase/supabase-js'

// Supabase configuration - these should match the Python version
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Check if Supabase is configured
export const useCloud = Boolean(supabaseUrl && supabaseKey)

// Create Supabase client only if configured
export const supabase = useCloud ? createClient(supabaseUrl, supabaseKey) : null

// Database types
export interface BossRecord {
  id?: number
  group_name: string
  boss_name: string
  respawn_minutes: number
  last_killed: string | null
  updated_at?: string
  created_at?: string
}

// Error handling for missing configuration
if (!useCloud) {
  console.warn('Supabase not configured. Cloud sync will be disabled. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.')
}