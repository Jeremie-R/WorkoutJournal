import { useState } from 'react'
import { Stepper } from './Stepper'

interface SetsAndRepsProps {
  sets: number
  reps: number
  onChange: (next: { sets: number; reps: number }) => void
}

/** The session's sets and reps for this workout, shared by every exercise. One line until you change it. */
export function SetsAndReps({ sets, reps, onChange }: SetsAndRepsProps) {
  const [open, setOpen] = useState(false)
  return (
    <section className="group sets-reps" aria-label="Sets and reps">
      <button type="button" className="row row--link row--compact" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="row__body">
          <span className="row__title">
            {sets} sets × {reps} reps
          </span>
          <span className="row__meta">For every exercise</span>
        </span>
        <span className="chip sets-reps__action">{open ? 'Done' : 'Change'}</span>
      </button>
      {open && (
        <>
          <Stepper label="Sets" value={sets} onChange={(v) => onChange({ sets: v, reps })} min={1} max={20} integer />
          <Stepper label="Reps per set" value={reps} onChange={(v) => onChange({ sets, reps: v })} min={1} max={100} integer />
        </>
      )}
    </section>
  )
}
