import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

export interface ParsedRmFields {
  patientComment: string
  diagnosisContent: string
  treatmentResult: string
  medicationInstruction: string
  nextAppointmentDate: string
  department: string
  hospitalName: string
  bodyPart: string
}

const SYSTEM_PROMPT = `당신은 의료 통번역사를 돕는 AI입니다. 실시간 메모(RM)에서 보고서 작성에 필요한 각 필드 정보를 정확하게 추출합니다.

각 필드 정의:
- patientComment: 환자가 호소한 증상, 내원 이유, 환자 요청사항 (예: "복통있어서 내원", "어깨 통증 3일째")
- diagnosisContent: 의사가 내린 진단명, 의사 소견, 권고 검사 (예: "위염 진단", "위내시경 검사 권고")
- treatmentResult: 의사가 지시한 주의사항, 생활습관 지도, 식이 제한, 재검사 권고 (약 복용 방법 제외) (예: "자극적인 음식 피하기", "6개월 후 재검사")
- medicationInstruction: 처방약 이름, 복용 방법, 용량, 복용 기간 (예: "처방약 2주동안 식후 30분 하루 3회 복용")
- nextAppointmentDate: 구체적 날짜(YYYY-MM-DD)만 입력. "6개월 후", "다음 달" 같은 상대적 표현은 빈 문자열
- department: 진료과 (예: 내과, 소화기내과, 정형외과). 명시 없으면 빈 문자열
- hospitalName: 병원 이름. 명시 없으면 빈 문자열
- bodyPart: 메모 전체 내용을 보고 관련 신체 부위를 하나 선택. 반드시 다음 중 하나: ear(귀/이비인후), eye(눈/안과), mouth(치아/구강), vertebrae(척추/허리/관절/정형), pelvis(골반/산부인과/비뇨기), head(두뇌/신경계/두통), chest(폐/심장/호흡기/기침), abdomen(위/장/소화기/복통), legs(다리/무릎/발목), arm(어깨/팔/손목). 판단 불가 시 vertebrae

규칙: 메모에 명시된 내용만 채우고, 없는 내용은 반드시 빈 문자열("")로 남겨두세요. 한 정보를 여러 필드에 중복 입력하지 마세요.

예시:
메모: "복통있어서 내원함. 위염 진단, 위내시경 검사 권고, 처방약 2주동안 식후 30분, 하루 3회 복용, 자극적인 음식 피하기, 6개월 후 재검사 권고"
→ patientComment: "복통으로 내원"
→ diagnosisContent: "위염 진단, 위내시경 검사 권고"
→ treatmentResult: "자극적인 음식 피하기, 6개월 후 재검사 권고"
→ medicationInstruction: "처방약 2주동안 식후 30분, 하루 3회 복용"
→ nextAppointmentDate: ""
→ department: "", hospitalName: ""
→ bodyPart: "abdomen"`

const RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    patientComment:        { type: SchemaType.STRING, description: '환자 주호소/증상/내원 이유. 없으면 빈 문자열.' },
    diagnosisContent:      { type: SchemaType.STRING, description: '의사 진단명 및 소견, 권고 검사. 없으면 빈 문자열.' },
    treatmentResult:       { type: SchemaType.STRING, description: '주의사항, 생활습관 지도, 식이 제한, 재검사 권고 (약 복용법 제외). 없으면 빈 문자열.' },
    medicationInstruction: { type: SchemaType.STRING, description: '처방약 이름, 복용 방법, 용량, 복용 기간. 없으면 빈 문자열.' },
    nextAppointmentDate:   { type: SchemaType.STRING, description: '다음 예약일 YYYY-MM-DD. 구체적 날짜가 없으면 반드시 빈 문자열.' },
    department:            { type: SchemaType.STRING, description: '진료과. 없으면 빈 문자열.' },
    hospitalName:          { type: SchemaType.STRING, description: '병원 이름. 없으면 빈 문자열.' },
    bodyPart:              { type: SchemaType.STRING, description: '신체 부위: ear | eye | mouth | vertebrae | pelvis | head | chest | abdomen | legs | arm' },
  },
  required: ['patientComment', 'diagnosisContent', 'treatmentResult', 'medicationInstruction', 'nextAppointmentDate', 'department', 'hospitalName', 'bodyPart'],
}

// ─── Gemini ──────────────────────────────────────────────────────────────────

async function parseWithGemini(rmText: string): Promise<ParsedRmFields> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY 없음')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      maxOutputTokens: 1024,
      temperature: 0.1,
    },
  })

  const result = await model.generateContent(
    `다음 실시간 메모(RM)에서 보고서 필드를 추출해주세요:\n\n${rmText}`
  )
  const text = result.response.text()
  const parsed = JSON.parse(text) as Partial<ParsedRmFields>
  return {
    patientComment:        parsed.patientComment        ?? '',
    diagnosisContent:      parsed.diagnosisContent      ?? '',
    treatmentResult:       parsed.treatmentResult       ?? '',
    medicationInstruction: parsed.medicationInstruction ?? '',
    nextAppointmentDate:   parsed.nextAppointmentDate   ?? '',
    department:            parsed.department            ?? '',
    hospitalName:          parsed.hospitalName          ?? '',
    bodyPart:              parsed.bodyPart              ?? '',
  }
}

// ─── Groq fallback ───────────────────────────────────────────────────────────

async function parseWithGroq(rmText: string): Promise<ParsedRmFields> {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const chat = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `다음 실시간 메모(RM)에서 보고서 필드를 추출해서 반드시 아래 JSON 형식으로만 답하세요. 다른 말은 하지 마세요.

각 필드 정의 (한 정보를 여러 필드에 중복 입력 금지):
- patientComment: 환자가 호소한 증상, 내원 이유 (예: "복통으로 내원", "어깨 통증 3일째")
- diagnosisContent: 의사 진단명, 소견, 권고 검사 (예: "위염 진단, 위내시경 검사 권고")
- treatmentResult: 주의사항, 생활습관 지도, 식이 제한, 재검사 권고 — 약 복용법 제외 (예: "자극적인 음식 피하기, 6개월 후 재검사")
- medicationInstruction: 처방약 이름, 복용 방법, 용량, 복용 기간 (예: "처방약 2주동안 식후 30분 하루 3회")
- nextAppointmentDate: 구체적 날짜 YYYY-MM-DD만. "6개월 후" 같은 상대 표현은 "" (빈 문자열)
- department: 진료과 (없으면 "")
- hospitalName: 병원명 (없으면 "")
- bodyPart: 메모 전체를 보고 관련 신체 부위 하나 선택. 반드시 다음 중 하나: ear, eye, mouth, vertebrae, pelvis, head, chest, abdomen, legs, arm

형식:
{"patientComment":"...","diagnosisContent":"...","treatmentResult":"...","medicationInstruction":"...","nextAppointmentDate":"","department":"","hospitalName":"","bodyPart":"..."}

RM:
${rmText}`,
      },
    ],
    response_format: { type: 'json_object' },
  })
  const raw = chat.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw) as Partial<ParsedRmFields>
  return {
    patientComment:        parsed.patientComment        ?? '',
    diagnosisContent:      parsed.diagnosisContent      ?? '',
    treatmentResult:       parsed.treatmentResult       ?? '',
    medicationInstruction: parsed.medicationInstruction ?? '',
    nextAppointmentDate:   parsed.nextAppointmentDate   ?? '',
    department:            parsed.department            ?? '',
    hospitalName:          parsed.hospitalName          ?? '',
    bodyPart:              parsed.bodyPart              ?? '',
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

function filledKeys(fields: ParsedRmFields): string[] {
  return (Object.keys(fields) as (keyof ParsedRmFields)[]).filter(k => !!fields[k])
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { rmText?: string }
    const rmText = body.rmText?.trim()
    if (!rmText) {
      console.log('[parse-rm] 빈 입력 — 스킵')
      return NextResponse.json({ fields: null })
    }

    console.log(`[parse-rm] 요청 수신 len=${rmText.length}`)

    // 1순위: Gemini
    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey) {
      try {
        const fields = await parseWithGemini(rmText)
        const filled = filledKeys(fields)
        console.log(`[parse-rm] Gemini 완료 filled=[${filled.join(',')}]`)
        return NextResponse.json({ fields, provider: 'gemini' })
      } catch (e) {
        console.error('[parse-rm] Gemini 실패:', e instanceof Error ? e.message : e)
      }
    } else {
      console.warn('[parse-rm] GEMINI_API_KEY 없음 — Gemini 스킵')
    }

    // 2순위: Groq
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      try {
        const fields = await parseWithGroq(rmText)
        const filled = filledKeys(fields)
        console.log(`[parse-rm] Groq 완료 filled=[${filled.join(',')}]`)
        return NextResponse.json({ fields, provider: 'groq' })
      } catch (e) {
        console.error('[parse-rm] Groq 실패:', e instanceof Error ? e.message : e)
      }
    } else {
      console.warn('[parse-rm] GROQ_API_KEY 없음 — Groq 스킵')
    }

    console.error('[parse-rm] 모든 AI 서비스 실패')
    return NextResponse.json({ fields: null, error: 'AI 서비스를 사용할 수 없습니다.' })
  } catch (e) {
    console.error('[parse-rm] 요청 처리 오류:', e instanceof Error ? e.message : e)
    return NextResponse.json({ fields: null, error: 'RM 분석에 실패했습니다.' })
  }
}
