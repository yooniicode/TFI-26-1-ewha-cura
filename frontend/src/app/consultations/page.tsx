'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { adminApi, consultationApi, chatApi } from '@/lib/api'
import type { AdminWorkLog, AdminWorkLogTask, Consultation, PageInfo } from '@/lib/types'
import { useEnumLabels } from '@/lib/i18n/enumLabels'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { useMe } from '@/hooks/useMe'
import { formatKoreanDate, formatKoreanDateTime } from '@/lib/utils/dateFormat'

type SortBy = 'consultationDate' | 'createdAt' | 'updatedAt'
type SortDirection = 'asc' | 'desc'
type ReportCategory = 'staffWork' | 'interpreterWork' | 'migrantReport'

export default function ConsultationsPage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { t } = useTranslation()
  const labels = useEnumLabels()
  const { data: me, isLoading: meLoading } = useMe()
  const [category, setCategory] = useState<ReportCategory>('interpreterWork')
  const [items, setItems] = useState<Consultation[]>([])
  const [page, setPage] = useState(0)
  const [pageInfo, setPageInfo] = useState<PageInfo | undefined>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [patientQuery, setPatientQuery] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('consultationDate')
  const [direction, setDirection] = useState<SortDirection>('desc')
  const [workLogPage, setWorkLogPage] = useState(0)
  const [showWorkForm, setShowWorkForm] = useState(false)
  const [workDate, setWorkDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [workMemo, setWorkMemo] = useState('')
  const [workTaskLines, setWorkTaskLines] = useState('')
  const [chatLoading, setChatLoading] = useState<string | null>(null)

  async function handleOpenChatWithPatient(patientId: string) {
    setChatLoading(patientId)
    try {
      const res = await chatApi.roomWithPatient(patientId)
      if (res.payload) router.push(`/chat/${res.payload.id}`)
    } catch { /* ignore */ } finally {
      setChatLoading(null)
    }
  }

  const adminFeaturesEnabled = false
  const needsAdminCenter = false
  const showStaffWork = adminFeaturesEnabled && me?.role === 'admin' && category === 'staffWork'
  const showConsultationList = !!me && me.role !== 'admin'

  const sortLabels: Record<SortBy, string> = {
    consultationDate: t.consultation.sort_visit,
    createdAt: t.consultation.sort_created,
    updatedAt: t.consultation.sort_updated,
  }

  const { data: workLogResponse, isLoading: workLogsLoading, error: workLogsError } = useQuery({
    queryKey: queryKeysForWorkLogs(workLogPage),
    queryFn: () => adminApi.workLogs(workLogPage),
    enabled: showStaffWork,
  })
  const workLogs = workLogResponse?.payload ?? []
  const workLogPageInfo = workLogResponse?.pageInfo

  const createWorkLog = useMutation({
    mutationFn: () => adminApi.createWorkLog({
      workDate,
      memo: workMemo.trim(),
      tasks: workTaskLines
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)
        .map(content => ({ content, checked: false })),
    }),
    onSuccess: () => {
      setWorkMemo('')
      setWorkTaskLines('')
      setShowWorkForm(false)
      queryClient.invalidateQueries({ queryKey: ['admin', 'work-logs'] })
    },
  })

  const updateWorkLog = useMutation({
    mutationFn: (log: AdminWorkLog) => adminApi.updateWorkLog(log.id, {
      workDate: log.workDate,
      memo: log.memo ?? '',
      tasks: log.tasks,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'work-logs'] }),
  })

  const deleteWorkLog = useMutation({
    mutationFn: (id: string) => adminApi.deleteWorkLog(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'work-logs'] }),
  })

  useEffect(() => {
    if (adminFeaturesEnabled && me?.role === 'admin') setCategory('staffWork')
  }, [adminFeaturesEnabled, me?.role])

  useEffect(() => {
    setPage(0)
  }, [patientQuery, sortBy, direction, category])

  useEffect(() => {
    if (meLoading) return
    if (needsAdminCenter) {
      setItems([])
      setPageInfo(undefined)
      setError(t.common.admin_center_required)
      setLoading(false)
      return
    }
    if (!showConsultationList) {
      setItems([])
      setPageInfo(undefined)
      setError('')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    consultationApi.list({ page, patientQuery, sortBy, direction })
      .then(cRes => {
        if (!cancelled) {
          setItems(cRes.payload ?? [])
          setPageInfo(cRes.pageInfo)
        }
      })
      .catch(e => {
        if (!cancelled) {
          setItems([])
          setPageInfo(undefined)
          setError(e instanceof Error ? e.message : t.consultation.err_save)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [meLoading, needsAdminCenter, showConsultationList, page, patientQuery, sortBy, direction, t])

  function toggleDirection() {
    setPage(0)
    setDirection(prev => prev === 'desc' ? 'asc' : 'desc')
  }

  function toggleTask(log: AdminWorkLog, index: number) {
    const tasks: AdminWorkLogTask[] = log.tasks.map((task, idx) =>
      idx === index ? { ...task, checked: !task.checked } : task,
    )
    updateWorkLog.mutate({ ...log, tasks })
  }

  function handleDeleteWorkLog(id: string) {
    if (!confirm(t.consultation.work_log_delete_confirm)) return
    deleteWorkLog.mutate(id)
  }

  if (meLoading || (showConsultationList && loading) || (showStaffWork && workLogsLoading)) {
    return <AppShell noPadding><div className="flex justify-center pt-20"><Spinner /></div></AppShell>
  }

  return (
    <AppShell noPadding>
      {/* 헤더 */}
      <div className="bg-white px-4 py-3 border-b border-[#F6F6F6] flex items-center justify-between">
        <h1 className="text-base font-semibold text-[#424242]">{t.consultation.title}</h1>
        {me?.role === 'interpreter' && (
          <Link
            href="/consultations/new"
            className="bg-[#2592FF] text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
          >
            {t.consultation.write}
          </Link>
        )}
      </div>

      {/* 검색 + 정렬 */}
      {showConsultationList && (
        <div className="bg-white px-4 py-3 border-b border-[#EEEEEE] space-y-2">
          <input
            className="w-full bg-[#F5F5F5] rounded-lg px-4 py-2.5 text-base outline-none placeholder:text-[#A0A0A0] text-[#161616]"
            value={patientQuery}
            onChange={e => {
              setPage(0)
              setPatientQuery(e.target.value)
            }}
            placeholder={t.consultation.search_placeholder}
          />
          <div className="flex flex-wrap items-center gap-2">
            {(Object.entries(sortLabels) as [SortBy, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${
                  sortBy === value
                    ? 'border-[#2592FF] bg-[#EAF4FF] text-[#2592FF]'
                    : 'border-[#EEEEEE] text-[#808080] bg-white'
                }`}
                onClick={() => {
                  setPage(0)
                  setSortBy(value)
                }}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className="rounded-lg border border-[#2592FF] bg-[#2592FF] px-3 py-1.5 text-xs font-semibold text-white"
              onClick={toggleDirection}
            >
              {direction === 'desc' ? t.consultation.sort_desc : t.consultation.sort_asc}
            </button>
          </div>
        </div>
      )}

      {/* 목록 */}
      <div className="bg-[#F5F5F5] px-4 py-4 min-h-screen">
        {showStaffWork ? (
          <StaffWorkSection
            workLogs={workLogs}
            page={workLogPage}
            pageInfo={workLogPageInfo}
            showForm={showWorkForm}
            workDate={workDate}
            workMemo={workMemo}
            workTaskLines={workTaskLines}
            saving={createWorkLog.isPending}
            error={createWorkLog.error ?? workLogsError}
            t={t}
            onPageChange={setWorkLogPage}
            onToggleForm={() => setShowWorkForm(prev => !prev)}
            onWorkDateChange={setWorkDate}
            onWorkMemoChange={setWorkMemo}
            onWorkTaskLinesChange={setWorkTaskLines}
            onSubmit={(e) => {
              e.preventDefault()
              createWorkLog.mutate()
            }}
            onToggleTask={toggleTask}
            onDelete={handleDeleteWorkLog}
          />
        ) : error ? (
          <EmptyState message={error} />
        ) : items.length === 0 ? (
          <EmptyState message={t.consultation.empty} />
        ) : (
          <ReportList
            items={items}
            labels={labels}
            page={page}
            pageInfo={pageInfo}
            locale={t.locale}
            t={t}
            onPageChange={setPage}
            isInterpreter={me?.role === 'interpreter'}
            chatLoading={chatLoading}
            onOpenChat={handleOpenChatWithPatient}
          />
        )}
      </div>
    </AppShell>
  )
}

function StaffWorkSection({
  workLogs, page, pageInfo, showForm, workDate, workMemo, workTaskLines,
  saving, error, t, onPageChange, onToggleForm, onWorkDateChange,
  onWorkMemoChange, onWorkTaskLinesChange, onSubmit, onToggleTask, onDelete,
}: {
  workLogs: AdminWorkLog[]
  page: number
  pageInfo?: PageInfo
  showForm: boolean
  workDate: string
  workMemo: string
  workTaskLines: string
  saving: boolean
  error: unknown
  t: ReturnType<typeof useTranslation>['t']
  onPageChange: (page: number) => void
  onToggleForm: () => void
  onWorkDateChange: (value: string) => void
  onWorkMemoChange: (value: string) => void
  onWorkTaskLinesChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  onToggleTask: (log: AdminWorkLog, index: number) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      {showForm && (
        <form onSubmit={onSubmit} className="bg-white rounded-xl px-4 py-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-[#161616] block mb-1">{t.consultation.work_date}</label>
            <input type="date" className="w-full bg-[#F5F5F5] rounded-lg px-4 py-2.5 text-base outline-none text-[#161616]" value={workDate} onChange={e => onWorkDateChange(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium text-[#161616] block mb-1">{t.consultation.work_memo}</label>
            <textarea className="w-full bg-[#F5F5F5] rounded-lg px-4 py-3 text-base outline-none text-[#161616] min-h-20 resize-none" value={workMemo} onChange={e => onWorkMemoChange(e.target.value)} placeholder={t.consultation.work_memo_placeholder} />
          </div>
          <div>
            <label className="text-sm font-medium text-[#161616] block mb-1">{t.consultation.work_tasks}</label>
            <textarea className="w-full bg-[#F5F5F5] rounded-lg px-4 py-3 text-base outline-none text-[#161616] min-h-24 resize-none" value={workTaskLines} onChange={e => onWorkTaskLinesChange(e.target.value)} placeholder={t.consultation.work_tasks_placeholder} />
          </div>
          {!!error && <p className="text-xs text-red-500">{error instanceof Error ? error.message : t.consultation.err_save}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="h-11 rounded-lg bg-[#F0F1F5] text-sm font-medium text-[#494949]" onClick={onToggleForm}>{t.common.cancel}</button>
            <button type="submit" className="h-11 rounded-lg bg-[#2592FF] text-sm font-semibold text-white disabled:opacity-60" disabled={saving}>
              {saving ? t.consultation.saving : t.common.save}
            </button>
          </div>
        </form>
      )}

      {workLogs.length === 0 ? (
        <EmptyState message={t.consultation.work_log_empty} />
      ) : (
        <>
          {workLogs.map(log => (
            <div key={log.id} className="bg-white rounded-xl px-4 py-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-[#161616]">{formatKoreanDate(log.workDate)}</p>
                  {log.memo && <p className="mt-1 whitespace-pre-wrap text-sm text-[#808080]">{log.memo}</p>}
                </div>
                <button type="button" className="text-xs text-red-500 hover:text-red-700" onClick={() => onDelete(log.id)}>
                  {t.common.delete}
                </button>
              </div>
              {log.tasks.length > 0 && (
                <div className="space-y-2">
                  {log.tasks.map((task, index) => (
                    <label key={`${log.id}-${index}`} className="flex items-center gap-2 text-sm text-[#494949]">
                      <input type="checkbox" checked={task.checked} onChange={() => onToggleTask(log, index)} />
                      <span className={task.checked ? 'text-[#A0A0A0] line-through' : ''}>{task.content}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
          {(page > 0 || pageInfo?.hasNext) && (
            <Pagination page={page} pageInfo={pageInfo} t={t} onPageChange={onPageChange} />
          )}
        </>
      )}
    </div>
  )
}

function ReportList({
  items, labels, page, pageInfo, locale, t, onPageChange,
  isInterpreter, chatLoading, onOpenChat,
}: {
  items: Consultation[]
  labels: ReturnType<typeof useEnumLabels>
  page: number
  pageInfo?: PageInfo
  locale: string
  t: ReturnType<typeof useTranslation>['t']
  onPageChange: (page: number) => void
  isInterpreter?: boolean
  chatLoading?: string | null
  onOpenChat?: (patientId: string) => void
}) {
  return (
    <div className="space-y-3">
      {items.map(c => (
        <div key={c.id} className="bg-white rounded-xl px-4 py-4">
          <Link href={`/consultations/${c.id}`} className="block">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-[#161616]">{c.patientName}</p>
                <p className="text-sm text-[#808080] mt-0.5">
                  {formatKoreanDateTime(c.consultationDate)}
                  {c.hospitalName && ` / ${c.hospitalName}`}
                </p>
                <p className="text-xs text-[#A0A0A0] mt-0.5">{labels.issue[c.issueType]}</p>
                <p className="text-xs text-[#A0A0A0] mt-1">
                  {t.consultation.written_by}: {c.createdByName ?? c.interpreterName ?? '-'}
                  {c.createdAt && ` / ${t.consultation.written_at}: ${formatKoreanDateTime(c.createdAt)}`}
                </p>
              </div>
              {c.confirmed && <Badge variant="green">{t.common.confirmed}</Badge>}
            </div>
            {c.nextAppointmentDate && (
              <p className="text-xs text-[#2592FF] mt-2">
                {t.consultation.next_appointment}: {formatKoreanDateTime(c.nextAppointmentDate)}
              </p>
            )}
          </Link>
          {isInterpreter && c.patientId && onOpenChat && (
            <div className="mt-3 flex justify-end border-t border-[#F5F5F5] pt-2">
              <button
                type="button"
                disabled={chatLoading === c.patientId}
                onClick={() => onOpenChat(c.patientId)}
                className="text-xs font-semibold text-[#2592FF] hover:text-blue-700"
              >
                {chatLoading === c.patientId ? '...' : t.chat.open_chat}
              </button>
            </div>
          )}
        </div>
      ))}
      {(page > 0 || pageInfo?.hasNext) && (
        <Pagination page={page} pageInfo={pageInfo} t={t} onPageChange={onPageChange} />
      )}
    </div>
  )
}

function Pagination({
  page, pageInfo, t, onPageChange,
}: {
  page: number
  pageInfo?: PageInfo
  t: ReturnType<typeof useTranslation>['t']
  onPageChange: (page: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <button
        type="button"
        className="bg-white rounded-lg px-3 py-2 text-sm font-medium text-[#494949] disabled:opacity-40"
        disabled={page === 0}
        onClick={() => onPageChange(Math.max(page - 1, 0))}
      >
        {t.common.prev_page}
      </button>
      <span className="text-xs text-[#808080]">{t.common.page_label(page + 1)}</span>
      <button
        type="button"
        className="bg-white rounded-lg px-3 py-2 text-sm font-medium text-[#494949] disabled:opacity-40"
        disabled={!pageInfo?.hasNext}
        onClick={() => onPageChange(page + 1)}
      >
        {t.common.next_page}
      </button>
    </div>
  )
}

function queryKeysForWorkLogs(page: number) {
  return ['admin', 'work-logs', page] as const
}

