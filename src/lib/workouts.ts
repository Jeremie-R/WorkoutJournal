import type { SessionType, SetEntry, Unit, Workout } from './types'
import { newId } from './types'
import { tidyKg } from './units'

/** "4 × 12" when every set has the same reps, otherwise "12 · 12 · 10". Counts done sets if any are done. */
export function setsSummary(sets: SetEntry[]): string {
  const done = sets.filter((s) => s.done)
  const list = done.length ? done : sets
  if (list.length === 0) return 'No sets'
  const reps = list.map((s) => s.reps)
  return reps.every((r) => r === reps[0]) ? `${list.length} × ${reps[0]}` : reps.join(' · ')
}

export function doneSets(sets: SetEntry[]) {
  return sets.filter((s) => s.done).length
}

export function totalReps(sets: SetEntry[]) {
  return sets.reduce((sum, s) => sum + (s.done ? s.reps : 0), 0)
}

/** Shows the session's current name and icon, falling back to the copy saved with the workout. */
export function workoutLook(workout: Workout, types: SessionType[]) {
  const type = types.find((t) => t.id === workout.typeId)
  return { name: type?.name ?? workout.typeName, icon: type?.icon ?? workout.typeIcon }
}

export function makeSets(count: number, reps: number): SetEntry[] {
  return Array.from({ length: count }, () => ({ reps, done: false }))
}

const SUGGESTED = [
  { name: 'Glutes', icon: 'peach', sets: 4, reps: 12, weightKg: 40 },
  { name: 'Arms', icon: 'flexed_biceps', sets: 3, reps: 12, weightKg: 10 },
  { name: 'Upper body', icon: 'mechanical_arm', sets: 4, reps: 10, weightKg: 30 },
  { name: 'Legs', icon: 'leg', sets: 4, reps: 10, weightKg: 60 },
  { name: 'Core', icon: 'bullseye', sets: 3, reps: 15, weightKg: 0 },
]

export const suggestedPreview = SUGGESTED.map(({ name, icon }) => ({ name, icon }))

export function suggestedSessions(unit: Unit, startOrder: number): SessionType[] {
  const now = Date.now()
  return SUGGESTED.map((s, i) => ({
    ...s,
    id: newId(),
    weightKg: tidyKg(s.weightKg, unit),
    order: startOrder + i,
    createdAt: now + i,
    updatedAt: now,
  }))
}
