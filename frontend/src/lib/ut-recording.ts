// UT 세션 녹화 (rrweb 기반) — module-level singleton, Next.js 클라이언트 라우팅 사이에서도 유지됨

type RrwebEvent = object

const state = {
  events: [] as RrwebEvent[],
  stopFn: null as (() => void) | null,
  startTime: null as Date | null,
  role: null as string | null,
}

export function isRecording(): boolean {
  return state.stopFn !== null
}

export function getRecordingState() {
  return {
    recording: state.stopFn !== null,
    role: state.role,
    startTime: state.startTime,
    eventCount: state.events.length,
  }
}

export async function startRecording(role: string): Promise<void> {
  if (state.stopFn) return

  state.events = []
  state.startTime = new Date()
  state.role = role

  try { sessionStorage.setItem('ut_recording', role) } catch {}

  const { record } = await import('rrweb')
  const stop = record({
    emit(event) {
      state.events.push(event as RrwebEvent)
    },
    sampling: {
      mousemove: 100,
      scroll: 200,
      input: 'last',
    },
    maskInputOptions: { password: true },
  })

  state.stopFn = stop ?? null
}

function buildPayload() {
  return {
    role: state.role,
    startTime: state.startTime?.toISOString(),
    endTime: new Date().toISOString(),
    durationSeconds: state.startTime
      ? Math.round((Date.now() - state.startTime.getTime()) / 1000)
      : 0,
    events: state.events,
  }
}

function cleanup() {
  state.events = []
  state.startTime = null
  state.role = null
  try { sessionStorage.removeItem('ut_recording') } catch {}
}

function localDownload(payload: ReturnType<typeof buildPayload>) {
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const ts = payload.startTime?.slice(0, 19).replace(/[T:]/g, '-') ?? 'session'
  a.download = `ut-${payload.role ?? 'unknown'}-${ts}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 녹화 종료 → /api/ut-recordings 자동 업로드
 * 업로드 실패 시 로컬 다운로드로 폴백
 * @returns 업로드된 파일 경로 (성공) 또는 null (폴백)
 */
export async function stopAndUpload(): Promise<string | null> {
  if (state.stopFn) {
    state.stopFn()
    state.stopFn = null
  }

  const payload = buildPayload()

  try {
    const res = await fetch('/api/ut-recordings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { path: string }
    console.log('[UT] 녹화 업로드 완료:', data.path)
    cleanup()
    return data.path
  } catch (e) {
    console.warn('[UT] 업로드 실패, 로컬 다운로드 폴백:', e)
    localDownload(payload)
    cleanup()
    return null
  }
}
