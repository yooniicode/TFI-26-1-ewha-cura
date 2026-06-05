import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase 환경변수가 설정되지 않았습니다.' }, { status: 503 })
  }

  const formData = await req.formData()
  const file = formData.get('file')
  const userId = formData.get('userId')

  if (!(file instanceof File) || !userId || typeof userId !== 'string') {
    return NextResponse.json({ error: 'file, userId 필드가 필요합니다.' }, { status: 400 })
  }

  const ext  = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  // service role key — RLS 우회, 서버사이드에서만 사용
  const supabase = createClient(supabaseUrl, serviceKey)
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (error) {
    console.error('[avatar upload]', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return NextResponse.json({ url: `${data.publicUrl}?t=${Date.now()}` })
}
