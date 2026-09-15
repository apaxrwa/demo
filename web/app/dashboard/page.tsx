'use client'

import { useEffect } from 'react'
import { AuthGuard } from '@/components/auth-guard'
import { DashboardLayout } from '@/components/dashboard-layout'
import { DashboardView } from '@/components/views/dashboard-view'
import { PorView } from '@/components/views/por-view'
import { ZakatView } from '@/components/views/zakat-view'
import { RedemptionView } from '@/components/views/redemption-view'
import { ShariaView } from '@/components/views/sharia-view'
import { useAPAXStore } from '@/lib/store'

function Dashboard() {
  const { activeView, fetchHoldings, fetchActivity, fetchReconciliation } = useAPAXStore()

  useEffect(() => {
    void fetchHoldings()
    void fetchActivity()
    void fetchReconciliation()
  }, [fetchHoldings, fetchActivity, fetchReconciliation])

  // Simulate live price updates (no price feed is connected yet)
  useEffect(() => {
    const interval = setInterval(() => {
      useAPAXStore.setState((state) => ({
        metalPrices: {
          gold: state.metalPrices.gold + (Math.random() - 0.5) * 2,
          silver: state.metalPrices.silver + (Math.random() - 0.5) * 0.1,
          platinum: state.metalPrices.platinum + (Math.random() - 0.5) * 1,
          lastUpdated: new Date()
        }
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView />
      case 'por':
        return <PorView />
      case 'zakat':
        return <ZakatView />
      case 'redemption':
        return <RedemptionView />
      case 'sharia':
        return <ShariaView />
      default:
        return <DashboardView />
    }
  }

  return (
    <DashboardLayout>
      {renderView()}
    </DashboardLayout>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  )
}
