import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ZodType } from 'zod'

const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '')

declare module 'axios' {
  interface AxiosRequestConfig {
    // Auth endpoints must not trigger a refresh attempt on 401.
    skipRefresh?: boolean
  }
}

type RetryableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

export type ApiResult<T> =
  | { success: true; status: number; data: T }
  | { success: false; status: number; message: string }

interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  schema: ZodType<T>
  skipRefresh?: boolean
}

/** Shared client. Add interceptors here when a concern applies to every API call. */
export const apiClient = axios.create({
  baseURL: baseUrl,
  withCredentials: true,
})

let refreshInFlight: Promise<boolean> | null = null

const refreshSession = (): Promise<boolean> => {
  refreshInFlight ??= apiClient
    .post('/user/refresh-token', undefined, { skipRefresh: true })
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null
    })
  return refreshInFlight
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableConfig | undefined
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.skipRefresh
    ) {
      original._retry = true
      if (await refreshSession()) {
        return apiClient.request(original)
      }
    }
    return Promise.reject(error)
  },
)

const readBody = (data: unknown): unknown => {
  if (data === '' || data === undefined) return null
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return null
    }
  }
  return data ?? null
}

const failureMessage = (status: number, body: unknown): string => {
  const message = (body as { message?: unknown } | null)?.message
  return typeof message === 'string' ? message : `Request failed with status ${status}`
}

const unreachable = {
  success: false as const,
  status: 0,
  message: 'Cannot reach the server. Check that the API is running.',
}

export async function apiRequest<T>(path: string, options: RequestOptions<T>): Promise<ApiResult<T>> {
  const method = options.method ?? 'GET'

  try {
    const res = await apiClient.request({
      url: path,
      method,
      data: options.body,
      skipRefresh: options.skipRefresh,
      headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    })

    const parsed = options.schema.safeParse(readBody(res.data))
    if (!parsed.success) {
      return { success: false, status: res.status, message: 'Unexpected response from the server' }
    }
    return { success: true, status: res.status, data: parsed.data }
  } catch (error) {
    if (!axios.isAxiosError(error) || !error.response) return unreachable
    const status = error.response.status
    return { success: false, status, message: failureMessage(status, readBody(error.response.data)) }
  }
}
