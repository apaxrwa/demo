import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

/** Shared frame for the account pages (register, forgot password, reset password). */
export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="min-h-screen bg-radial-obsidian flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-[#C0C0C0]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 bg-[#D4AF37]/20 rounded-full blur-xl" />
              <Image
                src="/images/apax-logo.png"
                alt="APAX"
                fill
                sizes="64px"
                loading="eager"
                className="object-contain rounded-full"
              />
            </div>
            <h1 className="text-2xl font-serif font-bold text-gradient-gold">{title}</h1>
          </Link>
          <p className="text-sm text-[#888888] mt-2">{subtitle}</p>
        </div>

        <div className="glass rounded-2xl p-8 gold-glow">{children}</div>

        {footer && <div className="text-center text-sm text-[#888888] mt-6">{footer}</div>}
      </div>
    </div>
  )
}

export const authInputClass =
  'bg-[#1A1A1A] border-[#2A2A2A] text-[#E8E8E8] placeholder:text-[#888888] focus:border-[#D4AF37] focus:ring-[#D4AF37]/20'

export const authButtonClass =
  'w-full metallic-shine bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#E6C861] font-semibold h-12'

export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
      {message}
    </p>
  )
}
