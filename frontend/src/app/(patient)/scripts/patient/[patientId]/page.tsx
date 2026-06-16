'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import PageHeader from '@/components/ui/PageHeader'
import { useTranslation } from '@/lib/i18n/I18nContext'
import { useTTS } from '@/hooks/useTTS'
import { bookmarkApi, type Bookmark } from '@/lib/api'

const LOCALE_TO_LANG: Record<string, string> = {
  'ko-KR': 'ko',
  'vi-VN': 'vi',
  'en-US': 'en',
  'zh-TW': 'zh',
  'zh-CN': 'zh',
  'id-ID': 'id',
  'th-TH': 'th',
  'ne-NP': 'ne',
  'mn-MN': 'mn',
  'uz-UZ': 'uz',
  'km-KH': 'km',
  'my-MM': 'my',
  'fil-PH': 'fil',
  'si-LK': 'si',
  'bn-BD': 'bn',
  'ur-PK': 'ur',
}

function getLang(locale: string): string {
  return LOCALE_TO_LANG[locale] ?? locale.split('-')[0]
}

function getKoreanSubjectParticle(word: string): string {
  if (!word) return '이'
  const code = word.charCodeAt(word.length - 1)
  if (code >= 0xAC00 && code <= 0xD7A3) {
    return (code - 0xAC00) % 28 > 0 ? '이' : '가'
  }
  return '이'
}

type BodyPartKey =
  | 'head' | 'eye' | 'nose' | 'mouth' | 'chest'
  | 'arm' | 'abdomen' | 'pelvis' | 'legs' | 'vertebrae' | 'ear'

interface BodyPart {
  key: BodyPartKey
  label: string
  translations: Record<string, string>
  src: string
}

type SituationKey = 'cold' | 'allergy' | 'pregnancy' | 'womens_health'

interface Situation {
  key: SituationKey
  label: string
  src: string
  translations: Record<string, string>
}

const SITUATIONS: Situation[] = [
  { key: 'cold',         label: '감기',     src: '/icons/immigrant/medical-script/situation/cold.svg',      translations: { vi: 'Cảm cúm', en: 'Cold / Flu', zh: '感冒', id: 'Flu', th: 'หวัด', ne: 'रुघाखोकी', mn: 'Томуу', uz: 'Gripp', km: 'គ្រុនផ្តាសាយ', my: 'တုပ်ကွေး', fil: 'Sipon / Trangkaso', si: 'සෙම්ප්‍රතිශ්‍යාව', bn: 'সর্দি-কাশি', ur: 'نزلہ' } },
  { key: 'allergy',      label: '알레르기', src: '/icons/immigrant/medical-script/situation/allergy.svg',  translations: { vi: 'Dị ứng', en: 'Allergy', zh: '过敏', id: 'Alergi', th: 'ภูมิแพ้', ne: 'एलर्जी', mn: 'Харшил', uz: 'Allergiya', km: 'អាឡែស្ស', my: 'ဓာတ်မတည့်ခြင်း', fil: 'Allergy', si: 'අසාත්මිකතාව', bn: 'অ্যালার্জি', ur: 'الرجی' } },
  { key: 'pregnancy',    label: '임신·출산', src: '/icons/immigrant/medical-script/situation/pregnancy.svg', translations: { vi: 'Mang thai & Sinh nở', en: 'Pregnancy & Childbirth', zh: '妊娠·分娩', id: 'Kehamilan & Melahirkan', th: 'ตั้งครรภ์ & คลอดบุตร', ne: 'गर्भावस्था र प्रसव', mn: 'Жирэмслэлт & Төрөлт', uz: 'Homiladorlik & Tug\'ish', km: 'មានផ្ទៃពោះ & សម្រាល', my: 'ကိုယ်ဝန်ဆောင် & မွေးဖွားခြင်း', fil: 'Pagbubuntis & Panganganak', si: 'ගර්භනී & දරු ප්‍රසූතිය', bn: 'গর্ভাবস্থা ও প্রসব', ur: 'حمل اور ولادت' } },
  { key: 'womens_health', label: '여성 건강', src: '/icons/immigrant/medical-script/situation/womens-health.svg', translations: { vi: 'Sức khỏe phụ nữ', en: "Women's Health", zh: '女性健康', id: 'Kesehatan Wanita', th: 'สุขภาพผู้หญิง', ne: 'महिला स्वास्थ्य', mn: 'Эмэгтэйчүүдийн эрүүл мэнд', uz: 'Ayollar salomatligi', km: 'សុខភាពស្ត្រី', my: 'အမျိုးသမီးကျန်းမာရေး', fil: 'Kalusugan ng Babae', si: 'කාන්තා සෞඛ්‍යය', bn: 'নারী স্বাস্থ্য', ur: 'خواتین کی صحت' } },
]

const SITUATION_PHRASES: Record<SituationKey, Phrase[]> = {
  cold: [
    { ko: '열이 나요',    translations: { vi: 'Tôi bị sốt',          en: 'I have a fever' } },
    { ko: '기침이 나요',  translations: { vi: 'Tôi bị ho',           en: 'I have a cough' } },
    { ko: '목이 아파요',  translations: { vi: 'Họng tôi đau',        en: 'My throat hurts' } },
    { ko: '몸이 떨려요',  translations: { vi: 'Tôi bị run người',    en: 'I am shivering' } },
    { ko: '코가 막혀요',  translations: { vi: 'Mũi tôi bị nghẹt',   en: 'My nose is congested' } },
  ],
  allergy: [
    { ko: '이 약에 알레르기가 있어요',        translations: { vi: 'Tôi bị dị ứng với thuốc này',   en: 'I am allergic to this medication' } },
    { ko: '두드러기가 났어요',               translations: { vi: 'Tôi bị nổi mề đay',             en: 'I have hives' } },
    { ko: '가려워요',                       translations: { vi: 'Tôi bị ngứa',                   en: 'I feel itchy' } },
    { ko: '숨쉬기 힘들어요',                translations: { vi: 'Tôi khó thở',                   en: 'I have difficulty breathing' } },
    { ko: '먹으면 안 되는 음식이 있어요',    translations: { vi: 'Tôi có thực phẩm không thể ăn', en: 'There are foods I cannot eat' } },
  ],
  pregnancy: [
    { ko: '임신했어요',        translations: { vi: 'Tôi đang mang thai',              en: 'I am pregnant' } },
    { ko: '임신 몇 주예요',    translations: { vi: 'Thai được mấy tuần rồi',          en: 'How many weeks pregnant am I' } },
    { ko: '배가 아파요',       translations: { vi: 'Bụng tôi đau',                   en: 'I have stomach pain' } },
    { ko: '정기 검진이에요',   translations: { vi: 'Đây là kiểm tra định kỳ',        en: 'This is a regular checkup' } },
    { ko: '출산 예정일이에요', translations: { vi: 'Đây là ngày dự sinh của tôi',    en: 'This is my due date' } },
  ],
  womens_health: [
    { ko: '생리통이 심해요',             translations: { vi: 'Tôi bị đau bụng kinh dữ dội',     en: 'I have severe menstrual cramps' } },
    { ko: '생리가 불규칙해요',           translations: { vi: 'Kinh nguyệt của tôi không đều',   en: 'My period is irregular' } },
    { ko: '분비물이 이상해요',           translations: { vi: 'Có dịch tiết bất thường',          en: 'I have abnormal discharge' } },
    { ko: '생리가 멈췄어요',             translations: { vi: 'Kinh nguyệt của tôi đã ngừng',    en: 'My period has stopped' } },
    { ko: '산부인과 진료를 받고 싶어요', translations: { vi: 'Tôi muốn khám phụ khoa',          en: 'I want to see a gynecologist' } },
  ],
}

const BODY_PARTS: BodyPart[] = [
  { key: 'head',      label: '머리',  src: '/icons/immigrant/medical-script/body/head.svg',    translations: { vi: 'Đầu', en: 'Head', zh: '头', id: 'Kepala', th: 'ศีรษะ', ne: 'टाउको', mn: 'Толгой', uz: 'Bosh', km: 'ក្បាល', my: 'ဦးခေါင်း', fil: 'Ulo', si: 'හිස', bn: 'মাথা', ur: 'سر' } },
  { key: 'eye',       label: '눈',    src: '/icons/immigrant/medical-script/body/eyes.svg',    translations: { vi: 'Mắt', en: 'Eye', zh: '眼睛', id: 'Mata', th: 'ตา', ne: 'आँखा', mn: 'Нүд', uz: 'Ko\'z', km: 'ភ្នែក', my: 'မျက်စိ', fil: 'Mata', si: 'ඇස', bn: 'চোখ', ur: 'آنکھ' } },
  { key: 'nose',      label: '코',    src: '/icons/immigrant/medical-script/body/nose.svg',    translations: { vi: 'Mũi', en: 'Nose', zh: '鼻子', id: 'Hidung', th: 'จมูก', ne: 'नाक', mn: 'Хамар', uz: 'Burun', km: 'ច្រមុះ', my: 'နှာခေါင်း', fil: 'Ilong', si: 'නාසය', bn: 'নাক', ur: 'ناک' } },
  { key: 'mouth',     label: '입/목', src: '/icons/immigrant/medical-script/body/lip.svg',     translations: { vi: 'Miệng / Họng', en: 'Mouth / Throat', zh: '嘴/喉咙', id: 'Mulut / Tenggorokan', th: 'ปาก / คอ', ne: 'मुख/घाँटी', mn: 'Ам/Хоолой', uz: 'Og\'iz / Tomoq', km: 'មាត់/បំពង់ក', my: 'ပါး/လည်ချောင်း', fil: 'Bibig / Lalamunan', si: 'කට/උගුර', bn: 'মুখ/গলা', ur: 'منہ/گلا' } },
  { key: 'chest',     label: '가슴',  src: '/icons/immigrant/medical-script/body/chest.svg',   translations: { vi: 'Ngực', en: 'Chest', zh: '胸部', id: 'Dada', th: 'หน้าอก', ne: 'छाती', mn: 'Цээж', uz: 'Ko\'krak', km: 'ដើមទ្រូង', my: 'ရင်ဘတ်', fil: 'Dibdib', si: 'පපු', bn: 'বুক', ur: 'سینہ' } },
  { key: 'arm',       label: '팔',    src: '/icons/immigrant/medical-script/body/arm.svg',     translations: { vi: 'Tay', en: 'Arm', zh: '手臂', id: 'Lengan', th: 'แขน', ne: 'हात', mn: 'Гар', uz: 'Qo\'l', km: 'ដៃ', my: 'လက်မောင်း', fil: 'Braso', si: 'අත', bn: 'হাত', ur: 'بازو' } },
  { key: 'abdomen',   label: '배',    src: '/icons/immigrant/medical-script/body/stomach.svg', translations: { vi: 'Bụng', en: 'Abdomen', zh: '腹部', id: 'Perut', th: 'ท้อง', ne: 'पेट', mn: 'Гэдэс', uz: 'Qorin', km: 'ក្រពះ', my: 'ဝမ်းဗိုက်', fil: 'Tiyan', si: 'බඩ', bn: 'পেট', ur: 'پیٹ' } },
  { key: 'pelvis',    label: '골반',  src: '/icons/immigrant/medical-script/body/pelvis.svg',  translations: { vi: 'Hông', en: 'Pelvis', zh: '骨盆', id: 'Panggul', th: 'กระดูกเชิงกราน', ne: 'कूल्हा', mn: 'Аарцаг', uz: 'Tos', km: 'ត្រគៀក', my: 'တင်ပါး', fil: 'Balakang', si: 'ශ්‍රෝණිය', bn: 'কোমর', ur: 'کولہا' } },
  { key: 'legs',      label: '다리',  src: '/icons/immigrant/medical-script/body/leg.svg',     translations: { vi: 'Chân', en: 'Leg', zh: '腿', id: 'Kaki', th: 'ขา', ne: 'खुट्टा', mn: 'Хөл', uz: 'Oyoq', km: 'ជើង', my: 'ခြေထောက်', fil: 'Binti', si: 'කකුල', bn: 'পা', ur: 'پاؤں' } },
  { key: 'vertebrae', label: '척추',  src: '/icons/immigrant/medical-script/body/spine.svg',   translations: { vi: 'Cột sống', en: 'Spine', zh: '脊椎', id: 'Tulang belakang', th: 'กระดูกสันหลัง', ne: 'मेरुदण्ड', mn: 'Нурuu', uz: 'Umurtqa', km: 'ឆ្អឹងខ្នង', my: 'ကျောရိုး', fil: 'Gulugod', si: 'කොඳු ඇට', bn: 'মেরুদণ্ড', ur: 'ریڑھ کی ہڈی' } },
  { key: 'ear',       label: '귀',    src: '/icons/immigrant/medical-script/body/ear.svg',     translations: { vi: 'Tai', en: 'Ear', zh: '耳朵', id: 'Telinga', th: 'หู', ne: 'कान', mn: 'Чих', uz: 'Quloq', km: '귀ស', my: 'နား', fil: 'Tainga', si: 'කණ', bn: 'কান', ur: 'کان' } },
]

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

type Step = 'select-part' | 'phrases'
type ScriptTab = 'body' | 'situation'

export default function ScriptPage() {
  const { patientId } = useParams<{ patientId: string }>()
  const { t } = useTranslation()
  const lang = getLang(t.locale)

  const [step, setStep] = useState<Step>('select-part')
  const [activeTab, setActiveTab] = useState<ScriptTab>('body')
  const [selectedPart, setSelectedPart] = useState<BodyPart | null>(null)
  const [selectedSituation, setSelectedSituation] = useState<Situation | null>(null)
  const [selectedPhrase, setSelectedPhrase] = useState<Phrase | null>(null)
  const [bookmarkedPhrases, setBookmarkedPhrases] = useState<Bookmark[]>([])
  const { speak, speaking } = useTTS()

  useEffect(() => {
    bookmarkApi.list().then(res => setBookmarkedPhrases(res.payload ?? [])).catch(() => {})
  }, [])

  function toggleBookmark(phrase: Phrase, translatedText: string) {
    const already = bookmarkedPhrases.some(p => p.koText === phrase.ko)
    if (already) {
      setBookmarkedPhrases(prev => prev.filter(p => p.koText !== phrase.ko))
      bookmarkApi.delete(phrase.ko).catch(() => {
        bookmarkApi.list().then(res => setBookmarkedPhrases(res.payload ?? [])).catch(() => {})
      })
    } else {
      const optimistic: Bookmark = { id: '', koText: phrase.ko, translatedText }
      setBookmarkedPhrases(prev => [...prev, optimistic])
      bookmarkApi.save(phrase.ko, translatedText).then(res => {
        setBookmarkedPhrases(prev => prev.map(p => p.koText === phrase.ko ? (res.payload ?? p) : p))
      }).catch(() => {
        setBookmarkedPhrases(prev => prev.filter(p => p.koText !== phrase.ko))
      })
    }
  }

  function isBookmarked(phrase: Phrase): boolean {
    return bookmarkedPhrases.some(p => p.koText === phrase.ko)
  }

  function getTranslation(item: { translations: Record<string, string> }): string {
    return item.translations[lang] ?? item.translations['en'] ?? item.translations['vi'] ?? ''
  }

  if (step === 'phrases' && (selectedPart || selectedSituation)) {
    const isBodyTab = !!selectedPart
    const phrases = isBodyTab
      ? PHRASES[selectedPart!.key]
      : SITUATION_PHRASES[selectedSituation!.key]
    const currentLabel = isBodyTab ? selectedPart!.label : selectedSituation!.label
    const currentLabelInLang = isBodyTab
      ? getTranslation(selectedPart!)
      : getTranslation(selectedSituation!)
    const phraseTitle = isBodyTab
      ? `${currentLabel}${getKoreanSubjectParticle(currentLabel)} 아플 때 쓸 수 있는 표현이에요`
      : `${currentLabel} 관련 표현이에요`

    const handleBackFromPhrases = () => {
      setStep('select-part')
      setSelectedPart(null)
      setSelectedSituation(null)
    }

    return (
      <AppShell noPadding>
        <PageHeader title={t.medical_script_ui.title} onBack={handleBackFromPhrases} />

        <div className="bg-white px-4 pb-10 min-h-screen">
          <div className="flex flex-col gap-1 pt-4 pb-6">
            <p className="text-[24px] font-semibold text-[#161616] leading-[1.4]">{phraseTitle}</p>
            <p className="text-[16px] text-[#808080] leading-[1.4] whitespace-pre-line">
              {'표현을 들으며 따라 말해보거나,\n필요한 문장을 의사나 간호사에게 직접 보여주세요.'}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {phrases.map((phrase, i) => (
              <div
                key={i}
                onClick={() => setSelectedPhrase(phrase)}
                className="w-full bg-white border border-[#eee] rounded-[16px] p-4 flex flex-row items-start justify-between gap-4 cursor-pointer active:opacity-70 transition-opacity"
              >
                <div className="flex flex-col gap-2 flex-1 min-w-0 pointer-events-none">
                  <p className="text-[20px] font-semibold text-[#2592ff] leading-[1.4]">{phrase.ko}</p>
                  {getTranslation(phrase) && (
                    <p className="text-[14px] font-medium text-[#161616] leading-[1.4]">{getTranslation(phrase)}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); toggleBookmark(phrase, getTranslation(phrase)) }}
                  className={`shrink-0 mt-0.5 transition-all duration-150 active:scale-90 active:text-[#2592FF] ${
                    isBookmarked(phrase) ? 'text-[#2592FF]' : 'text-[#161616]'
                  }`}
                  aria-label="북마크"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill={isBookmarked(phrase) ? 'currentColor' : 'none'}
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {selectedPhrase && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
            <div className="flex flex-col items-end gap-[8px] w-full max-w-[370px]">
              {/* 닫기 버튼 */}
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

              <div className="bg-[#f3f9ff] border border-[#eee] rounded-[16px] p-[16px] flex flex-col gap-[8px] w-full">
                {/* 문구 카드 */}
                <div className="bg-white border border-[#eee] rounded-[20px] p-[16px] flex flex-col gap-[24px]">
                  <div className="flex flex-col gap-[8px]">
                    <p className="text-[24px] font-semibold text-[#2592ff] leading-[1.4]">
                      {selectedPhrase.ko}
                    </p>
                    {getTranslation(selectedPhrase) && (
                      <p className="text-[16px] font-medium text-[#494949] leading-[1.4]">
                        {getTranslation(selectedPhrase)}
                      </p>
                    )}
                  </div>
                  {/* 아이콘: 북마크 → 스피커 */}
                  <div className="flex items-center gap-[12px]">
                    <button
                      type="button"
                      onClick={() => toggleBookmark(selectedPhrase, getTranslation(selectedPhrase))}
                      className={`w-[28px] h-[28px] flex items-center justify-center transition-all duration-150 active:scale-90 active:text-[#2592FF] ${
                        isBookmarked(selectedPhrase) ? 'text-[#2592FF]' : 'text-[#161616]'
                      }`}
                      aria-label="북마크"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill={isBookmarked(selectedPhrase) ? 'currentColor' : 'none'}
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => speak(selectedPhrase.ko)}
                      className={`w-[28px] h-[28px] flex items-center justify-center transition-all duration-150 active:scale-90 active:text-[#2592FF] ${
                        speaking ? 'text-[#2592FF]' : 'text-[#161616]'
                      }`}
                      aria-label="듣기"
                    >
                      {speaking ? (
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                          <path d="M18 6L20 4M18 18L20 20M18 12H21M4 16H5C5.55228 16 6 15.5523 6 15V9C6 8.44772 5.55228 8 5 8H4C2.89543 8 2 8.89543 2 10V14C2 15.1046 2.89543 16 4 16ZM6.55279 7.72361L12.5528 4.72361C13.2177 4.39116 14 4.87465 14 5.61803V18.382C14 19.1253 13.2177 19.6088 12.5528 19.2764L6.55279 16.2764C6.214 16.107 6 15.7607 6 15.382V8.61803C6 8.23926 6.214 7.893 6.55279 7.72361Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      ) : (
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                          <path d="M18 9.99996V14M21 6.99996V17M4 16H5C5.55228 16 6 15.5522 6 15V8.99996C6 8.44767 5.55228 7.99996 5 7.99996H4C2.89543 7.99996 2 8.89539 2 9.99996V14C2 15.1045 2.89543 16 4 16ZM6.55279 7.72356L12.5528 4.72356C13.2177 4.39111 14 4.87461 14 5.61799V18.3819C14 19.1253 13.2177 19.6088 12.5528 19.2763L6.55279 16.2763C6.214 16.107 6 15.7607 6 15.3819V8.61799C6 8.23922 6.214 7.89295 6.55279 7.72356Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* 이미지 카드 */}
                <div className="w-full h-[270px] rounded-[20px] bg-white overflow-hidden flex items-center justify-center">
                  {isBodyTab ? (
                    <img
                      src={`/icons/common/body-parts/${selectedPart!.key}.png`}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <img
                      src={selectedSituation!.src}
                      alt=""
                      className="w-24 h-24 object-contain"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </AppShell>
    )
  }

  return (
    <AppShell noPadding>
      <PageHeader
        title={t.medical_script_ui.title}
        rightAction={
          <Link href="/scripts/saved" aria-label="저장한 대본">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M17 3H7C5.9 3 5 3.9 5 5V21L12 18L19 21V5C19 3.9 18.1 3 17 3Z"
                stroke="#161616"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        }
      />

      <div className="bg-white px-4 pb-32">
        <div className="flex flex-col gap-1 pt-4 pb-5">
          <p className="text-[24px] font-semibold text-[#161616] leading-[1.4]">어디가 아프신가요?</p>
          <p className="text-[16px] text-[#808080] leading-[1.4]">아픈 부위를 선택하면 바로 쓸 수 있는 표현을 보여드려요</p>
        </div>

        {/* 탭 switcher */}
        <div className="flex bg-[#f7f7f7] rounded-[10px] p-0 mb-4 overflow-hidden">
          <button
            type="button"
            onClick={() => setActiveTab('body')}
            className={`group flex flex-1 items-center justify-center gap-1 px-4 py-4 rounded-[10px] transition-colors ${
              activeTab === 'body' ? 'bg-[#f3f9ff]' : 'bg-transparent'
            }`}
          >
            <span className={`shrink-0 transition-colors duration-150 group-active:text-[#2592FF] ${
              activeTab === 'body' ? 'text-[#2592FF]' : 'text-[#808080]'
            }`}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M16.3346 4.66668C16.3346 5.95532 15.2899 7.00001 14.0013 7.00001C12.7127 7.00001 11.668 5.95532 11.668 4.66668C11.668 3.37801 12.7127 2.33334 14.0013 2.33334C15.2899 2.33334 16.3346 3.37801 16.3346 4.66668Z" fill="currentColor"/>
                <path d="M10.7578 8.74966H17.2393C18.0186 8.74966 18.545 9.25944 18.877 9.82779C19.206 10.3911 19.4118 11.1146 19.5459 11.8122C19.8161 13.2183 19.832 14.7226 19.832 15.1667C19.832 15.4887 19.5711 15.7495 19.249 15.7497C18.9268 15.7497 18.665 15.4888 18.665 15.1667C18.665 14.736 18.6487 13.3237 18.4004 12.0319C18.3056 11.5386 18.1838 11.1006 18.0361 10.7516L16.915 10.9792V24.4997C16.915 24.8131 16.6676 25.0706 16.3545 25.0827C16.0413 25.0947 15.774 24.8571 15.75 24.5446L15.167 16.9616C15.1658 16.9461 15.165 16.9311 15.165 16.9167V16.3336H12.832V16.9167L12.8301 16.9616L12.2471 24.5446C12.223 24.8571 11.9558 25.0947 11.6426 25.0827C11.3296 25.0705 11.082 24.813 11.082 24.4997V10.9792L9.96191 10.7516C9.81423 11.1007 9.69149 11.5384 9.59668 12.0319C9.34837 13.3237 9.33203 14.736 9.33203 15.1667C9.33203 15.4887 9.07106 15.7495 8.74902 15.7497C8.42684 15.7497 8.16504 15.4888 8.16504 15.1667C8.16504 14.7226 8.18095 13.2183 8.45117 11.8122C8.58522 11.1146 8.79114 10.3911 9.12012 9.82779C9.45208 9.25947 9.97853 8.74972 10.7578 8.74966Z" fill="currentColor" stroke="currentColor" strokeWidth="1.16667"/>
              </svg>
            </span>
            <span className={`text-[20px] font-semibold leading-[1.4] whitespace-nowrap ${
              activeTab === 'body' ? 'text-[#161616]' : 'text-[#808080]'
            }`}>여기가 아파요</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('situation')}
            className={`group flex flex-1 items-center justify-center gap-1 px-4 py-4 rounded-[10px] transition-colors ${
              activeTab === 'situation' ? 'bg-[#f3f9ff]' : 'bg-transparent'
            }`}
          >
            <span className={`shrink-0 transition-colors duration-150 group-active:text-[#2592FF] ${
              activeTab === 'situation' ? 'text-[#2592FF]' : 'text-[#808080]'
            }`}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M19 4H5C3.34315 4 2 5.34315 2 7C2 8.65685 3.34315 10 5 10H7C7.55228 10 8 10.4477 8 11V12.7929C8 13.2383 8.53857 13.4614 8.85355 13.1464L11.7071 10.2929C11.8946 10.1054 12.149 10 12.4142 10H19C20.6569 10 22 8.65685 22 7C22 5.34315 20.6569 4 19 4Z" fill="currentColor"/>
                <path d="M5 13C3.34315 13 2 14.3431 2 16C2 17.6569 3.34315 19 5 19H11.5858C11.851 19 12.1054 19.1054 12.2929 19.2929L15.1464 22.1464C15.4614 22.4614 16 22.2383 16 21.7929V20C16 19.4477 16.4477 19 17 19H19C20.6569 19 22 17.6569 22 16C22 14.3431 20.6569 13 19 13H14M5 4H19C20.6569 4 22 5.34315 22 7C22 8.65685 20.6569 10 19 10H12.4142C12.149 10 11.8946 10.1054 11.7071 10.2929L8.85355 13.1464C8.53857 13.4614 8 13.2383 8 12.7929V11C8 10.4477 7.55228 10 7 10H5C3.34315 10 2 8.65685 2 7C2 5.34315 3.34315 4 5 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </span>
            <span className={`text-[20px] font-semibold leading-[1.4] whitespace-nowrap ${
              activeTab === 'situation' ? 'text-[#161616]' : 'text-[#808080]'
            }`}>이럴 때 아파요</span>
          </button>
        </div>

        {/* 몸 부위별 그리드 */}
        {activeTab === 'body' && (
          <div className="grid grid-cols-3 gap-4">
            {BODY_PARTS.map(part => {
              const translatedLabel = getTranslation(part)
              return (
                <button
                  key={part.key}
                  type="button"
                  onClick={() => { setSelectedPart(part); setStep('phrases') }}
                  className="flex flex-col items-center gap-1 bg-white border border-[#eee] rounded-[16px] py-3 px-5 overflow-hidden active:opacity-70 transition-opacity"
                >
                  <img src={part.src} alt="" width={32} height={32} className="shrink-0" />
                  <p className="text-[18px] text-[#161616] leading-[1.4] whitespace-nowrap">{part.label}</p>
                  {translatedLabel && translatedLabel !== part.label && (
                    <p className="text-[12px] text-[#808080] leading-[1.2] whitespace-nowrap">{translatedLabel}</p>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* 상황별 그리드 */}
        {activeTab === 'situation' && (
          <div className="grid grid-cols-2 gap-4">
            {SITUATIONS.map(situation => {
              const translatedLabel = getTranslation(situation)
              return (
                <button
                  key={situation.key}
                  type="button"
                  onClick={() => { setSelectedSituation(situation); setStep('phrases') }}
                  className="flex flex-col items-center gap-1 bg-white border border-[#eee] rounded-[16px] py-3 px-5 overflow-hidden active:opacity-70 transition-opacity"
                >
                  <img src={situation.src} alt="" width={32} height={32} className="shrink-0" />
                  <p className="text-[18px] text-[#161616] leading-[1.4] whitespace-nowrap">{situation.label}</p>
                  {translatedLabel && translatedLabel !== situation.label && (
                    <p className="text-[12px] text-[#808080] leading-[1.2] whitespace-nowrap">{translatedLabel}</p>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-[402px] mx-auto px-4 pb-8 pt-4 bg-white border-t border-[#EEEEEE]">
        <Link
          href={`/scripts/patient/${patientId}/custom`}
          className="flex items-center justify-center w-full h-[56px] rounded-2xl bg-[#F0F1F5] text-[#494949] text-base font-semibold gap-2 active:opacity-70 transition-opacity"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          {t.medical_script_ui.custom_write_btn}
        </Link>
      </div>
    </AppShell>
  )
}
