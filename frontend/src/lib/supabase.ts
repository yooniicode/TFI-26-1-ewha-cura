import { createBrowserClient } from '@supabase/ssr'
import { getAccessToken as getLocalToken } from './auth-token'

// Supabase 클라이언트는 Realtime(채팅) 전용 — Auth는 사용하지 않음
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// 하위 호환 — API 클라이언트는 auth-token.ts를 직접 사용
export async function getAccessToken(): Promise<string | null> {
  return getLocalToken()
}

export async function refreshAccessToken(): Promise<string | null> {
  // 자체 JWT는 24h 유효 — 만료 시 재로그인
  return null
}
