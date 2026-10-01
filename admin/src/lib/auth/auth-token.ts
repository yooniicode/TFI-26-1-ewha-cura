/**
 * 인증 토큰은 서버가 httpOnly 쿠키로 관리합니다.
 * 브라우저 JS는 토큰을 읽을 수 없으므로(XSS 방어) 여기서는 "로그인 상태" 플래그만 다룹니다.
 * 쿠키는 Domain 없이 발급되므로 admin 호스트 전용입니다.
 */

/** 미들웨어·클라이언트가 로그인 여부만 판단하는 데 쓰는 플래그. 비밀값이 아닙니다. */
export const AUTH_FLAG_COOKIE = 'byby_auth'

/** 서버 쿠키 수명과 동일 (JWT expiration-ms = 24h) */
const AUTH_FLAG_MAX_AGE = 24 * 60 * 60

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export function isAuthenticated(): boolean {
  return readCookie(AUTH_FLAG_COOKIE) === '1'
}

export function markAuthenticated(): void {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${AUTH_FLAG_COOKIE}=1; path=/; max-age=${AUTH_FLAG_MAX_AGE}; SameSite=Lax${secure}`
}

export function clearAuthState(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${AUTH_FLAG_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
}
