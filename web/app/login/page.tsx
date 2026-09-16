'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Wallet, EnvelopeSimple, LockKey, CaretRight, Eye, EyeSlash, ShieldCheck } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { loginApi } from '@/lib/services/auth.api'
import { useAPAXStore } from '@/lib/store'

export default function LoginPage() {
  const setUser = useAPAXStore((state) => state.setUser)
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [vaultOpening, setVaultOpening] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [walletNotice, setWalletNotice] = useState(false)

  useEffect(() => {
    const { sessionStatus, checkSession } = useAPAXStore.getState()
    const redirectIfSignedIn = () => {
      if (useAPAXStore.getState().sessionStatus === 'authenticated') {
        window.location.replace('/dashboard')
      }
    }
    if (sessionStatus === 'checking') {
      void checkSession().then(redirectIfSignedIn)
    } else {
      redirectIfSignedIn()
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    const result = await loginApi({ email, password })

    if (!result.success) {
      setIsLoading(false)
      setError(
        result.status === 401
          ? 'Invalid email or password'
          : result.status === 429
            ? 'Too many attempts. Please wait a few minutes and try again.'
            : result.message
      )
      return
    }

    setUser(result.data.user)
    setVaultOpening(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    // A full page load that replaces the form in history, so Back doesn't return to it.
    // (Client-side transitions can also stall in dev while a page compiles.)
    window.location.replace('/dashboard')
  }

  const handleWalletConnect = () => {
    setWalletNotice(true)
  }

  return (
    <div className="min-h-screen bg-radial-obsidian flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-[#C0C0C0]/5 rounded-full blur-3xl" />

        {/* Vault door pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at center, #D4AF37 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
      </div>

      {/* Vault Door Animation Overlay */}
      {vaultOpening && (
        <div className="fixed inset-0 z-50 flex pointer-events-none">
          {/* Left Door Panel */}
          <div className="vault-door-left w-1/2 h-full bg-[#050505] border-r border-[#D4AF37]/20 flex items-center justify-end relative z-20">
            {/* Brushed Metal Texture */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A1A] to-[#050505] opacity-90" />
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />

            {/* Locking Mechanisms (Pistons) */}
            <div className="relative z-10 w-8 h-64 border-r-4 border-[#D4AF37] flex flex-col justify-between py-8 mr-[-2px] shadow-[0_0_30px_rgba(212,175,55,0.3)]">
              <div className="w-12 h-4 bg-gradient-to-r from-transparent to-[#D4AF37] rounded-l-sm" />
              <div className="w-16 h-4 bg-gradient-to-r from-transparent to-[#D4AF37] rounded-l-sm" />
              <div className="w-12 h-4 bg-gradient-to-r from-transparent to-[#D4AF37] rounded-l-sm" />
            </div>
          </div>

          {/* Right Door Panel */}
          <div className="vault-door-right w-1/2 h-full bg-[#050505] border-l border-[#D4AF37]/20 flex items-center justify-start relative z-20">
            {/* Brushed Metal Texture */}
            <div className="absolute inset-0 bg-gradient-to-bl from-[#1A1A1A] to-[#050505] opacity-90" />
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />

            {/* Locking Mechanisms (Pistons) */}
            <div className="relative z-10 w-8 h-64 border-l-4 border-[#D4AF37] flex flex-col justify-between py-8 ml-[-2px] shadow-[0_0_30px_rgba(212,175,55,0.3)]">
              <div className="w-12 h-4 bg-gradient-to-l from-transparent to-[#D4AF37] rounded-r-sm" />
              <div className="w-16 h-4 bg-gradient-to-l from-transparent to-[#D4AF37] rounded-r-sm" />
              <div className="w-12 h-4 bg-gradient-to-l from-transparent to-[#D4AF37] rounded-r-sm" />
            </div>
          </div>

          {/* Central Lock Spinner (Fading out) */}
          <div className="absolute inset-0 z-30 flex items-center justify-center animate-ping-slow pointer-events-none">
            <div className="w-96 h-96 rounded-full border border-[#D4AF37]/10 animate-spin-slow-reverse" />
          </div>
        </div>
      )}

      {/* Login Card */}
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 bg-[#D4AF37]/20 rounded-full blur-xl" />
              <Image
                src="/images/apax-logo.png"
                alt="APAX"
                fill
                sizes="80px"
                loading="eager"
                className="object-contain rounded-full"
              />
            </div>
            <h1 className="text-2xl font-serif font-bold text-gradient-gold">Enter The Vault</h1>
          </Link>
          <p className="text-sm text-[#888888] mt-2">Access your precious metal portfolio</p>
        </div>

        {/* Glass Card */}
        <div className="glass rounded-2xl p-8 gold-glow">
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-[#1A1A1A] p-1 rounded-lg">
              <TabsTrigger
                value="wallet"
                className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A0A0A] text-[#888888] rounded-md transition-all"
              >
                <Wallet className="w-4 h-4 mr-2" />
                Wallet
              </TabsTrigger>
              <TabsTrigger
                value="email"
                className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A0A0A] text-[#888888] rounded-md transition-all"
              >
                <EnvelopeSimple className="w-4 h-4 mr-2" />
                Email
              </TabsTrigger>
            </TabsList>

            {/* Wallet Tab */}
            <TabsContent value="wallet" className="space-y-6">
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-[#D4AF37]" />
                </div>
                <p className="text-sm text-[#888888] mb-6">
                  Connect your SidraChain wallet to access the vault
                </p>
              </div>

              <Button
                onClick={handleWalletConnect}
                className="w-full metallic-shine bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#E6C861] font-semibold h-12 gap-2"
              >
                Connect Sidra Ledger Gateway
                <CaretRight weight="bold" className="w-4 h-4" />
              </Button>

              {walletNotice && (
                <p role="status" className="text-sm text-center text-[#C0C0C0] bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg p-3">
                  Wallet sign-in is not available yet. Please use the Email tab to sign in.
                </p>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#2A2A2A]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#111111] px-3 text-[#888888]">or connect with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="border-[#2A2A2A] text-[#C0C0C0] hover:bg-[#1A1A1A] hover:border-[#D4AF37]/30 bg-transparent"
                  onClick={handleWalletConnect}
                >
                  MetaMask
                </Button>
                <Button
                  variant="outline"
                  className="border-[#2A2A2A] text-[#C0C0C0] hover:bg-[#1A1A1A] hover:border-[#D4AF37]/30 bg-transparent"
                  onClick={handleWalletConnect}
                >
                  WalletConnect
                </Button>
              </div>
            </TabsContent>

            {/* Email Tab */}
            <TabsContent value="email">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#C0C0C0]">Email</Label>
                  <div className="relative">
                    <EnvelopeSimple className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="client@apax.institutional"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 bg-[#1A1A1A] border-[#2A2A2A] text-[#E8E8E8] placeholder:text-[#888888] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[#C0C0C0]">Password</Label>
                  <div className="relative">
                    <LockKey className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888888]" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 bg-[#1A1A1A] border-[#2A2A2A] text-[#E8E8E8] placeholder:text-[#888888] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#C0C0C0]"
                    >
                      {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-[#888888]">
                    <input type="checkbox" className="rounded border-[#2A2A2A] bg-[#1A1A1A] text-[#D4AF37] focus:ring-[#D4AF37]/20" />
                    Remember me
                  </label>
                  <Link href="/forgot-password" className="text-[#D4AF37] hover:text-[#E6C861]">
                    Forgot password?
                  </Link>
                </div>

                {error && (
                  <p role="alert" className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full metallic-shine bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#E6C861] font-semibold h-12 gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-[#0A0A0A]/30 border-t-[#0A0A0A] rounded-full animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <CaretRight weight="bold" className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Security Badge */}
          <div className="mt-6 pt-6 border-t border-[#2A2A2A]">
            <div className="flex items-center justify-center gap-2 text-xs text-[#888888]">
              <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
              <span>256-bit SSL Encryption</span>
              <span className="text-[#2A2A2A]">|</span>
              <span>RWA-Compliant</span>
            </div>
          </div>
        </div>

        {/* Sign up link */}
        <p className="text-center text-sm text-[#888888] mt-6">
          {"Don't have an account?"}{' '}
          <Link href="/register" className="text-[#D4AF37] hover:text-[#E6C861] font-medium">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  )
}
