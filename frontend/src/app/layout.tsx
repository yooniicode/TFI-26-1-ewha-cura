import type { Metadata, Viewport } from 'next'
import './globals.css'
import QueryProvider from '@/components/QueryProvider'
import { I18nProvider } from '@/lib/i18n/I18nContext'

export const metadata: Metadata = {
  title: 'LinkUs Interpretation Support Platform',
  description: 'Medical interpretation support system for migrants',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'LinkUs' },
}

export const viewport: Viewport = {
  themeColor: '#16a34a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <QueryProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
