import { createClient } from '@supabase/supabase-js'

// Publishable key — safe to expose; write access is guarded by RLS + auth
const SUPABASE_URL = 'https://vlpuvaofbzdawgjjpgfu.supabase.co'
const SUPABASE_KEY = 'sb_publishable_iRpQjoext0BgPQXifwwgnw_kCnjFonX'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
