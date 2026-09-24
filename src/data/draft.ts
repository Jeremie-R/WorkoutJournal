import { useSyncExternalStore } from 'react'
import { legacyExercise, type LoggedExercise } from '../lib/types'

/** The workout currently in progress. Kept on the device so a locked phone or closed tab doesn't lose it. */
export interface Draft {
  typeId: string
  typeName: string
  typeIcon: string
  exercises: LoggedExercise[]
  note: string
  startedAt: number
}

const KEY = 'wj:draft:v2'
const LEGACY_KEY = 'wj:draft:v1'
const listeners = new Set<() => void>()
let cached: Draft | null = read()

function read(): Draft | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as Draft
    // A workout started before exercises existed: one weight and a list of sets.
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (!legacy) return null
    const { weightKg, sets, ...rest } = JSON.parse(legacy)
    const draft: Draft = { ...rest, exercises: [legacyExercise(rest.typeName, weightKg, sets)] }
    localStorage.setItem(KEY, JSON.stringify(draft))
    localStorage.removeItem(LEGACY_KEY)
    return draft
  } catch {
    return null
  }
}

export function setDraft(draft: Draft | null) {
  cached = draft
  if (draft) localStorage.setItem(KEY, JSON.stringify(draft))
  else localStorage.removeItem(KEY)
  listeners.forEach((listener) => listener())
}

/** Updates from the latest draft, so several quick changes (e.g. adding exercises in a row) don't overwrite each other. */
export function updateDraft(change: (draft: Draft) => Draft) {
  if (cached) setDraft(change(cached))
}

export function useDraft(): Draft | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => cached,
  )
}
