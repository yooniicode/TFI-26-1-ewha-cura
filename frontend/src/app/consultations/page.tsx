'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import Badge from '@/components/ui/Badge'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import { adminApi, consultationApi, chatApi } from '@/lib/api'
import type { AdminWorkLog, AdminWorkLogTask, Consultation, PageInfo } from '@/lib/types'
import { useEnumLabels } from '@/lib/i18n/enumLabels'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { useMe } from '@/hooks/useMe'

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

  const categoryLabels: Record<ReportCategory, string> = {
    staffWork: t.consultation.category_staff_work,
    interpreterWork: t.consultation.category_interpreter_work,
    migrantReport: t.consultation.category_migrant_report,
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
    return <AppShell><Spinner /></AppShell>
  }

  return (
    <AppShell>
      <div className="mb-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold">{t.consultation.title}</h1>
            {/* Admin consultation note disabled. */}
            {false && me?.role === 'admin' && (
              <p className="mt-0.5 text-xs text-gray-500">{t.consultation.admin_note}</p>
            )}
          </div>
          {me?.role === 'interpreter' && (
            <Link href="/consultations/new" className="btn-primary text-sm py-1.5 px-3">
              {t.consultation.write}
            </Link>
          )}
          {showStaffWork && (
            <button
              type="button"
              className="btn-primary text-sm py-1.5 px-3"
              onClick={() => setShowWorkForm(prev => !prev)}
            >
              {t.consultation.staff_work_write}
            </button>
          )}
        </div>

        {/* Admin report categories disabled. */}
        {false && me?.role === 'admin' && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(Object.entries(categoryLabels) as [ReportCategory, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  category === value
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
                onClick={() => setCategory(value)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {showConsultationList && (
          <div className="space-y-2 rounded-lg border border-gray-100 bg-white p-3">
            <input
              className="input"
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
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    sortBy === value
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-500'
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
                className="rounded-lg border border-primary-600 bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-700"
                onClick={toggleDirection}
              >
                {direction === 'desc' ? t.consultation.sort_desc : t.consultation.sort_asc}
              </button>
            </div>
          </div>
        )}
      </div>

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
    </AppShell>
  )
}

function StaffWorkSection({
  workLogs,
  page,
  pageInfo,
  showForm,
  workDate,
  workMemo,
  workTaskLines,
  saving,
  error,
  t,
  onPageChange,
  onToggleForm,
  onWorkDateChange,
  onWorkMemoChange,
  onWorkTaskLinesChange,
  onSubmit,
  onToggleTask,
  onDelete,
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
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-100 bg-white p-4">
        <h2 className="text-sm font-semibold">{t.consultation.staff_work_title}</h2>
        <p className="mt-1 text-xs text-gray-500">{t.consultation.staff_work_desc}</p>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="card space-y-3">
          <div>
            <label className="label">{t.consultation.work_date}</label>
            <input type="date" className="input" value={workDate} onChange={e => onWorkDateChange(e.target.value)} required />
          </div>
          <div>
            <label className="label">{t.consultation.work_memo}</label>
            <textarea
              className="input min-h-20"
              value={workMemo}
              onChange={e => onWorkMemoChange(e.target.value)}
              placeholder={t.consultation.work_memo_placeholder}
            />
          </div>
          <div>
            <label className="label">{t.consultation.work_tasks}</label>
            <textarea
              className="input min-h-24"
              value={workTaskLines}
              onChange={e => onWorkTaskLinesChange(e.target.value)}
              placeholder={t.consultation.work_tasks_placeholder}
            />
          </div>
          {!!error && <p className="text-xs text-red-500">{error instanceof Error ? error.message : t.consultation.err_save}</p>}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button type="button" className="btn-secondary" onClick={onToggleForm}>{t.common.cancel}</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? t.consultation.saving : t.common.save}
            </button>
          </div>
        </form>
      )}

      {workLogs.length === 0 ? (
        <EmptyState message={t.consultation.work_log_empty} />
      ) : (
        <div className="space-y-3">
          {workLogs.map(log => (
            <div key={log.id} className="card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{log.workDate}</p>
                  {log.memo && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">{log.memo}</p>}
                </div>
                <button type="button" className="text-xs text-red-500 hover:text-red-700" onClick={() => onDelete(log.id)}>
                  {t.common.delete}
                </button>
              </div>
              {log.tasks.length > 0 && (
                <div className="space-y-2">
                  {log.tasks.map((task, index) => (
                    <label key={`${log.id}-${index}`} className="flex items-center gap-2 text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={task.checked}
                        onChange={() => onToggleTask(log, index)}
                      />
                      <span className={task.checked ? 'text-gray-400 line-through' : ''}>{task.content}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
          {(page > 0 || pageInfo?.hasNext) && (
            <Pagination page={page} pageInfo={pageInfo} t={t} onPageChange={onPageChange} />
          )}
        </div>
      )}
    </div>
  )
}

function ReportList({
  items,
  labels,
  page,
  pageInfo,
  locale,
  t,
  onPageChange,
  isInterpreter,
  chatLoading,
  onOpenChat,
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
      <div className="space-y-2">
        {items.map(c => (
          <div key={c.id} className="card hover:border-primary-200 transition-colors">
            <Link href={`/consultations/${c.id}`} className="block">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{c.patientName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {c.consultationDate}
                    {c.hospitalName && ` / ${c.hospitalName}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{labels.issue[c.issueType]}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {t.consultation.written_by}: {c.createdByName ?? c.interpreterName ?? '-'}
                    {c.createdAt && ` / ${t.consultation.written_at}: ${formatDateTime(c.createdAt, locale)}`}
                  </p>
                </div>
                {c.confirmed
                  ? <Badge variant="green">{t.common.confirmed}</Badge>
                  : <Badge variant="yellow">{t.common.unconfirmed}</Badge>}
              </div>
              {c.nextAppointmentDate && (
                <p className="text-xs text-primary-600 mt-2">
                  {t.consultation.next_appointment}: {c.nextAppointmentDate}
                </p>
              )}
            </Link>
            {isInterpreter && c.patientId && onOpenChat && (
              <div className="mt-2 flex justify-end border-t pt-2">
                <button
                  type="button"
                  disabled={chatLoading === c.patientId}
                  onClick={() => onOpenChat(c.patientId)}
                  className="text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  {chatLoading === c.patientId ? '...' : t.chat.open_chat}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {(page > 0 || pageInfo?.hasNext) && (
        <Pagination page={page} pageInfo={pageInfo} t={t} onPageChange={onPageChange} />
      )}
    </div>
  )
}

function Pagination({
  page,
  pageInfo,
  t,
  onPageChange,
}: {
  page: number
  pageInfo?: PageInfo
  t: ReturnType<typeof useTranslation>['t']
  onPageChange: (page: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        className="btn-secondary px-3 py-1.5 text-sm"
        disabled={page === 0}
        onClick={() => onPageChange(Math.max(page - 1, 0))}
      >
        {t.common.prev_page}
      </button>
      <span className="text-xs text-gray-500">{t.common.page_label(page + 1)}</span>
      <button
        type="button"
        className="btn-secondary px-3 py-1.5 text-sm"
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

function formatDateTime(value: string, locale: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
