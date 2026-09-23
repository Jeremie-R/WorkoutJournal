import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ColumnChart, LineChart } from '../components/Charts'
import { SessionIcon } from '../components/SessionIcon'
import { formatDay, formatShort } from '../lib/dates'
import type { Data } from '../lib/types'
import { formatNumber, formatWeight, toUnit } from '../lib/units'
import { setsSummary, totalReps, workoutLook } from '../lib/workouts'

const MAX_POINTS = 20

/** Per-session-type trends: weight and reps across occurrences. */
export function Progress({ data }: { data: Data }) {
  const { unit } = data.profile

  // Session types that have history, most recently trained first.
  const trained = useMemo(() => {
    const seen = new Map<string, { name: string; icon: string }>()
    for (const w of data.workouts) if (!seen.has(w.typeId)) seen.set(w.typeId, workoutLook(w, data.types))
    return [...seen].map(([id, look]) => ({ id, ...look }))
  }, [data.workouts, data.types])

  const [picked, setPicked] = useState<string | null>(null)
  const typeId = picked && trained.some((t) => t.id === picked) ? picked : trained[0]?.id

  if (!typeId) {
    return (
      <section className="empty">
        <div className="empty__art">
          <SessionIcon icon="seedling" size={96} />
        </div>
        <h2 className="empty__title">Progress grows here</h2>
        <p className="empty__text">After a few workouts you’ll see how your weights and reps move over time.</p>
      </section>
    )
  }

  const all = data.workouts.filter((w) => w.typeId === typeId).sort((a, b) => a.startedAt - b.startedAt)
  const recent = all.slice(-MAX_POINTS)
  const weights = all.map((w) => w.weightKg)
  const first = all[0]
  const latest = all[all.length - 1]
  const change = latest.weightKg - first.weightKg
  const current = trained.find((t) => t.id === typeId)!

  return (
    <div className="progress">
      <div className="chip-row" role="tablist" aria-label="Session">
        {trained.map((t) => (
          <button key={t.id} role="tab" aria-selected={t.id === typeId} className={`chip chip--icon${t.id === typeId ? ' is-active' : ''}`} onClick={() => setPicked(t.id)}>
            <SessionIcon icon={t.icon} size={22} />
            {t.name}
          </button>
        ))}
      </div>

      <div className="tiles">
        <Tile label="Sessions" value={String(all.length)} />
        <Tile label="Latest" value={formatWeight(latest.weightKg, unit)} />
        <Tile label="Best" value={formatWeight(Math.max(...weights), unit)} />
        <Tile
          label={`Since ${formatShort(first.startedAt)}`}
          value={change === 0 ? '±0' : `${change > 0 ? '+' : '−'}${formatNumber(Math.abs(toUnit(change, unit)))} ${unit}`}
        />
      </div>

      <section className="card chart-card">
        <h2 className="chart-card__title">Weight</h2>
        <p className="chart-card__sub">
          {unit}, {recent.length < all.length ? `last ${recent.length} sessions` : 'each session'}
        </p>
        <LineChart
          ariaLabel={`${current.name} weight per session`}
          unit={unit}
          points={recent.map((w) => ({ value: Number(toUnit(w.weightKg, unit).toFixed(2)), label: formatShort(w.startedAt) }))}
        />
      </section>

      <section className="card chart-card">
        <h2 className="chart-card__title">Reps completed</h2>
        <p className="chart-card__sub">Checked-off sets × reps, {recent.length < all.length ? `last ${recent.length} sessions` : 'each session'}</p>
        <ColumnChart
          ariaLabel={`${current.name} reps completed per session`}
          unit="reps"
          points={recent.map((w) => ({ value: totalReps(w.sets), label: formatShort(w.startedAt) }))}
        />
      </section>

      <section>
        <h2 className="section-title">Recent {current.name.toLowerCase()} sessions</h2>
        <div className="group">
          {[...all].reverse().slice(0, 6).map((w) => (
            <Link key={w.id} to={`/workout/${w.id}`} className="row row--link row--compact">
              <span className="row__body">
                <span className="row__title">{formatDay(w.startedAt)}</span>
              </span>
              <span className="row__end row__end--inline">
                <span className="row__meta">{setsSummary(w.sets)}</span>
                <span className="row__value">{formatWeight(w.weightKg, unit)}</span>
              </span>
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
