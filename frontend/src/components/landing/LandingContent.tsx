'use client'

import Image from 'next/image'
import Link from 'next/link'
import LanguageSwitcher from '@/components/ui/LanguageSwitcher'
import { useTranslation } from '@/lib/i18n/I18nContext'

export interface CenterSummary {
  id: string
  name: string
  address?: string | null
}

interface LandingContentProps {
  centers: CenterSummary[]
}

function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, index) => (
        <span key={line}>
          {index > 0 && <br />}
          {line}
        </span>
      ))}
    </>
  )
}

export default function LandingContent({ centers }: LandingContentProps) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-white flex flex-col max-w-lg mx-auto">
      <header className="px-6 pt-10 pb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Image src="/icons/cura.svg" alt="Cura" width={32} height={32} />
          <span className="text-xl font-bold text-[#161616]">Cura</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href="/login"
            className="text-sm font-semibold text-[#2592FF] hover:underline"
          >
            {t.landing.login}
          </Link>
        </div>
      </header>

      <section className="px-6 pt-8 pb-10">
        <p className="text-sm font-medium text-[#2592FF] mb-2">{t.landing.eyebrow}</p>
        <h1 className="text-[32px] font-bold text-[#161616] leading-[1.3] mb-3">
          {t.landing.title_line1}<br />
          <span className="text-[#2592FF]">{t.landing.title_highlight}</span>{t.landing.title_suffix}
        </h1>
        <p className="text-base text-[#808080] leading-relaxed">
          <Lines text={t.landing.subtitle} />
        </p>
      </section>

      <section className="px-6 pb-8 space-y-3">
        <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-3">{t.landing.select_role}</p>

        <Link href="/login" className="flex items-center gap-4 bg-[#F3F9FF] border border-[#D1E8FF] rounded-2xl px-5 py-5 hover:bg-[#e8f4ff] active:bg-[#dceeff] transition-colors">
          <div className="w-12 h-12 rounded-xl bg-[#2592FF] flex items-center justify-center shrink-0">
            <img src="/icons/immigrant/home/의료통번역.svg" alt="" width={22} height={22} style={{ filter: 'brightness(0) invert(1)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-[#161616]">{t.landing.role_immigrant}</p>
            <p className="text-sm text-[#808080] mt-0.5">{t.landing.role_immigrant_desc}</p>
          </div>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="shrink-0">
            <path d="M1 1l6 6-6 6" stroke="#2592FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <Link href="/login" className="flex items-center gap-4 bg-[#F5F5F5] border border-[#EEEEEE] rounded-2xl px-5 py-5 hover:bg-[#ececec] active:bg-[#e4e4e4] transition-colors">
          <div className="w-12 h-12 rounded-xl bg-[#494949] flex items-center justify-center shrink-0">
            <img src="/icons/interpreter/home/실시간메모작성.svg" alt="" width={20} height={20} style={{ filter: 'brightness(0) invert(1)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-[#161616]">{t.landing.role_interpreter}</p>
            <p className="text-sm text-[#808080] mt-0.5">{t.landing.role_interpreter_desc}</p>
          </div>
          <svg width="8" height="14" viewBox="0 0 8 14" fill="none" className="shrink-0">
            <path d="M1 1l6 6-6 6" stroke="#494949" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </section>

      {centers.length > 0 && (
        <section className="px-6 pb-8">
          <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-3">{t.landing.participating_centers}</p>
          <div className="space-y-2">
            {centers.map(center => (
              <div key={center.id} className="flex items-center gap-3 bg-[#F5F5F5] rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-full bg-[#DEE2FF] flex items-center justify-center text-sm font-bold text-indigo-700 shrink-0">
                  {center.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#161616] truncate">{center.name}</p>
                  {center.address && <p className="text-xs text-[#A0A0A0] truncate">{center.address}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="px-6 pb-12 mt-auto">
        <Link
          href="/login"
          className="flex items-center justify-center w-full h-[60px] bg-[#2592FF] rounded-2xl text-lg font-bold text-white hover:bg-[#1a7ee6] active:bg-[#1568c7] transition-colors"
        >
          {t.landing.cta}
        </Link>
        <p className="text-center text-xs text-[#A0A0A0] mt-3">
          {t.landing.cta_desc}
        </p>
      </div>

      <footer className="border-t border-[#EEEEEE] py-5 text-center text-xs text-[#C0C0C0]">
        {t.landing.footer}
      </footer>
    </div>
  )
}
