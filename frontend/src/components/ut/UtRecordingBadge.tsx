'use client'

import { useEffect, useState } from 'react'
import { getRecordingState, stopAndUpload } from '@/lib/ut-recording'

type UploadState = 'idle' | 'uploading' | 'done' | 'fallback'

export default function UtRecordingBadge() {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [uploadState, setUploadState] = useState<UploadState>('idle')

  useEffect(() => {
    const tick = () => {
      const s = getRecordingState()
      setRecording(s.recording)
      if (s.recording && s.startTime) {
        setElapsed(Math.round((Date.now() - s.startTime.getTime()) / 1000))
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  async function handleStop() {
    setUploadState('uploading')
    setRecording(false)
    const path = await stopAndUpload()
    setUploadState(path ? 'done' : 'fallback')
    setTimeout(() => setUploadState('idle'), 4000)
  }

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  if (uploadState === 'uploading') {
    return (
      <div className="fixed bottom-24 left-4 z-[9999] flex items-center gap-2 bg-white border border-[#eee] rounded-full px-3 py-2 shadow-lg">
        <div className="w-3 h-3 border-2 border-[#2592FF] border-t-transparent rounded-full animate-spin" />
        <span className="text-[12px] font-medium text-[#2592FF]">업로드 중...</span>
      </div>
    )
  }

  if (uploadState === 'done') {
    return (
      <div className="fixed bottom-24 left-4 z-[9999] flex items-center gap-2 bg-white border border-green-200 rounded-full px-3 py-2 shadow-lg">
        <span className="text-green-500 text-[12px]">✓</span>
        <span className="text-[12px] font-medium text-green-600">업로드 완료</span>
      </div>
    )
  }

  if (uploadState === 'fallback') {
    return (
      <div className="fixed bottom-24 left-4 z-[9999] flex items-center gap-2 bg-white border border-amber-200 rounded-full px-3 py-2 shadow-lg">
        <span className="text-amber-500 text-[12px]">↓</span>
        <span className="text-[12px] font-medium text-amber-600">로컬 저장됨</span>
      </div>
    )
  }

  if (!recording) return null

  return (
    <div
      className="fixed bottom-24 left-4 z-[9999] flex items-center gap-2 bg-white border border-red-200 rounded-full px-3 py-2 shadow-lg"
    >
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
      <span className="text-[12px] font-semibold text-red-500 tabular-nums">{mm}:{ss}</span>
      <button
        type="button"
        onClick={handleStop}
        className="text-[11px] font-semibold text-[#808080] hover:text-red-500 transition-colors border-l border-[#eee] pl-2 ml-1"
      >
        종료
      </button>
    </div>
  )
}
