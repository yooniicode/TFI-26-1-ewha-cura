const TOKEN_KEY = 'byby_access_token'
const COOKIE_NAME = 'byby_auth'
const LAST_LOGIN_METHOD_KEY = 'byby_last_login_method'

export type LoginMethod = 'email' | 'phone' | 'kakao'

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setAccessToken(token: string): void {
  clearAccessToken()
  localStorage.setItem(TOKEN_KEY, token)
  // 쿠키는 미들웨어가 인증 여부를 확인하는 데 사용 (실제 토큰은 localStorage에만)
  const maxAge = 7 * 24 * 60 * 60
  document.cookie = `${COOKIE_NAME}=1; path=/; max-age=${maxAge}; SameSite=Lax`
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  document.cookie = `${COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
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
