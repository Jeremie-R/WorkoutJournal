import type { LoggedExercise, Measure, Unit } from '../lib/types'
import { formatSeconds, fromUnit, parseSeconds, secondsStep, toUnit } from '../lib/units'
import { formatValue, missingValue } from '../lib/workouts'
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

const PROMPT: Record<Measure, string> = { weight: 'Add weight', reps: 'Add reps', time: 'Add time' }

interface ExerciseRowProps {
  ex: LoggedExercise
  name: string
  /** The workout's reps, used by rep-counted exercises without a count of their own. */
  workoutReps: number
  unit: Unit
  weightStep: number
  expanded: boolean
  onToggle: () => void
  onChange: (next: LoggedExercise) => void
  onRemove?: () => void
}

/** One exercise in a workout and its value; tap it to change today's value. */
export function ExerciseRow({ ex, name, workoutReps, unit, weightStep, expanded, onToggle, onChange, onRemove }: ExerciseRowProps) {
  // Weight is the key number: until it's entered, prompt for it.
  const value = missingValue(ex) ? '' : formatValue(ex, unit, ex.measure === 'reps' ? workoutReps : undefined)

  return (
    <div className={`plan-row${expanded ? ' is-open' : ''}`}>
      <button type="button" className="row row--link" onClick={onToggle} aria-expanded={expanded}>
        <span className="row__body">
          <span className="row__title">{name}</span>
        </span>
        {value ? <span className="row__value">{value}</span> : <span className="value-prompt">{PROMPT[ex.measure]}</span>}
        <span className="plan-row__chevron" aria-hidden="true">
          <Icon name="chevron" size={18} />
        </span>
      </button>
      {expanded && (
        <div className="plan-row__edit">
          <ValueFields
            measure={ex.measure}
            weightKg={ex.weightKg}
            reps={ex.reps ?? workoutReps}
            seconds={ex.seconds}
            // A count equal to the workout's reps just follows the workout.
            onChange={(patch) => onChange({ ...ex, ...patch, ...(patch.reps !== undefined && { reps: patch.reps === workoutReps ? null : patch.reps }) })}
            unit={unit}
            weightStep={weightStep}
          />
          {onRemove && (
            <button type="button" className="btn btn--ghost btn--sm row-remove" onClick={onRemove}>
              <Icon name="trash" size={16} /> Remove from this workout
            </button>
          )}
        </div>
      )}
    </div>
  )
}
