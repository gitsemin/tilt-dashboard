import { createClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// .env(로컬) 또는 GitHub Secrets(배포)에 값이 없으면 Supabase 없이 시리얼만 쓴다.
export const supabase = url && anonKey ? createClient(url, anonKey) : null

export const READINGS_TABLE = "readings"

export type ReadingRow = {
  id: number
  created_at: string
  value: number | null
}
