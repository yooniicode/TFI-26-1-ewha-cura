'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getAccessToken } from '@/lib/auth-token'

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

export default function SplashPage() {
  const router = useRouter()
  const [idx, setIdx] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (getAccessToken()) {
      router.replace('/dashboard')
    }
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
        <div className="flex flex-col gap-5">
          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full h-[60px] bg-[#2592FF] rounded-lg text-white text-[18px] font-semibold hover:bg-[#1a7ee6] active:bg-[#1568c7] transition-colors"
          >
            이메일로 로그인
          </button>
          <button
            type="button"
            onClick={handleKakao}
            className="w-full h-[60px] bg-[#FFE724] rounded-lg text-[#171502] text-[18px] font-semibold hover:bg-[#f5dc00] active:bg-[#e8d000] transition-colors"
          >
            카카오톡 로그인
          </button>
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
