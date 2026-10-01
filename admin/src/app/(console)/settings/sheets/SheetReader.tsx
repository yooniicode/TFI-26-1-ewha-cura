'use client'

import { useEffect, useRef, useState } from 'react'
import { TextField } from '@/components/ui/Form'
import { ModalButton } from '@/components/ui/Modal'
import PillTabs from '@/components/ui/PillTabs'

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
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-[2fr_1fr] gap-5">
          <TextField
            label="Google Sheets URL / ID"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFetch()}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
          <TextField
            label="시트 이름 / 범위"
            hint="예: Sheet1, 상담기록!A:Z"
            value={range}
            onChange={e => setRange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFetch()}
            placeholder="Sheet1"
          />
        </div>

        {/* 시트 탭 — 보고서 관리와 같은 알약 탭 */}
        {data && data.sheets.length > 1 && (
          <PillTabs
            tabs={data.sheets.map(s => ({ value: s, label: s }))}
            value={range}
            onChange={s => { setRange(s); handleFetch(url, s) }}
            label="시트"
          />
        )}

        {/* 안내 — 내보내기 카드의 안내 박스와 같은 회색 박스 */}
        <div className="rounded-[12px] bg-surface-muted px-5 py-4 text-[13px] leading-relaxed text-modal-sub">
          <p className="mb-1 text-[14px] font-semibold text-modal-value">연결 전 확인사항</p>
          <p>• 구글 시트를 &quot;링크가 있는 모든 사용자 — 뷰어&quot;로 공유 설정해야 해요.</p>
          <p>• 서버에 GOOGLE_SHEETS_API_KEY 환경변수가 설정되어 있어야 해요.</p>
          <p>• 데이터는 읽기 전용으로 보여주고, 여기서 수정할 수 없어요.</p>
        </div>

        {apiKeyMissing && (
          <p role="alert" className="text-[13px] text-danger-text">
            GOOGLE_SHEETS_API_KEY 환경변수가 설정되지 않았어요. 서버 관리자에게 문의해주세요.
          </p>
        )}
        {error && !apiKeyMissing && (
          <p role="alert" className="text-[13px] text-danger-text">{error}</p>
        )}

        <div className="flex justify-end gap-[10px]">
          {data && <ModalButton onClick={handleDisconnect}>연결 해제</ModalButton>}
          <ModalButton variant="primary" onClick={() => handleFetch()} disabled={loading || !url.trim()}>
            {loading ? '불러오는 중...' : data ? '새로고침' : '불러오기'}
          </ModalButton>
        </div>
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
