'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthCard, FormError, authButtonClass, authInputClass } from '@/components/auth-card'
import { resetPasswordApi } from '@/lib/services/auth.api'
import { useAPAXStore } from '@/lib/store'

const MIN_PASSWORD_LENGTH = 8

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>()
  const setUser = useAPAXStore((state) => state.setUser)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isLoading) return

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password should have at least ${MIN_PASSWORD_LENGTH} characters`)
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setError(null)
    const result = await resetPasswordApi(token, password)

    if (!result.success) {
      setIsLoading(false)
      setError(
        result.status === 404
          ? 'This reset link is invalid or has expired. Request a new one.'
          : result.status === 429
            ? 'Too many attempts. Please wait a few minutes and try again.'
            : result.message
      )
      return
    }

    setUser(result.data.user)
    // A full page load that replaces the form in history, so Back doesn't return to it.
    // (Client-side transitions can also stall in dev while a page compiles.)
    window.location.replace('/dashboard')
  }

  return (
    <AuthCard
      title="Choose a New Password"
      subtitle="You will be signed in once it is saved"
      footer={
        <Link href="/forgot-password" className="text-[#D4AF37] hover:text-[#E6C861] font-medium">
          Request a new link
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#C0C0C0]">New password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            className={authInputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password" className="text-[#C0C0C0]">Confirm new password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
            className={authInputClass}
          />
        </div>

        <FormError message={error} />

        <Button type="submit" disabled={isLoading} className={authButtonClass}>
          {isLoading ? 'Saving...' : 'Save Password'}
        </Button>
      </form>
    </AuthCard>
  )
}
