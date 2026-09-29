import { z } from 'zod'
import { userResponseSchema } from '@/lib/api-schemas'
import { apiRequest } from './base.api'

const messageSchema = z.object({ message: z.string() })

export const loginApi = (credentials: { email: string; password: string }) =>
  apiRequest('/user/login', {
    method: 'POST',
    body: credentials,
    schema: userResponseSchema,
    skipRefresh: true,
  })

export const registerApi = (account: { name: string; email: string; gender: string; password: string }) =>
  apiRequest('/user/register', {
    method: 'POST',
    body: account,
    schema: userResponseSchema,
    skipRefresh: true,
  })

export const forgotPasswordApi = (email: string) =>
  apiRequest('/user/password/forgot', {
    method: 'POST',
    body: { email },
    schema: messageSchema,
    skipRefresh: true,
  })

export const resetPasswordApi = (token: string, password: string) =>
  apiRequest(`/user/password/reset/${encodeURIComponent(token)}`, {
    method: 'PUT',
    body: { password },
    schema: userResponseSchema,
    skipRefresh: true,
  })

export const getCurrentUserApi = () => apiRequest('/user/me', { schema: userResponseSchema })

export const logoutApi = () =>
  apiRequest('/user/logout', { method: 'POST', schema: z.unknown(), skipRefresh: true })
