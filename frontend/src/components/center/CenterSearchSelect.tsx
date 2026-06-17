'use client'

import { useEffect, useState } from 'react'
import { centerApi } from '@/lib/api'
import type { Center } from '@/lib/types'
import { useTranslation } from '@/lib/i18n/I18nContext'

type CenterSearchSelectProps = {
  valueName?: string
  disabled?: boolean
  placeholder?: string
  onSelect: (center: Center) => void
  buttonClassName?: string
  valueClassName?: string
  placeholderClassName?: string
  rightIcon?: React.ReactNode
}

export default function CenterSearchSelect({
  valueName,
  disabled,
  placeholder,
  onSelect,
  buttonClassName,
  valueClassName,
  placeholderClassName,
  rightIcon,
}: CenterSearchSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(valueName ?? '')
  const [centers, setCenters] = useState<Center[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return

    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      setError('')
      centerApi.list(query.trim() || undefined)
        .then(res => {
          if (active) setCenters(res.payload ?? [])
        })
        .catch(() => {
          if (active) {
            setCenters([])
            setError(t.common.center_search_failed)
          }
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [open, query, t.common.center_search_failed])

  function close() {
    setOpen(false)
    setQuery(valueName ?? '')
  }

  function selectCenter(center: Center) {
    onSelect(center)
    setOpen(false)
    setQuery(center.name)
  }

  return (
    <>
      <button
        type="button"
        className={buttonClassName ?? 'input flex items-center justify-between gap-3 text-left disabled:bg-gray-50 disabled:text-gray-400'}
        disabled={disabled}
        onClick={() => {
          setQuery(valueName ?? '')
          setOpen(true)
        }}
      >
        <span className={valueName
          ? (valueClassName ?? 'truncate text-gray-800')
          : (placeholderClassName ?? 'truncate text-gray-400')
        }>
          {valueName || placeholder || t.common.center_search}
        </span>
        {rightIcon ?? <span className="flex-shrink-0 text-xs font-medium text-primary-600">{t.common.search}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-800">{t.common.center_search}</h3>
              <button
                type="button"
                className="text-xl leading-none text-gray-400 hover:text-gray-700"
                onClick={close}
                aria-label={t.common.close}
              >
                x
              </button>
            </div>

            <input
              className="input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder || t.login.center_search_placeholder}
              autoFocus
            />

            <div className="mt-3 max-h-72 overflow-y-auto space-y-1">
              {loading ? (
                <p className="py-6 text-center text-xs text-gray-400">{t.common.searching}</p>
              ) : error ? (
                <p className="py-6 text-center text-xs text-red-500">{error}</p>
              ) : centers.length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-400">{t.common.no_result}</p>
              ) : centers.map(center => (
                <button
                  key={center.id}
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-primary-50 hover:text-primary-700"
                  onClick={() => selectCenter(center)}
                >
                  <span className="font-medium">{center.name}</span>
                  {center.address && (
                    <span className="mt-0.5 block truncate text-xs text-gray-400">{center.address}</span>
                  )}
                  {center.phone && (
                    <span className="mt-0.5 block text-xs text-gray-400">{center.phone}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
