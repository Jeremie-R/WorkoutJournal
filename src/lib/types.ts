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

/**
 * An exercise as done in a workout. All its sets use the same values; `done` has one entry per set.
 * Sets and reps come from the session, so every exercise has the same number of sets.
 */
export interface LoggedExercise {
  /** null when the session has no exercises: the session itself is logged as a single exercise. */
  exerciseId: string | null
  name: string
  measure: Measure
  weightKg: number | null
  reps: number | null
  seconds: number | null
  done: boolean[]
}

/** One logged workout. Names and icon are copied so history survives renaming or deleting things. */
export interface Workout {
  id: string
  typeId: string
  typeName: string
  typeIcon: string
  startedAt: number
  finishedAt: number | null
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

/** First-version workouts had one weight and a list of sets for the whole session; they become one logged exercise. */
export function normalizeWorkout(workout: Stored): Workout {
  if (Array.isArray(workout.exercises)) return workout as Workout
  const { sets = [], weightKg = 0, ...rest } = workout
  return { ...rest, exercises: [legacyExercise(rest.typeName, weightKg, sets)] }
}

export function legacyExercise(name: string, weightKg: number, sets: { reps: number; done: boolean }[]): LoggedExercise {
  // Old sets could each have their own reps; keep the most common value.
  const counts = new Map<number, number>()
  for (const s of sets) counts.set(s.reps, (counts.get(s.reps) ?? 0) + 1)
  const reps = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  return {
    exerciseId: null,
    name,
    measure: 'weight',
    weightKg: weightKg > 0 ? weightKg : null,
    reps,
    seconds: null,
    done: sets.map((s) => s.done),
  }
}

/** Sorts, fills defaults and upgrades old documents, so every backend hands the UI the same shape. */
export function normalizeData(input: Partial<Data>): Data {
  const types = (input.types ?? []).map(normalizeType).sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
  const workouts = (input.workouts ?? []).map(normalizeWorkout).sort((a, b) => b.startedAt - a.startedAt)
  const exercises = [...(input.exercises ?? [])].sort((a, b) => a.name.localeCompare(b.name))
  return { types, workouts, exercises, profile: { ...DEFAULT_PROFILE, ...input.profile } }
}

export function newId(): string {
  // randomUUID only exists in secure contexts; plain-http LAN testing on a phone isn't one.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
}
