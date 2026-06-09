import { GoogleGenerativeAI, SchemaType, type Schema } from '@google/generative-ai'
import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { type BodyPartKey, BODY_PART_KEYS, getBodyPartKey } from '@/lib/bodyPartUtils'

export type { BodyPartKey }

interface BodyPartInput {
  patientComment?: string
  diagnosisContent?: string
  diagnosisNameCode?: string
  department?: string
}

const SYSTEM_PROMPT = `당신은 의료 보고서를 분석하여 가장 관련 있는 신체 부위를 판별하는 AI입니다.

다음 중 반드시 하나만 선택하세요:
- head: 두통, 뇌, 신경계, 어지러움, 두부 질환
- ear: 귀, 이비인후과, 청력, 귀통증, 중이염, 외이도염
- eye: 눈, 안과, 시력, 결막염, 눈 통증
- mouth: 치아, 구강, 치과, 잇몸, 충치, 구강 질환
- chest: 폐, 기관지, 심장, 흉부, 호흡기, 기침, 감기, 천식, 폐렴
- abdomen: 위, 장, 소화기, 간, 췌장, 복통, 위염, 장염, 소화불량
- pelvis: 골반, 산부인과, 비뇨기, 방광, 자궁, 신장, 요로
- vertebrae: 척추, 허리 통증, 목 통증, 관절, 근골격계, 정형외과, 디스크
- arm: 어깨, 팔, 손목, 손, 팔꿈치 통증
- legs: 허벅지, 무릎, 발목, 발, 다리 통증

보고서 내용을 보고 가장 적합한 부위 하나를 JSON으로 반환하세요.`

const RESPONSE_SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    bodyPart: {
      type: SchemaType.STRING,
      description: 'One of: ear, eye, mouth, vertebrae, pelvis, head, chest, abdomen, legs, arm',
    },
  },
  required: ['bodyPart'],
}

function buildText(data: BodyPartInput): string {
  const parts: string[] = []
  if (data.department) parts.push(`진료과: ${data.department}`)
  if (data.patientComment) parts.push(`환자 증상: ${data.patientComment}`)
  if (data.diagnosisNameCode) parts.push(`병명: ${data.diagnosisNameCode}`)
  if (data.diagnosisContent) parts.push(`진단 내용: ${data.diagnosisContent}`)
  return parts.join('\n')
}

function validateKey(raw: string | undefined): BodyPartKey {
  return BODY_PART_KEYS.includes(raw as BodyPartKey) ? (raw as BodyPartKey) : 'vertebrae'
}

async function detectWithGemini(text: string): Promise<BodyPartKey> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY 없음')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      maxOutputTokens: 64,
      temperature: 0.1,
    },
  })
  const result = await model.generateContent(text)
  const parsed = JSON.parse(result.response.text()) as { bodyPart?: string }
  return validateKey(parsed.bodyPart)
}

async function detectWithGroq(text: string): Promise<BodyPartKey> {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY })
  const chat = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    max_tokens: 32,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `다음 보고서 내용에서 신체 부위를 선택해 JSON으로만 답하세요.\n반드시 이 중 하나: ear, eye, mouth, vertebrae, pelvis, head, chest, abdomen, legs, arm\n\n${text}\n\n{"bodyPart":"..."}`,
      },
    ],
    response_format: { type: 'json_object' },
  })
  const parsed = JSON.parse(chat.choices[0]?.message?.content ?? '{}') as { bodyPart?: string }
  return validateKey(parsed.bodyPart)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as BodyPartInput

    const text = buildText(body)
    if (!text.trim()) {
      return NextResponse.json({ bodyPart: 'vertebrae' })
    }

    if (process.env.GEMINI_API_KEY) {
      try {
        const bodyPart = await detectWithGemini(text)
        console.log(`[body-part] Gemini → ${bodyPart}`)
        return NextResponse.json({ bodyPart })
      } catch (e) {
        console.error('[body-part] Gemini 실패:', e instanceof Error ? e.message : e)
      }
    }

    if (process.env.GROQ_API_KEY) {
      try {
        const bodyPart = await detectWithGroq(text)
        console.log(`[body-part] Groq → ${bodyPart}`)
        return NextResponse.json({ bodyPart })
      } catch (e) {
        console.error('[body-part] Groq 실패:', e instanceof Error ? e.message : e)
      }
    }

    // 룰 기반 폴백
    const bodyPart = getBodyPartKey(body)
    console.log(`[body-part] 룰 기반 폴백 → ${bodyPart}`)
    return NextResponse.json({ bodyPart })
  } catch (e) {
    console.error('[body-part] 오류:', e instanceof Error ? e.message : e)
    return NextResponse.json({ bodyPart: 'vertebrae' })
  }
}
