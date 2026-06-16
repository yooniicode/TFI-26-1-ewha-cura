'use client'

import { useState, useEffect } from 'react'
import AppShell from '@/components/layout/AppShell'
import PageHeader from '@/components/ui/PageHeader'
import { useTTS } from '@/hooks/useTTS'
import { bookmarkApi, type Bookmark } from '@/lib/api'

function BookmarkFilledIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z"
        stroke="#2592FF"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="#2592FF"
      />
    </svg>
  )
}

export default function SavedScriptsPage() {
  const [phrases, setPhrases] = useState<Bookmark[]>([])
  const [selectedPhrase, setSelectedPhrase] = useState<Bookmark | null>(null)
  const { speak, speaking } = useTTS()

  useEffect(() => {
    bookmarkApi.list().then(res => setPhrases(res.payload ?? [])).catch(() => {})
  }, [])

  function removeBookmark(koText: string) {
    setPhrases(prev => prev.filter(p => p.koText !== koText))
    if (selectedPhrase?.koText === koText) setSelectedPhrase(null)
    bookmarkApi.delete(koText).catch(() => {
      bookmarkApi.list().then(res => setPhrases(res.payload ?? [])).catch(() => {})
    })
  }

  return (
    <AppShell noPadding>
      <PageHeader title="저장한 대본" />

      <div className="bg-white px-[16px] pt-[16px] pb-10 min-h-screen">
        {phrases.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-24 gap-3">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z"
                stroke="#C4C4C4"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-[16px] font-medium text-[#808080] text-center whitespace-pre-line">
              {'저장한 대본이 없어요.\n의료 대본에서 북마크를 눌러보세요.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-[16px]">
            {phrases.map((phrase) => (
              <div
                key={phrase.id || phrase.koText}
                onClick={() => setSelectedPhrase(phrase)}
                className="bg-white border border-[#eee] rounded-[16px] p-[16px] flex items-start justify-between gap-4 cursor-pointer active:opacity-70 transition-opacity"
              >
                <div className="flex flex-col gap-[8px] flex-1 min-w-0 pointer-events-none">
                  <p className="text-[20px] font-semibold text-[#2592ff] leading-[1.4]">{phrase.koText}</p>
                  {phrase.translatedText && (
                    <p className="text-[14px] font-medium text-[#161616] leading-[1.4]">{phrase.translatedText}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); removeBookmark(phrase.koText) }}
                  className="shrink-0 mt-0.5 active:scale-90 transition-transform"
                  aria-label="북마크 해제"
                >
                  <BookmarkFilledIcon size={24} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPhrase && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="flex flex-col items-end gap-2 w-full max-w-[370px]">
            <button
              type="button"
              onClick={() => setSelectedPhrase(null)}
              className="w-6 h-6 flex items-center justify-center shrink-0"
              aria-label="닫기"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1L13 13M13 1L1 13" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>

            <div className="bg-[#f3f9ff] border border-[#eee] rounded-[16px] p-[16px] flex flex-col gap-[8px] w-full">
              <div className="bg-white border border-[#eee] rounded-[20px] p-[16px] flex flex-col gap-[24px]">
                <div className="flex flex-col gap-[8px]">
                  <p className="text-[24px] font-semibold text-[#2592ff] text-center leading-[1.4]">
                    {selectedPhrase.koText}
                  </p>
                  {selectedPhrase.translatedText && (
                    <p className="text-[16px] font-medium text-[#494949] leading-[1.4]">
                      {selectedPhrase.translatedText}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-[12px]">
                  <button
                    type="button"
                    onClick={() => removeBookmark(selectedPhrase.koText)}
                    className="w-[28px] h-[28px] flex items-center justify-center active:scale-90 transition-transform"
                    aria-label="북마크 해제"
                  >
                    <BookmarkFilledIcon size={22} />
                  </button>
                  <button
                    type="button"
                    onClick={() => speak(selectedPhrase.koText)}
                    className="w-[28px] h-[28px] flex items-center justify-center"
                    aria-label="듣기"
                  >
                    <img
                      src={speaking
                        ? '/icons/immigrant/medical-script/speaking.svg'
                        : '/icons/immigrant/medical-script/speak.svg'}
                      alt=""
                      width={22}
                      height={22}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
