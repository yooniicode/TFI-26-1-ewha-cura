import axios, { type InternalAxiosRequestConfig } from 'axios'
import { z } from 'zod'
import { getAccessToken, clearAccessToken } from '../auth/auth-token'
import type { ApiResponse } from '../types'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
  get isBadRequest()   { return this.status === 400 }
  get isUnauthorized() { return this.status === 401 }
  get isForbidden()    { return this.status === 403 }
  get isNotFound()     { return this.status === 404 }
}

const instance = axios.create({ baseURL: '/api/v1' })

instance.interceptors.request.use(config => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

instance.interceptors.response.use(
  res => res,
  (err) => {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 0
      // 401/403 + 토큰 없음: Spring Security는 미인증 요청에 403을 반환하기도 함
      if (status === 401 || (status === 403 && !getAccessToken())) {
        clearAccessToken()
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
      }
      const message = extractErrorMessage(err.response?.data) ?? err.message
      throw new ApiError(message, status)
    }
    throw err
  },
)

function extractErrorMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined
  const body = data as Record<string, unknown>
  if (typeof body.message === 'string' && body.message.trim()) return body.message
  if (typeof body.error === 'string' && body.error.trim()) return body.error
  if (Array.isArray(body.errors)) {
    const messages = body.errors
      .map(item => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object' && 'message' in item) {
          return String((item as { message?: unknown }).message ?? '')
        }
        return ''
      })
      .filter(Boolean)
    if (messages.length > 0) return messages.join('\n')
  }
  return undefined
}

const wrapperSchema = z.object({
  statusCode: z.number(),
  isSuccess:  z.boolean(),
  message:    z.string(),
  payload:    z.unknown().optional(),
  pageInfo:   z.object({
    page:          z.number(),
    size:          z.number(),
    hasNext:       z.boolean(),
    totalElements: z.number(),
    totalPages:    z.number(),
  }).optional(),
})

async function request<T>(
  method: string,
  path: string,
  options?: { data?: unknown; schema?: z.ZodType<T> },
): Promise<ApiResponse<T>> {
  const res = await instance.request({ method, url: path, data: options?.data })

  const wrapper = wrapperSchema.safeParse(res.data)
  if (!wrapper.success) throw new ApiError('Invalid server response format.', res.status)
  if (!wrapper.data.isSuccess) throw new ApiError(wrapper.data.message, res.status)

  const payload = options?.schema
    ? parsePayload(options.schema, wrapper.data.payload, res.status)
    : wrapper.data.payload as T

  return { ...wrapper.data, payload }
}

function parsePayload<T>(schema: z.ZodType<T>, payload: unknown, status: number): T {
  const parsed = schema.safeParse(payload)
  if (!parsed.success) throw new ApiError('Invalid server response data format.', status)
  return parsed.data
}

export const get   = <T>(path: string, schema?: z.ZodType<T>) =>
  request<T>('GET', path, { schema })
export const post  = <T>(path: string, data: unknown, schema?: z.ZodType<T>) =>
  request<T>('POST', path, { data, schema })
export const put   = <T>(path: string, data: unknown, schema?: z.ZodType<T>) =>
  request<T>('PUT', path, { data, schema })
export const patch = <T>(path: string, data?: unknown, schema?: z.ZodType<T>) =>
  request<T>('PATCH', path, { data, schema })
export const del   = <T>(path: string) =>
  request<T>('DELETE', path)
