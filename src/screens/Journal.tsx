import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { Aura } from '../components/Aura'
import { Calendar } from '../components/Calendar'
import { useToast } from '../components/Feedback'
import { Icon } from '../components/Icon'
import { Segmented } from '../components/Segmented'
import { SessionIcon } from '../components/SessionIcon'
import { useDraft, type Draft } from '../data/draft'
import { readLocalData } from '../data/localBackend'
import { useData } from '../data/store'
import { dayKey, formatDay, formatLongDay, formatMonth, greeting, summarizeWeeks, type WeekSummary } from '../lib/dates'
import type { Data, Workout } from '../lib/types'
import { exerciseName, setCount, workoutLook } from '../lib/workouts'
import { Progress } from './Progress'

export function Journal() {
  const data = useData()!
  const { state } = useAuth()
  const firstName = state.status === 'signedIn' ? state.user.name.split(' ')[0] : ''
  const draft = useDraft()
  const [params, setParams] = useSearchParams()
  const view = params.get('view') === 'progress' ? 'progress' : 'history'
  const summary = useMemo(() => summarizeWeeks(data.workouts, data.profile.weekStart), [data.workouts, data.profile.weekStart])
  useSavedToast(summary)

  return (
    <main className="page">
      <Aura tone="dawn" />
      <header className="page-head">
        <p className="eyebrow">
          {greeting()}
          {firstName && `, ${firstName}`}
        </p>
        <h1 className="title">Your journal</h1>
      </header>

      <ImportBanner />
      {draft && <ResumeBanner draft={draft} />}
      <StreakCard summary={summary} />

      <Segmented
        label="Journal view"
        value={view}
        onChange={(v) => setParams(v === 'progress' ? { view: v } : {}, { replace: true })}
        options={[
          { value: 'history', label: 'History' },
          { value: 'progress', label: 'Progress' },
        ]}
      />

      {view === 'history' ? <History data={data} /> : <Progress data={data} />}
    </main>
  )
}

/** After finishing a workout the log flow lands here with `state.saved`; say so once. */
function useSavedToast(summary: WeekSummary) {
  const location = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const saved = (location.state as { saved?: string } | null)?.saved
  useEffect(() => {
    if (!saved) return
    toast(summary.streak > 1 ? `Workout saved · ${summary.streak} week streak` : 'Workout saved. Nice work!')
    navigate(location.pathname + location.search, { replace: true, state: null })
  }, [saved])
}

function StreakCard({ summary }: { summary: WeekSummary }) {
  const { streak, thisWeek, recentWeeks } = summary
  const hint = thisWeek
    ? `${thisWeek} workout${thisWeek > 1 ? 's' : ''} this week`
    : streak
      ? 'Log one this week to keep it going'
      : 'Log a workout to start your streak'
  const weekFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })
  return (
    <section className="streak card card--glass" aria-label="Weekly streak">
      <SessionIcon icon={streak ? 'fire' : 'seedling'} size={52} />
      <div className="streak__text">
        <p className="streak__count">
          <strong>{streak}</strong> week streak
        </p>
        <p className="streak__hint">{hint}</p>
      </div>
      <div className="streak__weeks" aria-label={`Last ${recentWeeks.length} weeks`}>
        {recentWeeks.map((w, i) => (
          <span
            key={w.start.getTime()}
            className={`streak__week${w.count ? ' is-on' : ''}${i === recentWeeks.length - 1 ? ' is-now' : ''}`}
            title={`Week of ${weekFmt.format(w.start)}: ${w.count} workout${w.count === 1 ? '' : 's'}`}
          />
        ))}
      </div>
    </section>
  )
}

function ResumeBanner({ draft }: { draft: Draft }) {
  const { done, total } = setCount(draft)
  return (
    <Link to="/log/active" className="banner">
      <SessionIcon icon={draft.typeIcon} size={36} />
      <div className="banner__body">
        <p className="banner__title">{draft.typeName} in progress</p>
        <p className="banner__meta">
          {done} of {total} sets done
        </p>
      </div>
      <span className="banner__action">Resume</span>
    </Link>
  )
}

/** Offered after the first sign-in when workouts were logged before having an account. */
function ImportBanner() {
  const { state, importDeviceData } = useAuth()
  const toast = useToast()
  const [local] = useState(() => (state.status === 'signedIn' ? readLocalData() : null))
  const [hidden, setHidden] = useState(false)
  if (!local || hidden || (local.workouts.length === 0 && local.types.length === 0)) return null

  const move = async () => {
    setHidden(true)
    try {
      const count = await importDeviceData()
      toast(`Moved ${count} workout${count === 1 ? '' : 's'} to your account`)
    } catch {
      setHidden(false)
      toast("Couldn't move them. Try again when you're online.")
    }
  }

  return (
    <div className="banner banner--static">
      <Icon name="device" />
      <div className="banner__body">
        <p className="banner__title">Workouts found on this device</p>
        <p className="banner__meta">
          {local.workouts.length} workouts and {local.types.length} sessions from before you signed in.
        </p>
      </div>
      <button className="btn btn--primary btn--sm" onClick={move}>
        Add to account
      </button>
    </div>
  )
}

function History({ data }: { data: Data }) {
  const [month, setMonth] = useState(() => new Date())
  const [selected, setSelected] = useState<string | null>(null)

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const w of data.workouts) map.set(dayKey(w.startedAt), (map.get(dayKey(w.startedAt)) ?? 0) + 1)
    return map
  }, [data.workouts])

  const list = selected ? data.workouts.filter((w) => dayKey(w.startedAt) === selected) : data.workouts

  // Month headers keep a long history easy to scan.
  const groups = useMemo(() => {
    const out: { label: string; items: Workout[] }[] = []
    for (const w of list) {
      const label = formatMonth(new Date(w.startedAt))
      const last = out[out.length - 1]
      if (last?.label === label) last.items.push(w)
      else out.push({ label, items: [w] })
    }
    return out
  }, [list])

  if (data.workouts.length === 0) return <EmptyJournal hasTypes={data.types.length > 0} />

  return (
    <>
      <Calendar
        month={month}
        onMonthChange={setMonth}
        counts={counts}
        selected={selected}
        onSelect={setSelected}
        weekStart={data.profile.weekStart}
      />

      {selected && (
        <div className="list-head">
          <h2 className="section-title">{formatLongDay(new Date(selected + 'T12:00').getTime())}</h2>
          <button className="chip" onClick={() => setSelected(null)}>
            Show all
          </button>
        </div>
      )}

      {groups.map((group) => (
        <section key={group.label} className="history-group">
          {!selected && <h2 className="section-title">{group.label}</h2>}
          <div className="group">
            {group.items.map((w) => (
              <WorkoutRow key={w.id} workout={w} data={data} />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

function WorkoutRow({ workout, data }: { workout: Workout; data: Data }) {
  const { name, icon } = workoutLook(workout, data.types)
  const { done, total } = setCount(workout)
  const named = workout.exercises.filter((ex) => ex.exerciseId)
  return (
    <Link to={`/workout/${workout.id}`} className="row row--link">
      <span className="row__icon">
        <SessionIcon icon={icon} size={34} />
      </span>
      <span className="row__body">
        <span className="row__title">{name}</span>
        <span className="row__meta">
          {formatDay(workout.startedAt)}
          {named.length > 0 && ` · ${named.length} exercise${named.length > 1 ? 's' : ''}`}
          {workout.note && ' · Note'}
        </span>
        {named.length > 0 && <span className="row__meta row__meta--soft row__list">{named.map((ex) => exerciseName(ex, data.exercises)).join(', ')}</span>}
      </span>
      <span className="row__end">
        <span className="row__value">
          {done}
          {done < total && <small className="row__total">/{total}</small>}
        </span>
        <span className="row__meta">sets</span>
      </span>
    </Link>
  )
}

function EmptyJournal({ hasTypes }: { hasTypes: boolean }) {
  return (
    <section className="empty">
      <div className="empty__art">
        <SessionIcon icon="running_shoe" size={96} />
      </div>
      <h2 className="empty__title">Your first entry awaits</h2>
      <p className="empty__text">
        {hasTypes
          ? 'Tap + when you get to the gym. Check off your sets as you go and they’ll show up here.'
          : 'Start by setting up the kinds of sessions you train, like Glutes or Upper body.'}
      </p>
      <Link to={hasTypes ? '/log' : '/setup'} className="btn btn--primary">
        {hasTypes ? 'Log a workout' : 'Set up sessions'}
      </Link>
    </section>
  )
}
