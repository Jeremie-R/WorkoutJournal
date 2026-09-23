import type { Data, Profile, SessionType, Workout } from '../lib/types'

/**
 * Where the data lives. The UI only talks to this interface, so device-only storage
 * and the signed-in cloud storage are interchangeable.
 *
 * Writes resolve when persisted. Backends must push the new state to subscribers
 * straight away (optimistically), so the UI never waits on the network.
 */
export interface Backend {
  kind: 'device' | 'cloud'
  /** Calls `listener` with the full data set once ready, then after every change. */
  subscribe(listener: (data: Data) => void): () => void
  putType(type: SessionType): Promise<void>
  deleteType(id: string): Promise<void>
  putWorkout(workout: Workout): Promise<void>
  deleteWorkout(id: string): Promise<void>
  putProfile(profile: Profile): Promise<void>
}
