/**
 * 인증 토큰은 서버가 httpOnly 쿠키(byby_access_token)로 관리합니다.
 * 브라우저 JS는 토큰을 읽을 수 없으므로(XSS 방어) 여기서는 "로그인 상태" 플래그만 다룹니다.
 */

/** 미들웨어·클라이언트가 로그인 여부만 판단하는 데 쓰는 플래그. 비밀값이 아닙니다. */
const AUTH_FLAG_COOKIE = 'byby_auth'
const LAST_LOGIN_METHOD_KEY = 'byby_last_login_method'

/** 서버 쿠키 수명과 동일 (JWT expiration-ms = 24h) */
const AUTH_FLAG_MAX_AGE = 24 * 60 * 60

/** v1 에서 localStorage 에 저장하던 토큰 — 남아 있으면 제거 대상 */
const LEGACY_TOKEN_KEY = 'byby_access_token'

export type LoginMethod = 'email' | 'phone' | 'kakao'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

/** 로그인 상태 여부. 실제 인증은 서버가 httpOnly 쿠키로 판정합니다. */
export function isAuthenticated(): boolean {
  return readCookie(AUTH_FLAG_COOKIE) === '1'
}

/** 로그인 성공 시 호출 — 토큰 자체는 저장하지 않습니다. */
export function markAuthenticated(): void {
  if (typeof document === 'undefined') return
  clearLegacyToken()
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${AUTH_FLAG_COOKIE}=1; path=/; max-age=${AUTH_FLAG_MAX_AGE}; SameSite=Lax${secure}`
}

/** 로그아웃·401 시 호출. 서버 httpOnly 쿠키는 백엔드가 만료시킵니다. */
export function clearAuthState(): void {
  if (typeof document === 'undefined') return
  clearLegacyToken()
  document.cookie = `${AUTH_FLAG_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
}

/**
 * localStorage 에 남은 구버전 토큰을 제거합니다.
 * XSS 로 탈취 가능한 값이므로 앱 진입 시 즉시 정리합니다.
 */
export function clearLegacyToken(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(LEGACY_TOKEN_KEY)
  } catch {
    /* Safari private mode 등에서 접근 실패 시 무시 */
  }
}

export function setLastLoginMethod(method: LoginMethod): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LAST_LOGIN_METHOD_KEY, method)
}

export function getLastLoginMethod(): LoginMethod | null {
  if (typeof window === 'undefined') return null
  const v = localStorage.getItem(LAST_LOGIN_METHOD_KEY)
  return v === 'email' || v === 'phone' || v === 'kakao' ? v : null
}
