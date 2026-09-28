import { z } from 'zod'

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  role: z.enum(['user', 'admin']),
  avatarUrl: z.string().optional(),
  walletAddress: z.string().optional(),
})
export type SessionUser = z.infer<typeof userSchema>

export const userResponseSchema = z.object({ user: userSchema })

const nonNegative = z.number().finite().nonnegative()

export const holdingsSchema = z.object({
  goldGrams: nonNegative,
  silverGrams: nonNegative,
  platinumGrams: nonNegative,
  apxiTokens: nonNegative,
  updatedAt: z.string().nullable(),
})
export const holdingsResponseSchema = z.object({ data: holdingsSchema })

export const activityItemSchema = z.object({
  id: z.string(),
  event: z.string(),
  blockNumber: z.number(),
  txHash: z.string(),
  timestamp: z.string(),
  account: z.string().optional(),
  amount: z.string().optional(),
  reference: z.string().optional(),
})
export type ActivityItem = z.infer<typeof activityItemSchema>
export const activityResponseSchema = z.object({ data: z.array(activityItemSchema) })

export const reconciliationSchema = z.object({
  status: z.enum(['not_configured', 'no_wallet', 'match', 'mismatch', 'unavailable']),
  walletAddress: z.string().optional(),
  offChainGrams: z.number(),
  onChainGrams: z.number().optional(),
  checkedAt: z.string(),
})
export type Reconciliation = z.infer<typeof reconciliationSchema>
export const reconciliationResponseSchema = z.object({ data: reconciliationSchema })
