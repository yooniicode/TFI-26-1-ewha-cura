/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone' } : {}),
  async rewrites() {
    const raw = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8080').trim()
    // "api.cura-ewha.kr" 처럼 스킴 없이 넣어도 동작하도록 https:// 를 붙이고 끝의 / 는 뗀다
    const apiUrl = (/^https?:\/\//.test(raw) ? raw : `https://${raw}`).replace(/\/+$/, '')
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUrl}/api/v1/:path*`,
      },
    ]
  },
  // 관리자 콘솔은 검색 노출·외부 iframe 삽입을 막는다
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
