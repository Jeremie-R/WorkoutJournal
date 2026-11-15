// Cloud storage + Google sign-in. Only loaded (dynamic import) when the Firebase
// env vars are set, so device-only mode never downloads the Firebase SDK.
import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  deleteUser,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  reauthenticateWithPopup,
  reauthenticateWithRedirect,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { normalizeData, type Data, type Exercise, type Profile, type SessionType, type Workout } from '../lib/types'
import type { Backend } from './backend'
import { firebaseConfig } from './config'

const app = initializeApp(firebaseConfig!)
const auth = getAuth(app)
// Persistent cache: reads work offline and writes queue until the connection returns.
const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  ignoreUndefinedProperties: true,
})

export interface AccountUser {
  uid: string
  name: string
  email: string
  photoURL: string | null
}

const toAccount = (user: User): AccountUser => ({
  uid: user.uid,
  name: user.displayName ?? '',
  email: user.email ?? '',
  photoURL: user.photoURL,
})

/** Set while the account deletion waits on a redirect to Google to confirm who's deleting it. */
const PENDING_DELETE = 'wj:delete-account'

export function watchUser(callback: (user: AccountUser | null) => void) {
  getRedirectResult(auth)
    .then(async (result) => {
      const pending = localStorage.getItem(PENDING_DELETE)
      if (!pending) return
      localStorage.removeItem(PENDING_DELETE)
      // Back from confirming the account: finish deleting it. (Cancelled: nothing was deleted.)
      if (result?.operationType === 'reauthenticate' && result.user.uid === pending) {
        await deleteEverything(result.user)
        window.dispatchEvent(new CustomEvent('wj:account-deleted'))
      }
    })
    // Surfaces errors from a redirect sign-in that finished while the page was away.
    .catch((error) => console.error('Sign-in redirect failed', error))
  return onAuthStateChanged(auth, (user) => callback(user ? toAccount(user) : null))
}

/** Running as an installed app: the Android app (a Trusted Web Activity) or a home-screen install. */
function isInstalledApp() {
  return window.matchMedia('(display-mode: standalone)').matches || document.referrer.startsWith('android-app://')
}

const isPopupUnavailable = (code?: string) =>
  code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment'
const isPopupCancelled = (code?: string) => code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request'

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  // An installed app opens popups as a separate browser tab that can't report back, so go
  // straight to the full-page redirect (it stays first-party through our own /__/auth handler).
  if (isInstalledApp()) {
    await signInWithRedirect(auth, provider)
    return
  }
  try {
    await signInWithPopup(auth, provider)
  } catch (error) {
    const code = (error as { code?: string }).code
    // Some mobile browsers block popups; redirect instead.
    if (isPopupUnavailable(code)) {
      await signInWithRedirect(auth, provider)
      return
    }
    if (isPopupCancelled(code)) return
    throw error
  }
}

export const signOut = () => firebaseSignOut(auth)

/** Deletes the journal (every document under users/{uid}), then the account itself. */
async function deleteEverything(user: User) {
  const userDoc = doc(db, 'users', user.uid)
  const refs = [userDoc]
  for (const name of ['types', 'workouts', 'exercises']) {
    const snap = await getDocs(collection(userDoc, name))
    refs.push(...snap.docs.map((d) => d.ref))
  }
  for (let i = 0; i < refs.length; i += 450) {
    const batch = writeBatch(db)
    for (const ref of refs.slice(i, i + 450)) batch.delete(ref)
    await batch.commit()
  }
  await deleteUser(user)
}

/**
 * Permanently deletes the signed-in account and its journal. Google first confirms the account
 * (it only lets a recent sign-in delete an account). Resolves to false if that was cancelled; in the
 * installed app the confirmation is a full-page redirect and the deletion finishes in watchUser.
 */
export async function deleteAccount(): Promise<boolean> {
  const user = auth.currentUser
  if (!user) return false
  const provider = new GoogleAuthProvider()
  if (user.email) provider.setCustomParameters({ login_hint: user.email })
  const redirect = async () => {
    localStorage.setItem(PENDING_DELETE, user.uid)
    await reauthenticateWithRedirect(user, provider)
  }
  if (isInstalledApp()) {
    await redirect()
    return false
  }
  try {
    await reauthenticateWithPopup(user, provider)
  } catch (error) {
    const code = (error as { code?: string }).code
    if (isPopupUnavailable(code)) {
      await redirect()
      return false
    }
    if (isPopupCancelled(code)) return false
    throw error
  }
  await deleteEverything(user)
  return true
}

// Layout: users/{uid} holds the profile; users/{uid}/types, /workouts and /exercises hold the rest.
export function createCloudBackend(uid: string): Backend {
  const userDoc = doc(db, 'users', uid)
  const typesCol = collection(userDoc, 'types')
  const workoutsCol = collection(userDoc, 'workouts')
  const exercisesCol = collection(userDoc, 'exercises')

  return {
    kind: 'cloud',
    subscribe(listener) {
      let types: SessionType[] | null = null
      let workouts: Workout[] | null = null
      let exercises: Exercise[] | null = null
      let profile: Profile | undefined | null = null
      const emit = () => {
        if (types && workouts && exercises && profile !== null) listener(normalizeData({ types, workouts, exercises, profile }))
      }
      const unsubs = [
        onSnapshot(typesCol, (snap) => {
          types = snap.docs.map((d) => d.data() as SessionType)
          emit()
        }),
        onSnapshot(workoutsCol, (snap) => {
          workouts = snap.docs.map((d) => d.data() as Workout)
          emit()
        }),
        onSnapshot(exercisesCol, (snap) => {
          exercises = snap.docs.map((d) => d.data() as Exercise)
          emit()
        }),
        onSnapshot(userDoc, (snap) => {
          profile = (snap.data()?.profile as Profile | undefined) ?? undefined
          emit()
        }),
      ]
      return () => unsubs.forEach((unsub) => unsub())
    },
    putType: (type) => setDoc(doc(typesCol, type.id), type),
    deleteType: (id) => deleteDoc(doc(typesCol, id)),
    putWorkout: (workout) => setDoc(doc(workoutsCol, workout.id), workout),
    deleteWorkout: (id) => deleteDoc(doc(workoutsCol, id)),
    putExercise: (exercise) => setDoc(doc(exercisesCol, exercise.id), exercise),
    deleteExercise: (id) => deleteDoc(doc(exercisesCol, id)),
    putProfile: (profile) => setDoc(userDoc, { profile }, { merge: true }),
  }
}

/** Copies device-only data into the signed-in account (used once, after first sign-in). */
export async function importIntoAccount(uid: string, data: Data) {
  const userDoc = doc(db, 'users', uid)
  const writes = [
    ...data.types.map((t) => [doc(userDoc, 'types', t.id), t] as const),
    ...data.workouts.map((w) => [doc(userDoc, 'workouts', w.id), w] as const),
    ...data.exercises.map((e) => [doc(userDoc, 'exercises', e.id), e] as const),
  ]
  // Firestore batches are capped at 500 writes.
  for (let i = 0; i < writes.length; i += 450) {
    const batch = writeBatch(db)
    for (const [ref, value] of writes.slice(i, i + 450)) batch.set(ref, value)
    await batch.commit()
  }
}
