import type { Measure, LoggedExercise, Unit } from '../lib/types'
import { formatSeconds, fromUnit, parseSeconds, secondsStep, toUnit } from '../lib/units'
import { formatValue, missingValue } from '../lib/workouts'
import { tap } from '../lib/hooks'
import { Icon } from './Icon'
import { Stepper } from './Stepper'

interface ValueFieldsProps {
  measure: Measure
  weightKg: number | null
  /** The count, for exercises measured in reps. */
  reps: number
  seconds: number | null
  onChange: (patch: { weightKg?: number | null; reps?: number; seconds?: number | null }) => void
  unit: Unit
  weightStep: number
}

/** The one value an exercise has of its own: a weight, a time, or a rep count. Sets and reps belong to the session. */
export function ValueFields({ measure, weightKg, reps, seconds, onChange, unit, weightStep }: ValueFieldsProps) {
  if (measure === 'time') {
    return (
      <Stepper
        label="Time per set"
        value={seconds ?? 0}
        onChange={(v) => onChange({ seconds: v > 0 ? v : null })}
        step={secondsStep}
        max={6 * 3600}
        zeroLabel="Not set"
        format={formatSeconds}
        parse={parseSeconds}
      />
    )
  }
  if (measure === 'reps') {
    return <Stepper label="Reps per set" value={reps} onChange={(v) => onChange({ reps: v })} min={1} max={500} integer />
  }
  return (
    <Stepper
      label="Weight"
      value={Number(toUnit(weightKg ?? 0, unit).toFixed(2))}
      onChange={(v) => onChange({ weightKg: v > 0 ? fromUnit(v, unit) : null })}
      step={weightStep}
      unit={unit}
      max={1000}
      zeroLabel="Not set"
    />
  )
}

const PLACEHOLDER: Record<Measure, string> = { weight: 'Add weight', reps: 'Add reps', time: 'Add time' }

interface ExerciseCardProps {
  ex: LoggedExercise
  name: string
  unit: Unit
  weightStep: number
  expanded: boolean
  onToggle: () => void
  onChange: (next: LoggedExercise) => void
  onRemove?: () => void
}

/** One exercise in a workout: its value, and a tap target per set. Tap the header to adjust today's value. */
export function ExerciseCard({ ex, name, unit, weightStep, expanded, onToggle, onChange, onRemove }: ExerciseCardProps) {
  // Weight is the key number: until it's entered, prompt for it. Reps are the session's, shown once above.
  const value = missingValue(ex) ? '' : formatValue(ex, unit, false)
  const complete = ex.done.length > 0 && ex.done.every(Boolean)

  const toggleSet = (i: number) => {
    tap()
    onChange({ ...ex, done: ex.done.map((d, j) => (j === i ? !d : d)) })
  }

  return (
    <article className={`ex-card${complete ? ' is-complete' : ''}${expanded ? ' is-open' : ''}`}>
      <button type="button" className="ex-card__head" onClick={onToggle} aria-expanded={expanded}>
        <span className="ex-card__name">{name}</span>
        <span className={`ex-card__value${value ? '' : ' is-empty'}`}>{value || PLACEHOLDER[ex.measure]}</span>
        <span className="ex-card__chevron" aria-hidden="true">
          <Icon name="chevron" size={18} />
        </span>
      </button>

      <div className="ex-card__sets" role="group" aria-label={`${name} sets`}>
        {ex.done.map((done, i) => (
          <button key={i} type="button" className={`set-dot${done ? ' is-done' : ''}`} aria-pressed={done} aria-label={`Set ${i + 1}`} onClick={() => toggleSet(i)}>
            {done ? <Icon name="check" size={18} strokeWidth={2.6} /> : i + 1}
          </button>
        ))}
      </div>

      {expanded && (
        <div className="ex-card__edit">
          <ValueFields
            measure={ex.measure}
            weightKg={ex.weightKg}
            reps={ex.reps ?? 10}
            seconds={ex.seconds}
            onChange={(patch) => onChange({ ...ex, ...patch })}
            unit={unit}
            weightStep={weightStep}
          />
          {onRemove && (
            <button type="button" className="btn btn--ghost btn--sm ex-card__remove" onClick={onRemove}>
              <Icon name="trash" size={16} /> Remove from this workout
            </button>
          )}
        </div>
      )}
    </article>
  )
}
