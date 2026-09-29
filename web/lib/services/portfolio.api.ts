import {
  activityResponseSchema,
  holdingsResponseSchema,
  reconciliationResponseSchema,
} from '@/lib/api-schemas'
import { apiRequest } from './base.api'

export const getHoldingsApi = () => apiRequest('/api/holdings', { schema: holdingsResponseSchema })

export const getActivityApi = (limit = 50) =>
  apiRequest(`/api/activity?limit=${limit}`, { schema: activityResponseSchema })

export const getReconciliationApi = () =>
  apiRequest('/api/reconciliation', { schema: reconciliationResponseSchema })
