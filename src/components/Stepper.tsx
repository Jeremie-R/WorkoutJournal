import { useEffect, useState } from 'react'
import { formatNumber } from '../lib/units'
import { Icon } from './Icon'

interface StepperProps {
  label: string
  hint?: string
  value: number
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  unit?: string
  /** Shown instead of the number when the value is 0 (e.g. "Bodyweight"). */
  zeroLabel?: string
  integer?: boolean
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** A labelled row with − value + controls. The value can also be typed. */
export function Stepper({ label, hint, value, onChange, step = 1, min = 0, max = 9999, unit, zeroLabel, integer }: StepperProps) {
  const [text, setText] = useState(formatNumber(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(formatNumber(value))
  }, [value, focused])

  const commit = (raw: string) => {
    const parsed = parseFloat(raw.replace(',', '.'))
    if (Number.isNaN(parsed)) return setText(formatNumber(value))
    const next = clamp(integer ? Math.round(parsed) : parsed, min, max)
    onChange(next)
    setText(formatNumber(next))
  }

  // Snap to the step grid so 41 + 2.5 goes to 42.5, not 43.5.
  const bump = (dir: 1 | -1) => {
    const snapped = dir > 0 ? Math.floor(value / step + 1e-9) * step + step : Math.ceil(value / step - 1e-9) * step - step
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
              setText(formatNumber(value))
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

/** Compact − 12 + control used on each set row. */
export function MiniStepper({ value, onChange, min = 1, max = 999, suffix }: { value: number; onChange: (v: number) => void; min?: number; max?: number; suffix: string }) {
  return (
    <div className="mini-stepper">
      <button type="button" onClick={() => onChange(clamp(value - 1, min, max))} disabled={value <= min} aria-label="One less">
        <Icon name="minus" size={16} strokeWidth={2.2} />
      </button>
      <span className="mini-stepper__value">
        {value}
        <small>{suffix}</small>
      </span>
      <button type="button" onClick={() => onChange(clamp(value + 1, min, max))} disabled={value >= max} aria-label="One more">
        <Icon name="plus" size={16} strokeWidth={2.2} />
      </button>
    </div>
  )
}
