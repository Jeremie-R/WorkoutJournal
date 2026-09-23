import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { Aura } from '../components/Aura'
import { useConfirm, useToast } from '../components/Feedback'
import { GoogleMark, Icon } from '../components/Icon'
import { Segmented } from '../components/Segmented'
import { SessionIcon } from '../components/SessionIcon'
import { saveProfile, saveType, useData } from '../data/store'
import { dayKey } from '../lib/dates'
import type { Data, Profile } from '../lib/types'
import { DEFAULT_STEP, formatNumber, formatWeight, WEIGHT_STEPS } from '../lib/units'
import { suggestedPreview, suggestedSessions } from '../lib/workouts'

export function Setup() {
  const data = useData()!
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'profile' ? 'profile' : 'sessions'

  return (
    <main className="page">
      <Aura tone="mint" />
      <header className="page-head">
        <p className="eyebrow">Make it yours</p>
        <h1 className="title">Setup</h1>
      </header>

      <Segmented
        label="Setup section"
        value={tab}
        onChange={(v) => setParams(v === 'profile' ? { tab: v } : {}, { replace: true })}
        options={[
          { value: 'sessions', label: 'Sessions' },
          { value: 'profile', label: 'Profile' },
        ]}
      />

      {tab === 'sessions' ? <Sessions data={data} /> : <ProfileSettings data={data} />}
    </main>
  )
}

function Sessions({ data }: { data: Data }) {
  const { types, profile } = data

  if (types.length === 0) {
    return (
      <section className="empty">
        <div className="empty__art">
          <SessionIcon icon="flexed_biceps" size={96} />
        </div>
        <h2 className="empty__title">What do you train?</h2>
        <p className="empty__text">
          Create a session for each kind of workout you do, with its usual sets, reps and weight. When you log, you just confirm and go.
        </p>
        <div className="suggest">
          <div className="suggest__icons" aria-hidden="true">
            {suggestedPreview.map((s) => (
              <SessionIcon key={s.name} icon={s.icon} size={30} />
            ))}
          </div>
          <p className="suggest__names">{suggestedPreview.map((s) => s.name).join(' · ')}</p>
          <button className="btn btn--secondary btn--block" onClick={() => suggestedSessions(profile.unit, 0).forEach(saveType)}>
            Add these suggestions
          </button>
        </div>
        <Link to="/setup/session/new" className="btn btn--primary btn--block">
          <Icon name="plus" size={18} /> Create your own
        </Link>
      </section>
    )
  }

  return (
    <section className="stack">
      <div className="group">
        {types.map((type) => (
          <Link key={type.id} to={`/setup/session/${type.id}`} className="row row--link">
            <span className="row__icon">
              <SessionIcon icon={type.icon} size={34} />
            </span>
            <span className="row__body">
              <span className="row__title">{type.name}</span>
              <span className="row__meta">
                {type.sets} sets × {type.reps} reps · {formatWeight(type.weightKg, profile.unit)}
              </span>
            </span>
            <Icon name="chevron" size={20} />
          </Link>
        ))}
      </div>
      <Link to="/setup/session/new" className="btn btn--secondary btn--block">
        <Icon name="plus" size={18} /> New session
      </Link>
    </section>
  )
}

function ProfileSettings({ data }: { data: Data }) {
  const { profile } = data
  const [name, setName] = useState(profile.name)
  const set = (patch: Partial<Profile>) => saveProfile({ ...profile, ...patch })

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = Object.assign(document.createElement('a'), { href: url, download: `workout-journal-${dayKey(Date.now())}.json` })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="stack">
      <AccountCard />

      <section>
        <h2 className="section-title">You</h2>
        <div className="group group--form">
          <label className="form-row">
            <span className="form-row__label">Name</span>
            <input
              className="input input--bare"
              value={name}
              placeholder="Optional"
              autoComplete="given-name"
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() !== profile.name && set({ name: name.trim() })}
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="section-title">Preferences</h2>
        <div className="group group--form">
          <div className="form-row">
            <span className="form-row__label">Units</span>
            <Segmented
              size="sm"
              label="Units"
              value={profile.unit}
              onChange={(unit) => set({ unit, weightStep: DEFAULT_STEP[unit] })}
              options={[
                { value: 'kg', label: 'kg' },
                { value: 'lb', label: 'lb' },
              ]}
            />
          </div>
          <div className="form-row">
            <span className="form-row__label">Week starts on</span>
            <Segmented
              size="sm"
              label="Week starts on"
              value={profile.weekStart}
              onChange={(weekStart) => set({ weekStart })}
              options={[
                { value: 1, label: 'Mon' },
                { value: 0, label: 'Sun' },
              ]}
            />
          </div>
          <div className="form-row form-row--stack">
            <span className="form-row__label">
              Weight step
              <small>How much + and − change the weight</small>
            </span>
            <div className="chip-row chip-row--wrap">
              {WEIGHT_STEPS[profile.unit].map((step) => (
                <button key={step} className={`chip${profile.weightStep === step ? ' is-active' : ''}`} onClick={() => set({ weightStep: step })}>
                  {formatNumber(step)} {profile.unit}
                </button>
              ))}
            </div>
          </div>
          <div className="form-row form-row--stack">
            <span className="form-row__label">
              Starting weight
              <small>What the weight is set to when you log a session</small>
            </span>
            <Segmented
              size="sm"
              label="Starting weight"
              value={profile.prefill}
              onChange={(prefill) => set({ prefill })}
              options={[
                { value: 'default', label: 'Session default' },
                { value: 'last', label: 'Last workout' },
              ]}
            />
          </div>
          <label className="form-row">
            <span className="form-row__label">
              Keep screen on
              <small>While a workout is in progress</small>
            </span>
            <input type="checkbox" className="switch" aria-label="Keep screen on" checked={profile.keepAwake} onChange={(e) => set({ keepAwake: e.target.checked })} />
          </label>
        </div>
      </section>

      <section>
        <h2 className="section-title">Your data</h2>
        <div className="group">
          <button className="row row--link" onClick={exportData}>
            <span className="row__icon row__icon--plain">
              <Icon name="download" />
            </span>
            <span className="row__body">
              <span className="row__title">Export as JSON</span>
              <span className="row__meta">
                {data.workouts.length} workouts, {data.types.length} sessions
              </span>
            </span>
          </button>
        </div>
      </section>

      <p className="fineprint">
        Workout Journal {__APP_VERSION__} · 3D icons from Microsoft Fluent Emoji (MIT)
      </p>
    </div>
  )
}

function AccountCard() {
  const { state, cloudEnabled, signInWithGoogle, signOut } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()

  if (state.status === 'signedIn') {
    const { user } = state
    return (
      <section className="card account">
        {user.photoURL ? (
          <img className="account__avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
        ) : (
          <span className="account__avatar account__avatar--initial">{(user.name || user.email).charAt(0).toUpperCase()}</span>
        )}
        <div className="account__body">
          <p className="account__name">{user.name || 'Signed in'}</p>
          <p className="account__meta account__meta--line">{user.email}</p>
          <p className="account__meta account__meta--sync">
            <Icon name="cloud" size={14} /> Synced to your account
          </p>
        </div>
        <button className="btn btn--secondary btn--sm" onClick={signOut}>
          Sign out
        </button>
      </section>
    )
  }

  const google = async () => {
    try {
      await signInWithGoogle()
    } catch {
      toast("Couldn't sign in with Google. Please try again.")
    }
  }

  const leave = async () => {
    const ok = await confirm({
      title: 'Back to the welcome screen?',
      message: 'Your workouts stay saved on this device and will be here when you come back.',
      confirmLabel: 'Continue',
    })
    if (ok) signOut()
  }

  return (
    <section className="card account account--device">
      <span className="account__avatar account__avatar--device">
        <Icon name="device" />
      </span>
      <div className="account__body">
        <p className="account__name">Saved on this device</p>
        <p className="account__meta">
          {cloudEnabled ? 'Sign in to back up your journal and use it on other devices.' : 'Google sign-in is coming soon.'}
        </p>
      </div>
      {cloudEnabled ? (
        <button className="btn btn--primary btn--block" onClick={google}>
          <span className="btn__google">
            <GoogleMark size={16} />
          </span>
          Continue with Google
        </button>
      ) : (
        <button className="btn btn--ghost btn--sm account__leave" onClick={leave}>
          <Icon name="logout" size={16} /> Welcome screen
        </button>
      )}
    </section>
  )
}
