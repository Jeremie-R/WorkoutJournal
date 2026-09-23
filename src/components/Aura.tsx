import type { CSSProperties } from 'react'

export type AuraTone = 'dawn' | 'lilac' | 'mint' | 'sunset' | 'sky'

/** The soft, grainy gradient "set piece" that sits behind the top of a page and fades into white. */
export function Aura({ tone, height = 360, glow = 1 }: { tone: AuraTone; height?: number; glow?: number }) {
  return (
    <div
      className={`aura aura--${tone}`}
      style={{ height, '--glow': glow } as CSSProperties}
      aria-hidden="true"
    />
  )
}

/** Rolling pastel hills with grain, used on the welcome screen (a nod to the reference's dunes). */
export function Dunes() {
  return (
    <div className="dunes" aria-hidden="true">
      <div className="dunes__sky" />
      <svg className="dunes__hills" viewBox="0 0 400 260" preserveAspectRatio="none">
        <defs>
          <linearGradient id="dune-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F9B8C9" />
            <stop offset="1" stopColor="#FFD9B8" />
          </linearGradient>
          <linearGradient id="dune-b" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E7C3F3" />
            <stop offset="1" stopColor="#F7B6CB" />
          </linearGradient>
          <linearGradient id="dune-c" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FBE3EA" />
            <stop offset="1" stopColor="#FFFFFF" />
          </linearGradient>
        </defs>
        <path d="M0 120 C 80 70, 150 150, 230 110 S 350 60, 400 90 V260 H0Z" fill="url(#dune-a)" opacity="0.9" />
        <path d="M0 170 C 90 120, 170 190, 260 150 S 360 130, 400 150 V260 H0Z" fill="url(#dune-b)" opacity="0.85" />
        <path d="M0 215 C 110 180, 200 235, 300 200 S 380 195, 400 205 V260 H0Z" fill="url(#dune-c)" />
      </svg>
      <div className="dunes__grain" />
    </div>
  )
}
