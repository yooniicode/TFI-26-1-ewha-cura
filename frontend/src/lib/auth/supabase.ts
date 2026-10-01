import { createBrowserClient } from '@supabase/ssr'

// Supabase 클라이언트는 Realtime(채팅) 전용 — Auth는 사용하지 않음
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

/**
 * 인증 토큰은 httpOnly 쿠키에 있어 JS 로 읽을 수 없습니다.
 * API 호출은 lib/api/client.ts 가 쿠키로 자동 인증하므로 토큰을 직접 다룰 일이 없습니다.
 */
export async function getAccessToken(): Promise<string | null> {
  return null
}

export async function refreshAccessToken(): Promise<string | null> {
  // 자체 JWT는 24h 유효 — 만료 시 재로그인
  return null
}
