import { useCallback, useEffect, useRef, useState } from 'react'

export function useTTS(lang = 'ko-KR') {
  const [speaking, setSpeaking] = useState(false)
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null)

  // 언마운트 시 재생 중단
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel() }
  }, [])

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()

    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = lang
    utt.rate = 0.9   // 의료 문장이므로 약간 느리게
    utt.pitch = 1
    utt.onstart  = () => setSpeaking(true)
    utt.onend    = () => setSpeaking(false)
    utt.onerror  = () => setSpeaking(false)
    uttRef.current = utt
    window.speechSynthesis.speak(utt)
  }, [lang])

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }, [])

  return { speak, stop, speaking }
}
