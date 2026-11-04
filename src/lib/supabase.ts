import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

// .env(로컬) 또는 GitHub Secrets(배포)에 값이 없거나 잘못돼도 화면이 죽지 않고 시리얼만 쓴다.
function createSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null
  try {
    return createClient(url, anonKey)
  } catch (error) {
    console.error("Supabase 설정 값이 올바르지 않습니다(VITE_SUPABASE_URL 확인).", error)
    return null
  }
}

export const supabase = createSupabase()

export const READINGS_TABLE = "readings"

export type ReadingRow = {
  id: number
  created_at: string
  value: number | null
}
