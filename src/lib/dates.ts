import type { Workout } from './types'

/** Local calendar day as YYYY-MM-DD. */
export function dayKey(time: number | Date): string {
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function startOfDay(time: number | Date): Date {
  const d = new Date(time)
  d.setHours(0, 0, 0, 0)
  return d
}

export function startOfWeek(time: number | Date, weekStart: 0 | 1): Date {
  const d = startOfDay(time)
  const offset = (d.getDay() - weekStart + 7) % 7
  d.setDate(d.getDate() - offset)
  return d
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export interface WeekSummary {
  /** Consecutive weeks with at least one workout. The current week only breaks the streak once it's over. */
  streak: number
  thisWeek: number
  /** Oldest first, ending with the current week. */
  recentWeeks: { start: Date; count: number }[]
}

export function summarizeWeeks(workouts: Workout[], weekStart: 0 | 1, now = Date.now(), recent = 8): WeekSummary {
  const counts = new Map<string, number>()
  for (const w of workouts) {
    const key = dayKey(startOfWeek(w.startedAt, weekStart))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const current = startOfWeek(now, weekStart)
  const thisWeek = counts.get(dayKey(current)) ?? 0

  let streak = 0
  let cursor = thisWeek > 0 ? current : addDays(current, -7)
  while (counts.has(dayKey(cursor))) {
    streak++
    cursor = addDays(cursor, -7)
  }

  const recentWeeks = Array.from({ length: recent }, (_, i) => {
    const start = addDays(current, -7 * (recent - 1 - i))
    return { start, count: counts.get(dayKey(start)) ?? 0 }
  })
  return { streak, thisWeek, recentWeeks }
}

const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
const longDayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })
const monthFmt = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const shortFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })

export const formatDay = (t: number) => dayFmt.format(t)
export const formatLongDay = (t: number) => longDayFmt.format(t)
export const formatTime = (t: number) => timeFmt.format(t)
export const formatMonth = (d: Date) => monthFmt.format(d)
export const formatShort = (t: number) => shortFmt.format(t)

/** "Today", "Yesterday", "3 days ago", "2 weeks ago"… */
export function relativeDay(time: number, now = Date.now()): string {
  const days = Math.round((startOfDay(now).getTime() - startOfDay(time).getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 14) return `${days} days ago`
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(h ? 2 : 1, '0')
  return h ? `${h}:${mm}:${String(s).padStart(2, '0')}` : `${mm}:${String(s).padStart(2, '0')}`
}

export function formatMinutes(ms: number): string {
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`
}

/** Value for <input type="datetime-local"> in local time. */
export function toLocalInput(time: number): string {
  const d = new Date(time)
  return `${dayKey(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function greeting(now = new Date()): string {
  const h = now.getHours()
  if (h < 5) return 'Good night'
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}
