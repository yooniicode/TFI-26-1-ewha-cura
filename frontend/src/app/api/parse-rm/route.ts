import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

export interface ParsedRmFields {
  diagnosisContent: string
  treatmentResult: string
  medicationInstruction: string
  nextAppointmentDate: string
  department: string
  hospitalName: string
}

const SYSTEM_PROMPT = '당신은 의료 통번역사를 돕는 AI입니다. 실시간 메모(RM)에서 보고서 작성에 필요한 정보만 정확하게 추출합니다. 메모에 없는 내용은 빈 문자열로 남겨두세요.'

const RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    diagnosisContent:      { type: SchemaType.STRING, description: '진단 내용 — 병명, 증상, 소견. 없으면 빈 문자열.' },
    treatmentResult:       { type: SchemaType.STRING, description: '치료 내용 및 처치 결과. 없으면 빈 문자열.' },
    medicationInstruction: { type: SchemaType.STRING, description: '복약 지도 — 약 이름, 용법, 용량, 주의사항. 없으면 빈 문자열.' },
    nextAppointmentDate:   { type: SchemaType.STRING, description: '다음 예약일 YYYY-MM-DD 형식. 없으면 빈 문자열.' },
    department:            { type: SchemaType.STRING, description: '진료과 (예: 피부과, 내과). 없으면 빈 문자열.' },
    hospitalName:          { type: SchemaType.STRING, description: '병원 이름. 없으면 빈 문자열.' },
  },
  required: ['diagnosisContent', 'treatmentResult', 'medicationInstruction', 'nextAppointmentDate', 'department', 'hospitalName'],
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
    diagnosisContent:      parsed.diagnosisContent      ?? '',
    treatmentResult:       parsed.treatmentResult       ?? '',
    medicationInstruction: parsed.medicationInstruction ?? '',
    nextAppointmentDate:   parsed.nextAppointmentDate   ?? '',
    department:            parsed.department            ?? '',
    hospitalName:          parsed.hospitalName          ?? '',
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

형식:
{"diagnosisContent":"...","treatmentResult":"...","medicationInstruction":"...","nextAppointmentDate":"","department":"..."}

RM:
${rmText}`,
      },
    ],
    response_format: { type: 'json_object' },
  })
  const raw = chat.choices[0]?.message?.content ?? '{}'
  const parsed = JSON.parse(raw) as Partial<ParsedRmFields>
  return {
    diagnosisContent:      parsed.diagnosisContent      ?? '',
    treatmentResult:       parsed.treatmentResult       ?? '',
    medicationInstruction: parsed.medicationInstruction ?? '',
    nextAppointmentDate:   parsed.nextAppointmentDate   ?? '',
    department:            parsed.department            ?? '',
    hospitalName:          parsed.hospitalName          ?? '',
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
