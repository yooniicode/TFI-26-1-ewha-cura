import { start, stop, getRecordingId } from '@rrweb/browser-client'

type RecordingState = {
  recording: boolean
  role: string | null
  startTime: Date | null
  eventCount: number
}

let isRecording = false
let currentRole: string | null = null
let recordingStartedAt: Date | null = null

export async function startRecording(role: string): Promise<void> {
  if (typeof window === 'undefined') return
  if (isRecording) return

  const publicApiKey = process.env.NEXT_PUBLIC_RRWEB_PUBLIC_KEY
  if (!publicApiKey) {
    console.warn('[ut-recording] NEXT_PUBLIC_RRWEB_PUBLIC_KEY not set')
    return
  }

  currentRole = role
  recordingStartedAt = new Date()
  isRecording = true

  start({
    publicApiKey,
    autostart: true,
    includePii: false,
    meta: { role },
    sampling: {
      mousemove: 50,
      scroll: 150,
      input: 'last',
    },
    maskInputOptions: {
      password: true,
    },
  })
}

export async function stopRecording(): Promise<void> {
  if (!isRecording) return
  stop(false)
  isRecording = false
}

export function getRecordingState(): RecordingState {
  return {
    recording: isRecording,
    role: currentRole,
    startTime: recordingStartedAt,
    eventCount: 0,
  }
}

export async function stopAndUpload(): Promise<string | null> {
  if (!isRecording) return null

  const recordingId = getRecordingId()
  stop(true)
  isRecording = false
  currentRole = null
  recordingStartedAt = null

  return recordingId
}
