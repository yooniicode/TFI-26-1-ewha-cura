import { record } from 'rrweb'

type RecordingState = {
  recording: boolean
  role: string | null
  startTime: Date | null
  eventCount: number
}

let stopFn: (() => void) | undefined
let events: unknown[] = []
let currentRole: string | null = null
let recordingStartedAt: Date | null = null

export async function startRecording(role: string): Promise<void> {
  if (typeof window === 'undefined') return
  if (stopFn) return

  events = []
  currentRole = role
  recordingStartedAt = new Date()

  stopFn = record({
    emit: event => {
      events.push(event)
    },
    sampling: {
      mousemove: 50,
      scroll: 150,
      input: 'last',
    },
    maskInputOptions: {
      password: true,
    },
  }) ?? undefined
}

export async function stopRecording(): Promise<void> {
  stopFn?.()
  stopFn = undefined
}

export function getRecordingState(): RecordingState {
  return {
    recording: !!stopFn,
    role: currentRole,
    startTime: recordingStartedAt,
    eventCount: events.length,
  }
}

export async function stopAndUpload(): Promise<string | null> {
  if (typeof window === 'undefined') return null

  const role = currentRole
  const startTime = recordingStartedAt
  const endTime = new Date()
  const recordedEvents = [...events]

  await stopRecording()
  events = []
  currentRole = null
  recordingStartedAt = null

  if (!role || recordedEvents.length === 0) return null

  const durationSeconds = startTime
    ? Math.round((endTime.getTime() - startTime.getTime()) / 1000)
    : 0

  const body = {
    role,
    startTime: startTime?.toISOString(),
    endTime: endTime.toISOString(),
    durationSeconds,
    events: recordedEvents,
  }

  try {
    const res = await fetch('/api/ut-recordings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
    const data = await res.json() as { path?: string }
    return data.path ?? null
  } catch (e) {
    const filename = `ut-${role}-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.json`
    const blob = new Blob([JSON.stringify(body)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
    console.error('[ut-recording] Upload failed, downloaded locally:', e)
    return null
  }
}
