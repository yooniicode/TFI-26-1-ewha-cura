import { NextRequest, NextResponse } from 'next/server'

interface TranslateRequest {
  fields: {
    patientComment?: string
    diagnosisContent?: string
    treatmentResult?: string
    medicationInstruction?: string
  }
  targetLang: string
}

interface TranslateResponse {
  patientComment?: string
  diagnosisContent?: string
  treatmentResult?: string
  medicationInstruction?: string
}

const LANG_NAME: Record<string, string> = {
  en: 'English',
  vi: 'Vietnamese',
  zh: 'Chinese (Simplified)',
  km: 'Khmer',
  my: 'Burmese (Myanmar)',
  fil: 'Filipino',
  id: 'Indonesian',
  th: 'Thai',
  ne: 'Nepali',
  mn: 'Mongolian',
  uz: 'Uzbek',
  si: 'Sinhala',
  bn: 'Bengali',
  ur: 'Urdu',
}

function buildPrompt(fields: TranslateRequest['fields'], langName: string): string {
  return `You are a medical translation assistant. Translate the following Korean medical record fields into ${langName}. Keep medical terms accurate. Return ONLY the translated text for each field.

PATIENT_COMMENT: ${fields.patientComment ?? ''}
DIAGNOSIS_CONTENT: ${fields.diagnosisContent ?? ''}
TREATMENT_RESULT: ${fields.treatmentResult ?? ''}
MEDICATION_INSTRUCTION: ${fields.medicationInstruction ?? ''}

Respond in exactly this format:
PATIENT_COMMENT: <translated text or empty>
DIAGNOSIS_CONTENT: <translated text or empty>
TREATMENT_RESULT: <translated text or empty>
MEDICATION_INSTRUCTION: <translated text or empty>`
}

function extractField(text: string, fieldName: string): string | undefined {
  const prefix = `${fieldName}:`
  for (const line of text.split('\n')) {
    if (line.startsWith(prefix)) {
      const value = line.substring(prefix.length).trim()
      return value || undefined
    }
  }
  return undefined
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as TranslateRequest
    const { fields, targetLang } = body

    if (!targetLang || targetLang === 'ko') {
      return NextResponse.json({})
    }

    const langName = LANG_NAME[targetLang]
    if (!langName) {
      return NextResponse.json({ error: '지원하지 않는 언어입니다.' }, { status: 400 })
    }

    const hasContent = fields.patientComment || fields.diagnosisContent
      || fields.treatmentResult || fields.medicationInstruction
    if (!hasContent) {
      return NextResponse.json({})
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.warn('[translate] OPENAI_API_KEY 없음')
      return NextResponse.json({ error: 'API key 없음' }, { status: 503 })
    }

    const prompt = buildPrompt(fields, langName)

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.1,
      }),
    })

    if (!res.ok) {
      console.error(`[translate] OpenAI HTTP ${res.status}`)
      return NextResponse.json({ error: 'AI 번역 실패' }, { status: 502 })
    }

    const data = await res.json() as { choices: { message: { content: string } }[] }
    const raw = data.choices[0]?.message?.content ?? ''

    const result: TranslateResponse = {}
    if (fields.patientComment) result.patientComment = extractField(raw, 'PATIENT_COMMENT')
    if (fields.diagnosisContent) result.diagnosisContent = extractField(raw, 'DIAGNOSIS_CONTENT')
    if (fields.treatmentResult) result.treatmentResult = extractField(raw, 'TREATMENT_RESULT')
    if (fields.medicationInstruction) result.medicationInstruction = extractField(raw, 'MEDICATION_INSTRUCTION')

    return NextResponse.json(result)
  } catch (e) {
    console.error('[translate] 오류:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: '번역 요청 실패' }, { status: 500 })
  }
}
