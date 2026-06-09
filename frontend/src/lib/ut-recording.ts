import { start, stop } from '@rrweb/browser-client'

const PUBLIC_API_KEY = process.env.NEXT_PUBLIC_RRWEB_PUBLIC_KEY ?? ''

export async function startRecording(role: string): Promise<void> {
  start({
    publicApiKey: PUBLIC_API_KEY,
    meta: { role },
    maskInputOptions: { password: true },
  })
}

export async function stopRecording(): Promise<void> {
  stop(true)
}
