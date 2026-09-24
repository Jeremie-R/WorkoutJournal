export type Unit = 'kg' | 'lb'

/** How an exercise is measured. Weight is the usual case; reps is for bodyweight counts, time for holds and cardio. */
export type Measure = 'weight' | 'reps' | 'time'

/** A reusable exercise ("Squat", "Plank"). Shared by every session that includes it, so its progress can be followed. */
export interface Exercise {
  id: string
  name: string
  measure: Measure
  createdAt: number
  updatedAt: number
}

/**
 * An exercise planned inside a session type. Sets and reps belong to the session; an exercise only
 * has its own value, and even that is optional: an empty one is taken from last time.
 */
export interface PlannedExercise {
  exerciseId: string
  /** Default weight in kg (measure 'weight'). */
  weightKg: number | null
  /** Count per set for 'reps' exercises (e.g. 10 push-ups); empty follows the session's reps. */
  reps: number | null
  /** Seconds per set (measure 'time'). */
  seconds: number | null
}

/** A kind of session the user trains, e.g. "Legs": its usual sets and reps, and the exercises it includes. */
export interface SessionType {
  id: string
  name: string
  /** Icon id from the catalog in icons.ts, or `emoji:<char>` for a custom emoji. */
  icon: string
  sets: number
  reps: number
  exercises: PlannedExercise[]
  order: number
  createdAt: number
  updatedAt: number
  /** Session-level weight from the first version; only used when the session has no exercises. */
  weightKg?: number
}

/** An exercise as done in a workout: just its value. Sets are checked off for the workout as a whole. */
export interface LoggedExercise {
  /** null when the session has no exercises: the session itself is logged as a single exercise. */
  exerciseId: string | null
  name: string
  measure: Measure
  weightKg: number | null
  /** Its own count per set, for exercises measured in reps; null follows the workout's reps. */
  reps: number | null
  seconds: number | null
}

/**
 * One logged workout. A set is one round through all its exercises, so sets and reps belong to the
 * workout, not to each exercise. Names and icon are copied so history survives renames and deletions.
 */
export interface Workout {
  id: string
  typeId: string
  typeName: string
  typeIcon: string
  startedAt: number
  finishedAt: number | null
  /** Reps per set, for every exercise without a count of its own. */
  reps: number
  /** One entry per set: was that round completed. */
  done: boolean[]
  exercises: LoggedExercise[]
  note: string
  createdAt: number
  updatedAt: number
}

export interface Profile {
  unit: Unit
  /** 1 = weeks start on Monday, 0 = Sunday. */
  weekStart: 0 | 1
  /** Stepper increment, in the profile's unit. */
  weightStep: number
  /** Where each exercise's starting values come from when logging. */
  prefill: 'default' | 'last'
  keepAwake: boolean
  updatedAt: number
}

export interface Data {
  types: SessionType[]
  workouts: Workout[]
  exercises: Exercise[]
  profile: Profile
}

export const DEFAULT_PROFILE: Profile = {
  unit: 'kg',
  weekStart: 1,
  weightStep: 2.5,
  prefill: 'default',
  keepAwake: false,
  updatedAt: 0,
}

// Stored documents may predate the current shape, so the upgraders below take them loosely typed.
type Stored = any

export function normalizeType(type: Stored): SessionType {
  const exercises: PlannedExercise[] = Array.isArray(type.exercises)
    ? type.exercises.map((p: Stored) => ({
        exerciseId: p.exerciseId,
        weightKg: p.weightKg ?? null,
        reps: p.reps ?? null,
        seconds: p.seconds ?? null,
      }))
    : []
  return { ...type, exercises }
}

/**
 * Brings an older workout (or in-progress draft) to the current shape:
 * - first version: one weight and a list of sets for the whole session, which becomes one exercise;
 * - exercises with their own checked sets: a round counts as done if any exercise was checked in it.
 */
export function upgradeSets<T extends { reps: number; done: boolean[]; exercises: LoggedExercise[] }>(workout: Stored): T {
  if (Array.isArray(workout.done)) return workout as T
  if (Array.isArray(workout.exercises)) {
    const exercises: Stored[] = workout.exercises
    const rounds = Math.max(0, ...exercises.map((ex) => ex.done?.length ?? 0))
    const reps = exercises.find((ex) => ex.measure !== 'time' && ex.reps)?.reps ?? 10
    return {
      ...workout,
      reps,
      done: Array.from({ length: rounds }, (_, i) => exercises.some((ex) => ex.done?.[i])),
      exercises: exercises.map(({ done: _done, ...ex }) => ({ ...ex, reps: ex.measure === 'reps' && ex.reps !== reps ? ex.reps : null })),
    }
  }
  const { sets = [], weightKg = 0, ...rest } = workout
  const counts = new Map<number, number>()
  for (const s of sets as { reps: number }[]) counts.set(s.reps, (counts.get(s.reps) ?? 0) + 1)
  return {
    ...rest,
    // Old sets could each have their own reps; keep the most common value.
    reps: [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 10,
    done: (sets as { done: boolean }[]).map((s) => s.done),
    exercises: [{ exerciseId: null, name: rest.typeName, measure: 'weight', weightKg: weightKg > 0 ? weightKg : null, reps: null, seconds: null }],
  }
}

/** Sorts, fills defaults and upgrades old documents, so every backend hands the UI the same shape. */
export function normalizeData(input: Partial<Data>): Data {
  const types = (input.types ?? []).map(normalizeType).sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
  const workouts = (input.workouts ?? []).map((w) => upgradeSets<Workout>(w)).sort((a, b) => b.startedAt - a.startedAt)
  const exercises = [...(input.exercises ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  return { types, workouts, exercises, profile: { ...DEFAULT_PROFILE, ...input.profile } }
}

export function newId(): string {
  // randomUUID only exists in secure contexts; plain-http LAN testing on a phone isn't one.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
}
