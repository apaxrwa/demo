'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthCard, FormError, authButtonClass, authInputClass } from '@/components/auth-card'
import { registerApi } from '@/lib/services/auth.api'
import { useAPAXStore } from '@/lib/store'

const MIN_PASSWORD_LENGTH = 8

export default function RegisterPage() {
  const setUser = useAPAXStore((state) => state.setUser)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState('')
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
    const result = await registerApi({ name, email, gender, password })

    if (!result.success) {
      setIsLoading(false)
      setError(
        result.status === 409
          ? 'An account with that email already exists'
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
      title="Open Your Vault"
      subtitle="Create an account to hold tokenized precious metals"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-[#D4AF37] hover:text-[#E6C861] font-medium">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-[#C0C0C0]">Full name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" className={authInputClass} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-[#C0C0C0]">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" className={authInputClass} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender" className="text-[#C0C0C0]">Gender</Label>
          <select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            required
            className={`flex h-9 w-full rounded-md border px-3 text-sm ${authInputClass}`}
          >
            <option value="" disabled>Select...</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="other">Other / prefer not to say</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-[#C0C0C0]">Password</Label>
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
          <Label htmlFor="confirm-password" className="text-[#C0C0C0]">Confirm password</Label>
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
          {isLoading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>
    </AuthCard>
  )
}
