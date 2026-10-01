import axios from 'axios'
import { z } from 'zod'
import { isAuthenticated, clearAuthState } from '../auth/auth-token'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
  get isUnauthorized() { return this.status === 401 }
  get isForbidden()    { return this.status === 403 }
}

export interface PageInfo {
  page: number
  size: number
  hasNext: boolean
  totalElements: number
  totalPages: number
}

export interface ApiResponse<T> {
  statusCode: number
  isSuccess: boolean
  message: string
  payload?: T
  pageInfo?: PageInfo
}

// 인증은 httpOnly 쿠키로 이뤄진다. baseURL 이 상대경로라 동일 출처(admin 호스트) 요청이며,
// 쿠키는 admin 호스트에만 묶여 사용자 앱과 세션을 공유하지 않는다.
const instance = axios.create({ baseURL: '/api/v1', withCredentials: true })

instance.interceptors.response.use(
  res => res,
  (err) => {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status ?? 0
      // Spring Security는 미인증 요청에 403을 반환하기도 함
      if (status === 401 || (status === 403 && !isAuthenticated())) {
        clearAuthState()
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

  let payload = wrapper.data.payload as T
  if (options?.schema) {
    const parsed = options.schema.safeParse(wrapper.data.payload)
    if (!parsed.success) throw new ApiError('Invalid server response data format.', res.status)
    payload = parsed.data
  }

  return { ...wrapper.data, payload }
}

export const get  = <T>(path: string, schema?: z.ZodType<T>) =>
  request<T>('GET', path, { schema })
export const post = <T>(path: string, data: unknown, schema?: z.ZodType<T>) =>
  request<T>('POST', path, { data, schema })
export const patch = <T>(path: string, data: unknown, schema?: z.ZodType<T>) =>
  request<T>('PATCH', path, { data, schema })
export const del  =<T>(path: string, schema?: z.ZodType<T>) =>
  request<T>('DELETE', path, { schema })
export const put  = <T>(path: string, data: unknown, schema?: z.ZodType<T>) =>
  request<T>('PUT', path, { data, schema })
