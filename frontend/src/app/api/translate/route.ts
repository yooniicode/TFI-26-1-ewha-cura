import { NextRequest, NextResponse } from 'next/server'

// ─── 단일 레코드 번역 ─────────────────────────────────────────────────────────

interface SingleTranslateRequest {
  fields: {
    patientComment?: string
    diagnosisContent?: string
    treatmentResult?: string
    medicationInstruction?: string
    diagnosisNameCode?: string
  }
  targetLang: string
}

// ─── 배치 번역 (목록용) ────────────────────────────────────────────────────────

interface BatchRecord {
  id: string
  diagnosisNameCode?: string
  diagnosisContent?: string
  patientComment?: string
  treatmentResult?: string
  medicationInstruction?: string
}

interface BatchTranslateRequest {
  records: BatchRecord[]
  targetLang: string
}

interface BatchTranslateResult {
  id: string
  diagnosisNameCode?: string
  diagnosisContent?: string
  patientComment?: string
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

async function callOpenAi(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2048,
      temperature: 0.1,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`)
  const data = await res.json() as { choices: { message: { content: string } }[] }
  return data.choices[0]?.message?.content ?? ''
}

// ─── 단일 번역 ────────────────────────────────────────────────────────────────

function buildSinglePrompt(fields: SingleTranslateRequest['fields'], langName: string): string {
  return `You are a medical translation assistant. Translate the following Korean medical record fields into ${langName}. Keep medical terms accurate. Return ONLY the translated text for each field.

DIAGNOSIS_NAME: ${fields.diagnosisNameCode ?? ''}
PATIENT_COMMENT: ${fields.patientComment ?? ''}
DIAGNOSIS_CONTENT: ${fields.diagnosisContent ?? ''}
TREATMENT_RESULT: ${fields.treatmentResult ?? ''}
MEDICATION_INSTRUCTION: ${fields.medicationInstruction ?? ''}

Respond in exactly this format:
DIAGNOSIS_NAME: <translated text or empty>
PATIENT_COMMENT: <translated text or empty>
DIAGNOSIS_CONTENT: <translated text or empty>
TREATMENT_RESULT: <translated text or empty>
MEDICATION_INSTRUCTION: <translated text or empty>`
}

// ─── 배치 번역 ────────────────────────────────────────────────────────────────

function buildBatchPrompt(records: BatchRecord[], langName: string): string {
  const lines: string[] = [
    `You are a medical translation assistant. Translate ALL records below from Korean into ${langName}. Keep medical terms accurate.`,
    `For each record, output the same record ID and translate only non-empty fields.`,
    `Respond strictly in this format for each record:\n`,
  ]

  for (const r of records) {
    lines.push(`--- RECORD ${r.id}`)
    if (r.diagnosisNameCode) lines.push(`DIAGNOSIS_NAME: ${r.diagnosisNameCode}`)
    if (r.diagnosisContent)  lines.push(`DIAGNOSIS_CONTENT: ${r.diagnosisContent}`)
    if (r.patientComment)    lines.push(`PATIENT_COMMENT: ${r.patientComment}`)
    if (r.treatmentResult)   lines.push(`TREATMENT_RESULT: ${r.treatmentResult}`)
    if (r.medicationInstruction) lines.push(`MEDICATION_INSTRUCTION: ${r.medicationInstruction}`)
  }

  lines.push(`\nOutput format (one block per record, same order):`)
  lines.push(`--- RECORD <id>`)
  lines.push(`DIAGNOSIS_NAME: <translated or omit if not present>`)
  lines.push(`DIAGNOSIS_CONTENT: <translated or omit if not present>`)
  lines.push(`PATIENT_COMMENT: <translated or omit if not present>`)
  lines.push(`TREATMENT_RESULT: <translated or omit if not present>`)
  lines.push(`MEDICATION_INSTRUCTION: <translated or omit if not present>`)

  return lines.join('\n')
}

function parseBatchResponse(raw: string, records: BatchRecord[]): BatchTranslateResult[] {
  const results: BatchTranslateResult[] = []
  // Split by "--- RECORD "
  const blocks = raw.split(/^--- RECORD /m).filter(b => b.trim())

  for (const block of blocks) {
    const lines = block.split('\n')
    const id = lines[0]?.trim()
    if (!id) continue

    const orig = records.find(r => r.id === id)
    if (!orig) continue

    const body = lines.slice(1).join('\n')
    const result: BatchTranslateResult = { id }

    if (orig.diagnosisNameCode)      result.diagnosisNameCode      = extractField(body, 'DIAGNOSIS_NAME')
    if (orig.diagnosisContent)       result.diagnosisContent       = extractField(body, 'DIAGNOSIS_CONTENT')
    if (orig.patientComment)         result.patientComment         = extractField(body, 'PATIENT_COMMENT')
    if (orig.treatmentResult)        result.treatmentResult        = extractField(body, 'TREATMENT_RESULT')
    if (orig.medicationInstruction)  result.medicationInstruction  = extractField(body, 'MEDICATION_INSTRUCTION')

    results.push(result)
  }

  // fallback: records not found in response keep undefined fields
  for (const r of records) {
    if (!results.find(res => res.id === r.id)) {
      results.push({ id: r.id })
    }
  }

  return results
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.warn('[translate] OPENAI_API_KEY 없음')
      return NextResponse.json({ error: 'API key 없음' }, { status: 503 })
    }

    const body = await req.json() as SingleTranslateRequest | BatchTranslateRequest

    // 배치 모드
    if ('records' in body) {
      const { records, targetLang } = body as BatchTranslateRequest
      if (!targetLang || targetLang === 'ko' || !records?.length) {
        return NextResponse.json([])
      }
      const langName = LANG_NAME[targetLang]
      if (!langName) return NextResponse.json([], { status: 400 })

      const prompt = buildBatchPrompt(records, langName)
      const raw = await callOpenAi(prompt, apiKey)
      const results = parseBatchResponse(raw, records)
      return NextResponse.json(results)
    }

    // 단일 모드
    const { fields, targetLang } = body as SingleTranslateRequest
    if (!targetLang || targetLang === 'ko') return NextResponse.json({})

    const langName = LANG_NAME[targetLang]
    if (!langName) return NextResponse.json({ error: '지원하지 않는 언어' }, { status: 400 })

    const hasContent = fields.patientComment || fields.diagnosisContent
      || fields.treatmentResult || fields.medicationInstruction || fields.diagnosisNameCode
    if (!hasContent) return NextResponse.json({})

    const prompt = buildSinglePrompt(fields, langName)
    const raw = await callOpenAi(prompt, apiKey)

    return NextResponse.json({
      diagnosisNameCode:      fields.diagnosisNameCode      ? extractField(raw, 'DIAGNOSIS_NAME')        : undefined,
      patientComment:         fields.patientComment         ? extractField(raw, 'PATIENT_COMMENT')        : undefined,
      diagnosisContent:       fields.diagnosisContent       ? extractField(raw, 'DIAGNOSIS_CONTENT')      : undefined,
      treatmentResult:        fields.treatmentResult        ? extractField(raw, 'TREATMENT_RESULT')       : undefined,
      medicationInstruction:  fields.medicationInstruction  ? extractField(raw, 'MEDICATION_INSTRUCTION') : undefined,
    })
  } catch (e) {
    console.error('[translate] 오류:', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: '번역 요청 실패' }, { status: 500 })
  }
}
