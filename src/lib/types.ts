export type Unit = 'kg' | 'lb'

/** A kind of session the user trains, e.g. "Glutes" or "Upper body". Set up once, logged many times. */
export interface SessionType {
  id: string
  name: string
  /** Icon id from the catalog in icons.ts, or `emoji:<char>` for a custom emoji. */
  icon: string
  sets: number
  reps: number
  /** Default weight, always stored in kg. 0 means bodyweight. */
  weightKg: number
  order: number
  createdAt: number
  updatedAt: number
}

export interface SetEntry {
  reps: number
  done: boolean
}

/** One logged workout. Name and icon are copied so history survives renaming or deleting a session type. */
export interface Workout {
  id: string
  typeId: string
  typeName: string
  typeIcon: string
  startedAt: number
  finishedAt: number | null
  weightKg: number
  sets: SetEntry[]
  note: string
  createdAt: number
  updatedAt: number
}

export interface Profile {
  name: string
  unit: Unit
  /** 1 = weeks start on Monday, 0 = Sunday. */
  weekStart: 0 | 1
  /** Stepper increment, in the profile's unit. */
  weightStep: number
  /** Where the weight on the "confirm" screen comes from. */
  prefill: 'default' | 'last'
  keepAwake: boolean
  updatedAt: number
}

export interface Data {
  types: SessionType[]
  workouts: Workout[]
  profile: Profile
}

export const DEFAULT_PROFILE: Profile = {
  name: '',
  unit: 'kg',
  weekStart: 1,
  weightStep: 2.5,
  prefill: 'default',
  keepAwake: false,
  updatedAt: 0,
}

/** Sorts and fills defaults so every backend hands the UI the same shape. */
export function normalizeData(input: Partial<Data>): Data {
  const types = [...(input.types ?? [])].sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
  const workouts = [...(input.workouts ?? [])].sort((a, b) => b.startedAt - a.startedAt)
  return { types, workouts, profile: { ...DEFAULT_PROFILE, ...input.profile } }
}

export function newId(): string {
  // randomUUID only exists in secure contexts; plain-http LAN testing on a phone isn't one.
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('')
}
