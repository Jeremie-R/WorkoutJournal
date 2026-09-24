import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ColumnChart, LineChart } from '../components/Charts'
import { SessionIcon } from '../components/SessionIcon'
import { formatDay, formatShort } from '../lib/dates'
import type { Data, LoggedExercise, Measure } from '../lib/types'
import { formatNumber, formatSeconds, toUnit } from '../lib/units'
import { exerciseName, formatValue, trackKey, workoutLook } from '../lib/workouts'

const MAX_POINTS = 20

interface Occurrence {
  at: number
  workoutId: string
  sessionName: string
  ex: LoggedExercise
}

interface Track {
  key: string
  name: string
  measure: Measure
  /** Oldest first. Only times where at least one set was checked off. */
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
      const session = workoutLook(w, data.types)
      for (const ex of w.exercises) {
        if (!ex.done.some(Boolean)) continue
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
        track.occurrences.push({ at: w.startedAt, workoutId: w.id, sessionName: session.name, ex })
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
  const valueOf = (ex: LoggedExercise): number | null =>
    metric === 'weight' ? (ex.weightKg ? Number(toUnit(ex.weightKg, unit).toFixed(2)) : null) : metric === 'time' ? ex.seconds : ex.reps
  const format = metric === 'time' ? formatSeconds : formatNumber
  const metricUnit = metric === 'weight' ? unit : metric === 'reps' ? 'reps' : ''
  const show = (v: number) => `${format(v)}${metricUnit && ` ${metricUnit}`}`

  const all = track.occurrences
  const measured = all.flatMap((o) => {
    const v = valueOf(o.ex)
    return v === null ? [] : [{ ...o, value: v }]
  })
  const recent = all.slice(-MAX_POINTS)
  const recentMeasured = measured.slice(-MAX_POINTS)
  const values = measured.map((m) => m.value)
  const change = measured.length ? measured[measured.length - 1].value - measured[0].value : 0

  // Volume per session: reps completed, or total time for timed exercises.
  const volume = (ex: LoggedExercise) => ex.done.filter(Boolean).length * ((metric === 'time' ? ex.seconds : ex.reps) ?? 0)
  const scope = (n: number, of: number) => (n < of ? `last ${n} times` : 'each time')

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
            {scope(recentMeasured.length, measured.length)}
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

      <section className="card chart-card">
        <h2 className="chart-card__title">{metric === 'time' ? 'Total time' : 'Reps completed'}</h2>
        <p className="chart-card__sub">Checked-off sets, {scope(recent.length, all.length)}</p>
        <ColumnChart
          ariaLabel={`${track.name} ${metric === 'time' ? 'total time' : 'reps completed'} per workout`}
          unit={metric === 'time' ? '' : 'reps'}
          format={metric === 'time' ? formatSeconds : formatNumber}
          points={recent.map((o) => ({ value: volume(o.ex), label: formatShort(o.at) }))}
        />
      </section>

      <section>
        <h2 className="section-title">Recent</h2>
        <div className="group">
          {[...all]
            .reverse()
            .slice(0, 6)
            .map((o) => (
              <Link key={o.workoutId} to={`/workout/${o.workoutId}`} className="row row--link row--compact">
                <span className="row__body">
                  <span className="row__title">{formatDay(o.at)}</span>
                  <span className="row__meta">
                    {o.sessionName} · {o.ex.done.filter(Boolean).length}/{o.ex.done.length} sets
                  </span>
                </span>
                <span className="row__value">{formatValue(o.ex, unit) || '—'}</span>
              </Link>
            ))}
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
