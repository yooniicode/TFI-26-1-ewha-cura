import { NextRequest, NextResponse } from 'next/server'

export interface DiseaseResult {
  code: string  // sickCd (ICD 코드)
  name: string  // sickNm (진단명)
  engName?: string // sickEngNm
}

/**
 * 건강보험심사평가원 질병정보서비스 — getDissNameCodeList
 *
 * 환경변수: HIRA_API_KEY → 공공데이터포털 일반 인증키 (Decoding 키 권장)
 *   - URLSearchParams가 자동 인코딩하므로 Decoding 키(raw) 사용
 *   - Encoding 키 사용 시 % → %25 이중인코딩 발생 (30 에러)
 *
 * 응답: XML이 기본, _type=json 쿼리파라미터로 JSON 요청
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim()
  if (!query || query.length < 1) {
    return NextResponse.json({ results: [] })
  }

  const apiKey = process.env.HIRA_API_KEY
  if (!apiKey) {
    console.warn('[disease-search] HIRA_API_KEY not configured')
    return NextResponse.json({ results: [], error: 'HIRA_API_KEY not configured' })
  }

  try {
    // URLSearchParams 사용 → 자동 인코딩 → Decoding 키 필요
    const params = new URLSearchParams({
      ServiceKey: apiKey,
      sickType: '1',       // 3단상병
      medTp: '1',          // 양방(의과)
      diseaseType: 'SICK_NM', // 상병명으로 검색
      searchText: query,
      pageNo: '1',
      numOfRows: '5',
      _type: 'json',       // JSON 응답 요청 (비공식 지원, 실패 시 XML 분기)
    })

    const url = `https://apis.data.go.kr/B551182/diseaseInfoService1/getDissNameCodeList1?${params.toString()}`
    console.log(`[disease-search] query="${query}" url=${url.split('ServiceKey')[0]}ServiceKey=***`)

    const res = await fetch(url, {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/json, text/xml' },
    })

    const contentType = res.headers.get('content-type') ?? ''
    const rawText = await res.text()

    // resultCode 에러 체크 (JSON/XML 공통)
    if (rawText.includes('<resultCode>') && !rawText.includes('<resultCode>00</resultCode>')) {
      const codeMatch = rawText.match(/<resultCode>(\d+)<\/resultCode>/)
      const msgMatch  = rawText.match(/<resultMsg>([^<]+)<\/resultMsg>/)
      const code = codeMatch?.[1] ?? '?'
      const msg  = msgMatch?.[1]  ?? '알 수 없는 오류'
      console.error(`[disease-search] HIRA 에러 resultCode=${code} msg=${msg}`)
      return NextResponse.json({ results: [], error: `HIRA 오류 (${code}): ${msg}` })
    }

    let results: DiseaseResult[] = []

    // JSON 응답 처리
    if (contentType.includes('json') || rawText.trimStart().startsWith('{')) {
      const data = JSON.parse(rawText) as HiraJsonResponse
      const items = normalizeItems(data?.response?.body?.items?.item)
      const total = data?.response?.body?.totalCount ?? 0
      console.log(`[disease-search] JSON 응답 total=${total} items=${items.length}`)
      results = toResults(items)

    // XML 응답 처리 (간단한 regex 파서)
    } else {
      const items = parseXmlItems(rawText)
      console.log(`[disease-search] XML 응답 items=${items.length}`)
      results = toResults(items)
    }

    return NextResponse.json({ results })
  } catch (e) {
    console.error('[disease-search] 오류:', e instanceof Error ? e.message : e)
    return NextResponse.json({ results: [], error: 'HIRA API 호출 실패' })
  }
}

// ─── 타입 / 헬퍼 ──────────────────────────────────────────────────────────────

interface HiraItem {
  sickCd?: string
  sickNm?: string
  sickEngNm?: string
}

interface HiraJsonResponse {
  response?: {
    body?: {
      items?: { item?: HiraItem | HiraItem[] }
      totalCount?: number
    }
  }
}

function normalizeItems(item: HiraItem | HiraItem[] | undefined): HiraItem[] {
  if (!item) return []
  return Array.isArray(item) ? item : [item]
}

function toResults(items: HiraItem[]): DiseaseResult[] {
  return items
    .slice(0, 5)
    .map(item => ({
      code:    item.sickCd    ?? '',
      name:    item.sickNm    ?? '',
      engName: item.sickEngNm ?? undefined,
    }))
    .filter(r => r.name)
}

/** XML에서 <item>...</item> 블록을 regex로 추출 */
function parseXmlItems(xml: string): HiraItem[] {
  const items: HiraItem[] = []
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let match: RegExpExecArray | null

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1]
    const get = (tag: string) => {
      const m = new RegExp(`<${tag}>([^<]*)<\/${tag}>`).exec(block)
      return m?.[1]?.trim() ?? ''
    }
    items.push({
      sickCd:    get('sickCd'),
      sickNm:    get('sickNm'),
      sickEngNm: get('sickEngNm') || undefined,
    })
  }
  return items
}
