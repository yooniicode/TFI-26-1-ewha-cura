import { NextRequest, NextResponse } from 'next/server'

export interface HospitalResult {
  name: string    // yadmNm
  address: string // addr
  phone: string   // telno
  type: string    // clCdNm (종별명칭)
}

/**
 * 건강보험심사평가원 병원정보서비스 OpenAPI 프록시
 * Base URL: apis.data.go.kr/B551182/hospInfoServicev2
 * Operation: getHospBasisList
 * 환경변수: HIRA_API_KEY
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim()
  if (!query || query.length < 1) {
    return NextResponse.json({ results: [] })
  }

  const apiKey = process.env.HIRA_API_KEY
  if (!apiKey) {
    return NextResponse.json({ results: [], error: 'HIRA_API_KEY not configured' })
  }

  try {
    const params = new URLSearchParams({
      ServiceKey: apiKey,
      pageNo: '1',
      numOfRows: '5',
      yadmNm: query,    // 병원명 (UTF-8)
      _type: 'json',
    })

    const url = `https://apis.data.go.kr/B551182/hospInfoServicev2/getHospBasisList?${params.toString()}`
    const res = await fetch(url, {
      next: { revalidate: 300 },
      headers: { 'Accept': 'application/json' },
    })

    if (!res.ok) {
      return NextResponse.json({ results: [] })
    }

    const data = await res.json() as HiraHospResponse
    const items = normalizeItems(data?.response?.body?.items?.item)

    const results: HospitalResult[] = items
      .slice(0, 5)
      .map(item => ({
        name: item.yadmNm ?? '',
        address: item.addr ?? '',
        phone: item.telno ?? '',
        type: item.clCdNm ?? '',
      }))
      .filter(r => r.name)

    return NextResponse.json({ results })
  } catch (e) {
    console.error('[hospital-search] HIRA API error:', e)
    return NextResponse.json({ results: [] })
  }
}

interface HiraHospItem {
  yadmNm?: string
  addr?: string
  telno?: string
  clCdNm?: string
}

interface HiraHospResponse {
  response?: {
    body?: {
      items?: { item?: HiraHospItem | HiraHospItem[] }
      totalCount?: number
    }
  }
}

function normalizeItems(item: HiraHospItem | HiraHospItem[] | undefined): HiraHospItem[] {
  if (!item) return []
  return Array.isArray(item) ? item : [item]
}
