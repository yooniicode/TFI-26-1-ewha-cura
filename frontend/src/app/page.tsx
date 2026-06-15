'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getAccessToken, getLastLoginMethod, type LoginMethod } from '@/lib/auth/auth-token'

const TAGLINES = [
  '의료와 당신을 잇다',
  'Connecting You to Healthcare',
  '连接您与医疗',
  'Kết nối bạn với y tế',
  'Menghubungkan Anda dengan Layanan Kesehatan',
  'เชื่อมคุณกับการดูแลสุขภาพ',
  'আপনাকে স্বাস্থ্যসেবার সাথে সংযুক্ত করা',
  'آپ کو صحت کی دیکھ بھال سے جوڑنا',
  "Sog'liqni saqlash xizmatiga ulash",
  'Таны эрүүл мэндтэй холбоно',
  'ភ្ជាប់អ្នកទៅការថែទាំសុខភាព',
  'स्वास्थ्य सेवासँग जोडिनुस्',
  'ကျန်းမာရေးနှင့် ချိတ်ဆက်ပါ',
  'Ikonekta sa Pangangalagang Pangkalusugan',
  'සෞඛ්‍ය සේවාව සම්බන්ධ කරයි',
]

function KakaoIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3C6.48 3 2 6.58 2 11c0 2.79 1.88 5.25 4.65 6.65-.15.55-.96 3.32-.99 3.55 0 0-.02.16.09.23.1.07.23.02.23.02.31-.04 3.59-2.35 4.16-2.74A12.5 12.5 0 0 0 12 18.5c5.52 0 10-3.58 10-8s-4.48-8-10-8z" fill="#191600" />
    </svg>
  )
}

function RecentBadge() {
  return (
    <span className="absolute -top-2.5 right-3 bg-[#FF5A5F] text-white text-[11px] font-semibold px-2 py-0.5 rounded-full shadow-sm">
      최근 로그인
    </span>
  )
}

export default function SplashPage() {
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)
  const [lastMethod, setLastMethod] = useState<LoginMethod | null>(null)

  useEffect(() => {
    if (getAccessToken()) {
      router.replace('/dashboard')
      return
    }
    setLastMethod(getLastLoginMethod())
  }, [router])

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIdx(i => (i + 1) % TAGLINES.length)
        setVisible(true)
      }, 600)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  function handleKakao() {
    const key = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY
    if (!key) return
    const redirectUri = `${window.location.origin}/auth/kakao/callback`
    const params = new URLSearchParams({ client_id: key, redirect_uri: redirectUri, response_type: 'code' })
    window.location.href = `https://kauth.kakao.com/oauth/authorize?${params}`
  }

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-[402px] mx-auto select-none">
      {/* Logo + animated tagline */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
        <div className="relative w-[240px] h-[84px]">
          <Image
            src="/icons/curawithfont.svg"
            alt="Cura"
            fill
            className="object-contain"
            priority
          />
        </div>
        <div className="h-9 flex items-center justify-center">
          <p
            className="text-[20px] font-medium text-[#494949] text-center transition-opacity duration-500"
            style={{ opacity: visible ? 1 : 0 }}
          >
            {TAGLINES[idx]}
          </p>
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="px-4 pb-10 flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <div className="relative">
            {lastMethod === 'email' && <RecentBadge />}
            <button
              type="button"
              onClick={() => router.push('/login?method=email')}
              className="w-full h-[60px] bg-[#2592FF] rounded-lg text-white text-[18px] font-semibold hover:bg-[#1a7ee6] active:bg-[#1568c7] transition-colors"
            >
              이메일로 로그인
            </button>
          </div>
          <div className="relative">
            {lastMethod === 'phone' && <RecentBadge />}
            <button
              type="button"
              onClick={() => router.push('/login?method=phone')}
              className="w-full h-[60px] bg-white border-2 border-[#2592FF] rounded-lg text-[#2592FF] text-[18px] font-semibold hover:bg-[#f0f7ff] active:bg-[#e0efff] transition-colors"
            >
              전화번호로 로그인
            </button>
          </div>
          <div className="relative">
            {lastMethod === 'kakao' && <RecentBadge />}
            <button
              type="button"
              onClick={handleKakao}
              className="w-full h-[60px] bg-[#FFE724] rounded-lg text-[#191600] text-[18px] font-semibold hover:bg-[#f5dc00] active:bg-[#e8d000] transition-colors flex items-center justify-center gap-2"
            >
              <KakaoIcon />
              카카오톡으로 로그인
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2.5">
          <span className="text-[16px] font-medium text-[#808080]">계정이 없으신가요?</span>
          <button
            type="button"
            onClick={() => router.push('/signup')}
            className="text-[16px] font-medium text-[#2592FF]"
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  )
}
