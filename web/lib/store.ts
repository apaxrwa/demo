'use client'

import { create } from 'zustand'
import type { ActivityItem, Reconciliation, SessionUser } from '@/lib/api-schemas'
import { getCurrentUserApi, logoutApi } from '@/lib/services/auth.api'
import { getActivityApi, getHoldingsApi, getReconciliationApi } from '@/lib/services/portfolio.api'

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'
export type SessionStatus = 'checking' | 'authenticated' | 'anonymous'

// Types
export interface MetalPrice {
  gold: number
  silver: number
  platinum: number
  lastUpdated: Date
}

export interface UserHolding {
  goldGrams: number
  silverGrams: number
  platinumGrams: number
  apxiTokens: number
}

export interface VaultData {
  totalGoldGrams: number
  totalSilverGrams: number
  totalPlatinumGrams: number
  totalTokensMinted: number
  lastAuditDate: Date
  verificationStatus: 'verified' | 'pending' | 'syncing'
}

export interface ZakatCalculation {
  totalAssetValue: number
  nisabThreshold: number
  zakatDue: number
  isAboveNisab: boolean
}

export interface AuditLog {
  id: string
  timestamp: Date
  event: string
  details: string
  txHash: string
}

interface APAXStore {
  // Session
  user: SessionUser | null
  sessionStatus: SessionStatus
  setUser: (user: SessionUser) => void
  checkSession: () => Promise<void>
  logout: () => Promise<void>

  // Metal Prices (Mock data with live simulation)
  metalPrices: MetalPrice
  setMetalPrices: (prices: MetalPrice) => void
  
  // User Holdings
  userHoldings: UserHolding
  holdingsStatus: LoadStatus
  holdingsError: string | null
  setUserHoldings: (holdings: UserHolding) => void
  fetchHoldings: () => Promise<void>

  // On-chain activity and reconciliation
  auditSource: 'sample' | 'chain'
  fetchActivity: () => Promise<void>
  reconciliation: Reconciliation | null
  reconciliationStatus: LoadStatus
  fetchReconciliation: () => Promise<void>
  
  // Vault Data
  vaultData: VaultData
  setVaultData: (data: VaultData) => void
  
  // Audit Logs
  auditLogs: AuditLog[]
  addAuditLog: (log: AuditLog) => void
  
  // Zakat
  zakatCalculation: ZakatCalculation | null
  calculateZakat: () => void
  
  // UI State
  activeView: 'dashboard' | 'por' | 'zakat' | 'redemption' | 'sharia'
  setActiveView: (view: 'dashboard' | 'por' | 'zakat' | 'redemption' | 'sharia') => void
}

// Initial mock data
const initialMetalPrices: MetalPrice = {
  gold: 2342.50,
  silver: 27.85,
  platinum: 1024.30,
  lastUpdated: new Date()
}

const emptyHoldings: UserHolding = {
  goldGrams: 0,
  silverGrams: 0,
  platinumGrams: 0,
  apxiTokens: 0
}

const ACTIVITY_LABELS: Record<string, string> = {
  Minted: 'Token Mint',
  RedemptionRequested: 'Redemption Request',
  RedemptionSettled: 'Redemption Settled',
  RedemptionCancelled: 'Redemption Cancelled',
  ComplianceRegistryUpdated: 'Compliance Registry Set',
  Paused: 'Contract Paused',
  Unpaused: 'Contract Resumed',
}

const shortHash = (value: string) =>
  value.length > 14 ? `${value.slice(0, 6)}...${value.slice(-4)}` : value

const toAuditLog = (item: ActivityItem): AuditLog => {
  const parts = [
    item.amount ? `${item.amount} APXG` : null,
    item.account ? `account ${shortHash(item.account)}` : null,
    item.reference ? `ref ${shortHash(item.reference)}` : null,
  ].filter(Boolean)
  return {
    id: item.id,
    timestamp: new Date(item.timestamp),
    event: ACTIVITY_LABELS[item.event] ?? item.event,
    details: parts.length ? parts.join(' | ') : `Block #${item.blockNumber}`,
    txHash: shortHash(item.txHash),
  }
}

const initialVaultData: VaultData = {
  totalGoldGrams: 15678.50,
  totalSilverGrams: 89240.75,
  totalPlatinumGrams: 4520.25,
  totalTokensMinted: 125000,
  lastAuditDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
  verificationStatus: 'verified'
}

const initialAuditLogs: AuditLog[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    event: 'Vault Verification',
    details: 'All reserves verified against token supply',
    txHash: '0x8f4e...3a2b'
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    event: 'Token Mint',
    details: '250 APX-i tokens minted',
    txHash: '0x7c3d...9e1f'
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 1000 * 60 * 32),
    event: 'Gold Deposit',
    details: '100g gold added to vault',
    txHash: '0x2a5b...7d4c'
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 1000 * 60 * 48),
    event: 'Reserve Audit',
    details: 'Quarterly audit completed successfully',
    txHash: '0x9f1e...8b3a'
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 1000 * 60 * 67),
    event: 'Redemption Request',
    details: '50g silver redeemed for physical delivery',
    txHash: '0x4c6d...2e5f'
  }
]

export const useAPAXStore = create<APAXStore>((set, get) => ({
  // Session
  user: null,
  sessionStatus: 'checking',
  setUser: (user) => set({ user, sessionStatus: 'authenticated' }),
  checkSession: async () => {
    const result = await getCurrentUserApi()
    if (result.success) {
      set({ user: result.data.user, sessionStatus: 'authenticated' })
    } else {
      set({ user: null, sessionStatus: 'anonymous' })
    }
  },
  logout: async () => {
    await logoutApi()
    set({
      user: null,
      sessionStatus: 'anonymous',
      userHoldings: emptyHoldings,
      holdingsStatus: 'idle',
      holdingsError: null,
      reconciliation: null,
      reconciliationStatus: 'idle',
    })
  },

  // Metal Prices
  metalPrices: initialMetalPrices,
  setMetalPrices: (prices) => set({ metalPrices: prices }),
  
  // User Holdings
  userHoldings: emptyHoldings,
  holdingsStatus: 'idle',
  holdingsError: null,
  setUserHoldings: (holdings) => set({ userHoldings: holdings }),
  fetchHoldings: async () => {
    set({ holdingsStatus: 'loading', holdingsError: null })
    const result = await getHoldingsApi()
    if (result.success) {
      const { goldGrams, silverGrams, platinumGrams, apxiTokens } = result.data.data
      set({
        userHoldings: { goldGrams, silverGrams, platinumGrams, apxiTokens },
        holdingsStatus: 'ready',
      })
    } else {
      // Keep the last good holdings on screen; only the status changes.
      set({ holdingsStatus: 'error', holdingsError: result.message })
    }
  },

  // On-chain activity and reconciliation
  auditSource: 'sample',
  fetchActivity: async () => {
    const result = await getActivityApi()
    if (result.success && result.data.data.length > 0) {
      set({ auditLogs: result.data.data.map(toAuditLog), auditSource: 'chain' })
    }
  },
  reconciliation: null,
  reconciliationStatus: 'idle',
  fetchReconciliation: async () => {
    set({ reconciliationStatus: 'loading' })
    const result = await getReconciliationApi()
    if (result.success) {
      set({ reconciliation: result.data.data, reconciliationStatus: 'ready' })
    } else {
      set({ reconciliationStatus: 'error' })
    }
  },
  
  // Vault Data
  vaultData: initialVaultData,
  setVaultData: (data) => set({ vaultData: data }),
  
  // Audit Logs
  auditLogs: initialAuditLogs,
  addAuditLog: (log) => set((state) => ({
    auditLogs: [log, ...state.auditLogs].slice(0, 50)
  })),
  
  // Zakat Calculation
  zakatCalculation: null,
  calculateZakat: () => {
    const { metalPrices, userHoldings } = get()
    
    // Calculate total asset value in USD
    const goldValue = userHoldings.goldGrams * (metalPrices.gold / 31.1035) // Price per gram
    const silverValue = userHoldings.silverGrams * (metalPrices.silver / 31.1035)
    const platinumValue = userHoldings.platinumGrams * (metalPrices.platinum / 31.1035)
    const totalAssetValue = goldValue + silverValue + platinumValue
    
    // Nisab threshold (approximately 85g of gold or 595g of silver)
    const nisabInGold = 85 * (metalPrices.gold / 31.1035)
    const nisabInSilver = 595 * (metalPrices.silver / 31.1035)
    const nisabThreshold = Math.min(nisabInGold, nisabInSilver)
    
    const isAboveNisab = totalAssetValue >= nisabThreshold
    const zakatDue = isAboveNisab ? totalAssetValue * 0.025 : 0
    
    set({
      zakatCalculation: {
        totalAssetValue,
        nisabThreshold,
        zakatDue,
        isAboveNisab
      }
    })
  },
  
  // UI State
  activeView: 'dashboard',
  setActiveView: (view) => set({ activeView: view })
}))

// Utility function to format currency
export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

// Utility function to format weight
export function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`
  }
  return `${grams.toFixed(2)} g`
}

// Calculate APX-i token breakdown (60% Gold, 30% Silver, 10% Platinum)
export function calculateAPXiBreakdown(tokens: number) {
  return {
    goldWeight: tokens * 0.60,
    silverWeight: tokens * 0.30,
    platinumWeight: tokens * 0.10
  }
}
