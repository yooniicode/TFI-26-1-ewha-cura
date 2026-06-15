'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { scriptApi } from '@/lib/api'
import type { MedicalScript } from '@/lib/types'
import Spinner from '@/components/ui/Spinner'
import { useTTS } from '@/hooks/useTTS'

export default function ScriptPresentPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [script, setScript] = useState<MedicalScript | null>(null)
  const [loading, setLoading] = useState(true)
  const [sentences, setSentences] = useState<string[]>([])
  const [current, setCurrent] = useState(0)
  const { speak, speaking } = useTTS()

  useEffect(() => {
    scriptApi.get(id).then(r => {
      setScript(r.payload)
      const parts = r.payload.contentKo
        .split(/[.。!?]\s+/)
        .map(s => s.trim())
        .filter(Boolean)
      setSentences(parts)
    }).finally(() => setLoading(false))
  }, [id])

  // 문장 바뀔 때마다 자동 읽기
  useEffect(() => {
    if (sentences[current]) speak(sentences[current])
  }, [current, sentences]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Spinner />
    </div>
  )

  if (!script || sentences.length === 0) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
      <p>대본을 불러올 수 없습니다.</p>
      <button onClick={() => router.back()} className="mt-4 text-gray-400 underline">돌아가기</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col select-none">
      {/* 상단: 닫기 + 진행도 */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => router.back()} className="text-gray-400 text-sm">✕ 닫기</button>
        <span className="text-gray-400 text-sm">{current + 1} / {sentences.length}</span>
      </div>

      {/* 진행 바 */}
      <div className="h-1 bg-gray-700 mx-4 rounded-full">
        <div
          className="h-1 bg-primary-500 rounded-full transition-all"
          style={{ width: `${((current + 1) / sentences.length) * 100}%` }}
        />
      </div>

      {/* 대본 문장 */}
      <div
        className="flex-1 flex items-center justify-center px-6 py-8 cursor-pointer"
        onClick={() => current < sentences.length - 1 && setCurrent(c => c + 1)}
      >
        <p className="text-white text-3xl font-bold leading-relaxed text-center">
          {sentences[current]}
        </p>
      </div>

      {/* 하단 네비게이션 */}
      <div className="flex gap-3 px-4 py-6">
        <button
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
          className="flex-1 py-4 rounded-xl bg-gray-700 text-white text-lg font-bold disabled:opacity-30"
        >
          ←
        </button>
        {/* TTS 재생/정지 */}
        <button
          onClick={() => speak(sentences[current])}
          className={`w-[64px] py-4 rounded-xl flex items-center justify-center transition-colors ${
            speaking ? 'bg-[#2592FF]' : 'bg-gray-700 hover:bg-gray-600'
          }`}
          title="다시 듣기"
        >
          <img
            src={speaking
              ? '/icons/immigrant/medical-script/speaking.svg'
              : '/icons/immigrant/medical-script/speak.svg'}
            alt=""
            width={20}
            height={20}
          />
        </button>
        <button
          onClick={() => setCurrent(c => Math.min(sentences.length - 1, c + 1))}
          disabled={current === sentences.length - 1}
          className="flex-1 py-4 rounded-xl bg-primary-600 text-white text-lg font-bold disabled:opacity-30"
        >
          →
        </button>
      </div>

      {current === sentences.length - 1 && (
        <div className="text-center pb-6">
          <p className="text-gray-400 text-sm">끝까지 읽었습니다.</p>
          <button
            onClick={() => setCurrent(0)}
            className="mt-2 text-primary-400 text-sm underline"
          >
            처음부터 다시
          </button>
        </div>
      )}
    </div>
  )
}
