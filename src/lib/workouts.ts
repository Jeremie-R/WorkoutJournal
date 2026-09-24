import { CATALOG } from './catalog'
import { newId, type Data, type Exercise, type LoggedExercise, type Measure, type PlannedExercise, type SessionType, type Unit, type Workout } from './types'
import { formatSeconds, formatWeight } from './units'

/** Shows the session's current name and icon, falling back to the copy saved with the workout. */
export function workoutLook(workout: Workout, types: SessionType[]) {
  const type = types.find((t) => t.id === workout.typeId)
  return { name: type?.name ?? workout.typeName, icon: type?.icon ?? workout.typeIcon }
}

/** The exercise's current name in the library, or the copy saved with the workout. */
export function exerciseName(ex: LoggedExercise, exercises: Exercise[]): string {
  return (ex.exerciseId && exercises.find((e) => e.id === ex.exerciseId)?.name) || ex.name
}

/** Sets checked off out of the workout's sets. A set is one round through every exercise. */
export function setCount(workout: { done: boolean[] }) {
  return { done: workout.done.filter(Boolean).length, total: workout.done.length }
}

export function resizeSets(done: boolean[], count: number): boolean[] {
  return count > done.length ? [...done, ...Array<boolean>(count - done.length).fill(false)] : done.slice(0, count)
}

/** Reps per set for this exercise: its own count if it has one, otherwise the workout's. */
export function repsOf(ex: LoggedExercise, workoutReps: number): number | null {
  return ex.measure === 'time' ? null : (ex.reps ?? workoutReps)
}

/** "40 kg × 12" (with the workout's reps), "40 kg", "15 reps", "1:00", or "" when there's nothing to show. */
export function formatValue(ex: Pick<LoggedExercise, 'measure' | 'weightKg' | 'reps' | 'seconds'>, unit: Unit, workoutReps?: number): string {
  if (ex.measure === 'time') return ex.seconds ? formatSeconds(ex.seconds) : ''
  if (ex.measure === 'weight') {
    if (!ex.weightKg) return ''
    return workoutReps ? `${formatWeight(ex.weightKg, unit)} × ${workoutReps}` : formatWeight(ex.weightKg, unit)
  }
  const reps = ex.reps ?? workoutReps
  return reps ? `${reps} reps` : ''
}

/** True when the exercise's key number (its weight or time) hasn't been entered yet. */
export function missingValue(ex: Pick<LoggedExercise, 'measure' | 'weightKg' | 'seconds'>): boolean {
  return (ex.measure === 'weight' && !ex.weightKg) || (ex.measure === 'time' && !ex.seconds)
}

/** Progress is followed per library exercise; sessions without exercises count as their own. */
export function trackKey(workout: Workout, ex: LoggedExercise): string {
  return ex.exerciseId ?? `session:${workout.typeId}`
}

/** The most recent time this exercise was logged (workouts are sorted newest first). */
export function lastLogged(key: string, workouts: Workout[]): LoggedExercise | undefined {
  for (const w of workouts) {
    const hit = w.exercises.find((ex) => trackKey(w, ex) === key)
    if (hit) return hit
  }
  return undefined
}

function choose<T>(planned: T | null | undefined, last: T | null | undefined, fromLast: boolean): T | null {
  return fromLast ? (last ?? planned ?? null) : (planned ?? last ?? null)
}

/**
 * Today's starting value for one exercise (sets and reps are the workout's). With the "session setup"
 * preference the planned value wins and last time only fills gaps; with "last workout" it's the other way round.
 */
export function startExercise(ex: Exercise, plan: Partial<PlannedExercise>, last: LoggedExercise | undefined, fromLast: boolean): LoggedExercise {
  return {
    exerciseId: ex.id,
    name: ex.name,
    measure: ex.measure,
    weightKg: ex.measure === 'weight' ? choose(plan.weightKg, last?.weightKg, fromLast) : null,
    reps: ex.measure === 'reps' ? choose(plan.reps, last?.reps, fromLast) : null,
    seconds: ex.measure === 'time' ? choose(plan.seconds, last?.seconds, fromLast) : null,
  }
}

/** The exercises a workout of this session starts with. */
export function planWorkout(type: SessionType, data: Data): LoggedExercise[] {
  const fromLast = data.profile.prefill === 'last'
  if (type.exercises.length === 0) {
    // No exercises set up: the session itself is logged, like in the first version.
    const last = lastLogged(`session:${type.id}`, data.workouts)
    const planned = type.weightKg && type.weightKg > 0 ? type.weightKg : null
    return [{ exerciseId: null, name: type.name, measure: 'weight', weightKg: choose(planned, last?.weightKg, fromLast), reps: null, seconds: null }]
  }
  return type.exercises.flatMap((plan) => {
    const ex = data.exercises.find((e) => e.id === plan.exerciseId)
    return ex ? [startExercise(ex, plan, lastLogged(ex.id, data.workouts), fromLast)] : []
  })
}

export function newExercise(name: string, measure: Measure): Exercise {
  const now = Date.now()
  return { id: newId(), name: name.trim(), measure, createdAt: now, updatedAt: now }
}

export function findByName(name: string, exercises: Exercise[]): Exercise | undefined {
  const key = name.trim().toLowerCase()
  return exercises.find((e) => e.name.toLowerCase() === key)
}

export function emptyPlan(exerciseId: string): PlannedExercise {
  return { exerciseId, weightKg: null, reps: null, seconds: null }
}

/** "4 × 12 · 3 exercises" */
export function sessionMeta(type: SessionType): string {
  const count = type.exercises.length
  return `${type.sets} × ${type.reps} · ${count ? `${count} exercise${count > 1 ? 's' : ''}` : 'no exercises yet'}`
}

/** Names of the sessions that include this exercise. */
export function usedIn(exerciseId: string, types: SessionType[]): string[] {
  return types.filter((t) => t.exercises.some((p) => p.exerciseId === exerciseId)).map((t) => t.name)
}

type SuggestedExercise = string | { name: string; seconds?: number }

const SUGGESTED: { name: string; icon: string; sets: number; reps: number; exercises: SuggestedExercise[] }[] = [
  { name: 'Glutes', icon: 'peach', sets: 4, reps: 12, exercises: ['Hip thrust', 'Bulgarian split squat', 'Romanian deadlift', 'Cable kickback'] },
  { name: 'Legs', icon: 'leg', sets: 4, reps: 10, exercises: ['Squat', 'Lunges', 'Leg press', 'Calf raise'] },
  { name: 'Upper body', icon: 'mechanical_arm', sets: 4, reps: 10, exercises: ['Bench press', 'Seated row', 'Shoulder press', 'Lat pulldown'] },
  { name: 'Arms', icon: 'flexed_biceps', sets: 3, reps: 12, exercises: ['Bicep curl', 'Hammer curl', 'Tricep pushdown'] },
  { name: 'Core', icon: 'bullseye', sets: 3, reps: 15, exercises: [{ name: 'Plank', seconds: 45 }, 'Crunches', 'Russian twists'] },
]

export const suggestedPreview = SUGGESTED.map(({ name, icon }) => ({ name, icon }))

/** The starter sessions, reusing exercises already in the library and creating the missing ones. */
export function suggestedSetup(library: Exercise[], startOrder: number) {
  const now = Date.now()
  const created: Exercise[] = []
  const pick = (name: string) => {
    const existing = findByName(name, [...library, ...created])
    if (existing) return existing
    const ex = newExercise(name, CATALOG.find((c) => c.name === name)?.measure ?? 'weight')
    created.push(ex)
    return ex
  }
  const types: SessionType[] = SUGGESTED.map((s, i) => ({
    id: newId(),
    name: s.name,
    icon: s.icon,
    sets: s.sets,
    reps: s.reps,
    exercises: s.exercises.map((item) => {
      const { name, seconds } = typeof item === 'string' ? { name: item, seconds: undefined } : item
      return { ...emptyPlan(pick(name).id), seconds: seconds ?? null }
    }),
    order: startOrder + i,
    createdAt: now + i,
    updatedAt: now,
  }))
  return { types, exercises: created }
}
