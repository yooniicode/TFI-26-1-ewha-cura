import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  tracesSampleRate: 0.1,

  // 에러 발생 시에만 Session Replay 수집, 일반 세션은 비활성화
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.5,

  integrations: [
    Sentry.replayIntegration({
      // 환자·이주민 개인정보 보호: 모든 텍스트/미디어 마스킹
      maskAllText: true,
      blockAllMedia: true,
      maskAllInputs: true,
    }),
  ],

  beforeSend(event) {
    // 요청 본문(진료 내용·개인정보) 제거
    if (event.request) {
      event.request.data = undefined
      event.request.cookies = undefined
    }
    event.user = undefined
    return event
  },
})
