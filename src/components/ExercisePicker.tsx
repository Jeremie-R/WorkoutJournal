import { useState } from 'react'
import { saveExercise, useData } from '../data/store'
import { CATALOG, MEASURE_LABEL } from '../lib/catalog'
import type { Exercise, Measure } from '../lib/types'
import { newExercise } from '../lib/workouts'
import { Icon } from './Icon'
import { Segmented } from './Segmented'
import { Sheet } from './Sheet'

export const MEASURE_OPTIONS: { value: Measure; label: string }[] = [
  { value: 'weight', label: MEASURE_LABEL.weight },
  { value: 'reps', label: MEASURE_LABEL.reps },
  { value: 'time', label: MEASURE_LABEL.time },
]

interface ExercisePickerProps {
  open: boolean
  onClose: () => void
  onPick: (exercise: Exercise) => void
  /** Exercises already in the list being edited; they're hidden. */
  excluded: Set<string>
}

/**
 * Pick exercises to add: your own first (so the same "Squat" is reused and tracked across sessions),
 * then common suggestions, or create a new one by typing its name. Stays open to add several.
 */
export function ExercisePicker({ open, onClose, onPick, excluded }: ExercisePickerProps) {
  const { exercises } = useData()!
  const [query, setQuery] = useState('')
  const [measure, setMeasure] = useState<Measure>('weight')
  const [added, setAdded] = useState<string[]>([])

  const q = query.trim().toLowerCase()
  const known = new Set(exercises.map((e) => e.name.toLowerCase()))
  const mine = exercises.filter((e) => !excluded.has(e.id) && e.name.toLowerCase().includes(q))
  const suggestions = CATALOG.filter((c) => !known.has(c.name.toLowerCase()) && c.name.toLowerCase().includes(q))
  const canCreate = q.length > 0 && !known.has(q) && !CATALOG.some((c) => c.name.toLowerCase() === q)

  const pick = (exercise: Exercise) => {
    onPick(exercise)
    setAdded((list) => [...list, exercise.name])
  }

  const create = (name: string, as: Measure) => {
    const exercise = newExercise(name, as)
    saveExercise(exercise)
    pick(exercise)
    setQuery('')
  }

  const close = () => {
    setQuery('')
    setAdded([])
    onClose()
  }

  return (
    <Sheet
      open={open}
      title="Add exercises"
      onClose={close}
      footer={
        <button className="btn btn--primary btn--block" onClick={close}>
          {added.length ? `Done · ${added.length} added` : 'Done'}
        </button>
      }
    >
      <input
        className="input picker__search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search, or type a new exercise"
        aria-label="Search exercises"
        enterKeyHint="done"
      />

      {added.length > 0 && <p className="picker__added">Added: {added.join(' · ')}</p>}

      {canCreate && (
        <div className="card picker__create">
          <p className="picker__create-title">
            New exercise: <strong>{query.trim()}</strong>
          </p>
          <div className="picker__create-row">
            <Segmented size="sm" label="Measured by" value={measure} onChange={setMeasure} options={MEASURE_OPTIONS} />
            <button className="btn btn--primary btn--sm" onClick={() => create(query, measure)}>
              <Icon name="plus" size={16} /> Create
            </button>
          </div>
        </div>
      )}

      {mine.length > 0 && (
        <section>
          <h3 className="section-title">Your exercises</h3>
          <div className="group">
            {mine.map((e) => (
              <PickRow key={e.id} name={e.name} measure={e.measure} onClick={() => pick(e)} />
            ))}
          </div>
        </section>
      )}

      {suggestions.length > 0 && (
        <section>
          <h3 className="section-title">Suggestions</h3>
          <div className="group">
            {suggestions.map((c) => (
              <PickRow key={c.name} name={c.name} measure={c.measure} onClick={() => create(c.name, c.measure)} />
            ))}
          </div>
        </section>
      )}

      {!canCreate && mine.length === 0 && suggestions.length === 0 && (
        <p className="picker__empty">{q ? 'Already in the list.' : 'Every exercise is already in the list.'}</p>
      )}
    </Sheet>
  )
}

function PickRow({ name, measure, onClick }: { name: string; measure: Measure; onClick: () => void }) {
  return (
    <button className="row row--link row--compact" onClick={onClick}>
      <span className="row__body">
        <span className="row__title">{name}</span>
        <span className="row__meta">{MEASURE_LABEL[measure]}</span>
      </span>
      <Icon name="plus" size={20} />
    </button>
  )
}
