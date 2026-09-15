'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthCard, FormError, authButtonClass, authInputClass } from '@/components/auth-card'
import { forgotPasswordApi } from '@/lib/services/auth.api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    setIsLoading(true)
    setError(null)
    const result = await forgotPasswordApi(email)
    setIsLoading(false)

    if (!result.success) {
      setError(
        result.status === 429
          ? 'Too many attempts. Please wait a few minutes and try again.'
          : result.message
      )
      return
    }
    setSent(true)
  }

  return (
    <AuthCard
      title="Reset Your Password"
      subtitle="We will send a reset link to your email"
      footer={
        <Link href="/login" className="text-[#D4AF37] hover:text-[#E6C861] font-medium">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p role="status" className="text-sm text-[#C0C0C0] text-center">
          If an account exists for <span className="text-[#E8E8E8]">{email}</span>, a reset link is on its
          way. The link expires in 15 minutes.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#C0C0C0]">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className={authInputClass} />
          </div>

          <FormError message={error} />

          <Button type="submit" disabled={isLoading} className={authButtonClass}>
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
