import { useSyncExternalStore } from 'react'
import { normalizeData, type Data, type Exercise, type Profile, type SessionType, type Workout } from '../lib/types'
import type { Backend } from './backend'

let backend: Backend | null = null
let data: Data | null = null
let unsubscribe: (() => void) | null = null
const listeners = new Set<() => void>()

const emit = () => listeners.forEach((listener) => listener())

export function setBackend(next: Backend | null) {
  if (next === backend) return
  unsubscribe?.()
  unsubscribe = null
  backend = next
  data = null
  emit()
  if (next) {
    unsubscribe = next.subscribe((fresh) => {
      data = fresh
      emit()
    })
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Current data, or null while the backend is still loading. */
export function useData(): Data | null {
  return useSyncExternalStore(subscribe, () => data)
}

// Writes are optimistic and fire-and-forget: the in-memory copy updates right away
// (so a screen we navigate to already sees the change), and a cloud write may sit
// in the offline queue until the gym's signal comes back.
function write(change: (d: Data) => Partial<Data>, persist: (b: Backend) => Promise<void>) {
  if (!backend || !data) return
  data = normalizeData({ ...data, ...change(data) })
  emit()
  persist(backend).catch((error) => {
    console.error('Save failed', error)
    window.dispatchEvent(new CustomEvent('wj:save-error'))
  })
}

const upsert = <T extends { id: string }>(list: T[], item: T) => [...list.filter((x) => x.id !== item.id), item]

export function saveType(type: SessionType) {
  const next = { ...type, updatedAt: Date.now() }
  write((d) => ({ types: upsert(d.types, next) }), (b) => b.putType(next))
}

export function deleteType(id: string) {
  write((d) => ({ types: d.types.filter((t) => t.id !== id) }), (b) => b.deleteType(id))
}

export function saveWorkout(workout: Workout) {
  const next = { ...workout, updatedAt: Date.now() }
  write((d) => ({ workouts: upsert(d.workouts, next) }), (b) => b.putWorkout(next))
}

export function deleteWorkout(id: string) {
  write((d) => ({ workouts: d.workouts.filter((w) => w.id !== id) }), (b) => b.deleteWorkout(id))
}

export function saveExercise(exercise: Exercise) {
  const next = { ...exercise, updatedAt: Date.now() }
  write((d) => ({ exercises: upsert(d.exercises, next) }), (b) => b.putExercise(next))
}

/** Removes an exercise from the library and from every session that includes it. Past workouts keep their copy. */
export function deleteExercise(id: string) {
  if (!data) return
  for (const type of data.types) {
    if (type.exercises.some((p) => p.exerciseId === id)) {
      saveType({ ...type, exercises: type.exercises.filter((p) => p.exerciseId !== id) })
    }
  }
  write((d) => ({ exercises: d.exercises.filter((e) => e.id !== id) }), (b) => b.deleteExercise(id))
}

export function saveProfile(profile: Profile) {
  const next = { ...profile, updatedAt: Date.now() }
  write(() => ({ profile: next }), (b) => b.putProfile(next))
}
