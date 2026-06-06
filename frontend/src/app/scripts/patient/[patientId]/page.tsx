'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import PageHeader from '@/components/interpreter/PageHeader'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { useTTS } from '@/hooks/useTTS'

// ─── 언어 코드 매핑 ────────────────────────────────────────────────────────────
const LOCALE_TO_LANG: Record<string, string> = {
  'ko-KR': 'ko',
  'vi-VN': 'vi',
  'en-US': 'en',
}

function getLang(locale: string): string {
  return LOCALE_TO_LANG[locale] ?? locale.split('-')[0]
}

// ─── 부위 이름에 맞는 조사(이/가) ─────────────────────────────────────────────
function getParticle(label: string): string {
  const code = label.charCodeAt(label.length - 1)
  return (code - 0xAC00) % 28 !== 0 ? '이' : '가'
}

// ─── 신체 부위 ─────────────────────────────────────────────────────────────────
type BodyPartKey =
  | 'head' | 'eye' | 'nose' | 'mouth' | 'chest'
  | 'arm' | 'abdomen' | 'pelvis' | 'legs' | 'vertebrae' | 'ear'

interface BodyPart {
  key: BodyPartKey
  label: string
  translations: Record<string, string>
  src: string
}

const BODY_PARTS: BodyPart[] = [
  { key: 'head',      label: '머리',  src: '/icons/immigrant/medical-script/body/head.svg',    translations: { vi: 'Đầu', en: 'Head' } },
  { key: 'eye',       label: '눈',    src: '/icons/immigrant/medical-script/body/eyes.svg',    translations: { vi: 'Mắt', en: 'Eye' } },
  { key: 'nose',      label: '코',    src: '/icons/immigrant/medical-script/body/nose.svg',    translations: { vi: 'Mũi', en: 'Nose' } },
  { key: 'mouth',     label: '입/목', src: '/icons/immigrant/medical-script/body/lip.svg',     translations: { vi: 'Miệng / Họng', en: 'Mouth / Throat' } },
  { key: 'chest',     label: '가슴',  src: '/icons/immigrant/medical-script/body/chest.svg',   translations: { vi: 'Ngực', en: 'Chest' } },
  { key: 'arm',       label: '팔',    src: '/icons/immigrant/medical-script/body/arm.svg',     translations: { vi: 'Tay', en: 'Arm' } },
  { key: 'abdomen',   label: '배',    src: '/icons/immigrant/medical-script/body/stomach.svg', translations: { vi: 'Bụng', en: 'Abdomen' } },
  { key: 'pelvis',    label: '골반',  src: '/icons/immigrant/medical-script/body/pelvis.svg',  translations: { vi: 'Hông', en: 'Pelvis' } },
  { key: 'legs',      label: '다리',  src: '/icons/immigrant/medical-script/body/leg.svg',     translations: { vi: 'Chân', en: 'Leg' } },
  { key: 'vertebrae', label: '척추',  src: '/icons/immigrant/medical-script/body/spine.svg',   translations: { vi: 'Cột sống', en: 'Spine' } },
  { key: 'ear',       label: '귀',    src: '/icons/immigrant/medical-script/body/ear.svg',     translations: { vi: 'Tai', en: 'Ear' } },
]

// ─── 의료 표현 ─────────────────────────────────────────────────────────────────
interface Phrase {
  ko: string
  translations: Record<string, string>
}

const PHRASES: Record<BodyPartKey, Phrase[]> = {
  head: [
    { ko: '머리가 아파요',   translations: { vi: 'Tôi bị đau đầu',               en: 'I have a headache' } },
    { ko: '어지러워요',      translations: { vi: 'Tôi bị chóng mặt',             en: 'I feel dizzy' } },
    { ko: '머리를 다쳤어요', translations: { vi: 'Tôi bị chấn thương đầu',       en: 'I injured my head' } },
    { ko: '두통이 심해요',   translations: { vi: 'Tôi bị đau đầu dữ dội',       en: 'My headache is severe' } },
  ],
  eye: [
    { ko: '눈이 아파요',          translations: { vi: 'Mắt tôi bị đau',           en: 'My eye hurts' } },
    { ko: '눈이 잘 안 보여요',    translations: { vi: 'Tôi nhìn không rõ',         en: 'I cannot see well' } },
    { ko: '눈이 충혈됐어요',      translations: { vi: 'Mắt tôi bị đỏ',            en: 'My eye is red' } },
    { ko: '눈에 뭔가 들어갔어요', translations: { vi: 'Có dị vật trong mắt tôi', en: 'Something is in my eye' } },
  ],
  ear: [
    { ko: '귀가 아파요',          translations: { vi: 'Tai tôi bị đau',           en: 'My ear hurts' } },
    { ko: '잘 안 들려요',         translations: { vi: 'Tôi nghe không rõ',         en: 'I cannot hear well' } },
    { ko: '귀에서 소리가 나요',   translations: { vi: 'Tai tôi có tiếng ồn',       en: 'There is ringing in my ear' } },
    { ko: '귀에 뭔가 들어갔어요', translations: { vi: 'Có dị vật trong tai tôi', en: 'Something is in my ear' } },
  ],
  nose: [
    { ko: '코가 막혔어요',      translations: { vi: 'Mũi tôi bị nghẹt',        en: 'My nose is congested' } },
    { ko: '콧물이 나요',        translations: { vi: 'Tôi bị chảy nước mũi',    en: 'I have a runny nose' } },
    { ko: '코피가 나요',        translations: { vi: 'Tôi bị chảy máu mũi',     en: 'My nose is bleeding' } },
    { ko: '냄새가 안 맡아져요', translations: { vi: 'Tôi không ngửi được mùi', en: 'I lost my sense of smell' } },
  ],
  mouth: [
    { ko: '목이 아파요',       translations: { vi: 'Họng tôi bị đau',  en: 'My throat hurts' } },
    { ko: '삼키기가 힘들어요', translations: { vi: 'Tôi khó nuốt',     en: 'I have difficulty swallowing' } },
    { ko: '목소리가 안 나요',  translations: { vi: 'Tôi bị mất giọng', en: 'I lost my voice' } },
    { ko: '입안이 아파요',     translations: { vi: 'Miệng tôi bị đau', en: 'My mouth hurts' } },
  ],
  chest: [
    { ko: '가슴이 아파요',     translations: { vi: 'Ngực tôi bị đau',               en: 'I have chest pain' } },
    { ko: '숨쉬기가 힘들어요', translations: { vi: 'Tôi khó thở',                   en: 'I have difficulty breathing' } },
    { ko: '심장이 두근거려요', translations: { vi: 'Tim tôi đập nhanh / loạn nhịp', en: 'My heart is racing' } },
    { ko: '가슴이 답답해요',   translations: { vi: 'Ngực tôi bị tức',               en: 'My chest feels tight' } },
  ],
  abdomen: [
    { ko: '배가 아파요',    translations: { vi: 'Bụng tôi bị đau',   en: 'I have stomach pain' } },
    { ko: '토할 것 같아요', translations: { vi: 'Tôi muốn nôn',      en: 'I feel nauseous' } },
    { ko: '설사를 해요',    translations: { vi: 'Tôi bị tiêu chảy',  en: 'I have diarrhea' } },
    { ko: '배가 부어요',    translations: { vi: 'Bụng tôi bị phình', en: 'My abdomen is swollen' } },
  ],
  vertebrae: [
    { ko: '등이 아파요',         translations: { vi: 'Lưng tôi bị đau',              en: 'My back hurts' } },
    { ko: '허리가 아파요',       translations: { vi: 'Thắt lưng tôi bị đau',         en: 'My lower back hurts' } },
    { ko: '허리를 다쳤어요',     translations: { vi: 'Tôi bị chấn thương thắt lưng', en: 'I injured my back' } },
    { ko: '움직이기가 힘들어요', translations: { vi: 'Tôi khó cử động',              en: 'I have difficulty moving' } },
  ],
  arm: [
    { ko: '팔이 아파요',   translations: { vi: 'Tay tôi bị đau',         en: 'My arm hurts' } },
    { ko: '팔을 다쳤어요', translations: { vi: 'Tôi bị chấn thương tay', en: 'I injured my arm' } },
    { ko: '팔이 저려요',   translations: { vi: 'Tay tôi bị tê',          en: 'My arm is numb' } },
    { ko: '팔이 부었어요', translations: { vi: 'Tay tôi bị sưng',        en: 'My arm is swollen' } },
  ],
  pelvis: [
    { ko: '골반이 아파요',   translations: { vi: 'Hông tôi bị đau',     en: 'My hip hurts' } },
    { ko: '걷기가 힘들어요', translations: { vi: 'Tôi khó đi lại',      en: 'I have difficulty walking' } },
    { ko: '넘어졌어요',      translations: { vi: 'Tôi bị ngã',          en: 'I fell down' } },
    { ko: '여기를 다쳤어요', translations: { vi: 'Tôi bị thương ở đây', en: 'I injured this area' } },
  ],
  legs: [
    { ko: '다리가 아파요',   translations: { vi: 'Chân tôi bị đau',         en: 'My leg hurts' } },
    { ko: '다리를 다쳤어요', translations: { vi: 'Tôi bị chấn thương chân', en: 'I injured my leg' } },
    { ko: '다리가 저려요',   translations: { vi: 'Chân tôi bị tê',          en: 'My leg is numb' } },
    { ko: '무릎이 아파요',   translations: { vi: 'Đầu gối tôi bị đau',     en: 'My knee hurts' } },
  ],
}

// ─── 페이지 ────────────────────────────────────────────────────────────────────
type Step = 'select-part' | 'phrases'

export default function ScriptPage() {
  const { patientId } = useParams<{ patientId: string }>()
  const { t } = useTranslation()
  const lang = getLang(t.locale)

  const [step, setStep] = useState<Step>('select-part')
  const [selectedPart, setSelectedPart] = useState<BodyPart | null>(null)
  const [selectedPhrase, setSelectedPhrase] = useState<Phrase | null>(null)
  const { speak, speaking } = useTTS()

  function getTranslation(phrase: Phrase): string {
    return phrase.translations[lang] ?? phrase.translations['vi'] ?? ''
  }

  // ── 대사 목록 + 모달 오버레이 ────────────────────────────────────────────────
  if (step === 'phrases' && selectedPart) {
    const phrases = PHRASES[selectedPart.key]
    const particle = getParticle(selectedPart.label)
    const phraseTitle = `${selectedPart.label}${particle} 아플 때 쓸 수 있는 표현이에요`

    return (
      <AppShell noPadding>
        <PageHeader title="의료대본" onBack={() => setStep('select-part')} />

        <div className="bg-white px-4 pb-10 min-h-screen">
          {/* 타이틀 */}
          <div className="flex flex-col gap-1 pt-4 pb-6">
            <p className="text-[24px] font-semibold text-[#161616] leading-[1.4]">{phraseTitle}</p>
            <div className="text-[16px] text-[#808080] leading-[1.4]">
              <p>표현을 들으며 따라 말해보거나,</p>
              <p>필요한 문장을 의사나 간호사에게 직접 보여주세요.</p>
            </div>
          </div>

          {/* 표현 목록 */}
          <div className="flex flex-col gap-4">
            {phrases.map((phrase, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedPhrase(phrase)}
                className="w-full text-left bg-white border border-[#eee] rounded-[16px] p-4 flex flex-col gap-2 active:opacity-70 transition-opacity"
              >
                <p className="text-[20px] font-semibold text-[#2592ff] leading-[1.4]">{phrase.ko}</p>
                <p className="text-[14px] text-[#161616] leading-[1.4]">{getTranslation(phrase)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 표현 상세 모달 오버레이 (Figma 957:2295) */}
        {selectedPhrase && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="flex flex-col items-end gap-2 w-full max-w-[370px]">
              {/* X 닫기 버튼 */}
              <button
                type="button"
                onClick={() => setSelectedPhrase(null)}
                className="w-6 h-6 flex items-center justify-center shrink-0"
                aria-label="닫기"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1L13 13M13 1L1 13" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>

              {/* 카드 */}
              <div className="bg-[#f3f9ff] border border-[#eee] rounded-[16px] p-4 flex flex-col gap-2 w-full">
                {/* 텍스트 + 스피크 카드 */}
                <div className="bg-white border border-[#eee] rounded-[20px] p-4 flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <p className="text-[24px] font-semibold text-[#2592ff] text-center leading-[1.4]">
                      {selectedPhrase.ko}
                    </p>
                    <p className="text-[16px] text-[#494949] leading-[1.4]">
                      {getTranslation(selectedPhrase)}
                    </p>
                  </div>
                  {/* 스피크 버튼 */}
                  <button
                    type="button"
                    onClick={() => speak(selectedPhrase.ko)}
                    className="bg-[#f0f1f5] rounded-full p-1 flex items-center justify-center w-7 h-7"
                    aria-label="듣기"
                  >
                    {speaking ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="#161616">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                      </svg>
                    ) : (
                      <img src="/icons/immigrant/medical-script/speak.svg" alt="" width={16} height={16} />
                    )}
                  </button>
                </div>

                {/* 신체 부위 이미지 */}
                <div className="w-full h-[200px] rounded-[20px] bg-[#f0f1f5] flex items-center justify-center overflow-hidden">
                  <img
                    src={selectedPart.src}
                    alt=""
                    className="w-28 h-28 object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    )
  }

  // ── 신체 부위 선택 (Figma 1032:2687) ─────────────────────────────────────────
  return (
    <AppShell noPadding>
      <PageHeader title="의료대본" />

      <div className="bg-white px-4 pb-32">
        {/* 타이틀 */}
        <div className="flex flex-col gap-1 pt-4 pb-6">
          <p className="text-[24px] font-semibold text-[#161616] leading-[1.4]">어디가 아프신가요?</p>
          <p className="text-[16px] text-[#808080] leading-[1.4]">
            아픈 부위를 선택하면 바로 쓸 수 있는 표현을 보여드려요
          </p>
        </div>

        {/* 부위 그리드 */}
        <div className="grid grid-cols-3 gap-4">
          {BODY_PARTS.map(part => (
            <button
              key={part.key}
              type="button"
              onClick={() => { setSelectedPart(part); setStep('phrases') }}
              className="flex flex-col items-center gap-1 bg-white border border-[#eee] rounded-[16px] py-3 px-5 overflow-hidden active:opacity-70 transition-opacity"
            >
              <img src={part.src} alt="" width={32} height={32} className="shrink-0" />
              <p className="text-[18px] text-[#161616] leading-[1.4] whitespace-nowrap">{part.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 직접 입력하기 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-4 pb-8 pt-4 bg-white border-t border-[#EEEEEE]">
        <Link
          href={`/scripts/patient/${patientId}/custom`}
          className="flex items-center justify-center w-full h-[56px] rounded-2xl bg-[#F0F1F5] text-[#494949] text-base font-semibold gap-2 active:opacity-70 transition-opacity"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          직접 입력하기
        </Link>
      </div>
    </AppShell>
  )
}
