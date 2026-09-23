import type { Unit } from './types'

const LB_PER_KG = 2.2046226218

export function toUnit(kg: number, unit: Unit): number {
  return unit === 'kg' ? kg : kg * LB_PER_KG
}

export function fromUnit(value: number, unit: Unit): number {
  return unit === 'kg' ? value : value / LB_PER_KG
}

/** Up to two decimals, no trailing zeros: 42.5, 45, 41.25. */
export function formatNumber(value: number): string {
  return String(Number(value.toFixed(2)))
}

export function formatWeight(kg: number, unit: Unit): string {
  if (kg <= 0) return 'Bodyweight'
  return `${formatNumber(toUnit(kg, unit))} ${unit}`
}

export const WEIGHT_STEPS: Record<Unit, number[]> = {
  kg: [0.5, 1, 1.25, 2.5, 5],
  lb: [1, 2.5, 5, 10],
}

export const DEFAULT_STEP: Record<Unit, number> = { kg: 2.5, lb: 5 }

/** Rounds a kg value to a tidy number in the user's unit (used for suggested sessions). */
export function tidyKg(kg: number, unit: Unit): number {
  const step = DEFAULT_STEP[unit]
  return fromUnit(Math.round(toUnit(kg, unit) / step) * step, unit)
}
