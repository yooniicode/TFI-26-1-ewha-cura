'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechToTextHook {
  supported: boolean
  recording: boolean
  interim: string
  start: () => void
  stop: () => void
}

export function useSpeechToText(
  onFinalTranscript: (text: string) => void,
  lang = 'ko-KR',
): SpeechToTextHook {
  const [supported, setSupported] = useState(false)
  const [recording, setRecording] = useState(false)
  const [interim, setInterim] = useState('')

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  // 항상 최신 콜백을 참조하도록 ref 사용
  const onFinalRef = useRef(onFinalTranscript)
  useEffect(() => { onFinalRef.current = onFinalTranscript }, [onFinalTranscript])

  useEffect(() => {
    const ctor =
      window.SpeechRecognition ??
      (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    setSupported(!!ctor)
  }, [])

  const start = useCallback(() => {
    if (recognitionRef.current) return

    const ctor =
      window.SpeechRecognition ??
      (window as Window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    if (!ctor) return

    const rec = new ctor()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true

    rec.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = ''
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interimText += r[0].transcript
      }
      if (finalText) {
        onFinalRef.current(finalText)
        setInterim('')
      }
      if (interimText) setInterim(interimText)
    }

    rec.onerror = () => {
      recognitionRef.current = null
      setRecording(false)
      setInterim('')
    }

    rec.onend = () => {
      recognitionRef.current = null
      setRecording(false)
      setInterim('')
    }

    rec.start()
    recognitionRef.current = rec
    setRecording(true)
  }, [lang])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setRecording(false)
    setInterim('')
  }, [])

  // 언마운트 시 정리
  useEffect(() => () => { recognitionRef.current?.stop() }, [])

  return { supported, recording, interim, start, stop }
}
