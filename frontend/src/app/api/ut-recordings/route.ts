import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'ut-recordings'

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key)
}

export async function POST(request: NextRequest) {
  let body: {
    role?: string
    startTime?: string
    endTime?: string
    durationSeconds?: number
    events?: unknown[]
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { role, startTime, endTime, durationSeconds, events } = body

  if (!role || !events?.length) {
    return NextResponse.json({ error: 'role and events are required' }, { status: 400 })
  }

  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 })
  }

  // 버킷이 없으면 생성 (에러 무시 — 이미 있으면 ok)
  await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 100 * 1024 * 1024, // 100MB
  }).catch(() => {})

  const ts = (startTime ?? new Date().toISOString())
    .slice(0, 19)
    .replace(/[T:]/g, '-')
  const filename = `${role}-${ts}-${Date.now()}.json`
  const content = JSON.stringify({ role, startTime, endTime, durationSeconds, events })

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, Buffer.from(content, 'utf-8'), {
      contentType: 'application/json',
      upsert: false,
    })

  if (error) {
    console.error('[ut-recordings] Supabase upload error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  console.log(`[ut-recordings] Uploaded: ${data.path} (${events.length} events, ${durationSeconds}s)`)
  return NextResponse.json({ path: data.path, bucket: BUCKET })
}

// 어드민용 목록 조회
export async function GET() {
  let supabase
  try {
    supabase = getSupabaseAdmin()
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 503 })
  }

  const { data, error } = await supabase.storage.from(BUCKET).list('', {
    limit: 100,
    sortBy: { column: 'created_at', order: 'desc' },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ recordings: data })
}
