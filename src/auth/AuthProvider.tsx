import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { cloudEnabled } from '../data/config'
import { clearLocalData, createLocalBackend, readLocalData } from '../data/localBackend'
import { setBackend } from '../data/store'

type CloudModule = typeof import('../data/firebase')
type AccountUser = import('../data/firebase').AccountUser

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  /** Using the app without an account: data stays in this browser. */
  | { status: 'device' }
  | { status: 'signedIn'; user: AccountUser }

interface AuthContextValue {
  state: AuthState
  cloudEnabled: boolean
  signInWithGoogle: () => Promise<void>
  continueWithoutAccount: () => void
  signOut: () => Promise<void>
  /** Moves workouts saved on this device into the signed-in account. */
  importDeviceData: () => Promise<number>
}

const DEVICE_KEY = 'wj:device-mode'
const deviceMode = () => localStorage.getItem(DEVICE_KEY) === '1'
const idleState = (): AuthState => (deviceMode() ? { status: 'device' } : { status: 'signedOut' })

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth outside AuthProvider')
  return value
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => (cloudEnabled ? { status: 'loading' } : idleState()))
  const cloud = useRef<CloudModule | null>(null)

  useEffect(() => {
    if (!cloudEnabled) return
    let cancelled = false
    let unwatch = () => {}
    import('../data/firebase')
      .then((mod) => {
        if (cancelled) return
        cloud.current = mod
        unwatch = mod.watchUser((user) => setState(user ? { status: 'signedIn', user } : idleState()))
      })
      .catch((error) => {
        console.error('Could not load sign-in', error)
        setState(idleState())
      })
    return () => {
      cancelled = true
      unwatch()
    }
  }, [])

  // Point the data store at the storage that matches who's using the app.
  const uid = state.status === 'signedIn' ? state.user.uid : null
  useEffect(() => {
    if (state.status === 'device') setBackend(createLocalBackend())
    else if (uid && cloud.current) setBackend(cloud.current.createCloudBackend(uid))
    else setBackend(null)
  }, [state.status, uid])

  const signInWithGoogle = useCallback(async () => {
    if (!cloud.current) throw new Error('Google sign-in is not set up yet')
    await cloud.current.signInWithGoogle()
  }, [])

  const continueWithoutAccount = useCallback(() => {
    localStorage.setItem(DEVICE_KEY, '1')
    setState({ status: 'device' })
  }, [])

  const signOut = useCallback(async () => {
    localStorage.removeItem(DEVICE_KEY)
    if (cloud.current && state.status === 'signedIn') await cloud.current.signOut()
    setState({ status: 'signedOut' })
  }, [state.status])

  const importDeviceData = useCallback(async () => {
    if (!cloud.current || !uid) return 0
    const local = readLocalData()
    await cloud.current.importIntoAccount(uid, local)
    clearLocalData()
    return local.workouts.length
  }, [uid])

  return (
    <AuthContext.Provider value={{ state, cloudEnabled, signInWithGoogle, continueWithoutAccount, signOut, importDeviceData }}>
      {children}
    </AuthContext.Provider>
  )
}
