import { normalizeData, type Data } from '../lib/types'
import type { Backend } from './backend'

const KEY = 'wj:data:v1'

export function readLocalData(): Data {
  try {
    const raw = localStorage.getItem(KEY)
    return normalizeData(raw ? JSON.parse(raw) : {})
  } catch {
    return normalizeData({})
  }
}

export function clearLocalData() {
  localStorage.removeItem(KEY)
}

/** Keeps everything in this browser's localStorage. Used before (or without) signing in. */
export function createLocalBackend(): Backend {
  let data = readLocalData()
  const listeners = new Set<(data: Data) => void>()
  const emit = () => listeners.forEach((listener) => listener(data))

  const commit = async (next: Partial<Data>) => {
    data = normalizeData({ ...data, ...next })
    localStorage.setItem(KEY, JSON.stringify(data))
    emit()
  }

  // Another tab changed the data.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return
    data = readLocalData()
    emit()
  }

  return {
    kind: 'device',
    subscribe(listener) {
      if (listeners.size === 0) window.addEventListener('storage', onStorage)
      listeners.add(listener)
      listener(data)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) window.removeEventListener('storage', onStorage)
      }
    },
    putType: (type) => commit({ types: [...data.types.filter((t) => t.id !== type.id), type] }),
    deleteType: (id) => commit({ types: data.types.filter((t) => t.id !== id) }),
    putWorkout: (workout) => commit({ workouts: [...data.workouts.filter((w) => w.id !== workout.id), workout] }),
    deleteWorkout: (id) => commit({ workouts: data.workouts.filter((w) => w.id !== id) }),
    putProfile: (profile) => commit({ profile }),
  }
}
