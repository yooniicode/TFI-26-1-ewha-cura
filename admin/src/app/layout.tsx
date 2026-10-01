import type { Metadata } from 'next'
import './globals.css'
import QueryProvider from '@/components/QueryProvider'

export const metadata: Metadata = {
  title: 'Cura 관리자',
  description: '이주민 의료 통번역 센터 관리자 콘솔',
  robots: { index: false, follow: false },
  icons: { icon: '/icons/cura.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
