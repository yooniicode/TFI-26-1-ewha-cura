'use client'

import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { adminApi, announcementApi, consultationApi, matchApi, patientApi, chatApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useMe } from '@/hooks/useMe'
import { useRouter } from 'next/navigation'
import type { Announcement, AnnouncementCategory, Consultation } from '@/lib/types'
import { useTranslation } from '@/lib/i18n/I18nContext'

function todayKo() {
  const d = new Date()
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${dow})`
}

function consultDateKo(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} (${dow})`
}

function formatDateTime(value: string, locale: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(locale, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { data: me, isLoading: meLoading } = useMe()
  const { t } = useTranslation()

  const isAdmin = me?.role === 'admin'
  const hasCenter = isAdmin && !!(me?.centerId || me?.centerName)
  const canViewConsultations = me?.role === 'interpreter'
  const canLoadAnnouncements = me?.role === 'patient' || isAdmin
  const isPatientWithEntity = me?.role === 'patient' && !!me.entityId
  const isInterpreter = me?.role === 'interpreter'

  const [announcementCategory, setAnnouncementCategory] = useState<AnnouncementCategory>('NOTICE')
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [announcementContent, setAnnouncementContent] = useState('')
  const [announcementLinkUrl, setAnnouncementLinkUrl] = useState('')
  const [announcementPinned, setAnnouncementPinned] = useState(false)

  const { data: consultations, isLoading: listLoading } = useQuery({
    queryKey: queryKeys.consultations.list(0),
    queryFn: () => consultationApi.list(0).then(r => (r.payload ?? []) as Consultation[]),
    enabled: canViewConsultations,
  })

  const { data: centerStats } = useQuery({
    queryKey: queryKeys.adminStats,
    queryFn: () => adminApi.stats().then(r => r.payload),
    enabled: hasCenter,
  })

  const { data: myMatch } = useQuery({
    queryKey: queryKeys.matching.myMatch(),
    queryFn: () => matchApi.myMatch().then(r => r.payload ?? null),
    enabled: isPatientWithEntity,
    retry: false,
  })

  const { data: myRecords } = useQuery({
    queryKey: queryKeys.patients.myRecords(me?.entityId ?? '', 0),
    queryFn: () => patientApi.myRecords(me!.entityId!, 0).then(r => r.payload ?? []),
    enabled: isPatientWithEntity,
  })

  const { data: myAssignedCount } = useQuery({
    queryKey: queryKeys.matching.myCount(),
    queryFn: () => matchApi.myCount().then(r => r.payload),
    enabled: isInterpreter,
  })

  const { data: announcementResponse, isLoading: announcementsLoading, error: announcementsError } = useQuery({
    queryKey: queryKeys.announcements.list(0),
    queryFn: () => announcementApi.list(0),
    enabled: canLoadAnnouncements,
  })

  const createAnnouncement = useMutation({
    mutationFn: () => announcementApi.create({
      category: announcementCategory,
      title: announcementTitle.trim(),
      content: announcementContent.trim(),
      linkUrl: announcementLinkUrl.trim(),
      pinned: announcementPinned,
    }),
    onSuccess: () => {
      setAnnouncementCategory('NOTICE')
      setAnnouncementTitle('')
      setAnnouncementContent('')
      setAnnouncementLinkUrl('')
      setAnnouncementPinned(false)
      queryClient.invalidateQueries({ queryKey: ['announcements'] })
    },
  })

  const deleteAnnouncement = useMutation({
    mutationFn: (id: string) => announcementApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['announcements'] }),
  })

  if (meLoading) return <AppShell><Spinner /></AppShell>

  const today = todayKo()
  // 한국 표준시(UTC+9) 기준 오늘 날짜
  const todayStr = (() => {
    const now = new Date()
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    return kst.toISOString().split('T')[0]
  })()
  const recentConsultations = (consultations ?? []).filter(c => c.consultationDate === todayStr)

  // 통번역가가 등록한 미래 consultationDate 레코드를 우선으로 찾고,
  // 없으면 과거 진료에 기록된 nextAppointmentDate를 폴백으로 사용
  const upcomingScheduled = (myRecords ?? [])
    .filter(r => r.consultationDate >= todayStr)
    .sort((a, b) => a.consultationDate.localeCompare(b.consultationDate))
  const nextScheduledRecord = upcomingScheduled[0] ?? null
  const nextFromRecord = (myRecords ?? [])
    .filter(r => r.consultationDate < todayStr)
    .find(r => r.nextAppointmentDate)?.nextAppointmentDate ?? null
  const nextAppointment = nextScheduledRecord?.consultationDate ?? nextFromRecord
  const nextAppointmentContext = nextScheduledRecord
    ? [nextScheduledRecord.hospitalName, nextScheduledRecord.department].filter(Boolean).join(' ') || null
    : null
  const announcements = announcementResponse?.payload ?? []
  const roleLabel = isAdmin ? '센터장' : me?.role === 'interpreter' ? '통번역가' : '이주민'

  const announcementCategoryLabels: Record<AnnouncementCategory, string> = {
    NOTICE: t.dashboard.announcement_category_notice,
    POLICY: t.dashboard.announcement_category_policy,
    RESOURCE: t.dashboard.announcement_category_resource,
  }

  function handleCreateAnnouncement(e: FormEvent) {
    e.preventDefault()
    if (!announcementTitle.trim() || !announcementContent.trim()) return
    createAnnouncement.mutate()
  }

  function handleDeleteAnnouncement(id: string) {
    if (!confirm(t.dashboard.announcement_delete_confirm)) return
    deleteAnnouncement.mutate(id)
  }

  // 이주민 홈 - 피그마 신디자인
  if (me?.role === 'patient') {
    const msPerDay = 1000 * 60 * 60 * 24
    const appointmentVariant: 'today_before' | 'next' | 'none' =
      nextScheduledRecord?.consultationDate === todayStr ? 'today_before' :
      nextScheduledRecord ? 'next' :
      'none'
    const daysUntil = nextScheduledRecord && nextScheduledRecord.consultationDate > todayStr
      ? Math.ceil(
          (new Date(nextScheduledRecord.consultationDate + 'T00:00:00').getTime()
            - new Date(todayStr + 'T00:00:00').getTime())
          / msPerDay
        )
      : 0
    const appointmentDate = nextScheduledRecord
      ? consultDateKo(nextScheduledRecord.consultationDate)
      : ''
    const appointmentHospital = nextScheduledRecord
      ? [nextScheduledRecord.hospitalName, nextScheduledRecord.department].filter(Boolean).join(' ')
      : ''
    const interpreterName = myMatch?.interpreterName ?? null

    return (
      <AppShell noPadding>
        {/* 파란 헤더 */}
        <div className="bg-[#2592FF] rounded-b-[20px] px-[22px] pb-6 pt-6">
          <h1 className="text-[24px] font-semibold text-white leading-[1.4] mb-4">
            안녕하세요,<br />{me.name ?? ''}님
          </h1>

          {appointmentVariant === 'none' ? (
            <div className="bg-[#1b85ee] rounded-[16px] h-[195px] flex items-center justify-center px-4">
              <p className="text-white text-[16px] font-medium text-center">예정된 진료가 없어요</p>
            </div>
          ) : (
            <div className="bg-white border border-[#eee] rounded-[16px] p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                {appointmentVariant === 'today_before' ? (
                  <div className="bg-[#f6fff3] rounded-full px-[10px] py-[4px]">
                    <span className="text-[#30c100] text-[18px] font-semibold leading-[1.4]">오늘 진료가 있어요</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-[#161616] text-[18px] font-semibold leading-[1.4]">다음 진료까지</span>
                    <div className="bg-[#f6fff3] rounded-full px-[10px] py-[4px]">
                      <span className="text-[#30c100] text-[18px] font-semibold leading-[1.4]">D-{daysUntil}</span>
                    </div>
                  </div>
                )}
                <div className="bg-[#f0f1f5] rounded-full px-3 h-[33px] flex items-center shrink-0">
                  <span className="text-[#808080] text-[14px] font-medium leading-[1.4]">캘린더에 추가</span>
                </div>
              </div>

              <div className="flex gap-4 text-[16px] font-medium leading-[1.4]">
                <div className="flex flex-col gap-1 flex-1">
                  <p className="text-[#808080]">날짜</p>
                  <p className="text-[#161616]">{appointmentDate}</p>
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <p className="text-[#808080]">병원</p>
                  <p className="text-[#161616] truncate">{appointmentHospital || '-'}</p>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-[#808080] text-[16px] font-medium leading-[1.4]">통번역가</p>
                <div className="flex items-center gap-1">
                  <p className="text-[#161616] text-[16px] font-medium leading-[1.4]">
                    {interpreterName ? `${interpreterName}님` : '-'}
                  </p>
                  {interpreterName && myMatch?.interpreterId && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await chatApi.roomWithInterpreter(myMatch.interpreterId)
                          if (res.payload) router.push(`/chat/${res.payload.id}`)
                        } catch { /* ignore */ }
                      }}
                      className="w-[24px] h-[24px] rounded-full bg-[#f0f1f5] flex items-center justify-center shrink-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#808080" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 13.6a19.79 19.79 0 01-3.07-8.67A2 2 0 012 2.84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 10.91a16 16 0 006.72 6.72l1.25-1.25a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 18.92v-2z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 퀵 액션 그리드 */}
        <div className="bg-white px-4 pt-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/interpretation-request"
              className="bg-white border border-[#eee] rounded-[16px] px-3 py-4 flex flex-col justify-between h-[120px] hover:bg-gray-50 transition-colors active:opacity-80"
            >
              <div className="flex items-center gap-1">
                <img src="/icons/immigrant/home/의료통번역.svg" alt="" width={24} height={24} />
                <span className="text-[#161616] text-[18px] font-medium">{t.immigrant_home.medical_translation}</span>
              </div>
              <div className="text-[#161616] text-[14px] font-medium leading-[1.4]">
                <p>병원 진료의</p>
                <p>통번역을 신청해요</p>
              </div>
            </Link>

            <Link
              href="/emergency-call"
              className="bg-white border border-[#eee] rounded-[16px] px-3 py-4 flex flex-col justify-between h-[120px] hover:bg-gray-50 transition-colors active:opacity-80"
            >
              <div className="flex items-center gap-1">
                <img src="/icons/immigrant/home/긴급전화.svg" alt="" width={24} height={24} />
                <span className="text-[#161616] text-[18px] font-medium">{t.immigrant_home.emergency_call}</span>
              </div>
              <div className="text-[#161616] text-[14px] font-medium leading-[1.4]">
                <p>급할 때 필요한</p>
                <p>전화번호를 모았어요</p>
              </div>
            </Link>

            <Link
              href="/my-records"
              className="bg-white border border-[#eee] rounded-[16px] px-3 py-4 flex flex-col justify-between h-[120px] hover:bg-gray-50 transition-colors active:opacity-80"
            >
              <div className="flex items-center gap-1">
                <img src="/icons/immigrant/home/진료기록.svg" alt="" width={24} height={24} />
                <span className="text-[#161616] text-[18px] font-medium">{t.immigrant_home.medical_records}</span>
              </div>
              <div className="text-[#161616] text-[14px] font-medium leading-[1.4]">
                <p>내가 받은</p>
                <p>진료 내용을 확인해요</p>
              </div>
            </Link>

            {me.entityId ? (
              <Link
                href={`/scripts/patient/${me.entityId}`}
                className="bg-white border border-[#eee] rounded-[16px] px-3 py-4 flex flex-col justify-between h-[120px] hover:bg-gray-50 transition-colors active:opacity-80"
              >
                <div className="flex items-center gap-1">
                  <img src="/icons/immigrant/home/의료대본.svg" alt="" width={24} height={24} />
                  <span className="text-[#161616] text-[18px] font-medium">{t.immigrant_home.medical_script}</span>
                </div>
                <div className="text-[#161616] text-[14px] font-medium leading-[1.4]">
                  <p>의료 상황에서</p>
                  <p>필요한 표현을 확인해요</p>
                </div>
              </Link>
            ) : (
              <div className="bg-white border border-[#eee] rounded-[16px] px-3 py-4 flex flex-col justify-between h-[120px] opacity-40">
                <div className="flex items-center gap-1">
                  <img src="/icons/immigrant/home/의료대본.svg" alt="" width={24} height={24} />
                  <span className="text-[#161616] text-[18px] font-medium">{t.immigrant_home.medical_script}</span>
                </div>
                <div className="text-[#161616] text-[14px] font-medium leading-[1.4]">
                  <p>의료 상황에서</p>
                  <p>필요한 표현을 확인해요</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 공지 피드 */}
        <section className="bg-neutral-100 px-4 pt-5 pb-8 min-h-[calc(100vh-18rem)]">
          <AnnouncementFeedSection
            announcements={announcements}
            categoryLabels={announcementCategoryLabels}
            loading={announcementsLoading}
            error={announcementsError}
            locale={t.locale}
            t={t}
          />
        </section>
      </AppShell>
    )
  }

  return (
    <AppShell noPadding>
      {/* 히어로 - 흰색 */}
      <section className="bg-white px-4 pt-5 pb-7">
        <p className="text-sm text-zinc-500 mb-3">{today}</p>
        <h1 className="text-2xl font-bold text-neutral-900 leading-snug">
          안녕하세요,<br />{me?.name ?? ''}님
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {roleLabel}{me?.centerName ? ` · ${me.centerName}` : ''}
        </p>

        {/* 통번역가 퀵 액션 */}
        {me?.role === 'interpreter' && (
          <div className="mt-5 space-y-2.5">
            {/* 실시간 메모 작성 — 주요 액션 */}
            <Link
              href="/rm/new"
              className="flex items-center gap-4 px-5 py-4 bg-[#2592FF] rounded-2xl hover:bg-[#1a7ee6] active:bg-[#1568c7] transition-colors"
            >
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <img
                  src="/icons/interpreter/home/실시간메모작성.svg"
                  alt=""
                  width={20}
                  height={20}
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold text-white">{t.interpreter_home.realtime_memo}</p>
                <p className="text-xs text-white/70 mt-0.5">{t.interpreter_home.realtime_memo_desc}</p>
              </div>
              <svg className="ml-auto shrink-0" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>

            {/* 3칸 그리드 */}
            <div className="grid grid-cols-3 gap-2">
              <Link
                href="/consultations/start"
                className="flex flex-col items-center py-5 gap-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <img src="/icons/interpreter/home/보고서.svg" alt="" width={24} height={24} />
                <span className="text-xs font-medium text-neutral-700">{t.interpreter_home.report}</span>
              </Link>
              <Link
                href="/patients"
                className="flex flex-col items-center py-5 gap-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="relative">
                  <img src="/icons/interpreter/home/담당환자.svg" alt="" width={24} height={24} />
                  {myAssignedCount !== undefined && myAssignedCount.count > 0 && (
                    <span className="absolute -top-2 -right-3 rounded-full bg-[#2592FF] px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                      {myAssignedCount.count}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-neutral-700">{t.interpreter_home.my_patients}</span>
              </Link>
              <Link
                href="/consultations"
                className="flex flex-col items-center py-5 gap-2.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <img src="/icons/interpreter/home/나의활동.svg" alt="" width={24} height={24} />
                <span className="text-xs font-medium text-neutral-700">{t.interpreter_home.my_activity}</span>
              </Link>
            </div>
          </div>
        )}

        {/* 센터장 퀵 액션 */}
        {isAdmin && (
          <div className="mt-5 grid grid-cols-2 gap-2.5">
            <Link href="/patients"
              className="flex flex-col items-center py-5 gap-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#494949" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
              <span className="text-xs font-medium text-neutral-700">이주민 관리</span>
            </Link>
            <Link href="/consultations"
              className="flex flex-col items-center py-5 gap-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#494949" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              <span className="text-xs font-medium text-neutral-700">보고서 조회</span>
            </Link>
            <Link href="/chat"
              className="flex flex-col items-center py-5 gap-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#494949" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <span className="text-xs font-medium text-neutral-700">채팅</span>
            </Link>
            <Link href="/mypage"
              className="flex flex-col items-center py-5 gap-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#494949" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
              <span className="text-xs font-medium text-neutral-700">센터 설정</span>
            </Link>
          </div>
        )}

        {/* 센터장 통계 */}
        {isAdmin && hasCenter && (
          <div className="mt-5 grid grid-cols-3 gap-2">
            {([
              { href: '/patients',     icon: 'P', label: t.nav.patients,    count: centerStats?.patientCount },
              { href: '/interpreters', icon: 'I', label: t.nav.interpreters, count: centerStats?.interpreterCount },
              { href: '/matching',     icon: 'M', label: t.nav.matching,     count: centerStats?.activeMatchCount },
            ] as const).map(item => (
              <Link key={item.href} href={item.href}
                className="flex flex-col items-center py-4 gap-1 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <span className="text-2xl font-bold text-primary-600">
                  {item.count !== undefined ? item.count : item.icon}
                </span>
                <span className="text-xs font-medium text-center text-gray-600">{item.label}</span>
              </Link>
            ))}
          </div>
        )}

      </section>

      {/* 컨텐츠 - 회색 배경 */}
      <section className="bg-neutral-100 px-4 pt-5 pb-8 min-h-[calc(100vh-18rem)]">

        {/* 통번역가: 오늘 통역 일정 */}
        {me?.role === 'interpreter' && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-sm text-zinc-500">{today}</p>
                <p className="text-base font-semibold text-zinc-700">{t.interpreter_home.today_schedule}</p>
              </div>
              <Link
                href="/consultations/schedule"
                className="flex items-center justify-center w-9 h-9 bg-[#2592FF] rounded-xl hover:bg-[#1a7ee6] active:bg-[#1568c7] transition-colors shrink-0"
                title={t.interpreter_home.add_schedule}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </Link>
            </div>
            {listLoading && <p className="text-sm text-gray-400 py-4">{t.interpreter_home.loading}</p>}
            {!listLoading && recentConsultations.length === 0 && (
              <div className="bg-white rounded-lg px-5 py-8 text-center">
                <p className="text-sm text-gray-400">{t.interpreter_home.no_schedule}</p>
              </div>
            )}
            {recentConsultations.map(c => (
              <Link key={c.id} href={`/patients/${c.patientId}?cid=${c.id}`}
                className="flex justify-between items-center bg-white rounded-lg px-5 py-5 hover:shadow-sm transition-shadow">
                <div className="flex flex-col gap-1 min-w-0 flex-1 pr-3">
                  <span className="text-xl font-semibold text-neutral-900">{c.patientName}</span>
                  <span className="text-base text-zinc-500">{consultDateKo(c.consultationDate)}</span>
                  {(c.hospitalName || c.department) && (
                    <span className="text-base text-zinc-500 truncate">
                      {[c.hospitalName, c.department].filter(Boolean).join(' ')}
                    </span>
                  )}
                </div>
                <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <div className="w-4 h-5 border-2 border-blue-500 rounded-sm" />
                </div>
              </Link>
            ))}
            {recentConsultations.length > 0 && (
              <Link href="/consultations" className="block text-center text-sm text-primary-600 py-2">
                {t.interpreter_home.view_all}
              </Link>
            )}
          </div>
        )}

        {/* 센터장: 공지 관리 */}
        {isAdmin && !hasCenter && (
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-5">
            <p className="text-sm font-semibold text-amber-900">{t.common.admin_center_required}</p>
            <p className="mt-1 text-xs text-amber-800">{t.common.admin_center_required_desc}</p>
            <Link href="/mypage" className="mt-3 inline-block text-xs font-semibold text-[#2592FF]">
              {t.common.setup_center}
            </Link>
          </div>
        )}
        {isAdmin && hasCenter && (
          <AdminAnnouncementSection
            announcements={announcements}
            category={announcementCategory}
            categoryLabels={announcementCategoryLabels}
            title={announcementTitle}
            content={announcementContent}
            linkUrl={announcementLinkUrl}
            pinned={announcementPinned}
            loading={announcementsLoading}
            saving={createAnnouncement.isPending}
            deletingId={deleteAnnouncement.variables}
            error={createAnnouncement.error ?? announcementsError}
            locale={t.locale}
            t={t}
            onCategoryChange={setAnnouncementCategory}
            onTitleChange={setAnnouncementTitle}
            onContentChange={setAnnouncementContent}
            onLinkUrlChange={setAnnouncementLinkUrl}
            onPinnedChange={setAnnouncementPinned}
            onSubmit={handleCreateAnnouncement}
            onDelete={handleDeleteAnnouncement}
          />
        )}

      </section>
    </AppShell>
  )
}

function AdminAnnouncementSection({
  announcements, category, categoryLabels, title, content, linkUrl, pinned,
  loading, saving, deletingId, error, locale, t,
  onCategoryChange, onTitleChange, onContentChange, onLinkUrlChange, onPinnedChange,
  onSubmit, onDelete,
}: {
  announcements: Announcement[]
  category: AnnouncementCategory
  categoryLabels: Record<AnnouncementCategory, string>
  title: string
  content: string
  linkUrl: string
  pinned: boolean
  loading: boolean
  saving: boolean
  deletingId?: string
  error: unknown
  locale: string
  t: ReturnType<typeof useTranslation>['t']
  onCategoryChange: (value: AnnouncementCategory) => void
  onTitleChange: (value: string) => void
  onContentChange: (value: string) => void
  onLinkUrlChange: (value: string) => void
  onPinnedChange: (value: boolean) => void
  onSubmit: (e: FormEvent) => void
  onDelete: (id: string) => void
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold text-zinc-700">{t.dashboard.announcement_manage_title}</h2>
        <p className="mt-0.5 text-xs text-gray-500">{t.dashboard.announcement_manage_desc}</p>
      </div>

      <form onSubmit={onSubmit} className="bg-white rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{t.dashboard.announcement_category}</label>
            <select className="input" value={category}
              onChange={e => onCategoryChange(e.target.value as AnnouncementCategory)}>
              {(Object.entries(categoryLabels) as [AnnouncementCategory, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-600">
            <input type="checkbox" checked={pinned} onChange={e => onPinnedChange(e.target.checked)} />
            {t.dashboard.announcement_pinned}
          </label>
        </div>
        <div>
          <label className="label">{t.dashboard.announcement_title}</label>
          <input className="input" value={title} onChange={e => onTitleChange(e.target.value)}
            placeholder={t.dashboard.announcement_title_placeholder} maxLength={120} required />
        </div>
        <div>
          <label className="label">{t.dashboard.announcement_content}</label>
          <textarea className="input min-h-24" value={content} onChange={e => onContentChange(e.target.value)}
            placeholder={t.dashboard.announcement_content_placeholder} required />
        </div>
        <div>
          <label className="label">{t.dashboard.announcement_link_url}</label>
          <input className="input" value={linkUrl} onChange={e => onLinkUrlChange(e.target.value)}
            placeholder={t.dashboard.announcement_link_placeholder} maxLength={500} />
        </div>
        {!!error && <p className="text-xs text-red-500">{error instanceof Error ? error.message : t.dashboard.announcement_err_save}</p>}
        <button type="submit" className="btn-primary w-full sm:w-auto sm:px-5" disabled={saving}>
          {saving ? t.common.saving : t.common.save}
        </button>
      </form>

      <AnnouncementList
        announcements={announcements}
        categoryLabels={categoryLabels}
        loading={loading}
        locale={locale}
        t={t}
        admin
        deletingId={deletingId}
        onDelete={onDelete}
      />
    </section>
  )
}

function AnnouncementFeedSection({
  announcements, categoryLabels, loading, error, locale, t,
}: {
  announcements: Announcement[]
  categoryLabels: Record<AnnouncementCategory, string>
  loading: boolean
  error: unknown
  locale: string
  t: ReturnType<typeof useTranslation>['t']
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold text-zinc-700">{t.dashboard.announcement_feed_title}</h2>
        <p className="mt-0.5 text-xs text-gray-500">{t.dashboard.announcement_feed_desc}</p>
      </div>
      {!!error && <p className="text-xs text-red-500">{error instanceof Error ? error.message : t.dashboard.announcement_err_save}</p>}
      <AnnouncementList
        announcements={announcements}
        categoryLabels={categoryLabels}
        loading={loading}
        locale={locale}
        t={t}
      />
    </section>
  )
}

function AnnouncementList({
  announcements, categoryLabels, loading, locale, t, admin = false, deletingId, onDelete,
}: {
  announcements: Announcement[]
  categoryLabels: Record<AnnouncementCategory, string>
  loading: boolean
  locale: string
  t: ReturnType<typeof useTranslation>['t']
  admin?: boolean
  deletingId?: string
  onDelete?: (id: string) => void
}) {
  if (loading) return <p className="text-sm text-gray-400">{t.common.loading}</p>

  if (announcements.length === 0) {
    return (
      <p className="rounded-xl bg-white px-3 py-4 text-center text-sm text-gray-400">
        {t.dashboard.announcement_empty}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {announcements.map(item => (
        <article key={item.id} className="bg-white rounded-xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-1.5">
                <Badge variant={item.category === 'POLICY' ? 'blue' : item.category === 'RESOURCE' ? 'green' : 'yellow'}>
                  {categoryLabels[item.category]}
                </Badge>
                {item.pinned && <Badge variant="red">{t.dashboard.announcement_pinned_badge}</Badge>}
                <span className="text-xs text-gray-400">{formatDateTime(item.createdAt, locale)}</span>
              </div>
              <h3 className="text-sm font-semibold text-gray-900">{item.title}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-gray-600">{item.content}</p>
              <p className="mt-1 text-xs text-gray-400">{item.centerName}</p>
            </div>
            {admin && onDelete && (
              <button type="button" className="shrink-0 text-xs font-medium text-red-500 hover:text-red-700"
                disabled={deletingId === item.id} onClick={() => onDelete(item.id)}>
                {t.common.delete}
              </button>
            )}
          </div>
          {item.linkUrl && (
            <a href={item.linkUrl} target="_blank" rel="noreferrer"
              className="inline-flex text-xs font-semibold text-primary-600 hover:text-primary-700">
              {t.dashboard.announcement_open_link}
            </a>
          )}
        </article>
      ))}
    </div>
  )
}
