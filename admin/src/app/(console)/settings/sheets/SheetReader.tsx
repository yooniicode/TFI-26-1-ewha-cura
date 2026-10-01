'use client'

import { useEffect, useRef, useState } from 'react'

const LS_KEY = 'byby_sheets_url'
const LS_RANGE_KEY = 'byby_sheets_range'

interface SheetData {
  title: string
  sheets: string[]
  range: string
  rows: string[][]
  fetchedAt: string
}

function parseSpreadsheetId(input: string): string | null {
  // 전체 URL: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit...
  const urlMatch = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (urlMatch) return urlMatch[1]
  // ID 직접 입력 (영숫자, 하이픈, 언더스코어)
  if (/^[a-zA-Z0-9-_]{20,}$/.test(input.trim())) return input.trim()
  return null
}

function readStorage(key: string, fallback: string) {
  try {
    return window.localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    /* 저장 실패 시 무시 */
  }
}

function formatFetchedAt(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

/** 공개 공유된 구글 시트를 읽기 전용으로 불러와 보여준다 (서버의 GOOGLE_SHEETS_API_KEY 사용) */
export default function SheetReader() {
  const [url, setUrl] = useState(() => (typeof window !== 'undefined' ? readStorage(LS_KEY, '') : ''))
  const [range, setRange] = useState(() => (typeof window !== 'undefined' ? readStorage(LS_RANGE_KEY, 'Sheet1') : 'Sheet1'))
  const [data, setData] = useState<SheetData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [apiKeyMissing, setApiKeyMissing] = useState(false)
  const hasFetchedRef = useRef(false)

  // 저장된 URL이 있으면 자동 로드
  useEffect(() => {
    if (hasFetchedRef.current) return
    const saved = readStorage(LS_KEY, '')
    if (saved) {
      hasFetchedRef.current = true
      handleFetch(saved, readStorage(LS_RANGE_KEY, 'Sheet1'))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleFetch(urlInput = url, rangeInput = range) {
    const id = parseSpreadsheetId(urlInput)
    if (!id) {
      setError('올바른 Google Sheets URL 또는 ID를 입력해주세요.')
      return
    }
    setLoading(true)
    setError('')
    setApiKeyMissing(false)
    try {
      const res = await fetch(`/api/sheets?id=${id}&range=${encodeURIComponent(rangeInput)}`)
      const json = await res.json() as SheetData & { error?: string }
      if (!res.ok) {
        if (res.status === 503) setApiKeyMissing(true)
        setError(json.error ?? '데이터를 불러오지 못했습니다.')
        return
      }
      setData(json)
      writeStorage(LS_KEY, urlInput)
      writeStorage(LS_RANGE_KEY, rangeInput)
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function handleDisconnect() {
    setData(null)
    setUrl('')
    setRange('Sheet1')
    writeStorage(LS_KEY, null)
    writeStorage(LS_RANGE_KEY, null)
  }

  const headers = data?.rows[0] ?? []
  const bodyRows = data?.rows.slice(1) ?? []

  return (
    <div className="space-y-4">
      <div className="space-y-3">

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            Google Sheets URL / ID
          </label>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFetch()}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            className="w-full rounded-[10px] border border-line bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-[#A0A0A0] focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink">
            시트 이름 / 범위
            <span className="ml-1 text-xs font-normal text-[#A0A0A0]">예: Sheet1, 상담기록!A:Z</span>
          </label>
          <input
            type="text"
            value={range}
            onChange={e => setRange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFetch()}
            placeholder="Sheet1"
            className="w-full rounded-[10px] border border-line bg-white px-4 py-3 text-sm text-ink outline-none placeholder:text-[#A0A0A0] focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>

        {/* 탭 목록 */}
        {data && data.sheets.length > 1 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {data.sheets.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => { setRange(s); handleFetch(url, s) }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  range === s
                    ? 'bg-brand-blue text-white'
                    : 'bg-white text-ink-grey hover:bg-[#e4e4e8]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleFetch()}
            disabled={loading || !url.trim()}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[10px] bg-brand-blue text-sm font-bold text-white transition-colors hover:bg-[#1a7ee6] disabled:opacity-40"
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                불러오는 중...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                {data ? '새로고침' : '불러오기'}
              </>
            )}
          </button>
          {data && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="h-12 rounded-[10px] border border-line bg-white px-4 text-sm font-semibold text-ink-grey transition-colors hover:bg-[#e4e4e8]"
            >
              연결 해제
            </button>
          )}
        </div>

        {/* 안내 */}
        <div className="rounded-xl bg-[#FFF8E1] px-4 py-3 text-xs leading-relaxed text-[#7B5E00]">
          <p className="mb-1 font-semibold">연결 전 확인사항</p>
          <p>• 구글 시트를 &quot;링크가 있는 모든 사용자 — 뷰어&quot;로 공유 설정해야 합니다.</p>
          <p>• 서버에 GOOGLE_SHEETS_API_KEY 환경변수가 설정되어 있어야 합니다.</p>
          <p>• 데이터는 읽기 전용으로 표시되며 앱 내에서 수정할 수 없습니다.</p>
        </div>

        {apiKeyMissing && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-xs text-red-600">
            GOOGLE_SHEETS_API_KEY 환경변수가 설정되지 않았습니다. 서버 관리자에게 문의하세요.
          </div>
        )}
        {error && !apiKeyMissing && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>

      {/* 데이터 테이블 */}
      {data && data.rows.length > 0 && (
        <div className="overflow-hidden rounded-[20px] border border-line bg-white">
          <div className="flex items-center justify-between border-b border-[#F0F0F0] px-5 py-3">
            <div>
              <p className="text-sm font-bold text-ink">{data.title}</p>
              <p className="mt-0.5 text-xs text-[#A0A0A0]">
                {data.range} · {bodyRows.length}행 · {headers.length}열
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-[#A0A0A0]">마지막 업데이트</span>
              <p className="text-xs font-medium text-ink-grey">{formatFetchedAt(data.fetchedAt)}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-[#F8F9FF]">
                  <th className="sticky left-0 w-10 bg-[#F8F9FF] px-3 py-2.5 text-left text-xs font-semibold text-[#A0A0A0]">
                    #
                  </th>
                  {headers.map((h, i) => (
                    <th
                      key={i}
                      className="whitespace-nowrap border-l border-[#F0F0F0] px-4 py-2.5 text-left text-xs font-semibold text-ink-grey"
                    >
                      {h || <span className="text-[#D0D0D0]">열 {i + 1}</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bodyRows.map((row, ri) => (
                  <tr
                    key={ri}
                    className={`border-t border-[#F5F5F5] ${ri % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}
                  >
                    <td className="sticky left-0 bg-inherit px-3 py-2.5 text-xs text-[#C0C0C0]">
                      {ri + 1}
                    </td>
                    {headers.map((_, ci) => (
                      <td
                        key={ci}
                        className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap border-l border-[#F0F0F0] px-4 py-2.5 text-ink"
                        title={row[ci] ?? ''}
                      >
                        {row[ci] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="border-t border-[#F0F0F0] px-5 py-2 text-right text-[10px] text-[#C0C0C0]">
            읽기 전용 · 출처: Google Sheets
          </p>
        </div>
      )}

      {data && data.rows.length === 0 && (
        <div className="rounded-[20px] bg-surface-card px-5 py-10 text-center">
          <p className="text-sm text-[#A0A0A0]">시트에 데이터가 없습니다.</p>
        </div>
      )}
    </div>
  )
}
