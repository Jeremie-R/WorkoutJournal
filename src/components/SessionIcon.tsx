import type { CSSProperties } from 'react'
import { EMOJI_PREFIX, iconSrc } from '../lib/icons'

export function SessionIcon({ icon, size = 40, className = '' }: { icon: string; size?: number; className?: string }) {
  const style = { '--size': `${size}px` } as CSSProperties
  if (icon.startsWith(EMOJI_PREFIX)) {
    return (
      <span className={`session-icon session-icon--emoji ${className}`} style={style} aria-hidden="true">
        {icon.slice(EMOJI_PREFIX.length)}
      </span>
    )
  }
  return (
    <img
      className={`session-icon ${className}`}
      style={style}
      src={iconSrc(icon) ?? iconSrc('person_lifting_weights')!}
      width={size}
      height={size}
      alt=""
      draggable={false}
    />
  )
}
