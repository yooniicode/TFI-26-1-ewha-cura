import withPWA from '@ducanh2912/next-pwa'
import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone' } : {}),
  async rewrites() {
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080'
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ]
  },
}

const pwaConfig = withPWA({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
})(nextConfig)

export default withSentryConfig(pwaConfig, {
  org: 'ewha-womans-univ-w6',
  project: 'javascript-nextjs',
  silent: !process.env.CI,           // CI 환경에서만 source map 업로드 로그 출력
  widenClientFileUpload: true,       // 더 많은 파일 포함 → 스택트레이스 정확도 향상
  hideSourceMaps: true,              // 소스맵을 클라이언트에 노출하지 않음
  disableLogger: true,               // 프로덕션 Sentry 로그 억제
  automaticVercelMonitors: false,
})