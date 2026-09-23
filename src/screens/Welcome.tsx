import { useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { Dunes } from '../components/Aura'
import { GoogleMark } from '../components/Icon'
import { SessionIcon } from '../components/SessionIcon'

export function Welcome() {
  const { cloudEnabled, signInWithGoogle, continueWithoutAccount } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const google = async () => {
    setBusy(true)
    setError('')
    try {
      await signInWithGoogle()
    } catch (e) {
      console.error(e)
      setError("Couldn't sign in with Google. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="welcome">
      <div className="welcome__hero">
        <Dunes />
        <div className="welcome__art">
          <SessionIcon icon="person_lifting_weights" size={168} className="welcome__main" />
          <SessionIcon icon="sparkles" size={56} className="welcome__spark welcome__spark--a" />
          <SessionIcon icon="fire" size={48} className="welcome__spark welcome__spark--b" />
        </div>
      </div>

      <div className="welcome__body">
        <h1 className="title title--xl welcome__title">
          Show up, lift, and see yourself grow
        </h1>

        <div className="welcome__actions">
          <button className="btn btn--primary btn--block btn--lg" onClick={google} disabled={!cloudEnabled || busy}>
            <span className="btn__google">
              <GoogleMark size={18} />
            </span>
            {busy ? 'Signing in…' : 'Continue with Google'}
          </button>
          <button className="btn btn--secondary btn--block btn--lg" onClick={continueWithoutAccount}>
            Continue without an account
          </button>
        </div>

        {error && <p className="welcome__error" role="alert">{error}</p>}
        <p className="fineprint">
          {cloudEnabled
            ? 'Sign in to keep your journal safe and in sync. Without an account, workouts are saved on this device only.'
            : 'Google sign-in is coming soon. For now, workouts are saved on this device only.'}
        </p>
      </div>
    </main>
  )
}
