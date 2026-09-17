'use client'

import { useEffect, type ReactNode } from 'react'
import { useAPAXStore } from '@/lib/store'

export function AuthGuard({ children }: { children: ReactNode }) {
  const sessionStatus = useAPAXStore((state) => state.sessionStatus)
  const checkSession = useAPAXStore((state) => state.checkSession)

  useEffect(() => {
    if (useAPAXStore.getState().sessionStatus === 'checking') {
      void checkSession()
    }
  }, [checkSession])

  useEffect(() => {
    if (sessionStatus === 'anonymous') {
      // A full page load: a client-side transition can stall in dev while /login is
      // still being compiled for the first time.
      window.location.replace('/login')
    }
  }, [sessionStatus])

  if (sessionStatus !== 'authenticated') {
    return (
      <div className="min-h-screen bg-radial-obsidian flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
          <p className="text-sm text-[#888888]">
            {sessionStatus === 'anonymous' ? 'Redirecting to sign in...' : 'Opening the vault...'}
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
