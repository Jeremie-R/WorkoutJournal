import { useEffect, useState } from 'react'
import { formatNumber } from '../lib/units'
import { Icon } from './Icon'

interface StepperProps {
  label: string
  hint?: string
  value: number
  onChange: (value: number) => void
  /** A fixed increment, or one that depends on the value (e.g. finer steps for short times). */
  step?: number | ((value: number, dir: 1 | -1) => number)
  min?: number
  max?: number
  unit?: string
  /** Shown instead of the number when the value is 0 (e.g. "None"). */
  zeroLabel?: string
  integer?: boolean
  /** Custom display and typing format, e.g. "1:30" for seconds. */
  format?: (value: number) => string
  parse?: (text: string) => number | null
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

const parseNumber = (text: string) => {
  const n = parseFloat(text.replace(',', '.'))
  return Number.isNaN(n) ? null : n
}

/** A labelled row with − value + controls. The value can also be typed. */
export function Stepper({
  label,
  hint,
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  unit,
  zeroLabel,
  integer,
  format = formatNumber,
  parse = parseNumber,
}: StepperProps) {
  const [text, setText] = useState(format(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(format(value))
  }, [value, focused])

  const commit = (raw: string) => {
    const parsed = parse(raw)
    if (parsed === null) return setText(format(value))
    const next = clamp(integer ? Math.round(parsed) : parsed, min, max)
    onChange(next)
    setText(format(next))
  }

  // Snap to the step grid so 41 + 2.5 goes to 42.5, not 43.5.
  const bump = (dir: 1 | -1) => {
    const size = typeof step === 'function' ? step(value, dir) : step
    const snapped = dir > 0 ? Math.floor(value / size + 1e-9) * size + size : Math.ceil(value / size - 1e-9) * size - size
    onChange(clamp(Number(snapped.toFixed(2)), min, max))
  }

  const showZero = zeroLabel && value === 0 && !focused

  return (
    <div className="stepper">
      <div className="stepper__label">
        <span>{label}</span>
        {hint && <small>{hint}</small>}
      </div>
      <div className="stepper__controls">
        <button type="button" className="stepper__btn" onClick={() => bump(-1)} disabled={value <= min} aria-label={`Less ${label.toLowerCase()}`}>
          <Icon name="minus" size={18} strokeWidth={2.2} />
        </button>
        <label className="stepper__value">
          <input
            className={showZero ? 'is-label' : undefined}
            inputMode={integer ? 'numeric' : 'decimal'}
            value={showZero ? zeroLabel : text}
            aria-label={label}
            onFocus={(e) => {
              setFocused(true)
              setText(format(value))
              requestAnimationFrame(() => e.target.select())
            }}
            onChange={(e) => setText(e.target.value)}
            onBlur={(e) => {
              setFocused(false)
              commit(e.target.value)
            }}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            size={Math.max(2, (showZero ? zeroLabel!.length : text.length) + 1)}
          />
          {unit && !showZero && <span className="stepper__unit">{unit}</span>}
        </label>
        <button type="button" className="stepper__btn" onClick={() => bump(1)} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`}>
          <Icon name="plus" size={18} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}
