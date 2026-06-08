'use client'

import { useEffect, useRef, useState } from 'react'
import AppShell from '@/components/AppShell'
import PageHeader from '@/components/interpreter/PageHeader'
import Spinner from '@/components/ui/Spinner'
import { useMe } from '@/hooks/useMe'
import { useRouter } from 'next/navigation'
import { formatKoreanDateTime } from '@/lib/dateFormat'
import { useTranslation } from '@/lib/i18n/I18nContext'

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

function formatFetchedAt(iso: string) {
  return formatKoreanDateTime(iso)
}

export default function SheetsPage() {
  const { data: me, isLoading: meLoading } = useMe()
  const router = useRouter()
  const { t } = useTranslation()
  const ts = t.sheets

  const [url, setUrl] = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem(LS_KEY) ?? '') : ''
  )
  const [range, setRange] = useState(() =>
    typeof window !== 'undefined' ? (localStorage.getItem(LS_RANGE_KEY) ?? 'Sheet1') : 'Sheet1'
  )
  const [data, setData] = useState<SheetData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [apiKeyMissing, setApiKeyMissing] = useState(false)
  const hasFetchedRef = useRef(false)

  // 권한 확인
  useEffect(() => {
    if (!meLoading && me?.role !== 'admin') {
      router.replace('/dashboard')
    }
  }, [me, meLoading, router])

  // 저장된 URL이 있으면 자동 로드
  useEffect(() => {
    if (hasFetchedRef.current) return
    const saved = typeof window !== 'undefined' ? localStorage.getItem(LS_KEY) : ''
    if (saved) {
      hasFetchedRef.current = true
      handleFetch(saved, typeof window !== 'undefined' ? (localStorage.getItem(LS_RANGE_KEY) ?? 'Sheet1') : 'Sheet1')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleFetch(urlInput = url, rangeInput = range) {
    const id = parseSpreadsheetId(urlInput)
    if (!id) {
      setError(ts.err_invalid_id)
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
        setError(json.error ?? ts.err_fetch_failed)
        return
      }
      setData(json)
      localStorage.setItem(LS_KEY, urlInput)
      localStorage.setItem(LS_RANGE_KEY, rangeInput)
    } catch {
      setError(ts.err_network)
    } finally {
      setLoading(false)
    }
  }

  if (meLoading) {
    return <AppShell><Spinner /></AppShell>
  }

  const headers = data?.rows[0] ?? []
  const bodyRows = data?.rows.slice(1) ?? []

  return (
    <AppShell noPadding>
      <PageHeader title={ts.title} />

      <div className="bg-[#F5F5F5] px-4 py-4 pb-10 min-h-screen space-y-4">

        {/* 연결 설정 카드 */}
        <div className="bg-white rounded-2xl px-5 py-5 space-y-3">
          <p className="text-xs font-bold text-[#A0A0A0] uppercase tracking-wider">{ts.settings}</p>

          <div>
            <label className="block text-sm font-medium text-[#161616] mb-1.5">
              Google Sheets URL / ID
            </label>
            <input
              type="text"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFetch()}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full bg-[#F5F5F5] rounded-xl px-4 py-3.5 text-sm text-[#161616] outline-none placeholder:text-[#A0A0A0] focus:ring-2 focus:ring-[#2592FF]/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#161616] mb-1.5">
              {ts.sheet_range}
              <span className="ml-1 text-xs text-[#A0A0A0] font-normal">{ts.range_example}</span>
            </label>
            <input
              type="text"
              value={range}
              onChange={e => setRange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFetch()}
              placeholder="Sheet1"
              className="w-full bg-[#F5F5F5] rounded-xl px-4 py-3.5 text-sm text-[#161616] outline-none placeholder:text-[#A0A0A0] focus:ring-2 focus:ring-[#2592FF]/20"
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
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    range === s
                      ? 'bg-[#2592FF] text-white'
                      : 'bg-[#F0F1F5] text-[#494949] hover:bg-[#e4e4e8]'
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
              className="flex-1 h-[48px] bg-[#2592FF] rounded-xl text-sm font-bold text-white disabled:opacity-40 hover:bg-[#1a7ee6] transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {ts.loading}
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  {data ? ts.refresh : ts.fetch}
                </>
              )}
            </button>
            {data && (
              <button
                type="button"
                onClick={() => { setData(null); setUrl(''); setRange('Sheet1'); localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_RANGE_KEY) }}
                className="px-4 h-[48px] bg-[#F0F1F5] rounded-xl text-sm font-semibold text-[#494949] hover:bg-[#e4e4e8] transition-colors"
              >
                {ts.disconnect}
              </button>
            )}
          </div>

          {/* 안내 */}
          <div className="bg-[#FFF8E1] rounded-xl px-4 py-3 text-xs text-[#7B5E00] leading-relaxed">
            <p className="font-semibold mb-1">{ts.notice_title}</p>
            <p>• {ts.notice_share}</p>
            <p>• {ts.notice_api_key}</p>
            <p>• {ts.notice_readonly}</p>
          </div>

          {apiKeyMissing && (
            <div className="bg-red-50 rounded-xl px-4 py-3 text-xs text-red-600">
              {ts.err_api_key_missing}
            </div>
          )}
          {error && !apiKeyMissing && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        {/* 데이터 테이블 */}
        {data && data.rows.length > 0 && (
          <div className="bg-white rounded-2xl overflow-hidden">
            {/* 헤더 */}
            <div className="px-5 py-3 border-b border-[#F0F0F0] flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#161616]">{data.title}</p>
                <p className="text-xs text-[#A0A0A0] mt-0.5">
                  {data.range} · {ts.row_count(bodyRows.length)} · {ts.col_count(headers.length)}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#A0A0A0]">{ts.last_updated}</span>
                <p className="text-xs font-medium text-[#494949]">{formatFetchedAt(data.fetchedAt)}</p>
              </div>
            </div>

            {/* 스크롤 테이블 */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-[#F8F9FF]">
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-[#A0A0A0] w-10 sticky left-0 bg-[#F8F9FF]">
                      #
                    </th>
                    {headers.map((h, i) => (
                      <th
                        key={i}
                        className="px-4 py-2.5 text-left text-xs font-semibold text-[#494949] whitespace-nowrap border-l border-[#F0F0F0]"
                      >
                        {h || <span className="text-[#D0D0D0]">{ts.col_label(i)}</span>}
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
                      <td className="px-3 py-2.5 text-xs text-[#C0C0C0] sticky left-0 bg-inherit">
                        {ri + 1}
                      </td>
                      {headers.map((_, ci) => (
                        <td
                          key={ci}
                          className="px-4 py-2.5 text-[#161616] whitespace-nowrap border-l border-[#F0F0F0] max-w-[200px] overflow-hidden text-ellipsis"
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

            <p className="px-5 py-2 text-[10px] text-[#C0C0C0] text-right border-t border-[#F0F0F0]">
              {ts.readonly_footer}
            </p>
          </div>
        )}

        {data && data.rows.length === 0 && (
          <div className="bg-white rounded-2xl px-5 py-10 text-center">
            <p className="text-sm text-[#A0A0A0]">{ts.empty}</p>
          </div>
        )}
      </div>
    </AppShell>
  )
}
