import { NextRequest, NextResponse } from 'next/server'

/**
 * Google Sheets API v4 — 읽기 전용 데이터 조회
 *
 * 사전 조건:
 *  - 환경변수 GOOGLE_SHEETS_API_KEY 설정 (Google Cloud Console → Credentials)
 *  - 대상 스프레드시트를 "링크가 있는 모든 사용자 — 뷰어" 로 공유
 *
 * GET /api/sheets?id={spreadsheetId}&range={A1 표기법, 기본값 Sheet1}
 */
export async function GET(req: NextRequest) {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_SHEETS_API_KEY 환경변수가 설정되지 않았습니다.' },
      { status: 503 },
    )
  }

  const { searchParams } = req.nextUrl
  const spreadsheetId = searchParams.get('id')?.trim()
  const range = searchParams.get('range')?.trim() || 'Sheet1'

  if (!spreadsheetId) {
    return NextResponse.json({ error: 'id 파라미터가 필요합니다.' }, { status: 400 })
  }

  try {
    // 1) 시트 메타데이터 (시트 이름 목록)
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}&fields=properties.title,sheets.properties`
    const metaRes = await fetch(metaUrl)
    if (!metaRes.ok) {
      const err = await metaRes.json().catch(() => ({})) as { error?: { message?: string } }
      return NextResponse.json(
        { error: err?.error?.message ?? '시트 메타데이터 조회 실패' },
        { status: metaRes.status },
      )
    }
    const meta = await metaRes.json() as {
      properties: { title: string }
      sheets: { properties: { sheetId: number; title: string } }[]
    }

    // 2) 실제 데이터 조회
    const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?key=${apiKey}`
    const dataRes = await fetch(dataUrl)
    if (!dataRes.ok) {
      const err = await dataRes.json().catch(() => ({})) as { error?: { message?: string } }
      return NextResponse.json(
        { error: err?.error?.message ?? '시트 데이터 조회 실패' },
        { status: dataRes.status },
      )
    }
    const data = await dataRes.json() as { values?: string[][]; range?: string }

    return NextResponse.json({
      title: meta.properties.title,
      sheets: meta.sheets.map(s => s.properties.title),
      range: data.range ?? range,
      rows: data.values ?? [],
      fetchedAt: new Date().toISOString(),
    })
  } catch (e) {
    console.error('[sheets] 조회 오류:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'Google Sheets 데이터 조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
