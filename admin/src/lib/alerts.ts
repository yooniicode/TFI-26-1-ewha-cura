import type { DashboardAlert } from './schemas'

// 알림 유형별 문구 — 최종 멘트는 기획 확정 후 교체 (Figma 홈 화면 & 알림 메모 참고)
const ALERT_META: Record<string, { category: string; title: string; href: string }> = {
  REQUEST_UNASSIGNED: { category: '매칭 관리',   title: '새로운 진료요청', href: '/matching' },
  REPORT_REJECTED:    { category: '보고서 관리', title: '수정 요청',       href: '/reports' },
  REPORT_OVERDUE:     { category: '보고서 관리', title: '미응답 통번역가', href: '/reports' },
}

const FALLBACK_META = { category: '알림', title: '새로운 알림', href: '/' }

export function alertMeta(alert: DashboardAlert) {
  return ALERT_META[alert.type] ?? FALLBACK_META
}

export function alertKey(alert: DashboardAlert) {
  return [alert.type, alert.consultationId ?? '', alert.occurredAt ?? ''].join(':')
}

// 읽음 표시는 브라우저별 편의 상태 — 접근 불가(사생활 모드 등) 시 모두 안 읽음으로 본다
const READ_KEY = 'cura_admin_read_alerts'
const READ_LIMIT = 200

export function loadReadAlerts(): Set<string> {
  try {
    const raw = window.localStorage.getItem(READ_KEY)
    return new Set(raw ? (JSON.parse(raw) as string[]) : [])
  } catch {
    return new Set()
  }
}

export function saveReadAlerts(keys: Set<string>) {
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify(Array.from(keys).slice(-READ_LIMIT)))
  } catch {
    /* 저장 실패 시 무시 */
  }
}
