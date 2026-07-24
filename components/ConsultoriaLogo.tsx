'use client'

type ConsultoriaLogoProps = {
  src?: string | null
  name?: string | null
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}

const sizes = {
  sm: 'h-10 w-16 rounded-xl',
  md: 'h-12 w-20 rounded-2xl',
  lg: 'h-16 w-28 rounded-2xl',
}

export default function ConsultoriaLogo({ src, name, size = 'md', label = 'Consultoria', className = '' }: ConsultoriaLogoProps) {
  if (!src) return null

  const alt = name ? 'Logomarca ' + name : 'Logomarca da consultoria'

  return (
    <div className={'flex min-w-0 items-center gap-3 ' + className}>
      <div className={sizes[size] + ' shrink-0 overflow-hidden border border-[var(--border)] bg-white shadow-sm'}>
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-contain p-1.5"
        />
      </div>
      {label && (
        <div className="min-w-0 hidden sm:block">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</div>
          {name && <div className="truncate text-xs font-semibold text-[var(--text-secondary)]">{name}</div>}
        </div>
      )}
    </div>
  )
}
