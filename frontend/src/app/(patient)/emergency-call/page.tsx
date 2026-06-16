'use client'

import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import PageHeader from '@/components/ui/PageHeader'

function PhoneIcon({ size = 24, color = '#2592FF' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M6.6 10.8a15.4 15.4 0 006.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2a11.5 11.5 0 003.6 1.2c.4.1.7.4.7.8V20a2 2 0 01-2 2A18 18 0 012 4a2 2 0 012-2h3c.4 0 .8.3.8.7.1 1.3.4 2.5 1.2 3.6.1.3.1.7-.2 1L6.6 10.8z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MessageIcon() {
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke="#808080"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 10h8M8 14h5" stroke="#808080" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ChevronDown() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <path d="M6 9l6 6 6-6" stroke="#808080" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ChevronUp() {
  return (
    <svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <path d="M18 15l-6-6-6 6" stroke="#808080" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface Interpretation {
  flag: string
  text: string
}

interface EmergencyContact {
  id: string
  name: string
  number: string
  hoursLabel?: string
  hoursRange?: { startHour: number; endHour: number; weekdayOnly?: boolean }
  category?: string
  interpretation?: Interpretation
  interpreterNote?: string
  hasSms: boolean
}

const CONTACTS: EmergencyContact[] = [
  {
    id: '119',
    name: '응급·화재 신고',
    number: '119',
    hoursLabel: '24시간 365일',
    interpretation: { flag: '🇻🇳', text: '베트남어로 전화가 가능해요' },
    interpreterNote: '11~14개 언어 통역 지원 (지역별 상이) · SMS·앱·수어 신고 가능',
    hasSms: true,
  },
  {
    id: '112',
    name: '범죄·경찰 신고',
    number: '112',
    hoursLabel: '24시간 365일',
    interpretation: { flag: '🇻🇳', text: '베트남어로 전화가 가능해요' },
    interpreterNote: '영어·중국어 전담 24시간 · 베트남어 등 기타 언어 3자 통화 연결',
    hasSms: true,
  },
  {
    id: '1339',
    name: '응급의료 안내',
    number: '1339',
    hoursLabel: '24시간 365일',
    interpreterNote: '외국어 직접 상담 없음 · 1330/1345 통해 3자 통화 연결',
    hasSms: false,
  },
  {
    id: '1577-1366',
    name: '다누리 콜센터',
    number: '1577-1366',
    hoursLabel: '365일 24시간',
    interpretation: { flag: '🇻🇳', text: '베트남어로 전화가 가능해요' },
    interpreterNote: '13개 언어 지원 · 베트남어, 중국어, 영어, 몽골어, 러시아어 등',
    hasSms: false,
  },
  {
    id: '1345',
    name: '출입국·이민 안내',
    number: '1345',
    hoursLabel: '평일 09:00~22:00',
    hoursRange: { startHour: 9, endHour: 22, weekdayOnly: true },
    category: '출입국·생활 정보',
    interpretation: { flag: '🇻🇳', text: '베트남어로 전화가 가능해요' },
    interpreterNote: '20개 언어 지원 · 18시 이후 영어·중국어·한국어만',
    hasSms: false,
  },
  {
    id: 'nhis',
    name: '국민건강보험 외국인 상담',
    number: '1588-1250',
    hoursLabel: '평일 09:00~18:00',
    hoursRange: { startHour: 9, endHour: 18, weekdayOnly: true },
    category: '건강보험 안내',
    hasSms: false,
  },
]

function isOpen(contact: EmergencyContact): boolean {
  if (!contact.hoursRange) return true
  const now = new Date()
  const day = now.getDay()
  const hour = now.getHours()
  if (contact.hoursRange.weekdayOnly && (day === 0 || day === 6)) return false
  return hour >= contact.hoursRange.startHour && hour < contact.hoursRange.endHour
}

function CallItem({
  contact,
  isExpanded,
  onToggle,
}: {
  contact: EmergencyContact
  isExpanded: boolean
  onToggle: () => void
}) {
  const numDialable = contact.number.replace(/-/g, '')

  if (!isExpanded) {
    return (
      <div className="flex items-center justify-between py-[16px] border-b border-[#eee]">
        <button
          type="button"
          onClick={onToggle}
          className="flex flex-col items-start justify-center gap-[2px] flex-1 min-w-0 active:opacity-70 transition-opacity text-left"
        >
          <p className="text-[20px] font-semibold text-[#161616] leading-[1.4]">{contact.name}</p>
          {contact.interpretation && (
            <div className="flex items-center gap-[2px]">
              <span className="text-[16px] leading-none">{contact.interpretation.flag}</span>
              <p className="text-[16px] font-medium text-[#808080] leading-[1.4] ml-1">{contact.interpretation.text}</p>
            </div>
          )}
        </button>
        <div className="flex items-center gap-[20px] shrink-0 ml-4">
          <a
            href={`tel:${numDialable}`}
            onClick={e => e.stopPropagation()}
            className="bg-[#f3f9ff] p-[6px] rounded-full flex items-center justify-center active:opacity-70 transition-opacity"
            aria-label={`${contact.name} 전화하기`}
          >
            <PhoneIcon size={34} color="#2592FF" />
          </a>
          <button type="button" onClick={onToggle} className="active:opacity-70 transition-opacity">
            <ChevronDown />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[16px] py-[24px] border-b border-[#eee]">
      <div className="flex items-center justify-between w-full">
        <p className="text-[20px] font-semibold text-[#161616] leading-[1.4] flex-1 min-w-0 pr-4">{contact.name}</p>
        <button type="button" onClick={onToggle} className="shrink-0 active:opacity-70 transition-opacity">
          <ChevronUp />
        </button>
      </div>

      <div className="flex flex-col gap-[4px]">
        {contact.interpretation && (
          <div className="flex items-center gap-[2px]">
            <span className="text-[16px] leading-none">{contact.interpretation.flag}</span>
            <p className="text-[16px] font-medium text-[#808080] leading-[1.4] ml-1">{contact.interpretation.text}</p>
          </div>
        )}
        {contact.hoursLabel && (
          <div className="flex items-center gap-[4px] text-[16px] font-medium text-[#808080] leading-[1.4]">
            <span>{contact.hoursLabel}</span>
            {contact.category && (
              <>
                <span>|</span>
                <span>{contact.category}</span>
              </>
            )}
          </div>
        )}
        {contact.interpreterNote && (
          <p className="text-[14px] font-medium text-[#808080] leading-[1.5]">{contact.interpreterNote}</p>
        )}
      </div>

      <div className={`flex items-center py-[8px] w-full ${contact.hasSms ? 'gap-[10px]' : ''}`}>
        {contact.hasSms && (
          <a
            href={`sms:${numDialable}`}
            className="bg-[#f0f1f5] h-[52px] w-[80px] rounded-[40px] flex items-center justify-center shrink-0 active:opacity-70 transition-opacity"
            aria-label={`${contact.name} 문자하기`}
          >
            <MessageIcon />
          </a>
        )}
        <a
          href={`tel:${numDialable}`}
          className="bg-[#f3f9ff] flex-1 h-[52px] rounded-full flex gap-[4px] items-center justify-center active:opacity-70 transition-opacity"
          aria-label={`${contact.name} 전화하기`}
        >
          <PhoneIcon size={28} color="#2592FF" />
          <p className="text-[22px] font-semibold text-[#2592FF] leading-[1.4]">{contact.number}</p>
        </a>
      </div>
    </div>
  )
}

export default function EmergencyCallPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const openContacts = CONTACTS.filter(isOpen)

  function toggleItem(key: string) {
    setExpandedId(prev => (prev === key ? null : key))
  }

  return (
    <AppShell noPadding>
      <PageHeader title="긴급전화" />

      <div className="bg-[#f6fff3] px-[16px] py-[20px] flex flex-col gap-[8px]">
        <p className="text-[18px] font-semibold text-[#30c100] leading-normal">통역 서비스 안내</p>
        <p className="text-[16px] font-medium text-[#161616] leading-[1.6]">
          {'국기가 표시된 언어는 통역 서비스가 지원됩니다.\n전화 연결 후 외국어로 도움을 받을 수 있습니다.'}
        </p>
      </div>

      <div className="bg-white px-[16px] pb-10">
        {openContacts.length > 0 && (
          <>
            <p className="text-[20px] font-semibold text-[#161616] leading-[1.4] pt-[20px] pb-[4px]">
              지금 통화할 수 있어요
            </p>
            {openContacts.map(contact => {
              const key = `open-${contact.id}`
              return (
                <CallItem
                  key={key}
                  contact={contact}
                  isExpanded={expandedId === key}
                  onToggle={() => toggleItem(key)}
                />
              )
            })}
            <p className="text-[20px] font-semibold text-[#161616] leading-[1.4] pt-[28px] pb-[4px]">전체</p>
          </>
        )}

        {openContacts.length === 0 && (
          <p className="text-[20px] font-semibold text-[#161616] leading-[1.4] pt-[20px] pb-[4px]">전체</p>
        )}

        {CONTACTS.map(contact => {
          const key = `all-${contact.id}`
          return (
            <CallItem
              key={key}
              contact={contact}
              isExpanded={expandedId === key}
              onToggle={() => toggleItem(key)}
            />
          )
        })}
      </div>
    </AppShell>
  )
}
