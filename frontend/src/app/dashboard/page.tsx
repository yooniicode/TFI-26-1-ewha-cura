'use client'

import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import { adminApi, announcementApi, consultationApi, matchApi, patientApi } from '@/lib/api'
import { queryKeys } from '@/lib/queryKeys'
import { useMe } from '@/hooks/useMe'
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
  const { data: me, isLoading: meLoading } = useMe()
  const { t } = useTranslation()

  const adminFeaturesEnabled = false
  const hasCenter = adminFeaturesEnabled && me?.role === 'admin' && !!(me.centerId || me.centerName)
  const canViewConsultations = me?.role === 'interpreter'
  const canLoadAnnouncements = me?.role === 'patient'
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
    enabled: adminFeaturesEnabled && hasCenter,
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
  const recentConsultations = (consultations ?? []).slice(0, 5)
  const nextAppointment = (myRecords ?? []).find(r => r.nextAppointmentDate)?.nextAppointmentDate
  const announcements = announcementResponse?.payload ?? []
  const roleLabel = me?.role === 'admin' ? '센터장' : me?.role === 'interpreter' ? '통번역가' : '이주민'

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
          <div className="mt-5 grid grid-cols-2 gap-2">
            <Link href="/consultations"
              className="flex flex-col items-center py-4 gap-1.5 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <line x1="10" y1="9" x2="8" y2="9" />
              </svg>
              <span className="text-xs font-medium text-center text-primary-700">보고서</span>
            </Link>
            <Link href="/patients"
              className="flex flex-col items-center py-4 gap-1.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="relative">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
                {myAssignedCount !== undefined && myAssignedCount.count > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 rounded-full bg-primary-500 px-1.5 py-0.5 text-[9px] font-bold text-white leading-none">
                    {myAssignedCount.count}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium text-center text-gray-600">담당 환자</span>
            </Link>
          </div>
        )}

        {/* 센터장 통계 (관리자 기능 비활성화) */}
        {false && me?.role === 'admin' && hasCenter && (
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

        {/* 이주민 퀵 링크 + 정보 */}
        {me?.role === 'patient' && (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Link href="/my-records"
                className="flex flex-col items-center py-4 gap-1.5 bg-primary-50 rounded-xl hover:bg-primary-100 transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  <line x1="16" y1="11" x2="8" y2="11" />
                  <line x1="16" y1="15" x2="8" y2="15" />
                </svg>
                <span className="text-xs font-medium text-center text-primary-700">내 진료 기록</span>
              </Link>
              {me.entityId ? (
                <Link href={`/scripts/patient/${me.entityId}`}
                  className="flex flex-col items-center py-4 gap-1.5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <span className="text-xs font-medium text-center text-gray-600">의료 대본</span>
                </Link>
              ) : (
                <div className="flex flex-col items-center py-4 gap-1.5 bg-gray-50 rounded-xl opacity-40">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                  <span className="text-xs font-medium text-center text-gray-600">의료 대본</span>
                </div>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-xl px-3 py-3">
                <p className="text-xs text-gray-400 mb-0.5">담당 통번역가</p>
                {myMatch?.interpreterName
                  ? <p className="text-sm font-semibold text-neutral-900 truncate">{myMatch.interpreterName}</p>
                  : <p className="text-xs text-gray-400">배정 없음</p>}
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-3">
                <p className="text-xs text-gray-400 mb-0.5">다음 예약</p>
                {nextAppointment
                  ? <p className="text-sm font-semibold text-neutral-900 truncate">{nextAppointment}</p>
                  : <p className="text-xs text-gray-400">예약 없음</p>}
              </div>
            </div>
          </>
        )}
      </section>

      {/* 컨텐츠 - 회색 배경 */}
      <section className="bg-neutral-100 px-4 pt-5 pb-8 min-h-[calc(100vh-18rem)]">

        {/* 통번역가: 오늘 통역 일정 */}
        {me?.role === 'interpreter' && (
          <div className="space-y-2.5">
            <div className="mb-1">
              <p className="text-sm text-zinc-700">{today}</p>
              <p className="text-base font-semibold text-zinc-700">오늘 통역 일정</p>
            </div>
            {listLoading && <p className="text-sm text-gray-400 py-4">로딩 중...</p>}
            {!listLoading && recentConsultations.length === 0 && (
              <div className="bg-white rounded-lg px-5 py-8 text-center">
                <p className="text-sm text-gray-400">예정된 통역 일정이 없습니다.</p>
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
                전체 보기
              </Link>
            )}
          </div>
        )}

        {/* 센터장: 공지 관리 (관리자 기능 비활성화) */}
        {false && me?.role === 'admin' && !hasCenter && (
          <div className="rounded-xl bg-yellow-50 border border-yellow-100 px-4 py-5">
            <p className="text-sm font-semibold text-yellow-900">{t.common.admin_center_required}</p>
            <p className="mt-1 text-xs text-yellow-800">{t.common.admin_center_required_desc}</p>
            <Link href="/mypage" className="mt-3 inline-block text-xs font-semibold text-primary-600">
              {t.common.setup_center}
            </Link>
          </div>
        )}
        {false && me?.role === 'admin' && hasCenter && (
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

        {/* 이주민: 공지 피드 */}
        {me?.role === 'patient' && (
          <AnnouncementFeedSection
            announcements={announcements}
            categoryLabels={announcementCategoryLabels}
            loading={announcementsLoading}
            error={announcementsError}
            locale={t.locale}
            t={t}
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
