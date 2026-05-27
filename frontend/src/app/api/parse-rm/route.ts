import Anthropic from '@anthropic-ai/sdk'
import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'

export interface ParsedRmFields {
  diagnosisContent: string
  treatmentResult: string
  medicationInstruction: string
  nextAppointmentDate: string
  department: string
}

const TOOL_SCHEMA = {
  name: 'extract_report_fields',
  description: '의료 통번역 실시간 메모에서 보고서 필드를 추출합니다.',
  input_schema: {
    type: 'object' as const,
    properties: {
      diagnosisContent: {
        type: 'string',
        description: '진단 내용 — 병명, 증상, 소견. 없으면 빈 문자열.',
      },
      treatmentResult: {
        type: 'string',
        description: '치료 내용 및 처치 결과. 없으면 빈 문자열.',
      },
      medicationInstruction: {
        type: 'string',
        description: '복약 지도 — 약 이름, 용법, 용량, 주의사항. 없으면 빈 문자열.',
      },
      nextAppointmentDate: {
        type: 'string',
        description: '다음 예약일 YYYY-MM-DD 형식. 없으면 빈 문자열.',
      },
      department: {
        type: 'string',
        description: '진료과 (예: 피부과, 내과). 없으면 빈 문자열.',
      },
    },
    required: ['diagnosisContent', 'treatmentResult', 'medicationInstruction', 'nextAppointmentDate', 'department'],
  },
}

const SYSTEM_PROMPT = '당신은 의료 통번역사를 돕는 AI입니다. 실시간 메모(RM)에서 보고서 작성에 필요한 정보만 정확하게 추출합니다. 메모에 없는 내용은 빈 문자열로 남겨두세요.'

async function parseWithClaude(rmText: string): Promise<ParsedRmFields> {
  const apiKey = process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY
  const client = new Anthropic({ apiKey })
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [TOOL_SCHEMA],
    tool_choice: { type: 'any' as const },
    messages: [{ role: 'user', content: `다음 실시간 메모(RM)에서 보고서 필드를 추출해주세요:\n\n${rmText}` }],
  })
  const toolUse = message.content.find(b => b.type === 'tool_use')
  if (!toolUse || toolUse.type !== 'tool_use') throw new Error('No tool use in response')
  return toolUse.input as ParsedRmFields
}

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
    diagnosisContent: parsed.diagnosisContent ?? '',
    treatmentResult: parsed.treatmentResult ?? '',
    medicationInstruction: parsed.medicationInstruction ?? '',
    nextAppointmentDate: parsed.nextAppointmentDate ?? '',
    department: parsed.department ?? '',
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { rmText?: string }
    const rmText = body.rmText?.trim()

    if (!rmText) {
      return NextResponse.json({ fields: null })
    }

    // Claude 시도 → 실패 시 Groq fallback
    const claudeKey = process.env.ANTHROPIC_API_KEY ?? process.env.CLAUDE_API_KEY
    if (claudeKey && claudeKey !== '여기에_API_키_입력' && claudeKey !== 'your-claude-api-key') {
      try {
        const fields = await parseWithClaude(rmText)
        return NextResponse.json({ fields, provider: 'claude' })
      } catch (e) {
        console.error('[parse-rm] Claude 실패:', e instanceof Error ? e.message : e)
      }
    } else {
      console.log('[parse-rm] Claude 키 없음 또는 placeholder')
    }

    const groqKey = process.env.GROQ_API_KEY
    if (groqKey && groqKey !== '여기에_Groq_API_키_입력') {
      try {
        const fields = await parseWithGroq(rmText)
        console.log('[parse-rm] Groq 성공:', JSON.stringify(fields))
        return NextResponse.json({ fields, provider: 'groq' })
      } catch (e) {
        console.error('[parse-rm] Groq 실패:', e instanceof Error ? e.message : e)
      }
    } else {
      console.log('[parse-rm] Groq 키 없음 또는 placeholder. GROQ_API_KEY=', groqKey?.slice(0, 8))
    }

    return NextResponse.json({ fields: null, error: 'AI 서비스를 사용할 수 없습니다.' })
  } catch (e) {
    console.error('[parse-rm] 요청 처리 오류:', e instanceof Error ? e.message : e)
    return NextResponse.json({ fields: null, error: 'RM 분석에 실패했습니다.' })
  }
}
