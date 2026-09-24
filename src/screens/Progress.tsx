import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { LineChart } from '../components/Charts'
import { SessionIcon } from '../components/SessionIcon'
import { formatDay, formatShort } from '../lib/dates'
import type { Data, LoggedExercise, Measure, Workout } from '../lib/types'
import { formatNumber, formatSeconds, toUnit } from '../lib/units'
import { exerciseName, formatValue, repsOf, setCount, trackKey, workoutLook } from '../lib/workouts'

const MAX_POINTS = 20
const DAY = 86_400_000

interface Occurrence {
  at: number
  sessionName: string
  workout: Workout
  ex: LoggedExercise
}

interface Track {
  key: string
  name: string
  measure: Measure
  /** Oldest first. Only workouts where at least one set was checked off. */
  occurrences: Occurrence[]
}

/** The number a track is followed by: weight when there is one, otherwise reps or time per set. */
type Metric = 'weight' | 'reps' | 'time'

/**
 * Progress per exercise, across every session it appears in: the same "Squat" in Legs and in
 * Glutes is one line. Sessions without exercises are followed as a whole.
 */
export function Progress({ data }: { data: Data }) {
  const { unit } = data.profile

  const tracks = useMemo(() => {
    const byKey = new Map<string, Track>()
    for (const w of data.workouts) {
      if (setCount(w).done === 0) continue
      const session = workoutLook(w, data.types)
      for (const ex of w.exercises) {
        const key = trackKey(w, ex)
        let track = byKey.get(key)
        if (!track) {
          const library = ex.exerciseId ? data.exercises.find((e) => e.id === ex.exerciseId) : undefined
          track = {
            key,
            name: ex.exerciseId ? exerciseName(ex, data.exercises) : session.name,
            measure: library?.measure ?? ex.measure,
            occurrences: [],
          }
          byKey.set(key, track)
        }
        track.occurrences.push({ at: w.startedAt, sessionName: session.name, workout: w, ex })
      }
    }
    // Workouts come newest first: tracks are ordered by most recent, occurrences flipped to oldest first.
    return [...byKey.values()].map((t) => ({ ...t, occurrences: t.occurrences.reverse() }))
  }, [data.workouts, data.types, data.exercises])

  const [picked, setPicked] = useState<string | null>(null)
  const track = tracks.find((t) => t.key === picked) ?? tracks[0]

  if (!track) {
    return (
      <section className="empty">
        <div className="empty__art">
          <SessionIcon icon="seedling" size={96} />
        </div>
        <h2 className="empty__title">Progress grows here</h2>
        <p className="empty__text">After a few workouts you’ll see how each exercise moves over time: weight, reps or time.</p>
      </section>
    )
  }

  const metric: Metric =
    track.measure === 'time' ? 'time' : track.measure === 'weight' && track.occurrences.some((o) => o.ex.weightKg) ? 'weight' : 'reps'
  const valueOf = (o: Occurrence): number | null =>
    metric === 'weight' ? (o.ex.weightKg ? Number(toUnit(o.ex.weightKg, unit).toFixed(2)) : null) : metric === 'time' ? o.ex.seconds : repsOf(o.ex, o.workout.reps)
  const format = metric === 'time' ? formatSeconds : formatNumber
  const metricUnit = metric === 'weight' ? unit : metric === 'reps' ? 'reps' : ''
  const show = (v: number) => `${format(v)}${metricUnit && ` ${metricUnit}`}`

  const all = track.occurrences
  const measured = all.flatMap((o) => {
    const v = valueOf(o)
    return v === null ? [] : [{ ...o, value: v }]
  })
  const recentMeasured = measured.slice(-MAX_POINTS)
  const values = measured.map((m) => m.value)
  const change = measured.length ? measured[measured.length - 1].value - measured[0].value : 0

  // Reps completed (or time, for timed exercises): checked-off sets × reps per set.
  const timed = metric === 'time'
  const volume = (o: Occurrence) => setCount(o.workout).done * ((timed ? o.ex.seconds : repsOf(o.ex, o.workout.reps)) ?? 0)
  const now = Date.now()
  const within = (from: number, to: number) => all.filter((o) => o.at > now - from * DAY && o.at <= now - to * DAY).reduce((sum, o) => sum + volume(o), 0)
  const last30 = within(30, 0)
  const prev30 = within(60, 30)
  const pct = prev30 > 0 ? Math.round(((last30 - prev30) / prev30) * 100) : null

  return (
    <div className="progress">
      <div className="chip-row" role="tablist" aria-label="Exercise">
        {tracks.map((t) => (
          <button key={t.key} role="tab" aria-selected={t.key === track.key} className={`chip${t.key === track.key ? ' is-active' : ''}`} onClick={() => setPicked(t.key)}>
            {t.name}
          </button>
        ))}
      </div>

      <div className="tiles">
        <div className="tile tile--wide">
          <span className="tile__label">{timed ? 'Time' : 'Reps'} completed · last 30 days</span>
          <span className="tile__value tile__value--lg">
            {timed ? formatSeconds(last30) : formatNumber(last30)}
            {!timed && <small> reps</small>}
          </span>
          <span className="tile__delta">
            {pct === null
              ? last30
                ? 'Nothing in the 30 days before'
                : 'Nothing in the last 60 days'
              : pct === 0
                ? 'Same as the previous 30 days'
                : `${pct > 0 ? '↑' : '↓'} ${Math.abs(pct)}% vs the previous 30 days`}
          </span>
        </div>
        <Tile label="Times done" value={String(all.length)} />
        <Tile label="Latest" value={measured.length ? show(measured[measured.length - 1].value) : '—'} />
        <Tile label="Best" value={values.length ? show(Math.max(...values)) : '—'} />
        <Tile
          label={measured.length ? `Since ${formatShort(measured[0].at)}` : 'Change'}
          value={!measured.length ? '—' : change === 0 ? '±0' : `${change > 0 ? '+' : '−'}${show(Math.abs(change))}`}
        />
      </div>

      {recentMeasured.length > 0 ? (
        <section className="card chart-card">
          <h2 className="chart-card__title">{metric === 'weight' ? 'Weight' : metric === 'time' ? 'Time per set' : 'Reps per set'}</h2>
          <p className="chart-card__sub">
            {metricUnit ? `${metricUnit}, ` : ''}
            {recentMeasured.length < measured.length ? `last ${recentMeasured.length} times` : 'each time'}
          </p>
          <LineChart
            ariaLabel={`${track.name} ${metric} over time`}
            unit={metricUnit}
            format={format}
            points={recentMeasured.map((m) => ({ value: m.value, label: formatShort(m.at) }))}
          />
        </section>
      ) : (
        <p className="fineprint">Add a {metric === 'time' ? 'time' : 'weight'} to this exercise during a workout to follow it here.</p>
      )}

      <section>
        <h2 className="section-title">Recent</h2>
        <div className="group">
          {[...all]
            .reverse()
            .slice(0, 6)
            .map((o) => {
              const { done, total } = setCount(o.workout)
              return (
                <Link key={o.workout.id} to={`/workout/${o.workout.id}`} className="row row--link row--compact">
                  <span className="row__body">
                    <span className="row__title">{formatDay(o.at)}</span>
                    <span className="row__meta">
                      {o.sessionName} · {done}/{total} sets
                    </span>
                  </span>
                  <span className="row__value">{formatValue(o.ex, unit, o.workout.reps) || '—'}</span>
                </Link>
              )
            })}
        </div>
      </section>
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="tile">
      <span className="tile__label">{label}</span>
      <span className="tile__value">{value}</span>
    </div>
  )
}
