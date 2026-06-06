'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import PageHeader from '@/components/interpreter/PageHeader'
import { consultationApi } from '@/lib/api'
import { useMe } from '@/hooks/useMe'
import { useTranslation } from '@/lib/i18n/I18nContext'

const SYMPTOM_KEYWORDS = [
  { key: 'head',     label: '머리·두통',   labelVi: 'Đầu / Đau đầu' },
  { key: 'stomach',  label: '복통·소화',   labelVi: 'Bụng / Tiêu hóa' },
  { key: 'breath',   label: '호흡·기침',   labelVi: 'Hô hấp / Ho' },
  { key: 'skin',     label: '피부·발진',   labelVi: 'Da / Phát ban' },
  { key: 'joint',    label: '관절·근육',   labelVi: 'Khớp / Cơ' },
  { key: 'fever',    label: '열·발열',     labelVi: 'Sốt / Nóng' },
  { key: 'eye',      label: '눈·귀·코',    labelVi: 'Mắt / Tai / Mũi' },
  { key: 'pregnancy',label: '임신·출산',   labelVi: 'Thai kỳ / Sinh nở' },
  { key: 'mental',   label: '정신건강',    labelVi: 'Sức khỏe tâm thần' },
  { key: 'checkup',  label: '건강검진',    labelVi: 'Khám sức khỏe' },
  { key: 'dental',   label: '치과',        labelVi: 'Nha khoa' },
  { key: 'other',    label: '기타',        labelVi: 'Khác' },
]

export default function InterpretationRequestPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { data: me } = useMe()

  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
  const [preferredDate, setPreferredDate] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  function toggleKeyword(key: string) {
    setSelectedKeywords(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  async function handleSubmit() {
    if (!me?.entityId) { setError('이주민 프로필이 없습니다. 마이페이지에서 설정해주세요.'); return }
    if (selectedKeywords.length === 0) { setError('증상을 하나 이상 선택해주세요.'); return }
    if (!preferredDate) { setError('희망 날짜를 선택해주세요.'); return }

    setSubmitting(true); setError('')
    try {
      const symptomLabels = selectedKeywords
        .map(k => SYMPTOM_KEYWORDS.find(s => s.key === k)?.label)
        .filter(Boolean)
        .join(', ')
      const patientComment = [
        `[증상] ${symptomLabels}`,
        note.trim() ? `[요청사항] ${note.trim()}` : '',
      ].filter(Boolean).join('\n')

      await consultationApi.request({
        patientId: me.entityId,
        consultationDate: preferredDate,
        issueType: 'MEDICAL',
        processing: 'INTERPRETATION',
        patientComment,
      })
      router.replace('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : '의뢰 제출에 실패했습니다.')
      setSubmitting(false)
    }
  }

  const isVi = t.locale === 'vi-VN'

  return (
    <AppShell noPadding>
      <PageHeader title="통번역 의뢰" />

      <div className="bg-[#F5F5F5] px-4 py-4 pb-32 min-h-screen space-y-4">

        {/* 증상 키워드 */}
        <div className="bg-white rounded-2xl px-5 py-5">
          <p className="text-sm font-bold text-[#161616] mb-1">어디가 불편하신가요?</p>
          <p className="text-xs text-[#A0A0A0] mb-4">Bạn đang bị đau ở đâu?</p>
          <div className="grid grid-cols-3 gap-2">
            {SYMPTOM_KEYWORDS.map(s => {
              const selected = selectedKeywords.includes(s.key)
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => toggleKeyword(s.key)}
                  className={`rounded-2xl px-3 py-3 text-left transition-all border-2 ${
                    selected
                      ? 'border-[#2592FF] bg-[#f3f9ff]'
                      : 'border-[#EEEEEE] bg-white hover:border-[#D1D1D1]'
                  }`}
                >
                  <p className={`text-sm font-semibold ${selected ? 'text-[#2592FF]' : 'text-[#161616]'}`}>
                    {s.label}
                  </p>
                  <p className="text-[10px] text-[#A0A0A0] mt-0.5 leading-tight">{s.labelVi}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* 희망 날짜 */}
        <div className="bg-white rounded-2xl px-5 py-5">
          <p className="text-sm font-bold text-[#161616] mb-1">희망 날짜</p>
          <p className="text-xs text-[#A0A0A0] mb-3">Ngày mong muốn</p>
          <input
            type="date"
            value={preferredDate}
            onChange={e => setPreferredDate(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
            className="w-full bg-[#F5F5F5] rounded-xl px-4 py-3.5 text-base text-[#161616] outline-none border border-[#EEEEEE] focus:border-[#2592FF]"
          />
        </div>

        {/* 요청사항 */}
        <div className="bg-white rounded-2xl px-5 py-5">
          <p className="text-sm font-bold text-[#161616] mb-1">요청사항 (선택)</p>
          <p className="text-xs text-[#A0A0A0] mb-3">Yêu cầu thêm (tùy chọn)</p>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={isVi
              ? 'Ví dụ: Tôi đang uống thuốc cao huyết áp...\nVí dụ: Tôi cần phiên dịch tiếng Việt...'
              : '예) 현재 고혈압 약을 복용 중입니다.\n예) 병원 예약이 오전에 잡혀 있습니다.'}
            rows={4}
            className="w-full bg-[#F5F5F5] rounded-xl px-4 py-3 text-sm text-[#161616] outline-none placeholder:text-[#A0A0A0] resize-none leading-relaxed"
          />
        </div>

        {error && <p className="text-red-500 text-sm px-1">{error}</p>}
      </div>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white border-t border-[#EEEEEE] px-6 pt-4 pb-8">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || selectedKeywords.length === 0 || !preferredDate}
          className="w-full h-[60px] bg-[#2592FF] rounded-2xl text-lg font-bold text-white disabled:opacity-40 hover:bg-[#1a7ee6] transition-colors"
        >
          {submitting ? '의뢰 중...' : '통번역 의뢰하기'}
        </button>
      </div>
    </AppShell>
  )
}
