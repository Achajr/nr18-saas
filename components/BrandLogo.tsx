'use client'

import { useId } from 'react'

type BrandLogoProps = {
  title?: string
  subtitle?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  inverted?: boolean
  markOnly?: boolean
  className?: string
}

const sizes = {
  sm: { mark: 44, title: 'text-[15px]', subtitle: 'text-[11px]' },
  md: { mark: 58, title: 'text-[21px]', subtitle: 'text-[12px]' },
  lg: { mark: 82, title: 'text-[28px]', subtitle: 'text-[14px]' },
  xl: { mark: 142, title: 'text-[42px]', subtitle: 'text-[16px]' },
}

function splitTitle(title: string) {
  const parts = title.trim().split(/\s+/)
  if (parts.length <= 1) return { primary: title, secondary: '' }
  return { primary: parts[0], secondary: parts.slice(1).join(' ') }
}

export default function BrandLogo({
  title = 'NR18 Check',
  subtitle = 'Vistorias e conformidade',
  size = 'md',
  inverted = false,
  markOnly = false,
  className = '',
}: BrandLogoProps) {
  const id = useId().replace(/:/g, '')
  const bgId = `brand-logo-bg-${id}`
  const plateId = `brand-logo-plate-${id}`
  const goldId = `brand-logo-gold-${id}`
  const silverId = `brand-logo-silver-${id}`
  const helmetId = `brand-logo-helmet-${id}`
  const paperId = `brand-logo-paper-${id}`
  const greenId = `brand-logo-green-${id}`
  const cfg = sizes[size]
  const titleTone = inverted ? 'text-white' : 'text-[var(--text-primary)]'
  const secondaryTone = inverted ? 'text-cyan-100' : 'text-[var(--brand)]'
  const subtitleTone = inverted ? 'text-slate-300' : 'text-[var(--text-secondary)]'
  const { primary, secondary } = splitTitle(title)

  return (
    <div className={`flex min-w-0 items-center gap-4 ${className}`}>
      <div
        className="relative flex shrink-0 items-center justify-center overflow-visible drop-shadow-xl"
        style={{ width: cfg.mark, height: cfg.mark }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 260 230" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id={bgId} x1="48" y1="80" x2="218" y2="210" gradientUnits="userSpaceOnUse">
              <stop stopColor="#050b14" />
              <stop offset="0.58" stopColor="#111c29" />
              <stop offset="1" stopColor="#020617" />
            </linearGradient>
            <linearGradient id={plateId} x1="75" y1="34" x2="158" y2="136" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" />
              <stop offset="0.58" stopColor="#f4f6f8" />
              <stop offset="1" stopColor="#d6dde5" />
            </linearGradient>
            <linearGradient id={goldId} x1="74" y1="20" x2="146" y2="60" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fff8dc" />
              <stop offset="0.48" stopColor="#f4c542" />
              <stop offset="1" stopColor="#9a6410" />
            </linearGradient>
            <linearGradient id={silverId} x1="44" y1="146" x2="212" y2="216" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f8fafc" />
              <stop offset="0.32" stopColor="#a9b3bf" />
              <stop offset="0.62" stopColor="#f8fafc" />
              <stop offset="1" stopColor="#68717d" />
            </linearGradient>
            <linearGradient id={helmetId} x1="26" y1="86" x2="100" y2="137" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fff7a8" />
              <stop offset="0.32" stopColor="#facc15" />
              <stop offset="1" stopColor="#d97706" />
            </linearGradient>
            <linearGradient id={paperId} x1="94" y1="42" x2="150" y2="130" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ffffff" />
              <stop offset="1" stopColor="#e6ebf1" />
            </linearGradient>
            <linearGradient id={greenId} x1="80" y1="176" x2="168" y2="213" gradientUnits="userSpaceOnUse">
              <stop stopColor="#b5f334" />
              <stop offset="1" stopColor="#4f9b10" />
            </linearGradient>
            <filter id={`logo-shadow-${id}`} x="-20%" y="-20%" width="140%" height="145%">
              <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#020617" floodOpacity="0.35" />
            </filter>
          </defs>

          <g filter={`url(#logo-shadow-${id})`}>
            <path d="M31 120c12-33 42-61 82-68 42-7 84 12 107 46" fill="none" stroke="#d79522" strokeWidth="10" strokeLinecap="round" opacity="0.9" />
            <path d="M29 117c14-35 43-58 76-66" fill="none" stroke="#3b7f18" strokeWidth="10" strokeLinecap="round" opacity="0.92" />

            <path d="M44 157c-3 8-6 16-10 23l16 15 15-8c6 5 13 8 21 11l3 17h32l4-16c8-2 16-5 23-9l14 9 23-21-8-15c5-7 9-15 11-23l17-4v-26H43v47Z" fill={`url(#${silverId})`} />
            <path d="M34 116h192l-9 41c-4 18-20 31-38 31H81c-19 0-35-13-39-31l-8-41Z" fill={`url(#${bgId})`} stroke="#f8fafc" strokeWidth="3.4" />
            <path d="M41 122c45 7 126 7 178-1" fill="none" stroke="rgba(255,255,255,0.36)" strokeWidth="4" strokeLinecap="round" />

            <g>
              <path d="M48 114c3-28 25-50 54-51 14 0 27 4 38 12-19 6-34 19-42 39H48Z" fill="#06101d" />
              <path d="M30 115c6-24 26-43 51-48 28-5 55 10 66 34-23-12-52-9-71 6-12 9-27 12-46 8Z" fill={`url(#${helmetId})`} stroke="#7c4b00" strokeWidth="2.6" />
              <path d="M51 111c5-19 19-31 36-35" fill="none" stroke="#fff7b8" strokeWidth="4" strokeLinecap="round" opacity="0.75" />
              <path d="M78 71c7 7 10 20 9 38M102 73c5 9 7 19 6 31" fill="none" stroke="#b06b00" strokeWidth="3" strokeLinecap="round" opacity="0.75" />
              <path d="M22 116c30 8 71 8 105-1 7-2 14 2 17 9-41 11-88 12-128 2 0-6 2-9 6-10Z" fill="#f8c318" stroke="#7c4b00" strokeWidth="2.5" />
            </g>

            <g>
              <path d="M96 40h62c5 0 9 4 9 9v75H87V49c0-5 4-9 9-9Z" fill="#111827" stroke="#020617" strokeWidth="4" />
              <path d="M101 49h57v73h-57z" fill={`url(#${paperId})`} />
              <path d="M108 86c18-2 33-13 44-29 0 23-17 43-44 51V86Z" fill="#cfd6df" opacity="0.42" />
              <path d="M111 67h13v13h-13zM111 88h13v13h-13z" fill="#ffffff" stroke="#111827" strokeWidth="2" />
              <path d="m113 72 5 5 13-14M113 93l5 5 13-14" fill="none" stroke="#2f8a13" strokeWidth="5" strokeLinecap="square" />
              <path d="M138 70h36M138 92h36" stroke="#17202b" strokeWidth="5" />
              <path d="M111 111h13v13h-13z" fill="#ffffff" stroke="#111827" strokeWidth="2" />
              <path d="m113 116 5 5 13-14" fill="none" stroke="#2f8a13" strokeWidth="5" strokeLinecap="square" />
              <path d="M138 114h36" stroke="#17202b" strokeWidth="5" />
              <path d="M105 30h45c4 0 7 3 7 7v18h-59V37c0-4 3-7 7-7Z" fill={`url(#${goldId})`} stroke="#020617" strokeWidth="4" />
              <path d="M122 30c0-10 8-18 18-18s18 8 18 18" fill="none" stroke="#020617" strokeWidth="8" strokeLinecap="round" />
              <circle cx="140" cy="29" r="7" fill="#020617" />
            </g>

            <g opacity="0.96">
              <path d="M170 111h53" stroke="#020617" strokeWidth="4" />
              <path d="M186 63v57M207 78v42" stroke="#020617" strokeWidth="4" />
              <path d="M180 78h42l-34-24" fill="none" stroke="#020617" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M186 63l-16 48M186 63l37 48" stroke="#020617" strokeWidth="3" />
              <path d="M180 98h35v25h-35z" fill="#111827" />
              <path d="M187 105h7M203 105h7M187 116h7M203 116h7" stroke="#cbd5e1" strokeWidth="3" />
            </g>

            {size === 'xl' && (
              <>
                <text x="129" y="161" textAnchor="middle" fill="#f8fafc" stroke="#020617" strokeWidth="1.5" paintOrder="stroke" fontFamily="Inter, Arial, sans-serif" fontSize="45" fontWeight="900">NR18</text>
                <text x="130" y="191" textAnchor="middle" fill={`url(#${greenId})`} stroke="#06210a" strokeWidth="1" paintOrder="stroke" fontFamily="Brush Script MT, Segoe Script, cursive" fontSize="30" fontWeight="700">Check</text>
              </>
            )}
          </g>
        </svg>
      </div>

      {!markOnly && size !== 'xl' && (
        <div className="min-w-0 leading-none">
          <div className={`${cfg.title} truncate font-black ${titleTone}`}>
            <span>{primary}</span>
            {secondary ? <span className={`ml-2 font-bold ${secondaryTone}`}>{secondary}</span> : null}
          </div>
          {subtitle && (
            <div className={`${cfg.subtitle} mt-1 truncate font-semibold ${subtitleTone}`}>
              {subtitle}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
