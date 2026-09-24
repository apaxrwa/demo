'use client'

import Image from 'next/image'
import { PortfolioOverview } from '@/components/portfolio-overview'
import { AssetAllocationChart } from '@/components/asset-allocation-chart'
import { ShariaCertificationHub } from '@/components/sharia-certification-hub'
import { ReconciliationStatus } from '@/components/reconciliation-status'
import { useAPAXStore } from '@/lib/store'

const RECONCILIATION_LABELS = {
  match: 'Reconciliation: matched on-chain',
  mismatch: 'Reconciliation: mismatch flagged',
  not_configured: 'Reconciliation: not configured',
  no_wallet: 'Reconciliation: no wallet linked',
  unavailable: 'Reconciliation: chain unreachable',
} as const

export function DashboardView() {
  const firstName = useAPAXStore((state) => state.user?.name.split(/\s+/)[0])
  const lastPriceUpdate = useAPAXStore((state) => state.metalPrices.lastUpdated)
  const auditSource = useAPAXStore((state) => state.auditSource)
  const reconciliationStatus = useAPAXStore((state) => state.reconciliation?.status)

  const tickerItems = [
    { text: 'Metal prices: simulated feed', live: true },
    { text: `Last price update: ${lastPriceUpdate.toLocaleTimeString()}` },
    { text: auditSource === 'chain' ? 'Proof of reserve: live on-chain events' : 'Proof of reserve: sample entries', gold: true },
    ...(reconciliationStatus ? [{ text: RECONCILIATION_LABELS[reconciliationStatus] }] : []),
  ]

  return (
    <div className="space-y-4 md:space-y-6 stagger-in max-w-7xl mx-auto overflow-hidden">
      {/* Live Ledger Ticker */}
      <div className="w-full bg-[#1A1A1A]/50 border-y border-[#2A2A2A] overflow-hidden py-1.5 relative">
        <div className="flex animate-ticker whitespace-nowrap gap-12 items-center">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex gap-12 items-center">
              {tickerItems.map((item) => (
                <div key={item.text} className="flex items-center gap-2">
                  {item.live && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  <span className={`text-terminal-sm${item.gold ? ' text-[#D4AF37]' : ''}`}>{item.text}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-serif font-bold text-[#E8E8E8]">
            {firstName ? `Welcome back, ${firstName}!` : 'Welcome back!'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 md:h-12 md:w-12 overflow-hidden rounded-lg gold-glow">
            <Image
              src="/images/apax-logo.png"
              alt="APAX Emblem"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>

      {/* Portfolio Overview Stats */}
      <PortfolioOverview />
      <ReconciliationStatus />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6 items-start">
        {/* Asset Allocation Charts */}
        <AssetAllocationChart />

        {/* Sharia Certification Hub - Moved inside grid for better density */}
        <ShariaCertificationHub />
      </div>
    </div>
  )
}
