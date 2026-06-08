const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토']

export function parseAppDate(value?: string | null): Date | null {
  if (!value) return null

  const normalized = value.trim()
  if (!normalized) return null

  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(normalized)) {
    const date = new Date(normalized)
    if (!Number.isNaN(date.getTime())) return date
  }

  const localMatch = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/,
  )

  if (localMatch) {
    const [, year, month, day, hour = '0', minute = '0', second = '0'] = localMatch
    const date = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
    )
    return Number.isNaN(date.getTime()) ? null : date
  }

  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

export function toDateKey(value?: string | null): string {
  const date = parseAppDate(value)
  if (!date) return value ?? ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatKoreanDate(value?: string | null, includeYear = false): string {
  const date = parseAppDate(value)
  if (!date) return value ?? ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const prefix = includeYear ? `${year}.` : ''
  return `${prefix}${month}.${day} (${WEEKDAYS_KO[date.getDay()]})`
}

export function formatKoreanDateTime(value?: string | null): string {
  const date = parseAppDate(value)
  if (!date) return value ?? ''

  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  return `${formatKoreanDate(value)} ${time}`
}

export function daysBetweenDateKeys(from: string, to: string): number | null {
  const fromDate = parseAppDate(from)
  const toDate = parseAppDate(to)
  if (!fromDate || !toDate) return null

  const fromMidnight = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate())
  const toMidnight = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate())
  return Math.ceil((toMidnight.getTime() - fromMidnight.getTime()) / (1000 * 60 * 60 * 24))
}
