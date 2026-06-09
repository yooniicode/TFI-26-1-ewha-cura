import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080'

const UT_CREDENTIALS: Record<string, { email: string; password: string }> = {
  patient: {
    email:    process.env.UT_PATIENT_EMAIL    ?? '',
    password: process.env.UT_PATIENT_PASSWORD ?? '',
  },
  interpreter: {
    email:    process.env.UT_INTERPRETER_EMAIL    ?? '',
    password: process.env.UT_INTERPRETER_PASSWORD ?? '',
  },
}

export async function GET(request: NextRequest) {
  const role = request.nextUrl.searchParams.get('role')

  if (role !== 'patient' && role !== 'interpreter') {
    return NextResponse.json({ error: 'role must be patient or interpreter' }, { status: 400 })
  }

  const creds = UT_CREDENTIALS[role]
  if (!creds.email || !creds.password) {
    return NextResponse.json(
      { error: `UT_${role.toUpperCase()}_EMAIL / UT_${role.toUpperCase()}_PASSWORD not configured` },
      { status: 503 },
    )
  }

  const backendRes = await fetch(`${API_URL}/api/v1/auth/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email: creds.email, password: creds.password }),
  })

  const data = await backendRes.json()

  if (!backendRes.ok || !data.isSuccess) {
    return NextResponse.json(
      { error: data.message ?? 'UT login failed' },
      { status: backendRes.status },
    )
  }

  return NextResponse.json({ token: data.payload.token, me: data.payload.me })
}
