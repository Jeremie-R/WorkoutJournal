import { useState } from 'react'
import { tap } from '../lib/hooks'
import { Icon } from './Icon'
import { Stepper } from './Stepper'

interface SetsCardProps {
  done: boolean[]
  reps: number
  onToggle: (index: number) => void
  onChange: (next: { sets: number; reps: number }) => void
}

/**
 * The workout's sets. A set is one round through every exercise, so it's checked off once for the
 * whole workout. Sets and reps can be changed here; they apply to every exercise.
 */
export function SetsCard({ done, reps, onToggle, onChange }: SetsCardProps) {
  const [editing, setEditing] = useState(false)
  return (
    <section className="card sets-card" aria-label="Sets">
      <div className="sets-card__head">
        <div>
          <h2 className="sets-card__title">
            {done.length} sets × {reps} reps
          </h2>
          <p className="sets-card__hint">Check a set once you’ve done every exercise.</p>
        </div>
        <button type="button" className="chip sets-card__change" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
          {editing ? 'Done' : 'Change'}
        </button>
      </div>

      <div className="sets-card__dots" role="group" aria-label="Sets done">
        {done.map((isDone, i) => (
          <button
            key={i}
            type="button"
            className={`set-dot${isDone ? ' is-done' : ''}`}
            aria-pressed={isDone}
            aria-label={`Set ${i + 1}`}
            onClick={() => {
              tap()
              onToggle(i)
            }}
          >
            {isDone ? <Icon name="check" size={22} strokeWidth={2.6} /> : i + 1}
          </button>
        ))}
      </div>

      {editing && (
        <div className="group sets-card__edit">
          <Stepper label="Sets" value={done.length} onChange={(sets) => onChange({ sets, reps })} min={1} max={20} integer />
          <Stepper label="Reps per set" value={reps} onChange={(r) => onChange({ sets: done.length, reps: r })} min={1} max={100} integer />
        </div>
      )}
    </section>
  )
}
