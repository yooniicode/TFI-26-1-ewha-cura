import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? 'localhost:3000'
  const proto = request.headers.get('x-forwarded-proto') ?? 'http'
  return NextResponse.redirect(`${proto}://${host}/login`)
}
