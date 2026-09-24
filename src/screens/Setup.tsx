import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { Aura } from '../components/Aura'
import { useConfirm, useToast } from '../components/Feedback'
import { GoogleMark, Icon } from '../components/Icon'
import { Segmented } from '../components/Segmented'
import { SessionIcon } from '../components/SessionIcon'
import { saveExercise, saveProfile, saveType, useData } from '../data/store'
import { MEASURE_LABEL } from '../lib/catalog'
import { dayKey } from '../lib/dates'
import type { Data, Profile } from '../lib/types'
import { DEFAULT_STEP, formatNumber, WEIGHT_STEPS } from '../lib/units'
import { sessionMeta, suggestedPreview, suggestedSetup, usedIn } from '../lib/workouts'

type Tab = 'sessions' | 'exercises' | 'profile'

export function Setup() {
  const data = useData()!
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'profile' ? 'profile' : params.get('tab') === 'exercises' ? 'exercises' : 'sessions'

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
        onChange={(v) => setParams(v === 'sessions' ? {} : { tab: v }, { replace: true })}
        options={[
          { value: 'sessions', label: 'Sessions' },
          { value: 'exercises', label: 'Exercises' },
          { value: 'profile', label: 'Profile' },
        ]}
      />

      {tab === 'sessions' && <Sessions data={data} />}
      {tab === 'exercises' && <Exercises data={data} />}
      {tab === 'profile' && <ProfileSettings data={data} />}
    </main>
  )
}

function Sessions({ data }: { data: Data }) {
  const { types, exercises } = data

  const addSuggestions = () => {
    const setup = suggestedSetup(exercises, 0)
    setup.exercises.forEach(saveExercise)
    setup.types.forEach(saveType)
  }

  if (types.length === 0) {
    return (
      <section className="empty">
        <div className="empty__art">
          <SessionIcon icon="flexed_biceps" size={96} />
        </div>
        <h2 className="empty__title">What do you train?</h2>
        <p className="empty__text">
          Create a session for each kind of workout you do, like Legs, and the exercises it includes. When you log, you just confirm and go.
        </p>
        <div className="suggest">
          <div className="suggest__icons" aria-hidden="true">
            {suggestedPreview.map((s) => (
              <SessionIcon key={s.name} icon={s.icon} size={30} />
            ))}
          </div>
          <p className="suggest__names">{suggestedPreview.map((s) => s.name).join(' · ')}</p>
          <button className="btn btn--secondary btn--block" onClick={addSuggestions}>
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
              <span className="row__meta">{sessionMeta(type)}</span>
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

function Exercises({ data }: { data: Data }) {
  const { exercises, types, workouts } = data

  if (exercises.length === 0) {
    return (
      <section className="empty">
        <div className="empty__art">
          <SessionIcon icon="person_lifting_weights" size={96} />
        </div>
        <h2 className="empty__title">Your exercises</h2>
        <p className="empty__text">Exercises you add to sessions show up here. The same exercise can be part of several sessions, and its progress follows it everywhere.</p>
      </section>
    )
  }

  return (
    <section className="stack">
      <div className="group">
        {exercises.map((exercise) => {
          const sessions = usedIn(exercise.id, types)
          const times = workouts.filter((w) => w.exercises.some((ex) => ex.exerciseId === exercise.id && ex.done.some(Boolean))).length
          return (
            <Link key={exercise.id} to={`/setup/exercise/${exercise.id}`} className="row row--link row--compact">
              <span className="row__body">
                <span className="row__title">{exercise.name}</span>
                <span className="row__meta">
                  {MEASURE_LABEL[exercise.measure]}
                  {sessions.length ? ` · ${sessions.join(', ')}` : ' · not in a session'}
                  {times > 0 && ` · done ${times}×`}
                </span>
              </span>
              <Icon name="chevron" size={20} />
            </Link>
          )
        })}
      </div>
      <p className="fineprint fineprint--left">Add exercises from a session’s setup or during a workout.</p>
    </section>
  )
}

function ProfileSettings({ data }: { data: Data }) {
  const { profile } = data
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
              Starting values
              <small>What each exercise’s weight, reps or time start at when you log. Empty values always come from last time.</small>
            </span>
            <Segmented
              size="sm"
              label="Starting values"
              value={profile.prefill}
              onChange={(prefill) => set({ prefill })}
              options={[
                { value: 'default', label: 'Session setup' },
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
                {data.workouts.length} workouts, {data.types.length} sessions, {data.exercises.length} exercises
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
