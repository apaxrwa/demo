'use client'

import { CheckCircle, WarningCircle, LinkBreak, ArrowClockwise } from '@phosphor-icons/react'
import { useAPAXStore, formatWeight } from '@/lib/store'

const shortAddress = (address?: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''

export function ReconciliationStatus() {
  const { reconciliation, reconciliationStatus, fetchReconciliation } = useAPAXStore()

  if (reconciliationStatus === 'idle' || (reconciliationStatus === 'loading' && !reconciliation)) {
    return null
  }

  const refresh = (
    <button
      type="button"
      onClick={() => void fetchReconciliation()}
      className="ml-auto inline-flex items-center gap-1 text-[#888888] hover:text-[#E8E8E8] shrink-0"
      aria-label="Re-check reconciliation"
    >
      <ArrowClockwise className="h-3.5 w-3.5" />
      Re-check
    </button>
  )

  if (reconciliationStatus === 'error' || !reconciliation) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-xs text-[#888888]">
        <LinkBreak className="h-4 w-4" />
        On-chain reconciliation could not be checked right now.
        {refresh}
      </div>
    )
  }

  const { status, offChainGrams, onChainGrams, walletAddress } = reconciliation

  if (status === 'match') {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
        <CheckCircle className="h-4 w-4" />
        Gold holdings match on-chain APXG balance ({formatWeight(offChainGrams)}) for {shortAddress(walletAddress)}.
        {refresh}
      </div>
    )
  }

  if (status === 'mismatch') {
    return (
      <div role="alert" className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
        <WarningCircle className="h-4 w-4" />
        Reconciliation mismatch: records show {formatWeight(offChainGrams)} but wallet {shortAddress(walletAddress)} holds{' '}
        {formatWeight(onChainGrams ?? 0)} on-chain. Flagged for review; nothing was changed automatically.
        {refresh}
      </div>
    )
  }

  const message = {
    not_configured: 'On-chain reconciliation is not configured for this environment.',
    no_wallet: 'No wallet is linked to your account, so on-chain reconciliation is skipped.',
    unavailable: 'The blockchain node is unreachable; reconciliation will retry later.',
  }[status]

  return (
    <div className="flex items-center gap-2 rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-xs text-[#888888]">
      <LinkBreak className="h-4 w-4" />
      {message}
      {refresh}
    </div>
  )
}
