import { NextResponse, type NextRequest } from 'next/server'

const COOKIE_NAME = 'byby_auth'

// 로그인 플래그만 보고 화면 접근을 거른다. 실제 권한(admin 역할)은 백엔드 @PreAuthorize 와
// (console) 레이아웃의 역할 확인이 판정한다.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const isAuthenticated = request.cookies.get(COOKIE_NAME)?.value === '1'
  const isLogin = pathname === '/login'

  if (!isAuthenticated && !isLogin) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthenticated && isLogin) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons).*)'],
}
