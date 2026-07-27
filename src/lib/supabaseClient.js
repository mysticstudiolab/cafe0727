import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// 키가 비어 있으면(.env 미설정) createClient가 즉시 에러를 던지므로,
// 설정 전에도 지도/마커 조회 같은 나머지 기능은 계속 쓸 수 있도록 null로 둔다.
export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null
