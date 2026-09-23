import { useSyncExternalStore } from 'react'
import type { SetEntry } from '../lib/types'

/** The workout currently in progress. Kept on the device so a locked phone or closed tab doesn't lose it. */
export interface Draft {
  typeId: string
  typeName: string
  typeIcon: string
  weightKg: number
  sets: SetEntry[]
  note: string
  startedAt: number
}

const KEY = 'wj:draft:v1'
const listeners = new Set<() => void>()
let cached: Draft | null = read()

function read(): Draft | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Draft) : null
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

export function useDraft(): Draft | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => cached,
  )
}
