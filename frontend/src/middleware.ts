import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/auth/', '/', '/ut']
const COOKIE_NAME = 'byby_auth'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API 프록시는 통과
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  const isPublic = PUBLIC_PATHS.some(p =>
    pathname === p || pathname.startsWith(p + '/') || (p.endsWith('/') && pathname.startsWith(p))
  )

  const isAuthenticated = request.cookies.get(COOKIE_NAME)?.value === '1'

  if (!isAuthenticated && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (isAuthenticated && pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw\\.js|workbox-.*).*)'],
}
