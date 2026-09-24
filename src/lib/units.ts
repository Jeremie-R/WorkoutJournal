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

/** 45 → "0:45", 600 → "10:00", 3900 → "1:05:00". */
export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.round(total))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

/** Reads "1:30", "1:05:00" or plain seconds ("90"). */
export function parseSeconds(text: string): number | null {
  const parts = text.trim().split(':').map((p) => Number(p.replace(',', '.')))
  if (parts.length === 0 || parts.length > 3 || parts.some((p) => Number.isNaN(p))) return null
  return Math.round(parts.reduce((total, p) => total * 60 + p, 0))
}

/** Finer steps for short holds, coarser for long cardio. */
export function secondsStep(value: number, dir: 1 | -1): number {
  const v = dir > 0 ? value : value - 1
  if (v < 60) return 5
  if (v < 180) return 15
  if (v < 600) return 30
  return 60
}
