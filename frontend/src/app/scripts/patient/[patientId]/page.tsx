'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import PageHeader from '@/components/interpreter/PageHeader'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { useTTS } from '@/hooks/useTTS'

// ─── 언어 코드 매핑 ────────────────────────────────────────────────────────────
// 새 언어 추가 시 여기에 locale → lang 코드 한 줄 추가
const LOCALE_TO_LANG: Record<string, string> = {
  'ko-KR': 'ko',
  'vi-VN': 'vi',
  'en-US': 'en',
  // 'zh-CN': 'zh',  ← 중국어 추가 예시
  // 'id-ID': 'id',  ← 인도네시아어 추가 예시
  // 'mn-MN': 'mn',  ← 몽골어 추가 예시
}

function getLang(locale: string): string {
  return LOCALE_TO_LANG[locale] ?? locale.split('-')[0]
}

// ─── 신체 부위 ─────────────────────────────────────────────────────────────────

type BodyPartKey =
  | 'head' | 'eye' | 'ear' | 'nose' | 'mouth'
  | 'chest' | 'abdomen' | 'vertebrae' | 'arm' | 'pelvis' | 'legs'

interface BodyPart {
  key: BodyPartKey
  label: string                        // 항상 한국어 (의사용)
  translations: Record<string, string> // lang → 환자 모국어 이름
  src: string
}

const BODY_PARTS: BodyPart[] = [
  { key: 'head',      label: '머리',    src: '/icons/common/body-parts/head.png',
    translations: { vi: 'Đầu', en: 'Head' /* zh: '头部' */ } },
  { key: 'eye',       label: '눈',      src: '/icons/common/body-parts/eye.png',
    translations: { vi: 'Mắt', en: 'Eye' } },
  { key: 'ear',       label: '귀',      src: '/icons/common/body-parts/ear.png',
    translations: { vi: 'Tai', en: 'Ear' } },
  { key: 'nose',      label: '코',      src: '/icons/common/body-parts/nose.png',
    translations: { vi: 'Mũi', en: 'Nose' } },
  { key: 'mouth',     label: '입·목',   src: '/icons/common/body-parts/mouth.png',
    translations: { vi: 'Miệng / Họng', en: 'Mouth / Throat' } },
  { key: 'chest',     label: '가슴',    src: '/icons/common/body-parts/chest.png',
    translations: { vi: 'Ngực', en: 'Chest' } },
  { key: 'abdomen',   label: '배',      src: '/icons/common/body-parts/abdomen.png',
    translations: { vi: 'Bụng', en: 'Abdomen' } },
  { key: 'vertebrae', label: '척추·등', src: '/icons/common/body-parts/vertebrae.png',
    translations: { vi: 'Lưng / Cột sống', en: 'Back / Spine' } },
  { key: 'arm',       label: '팔',      src: '/icons/common/body-parts/arm.png',
    translations: { vi: 'Tay', en: 'Arm / Hand' } },
  { key: 'pelvis',    label: '골반',    src: '/icons/common/body-parts/pelvis.png',
    translations: { vi: 'Hông / Xương chậu', en: 'Pelvis / Hip' } },
  { key: 'legs',      label: '다리',    src: '/icons/common/body-parts/legs.png',
    translations: { vi: 'Chân / Đầu gối', en: 'Leg / Knee' } },
]

// ─── 의료 대사 프레이즈 ────────────────────────────────────────────────────────
// 새 언어 추가: 각 phrase 의 translations 에 { zh: '...' } 처럼 추가만 하면 됨

interface Phrase {
  ko: string                           // 항상 한국어 (의사에게 보여주는 텍스트)
  translations: Record<string, string> // lang → 환자 모국어 번역
}

const PHRASES: Record<BodyPartKey, Phrase[]> = {
  head: [
    { ko: '머리가 아파요',   translations: { vi: 'Tôi bị đau đầu',               en: 'I have a headache' } },
    { ko: '어지러워요',      translations: { vi: 'Tôi bị chóng mặt',             en: 'I feel dizzy' } },
    { ko: '머리를 다쳤어요', translations: { vi: 'Tôi bị chấn thương đầu',       en: 'I injured my head' } },
    { ko: '두통이 심해요',   translations: { vi: 'Tôi bị đau đầu dữ dội',       en: 'My headache is severe' } },
  ],
  eye: [
    { ko: '눈이 아파요',           translations: { vi: 'Mắt tôi bị đau',              en: 'My eye hurts' } },
    { ko: '눈이 잘 안 보여요',     translations: { vi: 'Tôi nhìn không rõ',           en: 'I cannot see well' } },
    { ko: '눈이 충혈됐어요',       translations: { vi: 'Mắt tôi bị đỏ',              en: 'My eye is red' } },
    { ko: '눈에 뭔가 들어갔어요',  translations: { vi: 'Có dị vật trong mắt tôi',    en: 'Something is in my eye' } },
  ],
  ear: [
    { ko: '귀가 아파요',           translations: { vi: 'Tai tôi bị đau',              en: 'My ear hurts' } },
    { ko: '잘 안 들려요',          translations: { vi: 'Tôi nghe không rõ',           en: 'I cannot hear well' } },
    { ko: '귀에서 소리가 나요',    translations: { vi: 'Tai tôi có tiếng ồn',         en: 'There is ringing in my ear' } },
    { ko: '귀에 뭔가 들어갔어요',  translations: { vi: 'Có dị vật trong tai tôi',     en: 'Something is in my ear' } },
  ],
  nose: [
    { ko: '코가 막혔어요',      translations: { vi: 'Mũi tôi bị nghẹt',           en: 'My nose is congested' } },
    { ko: '콧물이 나요',        translations: { vi: 'Tôi bị chảy nước mũi',       en: 'I have a runny nose' } },
    { ko: '코피가 나요',        translations: { vi: 'Tôi bị chảy máu mũi',        en: 'My nose is bleeding' } },
    { ko: '냄새가 안 맡아져요', translations: { vi: 'Tôi không ngửi được mùi',    en: 'I lost my sense of smell' } },
  ],
  mouth: [
    { ko: '목이 아파요',       translations: { vi: 'Họng tôi bị đau',         en: 'My throat hurts' } },
    { ko: '삼키기가 힘들어요', translations: { vi: 'Tôi khó nuốt',            en: 'I have difficulty swallowing' } },
    { ko: '목소리가 안 나요',  translations: { vi: 'Tôi bị mất giọng',        en: 'I lost my voice' } },
    { ko: '입안이 아파요',     translations: { vi: 'Miệng tôi bị đau',        en: 'My mouth hurts' } },
  ],
  chest: [
    { ko: '가슴이 아파요',     translations: { vi: 'Ngực tôi bị đau',              en: 'I have chest pain' } },
    { ko: '숨쉬기가 힘들어요', translations: { vi: 'Tôi khó thở',                  en: 'I have difficulty breathing' } },
    { ko: '심장이 두근거려요', translations: { vi: 'Tim tôi đập nhanh / loạn nhịp', en: 'My heart is racing / palpitating' } },
    { ko: '가슴이 답답해요',   translations: { vi: 'Ngực tôi bị tức',              en: 'My chest feels tight' } },
  ],
  abdomen: [
    { ko: '배가 아파요',     translations: { vi: 'Bụng tôi bị đau',     en: 'I have stomach pain' } },
    { ko: '토할 것 같아요',  translations: { vi: 'Tôi muốn nôn',        en: 'I feel nauseous' } },
    { ko: '설사를 해요',     translations: { vi: 'Tôi bị tiêu chảy',    en: 'I have diarrhea' } },
    { ko: '배가 부어요',     translations: { vi: 'Bụng tôi bị phình',   en: 'My abdomen is swollen' } },
  ],
  vertebrae: [
    { ko: '등이 아파요',         translations: { vi: 'Lưng tôi bị đau',                  en: 'My back hurts' } },
    { ko: '허리가 아파요',       translations: { vi: 'Thắt lưng tôi bị đau',             en: 'My lower back hurts' } },
    { ko: '허리를 다쳤어요',     translations: { vi: 'Tôi bị chấn thương thắt lưng',     en: 'I injured my back' } },
    { ko: '움직이기가 힘들어요', translations: { vi: 'Tôi khó cử động',                  en: 'I have difficulty moving' } },
  ],
  arm: [
    { ko: '팔이 아파요',   translations: { vi: 'Tay tôi bị đau',          en: 'My arm hurts' } },
    { ko: '팔을 다쳤어요', translations: { vi: 'Tôi bị chấn thương tay',  en: 'I injured my arm' } },
    { ko: '팔이 저려요',   translations: { vi: 'Tay tôi bị tê',           en: 'My arm is numb' } },
    { ko: '팔이 부었어요', translations: { vi: 'Tay tôi bị sưng',         en: 'My arm is swollen' } },
  ],
  pelvis: [
    { ko: '골반이 아파요',   translations: { vi: 'Hông tôi bị đau',        en: 'My hip hurts' } },
    { ko: '걷기가 힘들어요', translations: { vi: 'Tôi khó đi lại',         en: 'I have difficulty walking' } },
    { ko: '넘어졌어요',      translations: { vi: 'Tôi bị ngã',             en: 'I fell down' } },
    { ko: '여기를 다쳤어요', translations: { vi: 'Tôi bị thương ở đây',    en: 'I injured this area' } },
  ],
  legs: [
    { ko: '다리가 아파요',   translations: { vi: 'Chân tôi bị đau',          en: 'My leg hurts' } },
    { ko: '다리를 다쳤어요', translations: { vi: 'Tôi bị chấn thương chân',  en: 'I injured my leg' } },
    { ko: '다리가 저려요',   translations: { vi: 'Chân tôi bị tê',           en: 'My leg is numb' } },
    { ko: '무릎이 아파요',   translations: { vi: 'Đầu gối tôi bị đau',      en: 'My knee hurts' } },
  ],
}

// ─── 페이지 ────────────────────────────────────────────────────────────────────

type Step = 'select-part' | 'phrases' | 'show'

export default function ScriptPage() {
  const { patientId } = useParams<{ patientId: string }>()
  const { t } = useTranslation()
  const lang = getLang(t.locale)

  const [step, setStep] = useState<Step>('select-part')
  const [selectedPart, setSelectedPart] = useState<BodyPart | null>(null)
  const [selectedPhrase, setSelectedPhrase] = useState<Phrase | null>(null)
  const { speak, speaking } = useTTS()

  // 현재 언어 번역 추출 (없으면 빈 문자열)
  function getTranslation(phrase: Phrase): string {
    return phrase.translations[lang] ?? phrase.translations['vi'] ?? ''
  }
  function getPartLabel(part: BodyPart): string {
    return part.translations[lang] ?? part.translations['vi'] ?? ''
  }

  // ── 의사에게 보여주기 전체화면 ─────────────────────────────────────────────

  if (step === 'show' && selectedPhrase) {
    const translation = getTranslation(selectedPhrase)
    return (
      <AppShell noPadding>
        <div className="bg-white min-h-screen flex flex-col">
          <div className="px-4 py-3 flex items-center gap-3 border-b border-[#F6F6F6]">
            <button onClick={() => setStep('phrases')} className="w-6 flex items-center justify-center text-gray-400">
              <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
                <path d="M10 2L2 10L10 18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h1 className="flex-1 text-center text-lg font-semibold text-[#161616]">
              {t.medical_script_ui.show_doctor_title}
            </h1>
            <div className="w-6" />
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 gap-8">
            {/* 한국어 — 의사에게 보여주는 텍스트 */}
            <div className="w-full bg-[#F3F9FF] rounded-2xl px-6 py-10 border border-[#D1E8FF]">
              <p className="text-3xl font-bold text-[#161616] leading-relaxed text-center">
                {selectedPhrase.ko}
              </p>
            </div>
            {/* 환자 모국어 번역 */}
            {translation && (
              <div className="w-full bg-[#F5F5F5] rounded-2xl px-6 py-8">
                <p className="text-xl text-[#494949] leading-relaxed text-center">
                  {translation}
                </p>
              </div>
            )}
          </div>

          <div className="px-6 pb-10 pt-4 border-t border-[#EEEEEE] flex gap-3">
            <button
              type="button"
              onClick={() => setStep('phrases')}
              className="flex-1 h-[56px] rounded-2xl bg-[#F0F1F5] text-[#494949] font-semibold text-base hover:bg-[#e4e4e8] transition-colors"
            >
              {t.medical_script_ui.other_script}
            </button>
            {/* TTS 버튼 */}
            <button
              type="button"
              onClick={() => speak(selectedPhrase.ko)}
              className={`w-[56px] h-[56px] rounded-2xl flex items-center justify-center transition-colors shrink-0 ${
                speaking
                  ? 'bg-[#2592FF] text-white'
                  : 'bg-[#F0F1F5] text-[#494949] hover:bg-[#e4e4e8]'
              }`}
              title="한국어로 듣기"
            >
              {speaking ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <img src="/icons/immigrant/medical-script/speak.svg" alt="듣기" width={22} height={22} />
              )}
            </button>
            {/* 전체화면 */}
            <Link
              href={`/scripts/patient/${patientId}/present?ko=${encodeURIComponent(selectedPhrase.ko)}&tr=${encodeURIComponent(translation)}`}
              className="flex-1 h-[56px] rounded-2xl bg-[#2592FF] text-white font-semibold text-base flex items-center justify-center hover:bg-[#1a7ee6] transition-colors"
            >
              {t.medical_script_ui.fullscreen}
            </Link>
          </div>
        </div>
      </AppShell>
    )
  }

  // ── 대사 목록 ─────────────────────────────────────────────────────────────

  if (step === 'phrases' && selectedPart) {
    const phrases = PHRASES[selectedPart.key]
    return (
      <AppShell noPadding>
        <div className="bg-white px-4 py-3 flex items-center gap-3 border-b border-[#F6F6F6]">
          <button onClick={() => setStep('select-part')} className="w-6 flex items-center justify-center text-gray-400">
            <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
              <path d="M10 2L2 10L10 18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-lg font-semibold text-[#161616]">{t.medical_script_ui.title}</h1>
          <div className="w-6" />
        </div>

        <div className="bg-[#F5F5F5] px-4 py-4 min-h-screen">
          {/* 선택된 부위 */}
          <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 mb-4">
            <img src={selectedPart.src} alt="" width={40} height={40} className="object-contain shrink-0" />
            <div>
              <p className="text-base font-bold text-[#161616]">{selectedPart.label}</p>
              {getPartLabel(selectedPart) && (
                <p className="text-sm text-[#808080]">{getPartLabel(selectedPart)}</p>
              )}
            </div>
          </div>

          <p className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wide mb-3">
            {t.medical_script_ui.select_hint}
          </p>
          <div className="space-y-3">
            {phrases.map((phrase, i) => {
              const translation = getTranslation(phrase)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => { setSelectedPhrase(phrase); setStep('show') }}
                  className="w-full text-left bg-white rounded-2xl px-5 py-5 hover:bg-[#f3f9ff] active:bg-[#e8f4ff] hover:shadow-sm transition-all border-2 border-transparent hover:border-[#D1E8FF]"
                >
                  <p className="text-lg font-semibold text-[#161616] leading-snug">{phrase.ko}</p>
                  {translation && (
                    <p className="text-sm text-[#808080] mt-1">{translation}</p>
                  )}
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-[#2592FF] font-medium">
                    <img src="/icons/immigrant/medical-script/speak.svg" alt="" width={16} height={16} />
                    {t.medical_script_ui.show_doctor}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </AppShell>
    )
  }

  // ── 신체 부위 선택 ────────────────────────────────────────────────────────

  return (
    <AppShell noPadding>
      <PageHeader title={t.medical_script_ui.title} />
      <div className="bg-[#F5F5F5] px-4 py-4 pb-32 min-h-screen">
        <p className="text-sm text-[#808080] mb-4">{t.medical_script_ui.subtitle}</p>

        <div className="grid grid-cols-3 gap-3">
          {BODY_PARTS.map(part => {
            const nativeLabel = getPartLabel(part)
            return (
              <button
                key={part.key}
                type="button"
                onClick={() => { setSelectedPart(part); setStep('phrases') }}
                className="flex flex-col items-center gap-2 bg-white rounded-2xl px-3 py-4 hover:bg-[#f3f9ff] active:bg-[#e8f4ff] hover:shadow-sm transition-all border-2 border-transparent hover:border-[#D1E8FF]"
              >
                <img src={part.src} alt={part.label} width={52} height={52} className="object-contain" />
                <span className="text-sm font-semibold text-[#161616]">{part.label}</span>
                {nativeLabel && (
                  <span className="text-[10px] text-[#A0A0A0] leading-tight text-center">{nativeLabel}</span>
                )}
              </button>
            )
          })}
        </div>

        {/* 직접 입력하기 */}
        <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-4 pb-8 pt-4 bg-white border-t border-[#EEEEEE]">
          <Link
            href={`/scripts/patient/${patientId}/custom`}
            className="flex items-center justify-center w-full h-[56px] rounded-2xl bg-[#F0F1F5] text-[#494949] text-base font-semibold gap-2 hover:bg-[#e4e4e8] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            {t.medical_script_ui.custom_write_btn}
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
