import { NextRequest, NextResponse } from 'next/server'

export interface DiseaseResult {
  code: string  // sickCd (ICD 코드)
  name: string  // sickNm (진단명)
}

/**
 * 건강보험심사평가원 질병정보서비스 OpenAPI 프록시
 * 환경변수: HIRA_API_KEY (공공데이터포털에서 발급)
 *
 * 문서: 공공데이터 개방•공유•활용 체계 개발 OpenAPI 활용가이드(질병정보서비스)
 * 엔드포인트: http://apis.data.go.kr/B551182/diseaseInfoService/getDissInfo
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim()
  if (!query || query.length < 1) {
    return NextResponse.json({ results: [] })
  }

  const apiKey = process.env.HIRA_API_KEY
  if (!apiKey) {
    // API 키 없으면 빈 결과 반환 (기능은 graceful degradation)
    return NextResponse.json({ results: [], error: 'HIRA_API_KEY not configured' })
  }

  try {
    const params = new URLSearchParams({
      serviceKey: apiKey,
      sickType: '1',
      medTp: 'DT001',
      searchText: query,
      pageNo: '1',
      numOfRows: '5',
      _type: 'json',
    })

    const url = `http://apis.data.go.kr/B551182/diseaseInfoService/getDissInfo?${params.toString()}`
    const res = await fetch(url, { next: { revalidate: 3600 } })

    if (!res.ok) {
      return NextResponse.json({ results: [] })
    }

    const data = await res.json() as HiraResponse
    const items = normalizeItems(data?.response?.body?.items?.item)

    const results: DiseaseResult[] = items
      .slice(0, 3)
      .map(item => ({
        code: item.sickCd ?? '',
        name: item.sickNm ?? '',
      }))
      .filter(r => r.name)

    return NextResponse.json({ results })
  } catch (e) {
    console.error('[disease-search] HIRA API error:', e)
    return NextResponse.json({ results: [] })
  }
}

// ─── 타입 / 헬퍼 ──────────────────────────────────────────────────────────────

interface HiraItem { sickCd?: string; sickNm?: string }

interface HiraResponse {
  response?: {
    body?: {
      items?: {
        // 결과가 1건일 때 object, 여러 건일 때 array
        item?: HiraItem | HiraItem[]
      }
      totalCount?: number
    }
  }
}

function normalizeItems(item: HiraItem | HiraItem[] | undefined): HiraItem[] {
  if (!item) return []
  return Array.isArray(item) ? item : [item]
}
