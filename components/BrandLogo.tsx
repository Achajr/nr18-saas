'use client'

import Image from 'next/image'

type BrandLogoProps = {
  title?: string
  subtitle?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  inverted?: boolean
  markOnly?: boolean
  className?: string
}

const sizes = {
  sm: { logoWidth: 140, markSize: 42, subtitle: 'text-[11px]' },
  md: { logoWidth: 190, markSize: 52, subtitle: 'text-[12px]' },
  lg: { logoWidth: 250, markSize: 68, subtitle: 'text-[14px]' },
  xl: { logoWidth: 340, markSize: 88, subtitle: 'text-[16px]' },
}

export default function BrandLogo({
  title = 'NR18 Check',
  subtitle = '',
  size = 'md',
  inverted = false,
  markOnly = false,
  className = '',
}: BrandLogoProps) {
  const cfg = sizes[size]
  const logoSrc = markOnly ? '/branding/logo-mark.png' : '/branding/login-logo-login.png'
  const subtitleTone = inverted ? 'text-slate-300' : 'text-[var(--text-secondary)]'
  const wrapperClass = markOnly
    ? 'rounded-[18px] border border-white/12 bg-white shadow-[0_12px_28px_rgba(15,23,42,0.16)]'
    : 'rounded-[24px] border border-white/12 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.14)]'

  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      <div
        className={`relative shrink-0 overflow-hidden ${wrapperClass}`}
        style={{ width: markOnly ? cfg.markSize : cfg.logoWidth, aspectRatio: markOnly ? '1 / 1' : '1080 / 500' }}
        aria-hidden="true"
      >
        <Image
          src={logoSrc}
          alt={title}
          fill
          priority={size !== 'sm'}
          sizes={markOnly ? `${cfg.markSize}px` : `${cfg.logoWidth}px`}
          className="object-contain p-1.5"
        />
      </div>

      {!markOnly && subtitle && (
        <div className="min-w-0 leading-tight">
          <div className={`truncate font-semibold ${subtitleTone} ${cfg.subtitle}`}>{subtitle}</div>
        </div>
      )}
    </div>
  )
}
