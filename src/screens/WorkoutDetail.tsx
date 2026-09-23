import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Aura } from '../components/Aura'
import { useConfirm, useToast } from '../components/Feedback'
import { Icon } from '../components/Icon'
import { SessionIcon } from '../components/SessionIcon'
import { MiniStepper, Stepper } from '../components/Stepper'
import { deleteWorkout, saveWorkout, useData } from '../data/store'
import { formatLongDay, formatMinutes, formatTime, toLocalInput } from '../lib/dates'
import { useBack } from '../lib/hooks'
import type { Workout } from '../lib/types'
import { formatWeight, fromUnit, toUnit } from '../lib/units'
import { doneSets, setsSummary, totalReps, workoutLook } from '../lib/workouts'

export function WorkoutDetail() {
  const { id } = useParams()
  const data = useData()!
  const workout = data.workouts.find((w) => w.id === id)
  const [editing, setEditing] = useState(false)
  const [focusNote, setFocusNote] = useState(false)

  if (!workout) return <Navigate to="/" replace />
  if (editing)
    return (
      <EditWorkout
        workout={workout}
        focusNote={focusNote}
        onDone={() => {
          setEditing(false)
          setFocusNote(false)
        }}
      />
    )
  return (
    <ViewWorkout
      workout={workout}
      onEdit={(note) => {
        setFocusNote(note)
        setEditing(true)
      }}
    />
  )
}

function ViewWorkout({ workout, onEdit }: { workout: Workout; onEdit: (focusNote: boolean) => void }) {
  const { types, profile } = useData()!
  const back = useBack('/')
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const { name, icon } = workoutLook(workout, types)
  const done = doneSets(workout.sets)

  const remove = async () => {
    const ok = await confirm({
      title: 'Delete this workout?',
      message: 'It will be removed from your journal and progress. This can’t be undone.',
      confirmLabel: 'Delete workout',
      danger: true,
    })
    if (!ok) return
    deleteWorkout(workout.id)
    toast('Workout deleted')
    navigate('/', { replace: true })
  }

  return (
    <main className="page page--flow page--detail">
      <Aura tone="dawn" height={320} />
      <div className="flow-bar">
        <button className="icon-btn" onClick={back} aria-label="Back">
          <Icon name="back" />
        </button>
        <button className="btn btn--secondary btn--sm" onClick={() => onEdit(false)}>
          <Icon name="pencil" size={16} /> Edit
        </button>
      </div>

      <header className="hero">
        <SessionIcon icon={icon} size={88} className="hero__icon" />
        <h1 className="title">{name}</h1>
        <p className="subtitle">
          {formatLongDay(workout.startedAt)}
          <br />
          {formatTime(workout.startedAt)}
          {workout.finishedAt && ` · ${formatMinutes(workout.finishedAt - workout.startedAt)}`}
        </p>
      </header>

      <div className="tiles tiles--3">
        <div className="tile">
          <span className="tile__label">Weight</span>
          <span className="tile__value">{formatWeight(workout.weightKg, profile.unit)}</span>
        </div>
        <div className="tile">
          <span className="tile__label">Sets</span>
          <span className="tile__value">
            {done}
            <small>/{workout.sets.length}</small>
          </span>
        </div>
        <div className="tile">
          <span className="tile__label">Reps</span>
          <span className="tile__value">{totalReps(workout.sets)}</span>
        </div>
      </div>

      <section>
        <h2 className="section-title">Sets · {setsSummary(workout.sets)}</h2>
        <div className="group">
          {workout.sets.map((s, i) => (
            <div key={i} className={`set set--static${s.done ? ' is-done' : ''}`}>
              <span className="set__toggle">
                <span className="check" aria-hidden="true">
                  <Icon name={s.done ? 'check' : 'minus'} size={16} strokeWidth={2.6} />
                </span>
                <span className="set__label">Set {i + 1}</span>
              </span>
              <span className="set__reps">
                {s.reps} reps{!s.done && <small> · skipped</small>}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">Notes</h2>
        <button className="card note" onClick={() => onEdit(true)}>
          {workout.note ? <span className="note__text">{workout.note}</span> : <span className="note__empty">Add a note…</span>}
        </button>
      </section>

      <button className="btn btn--danger-ghost btn--block" onClick={remove}>
        <Icon name="trash" size={18} /> Delete workout
      </button>
    </main>
  )
}

function EditWorkout({ workout, focusNote, onDone }: { workout: Workout; focusNote: boolean; onDone: () => void }) {
  const { types, profile } = useData()!
  const toast = useToast()
  const { unit } = profile
  const [draft, setDraft] = useState(workout)
  const [weight, setWeight] = useState(() => Number(toUnit(workout.weightKg, unit).toFixed(2)))
  const noteRef = useRef<HTMLTextAreaElement>(null)

  // Tapping the note on the view screen opens the editor with the cursor in the note.
  useEffect(() => {
    const el = noteRef.current
    if (!focusNote || !el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [focusNote])

  const typeOptions = types.some((t) => t.id === workout.typeId)
    ? types
    : [{ id: workout.typeId, name: `${workout.typeName} (deleted)`, icon: workout.typeIcon }, ...types]
  const look = workoutLook(draft, types)

  const update = (patch: Partial<Workout>) => setDraft((d) => ({ ...d, ...patch }))
  const updateSet = (i: number, patch: Partial<Workout['sets'][number]>) =>
    update({ sets: draft.sets.map((s, j) => (j === i ? { ...s, ...patch } : s)) })

  const save = () => {
    // Keep the original duration when the start time moves.
    const duration = workout.finishedAt ? workout.finishedAt - workout.startedAt : null
    saveWorkout({
      ...draft,
      weightKg: fromUnit(weight, unit),
      note: draft.note.trim(),
      finishedAt: duration === null ? null : draft.startedAt + duration,
    })
    toast('Changes saved')
    onDone()
  }

  return (
    <main className="page page--flow">
      <Aura tone="dawn" height={260} />
      <div className="flow-bar">
        <button className="btn btn--ghost btn--sm" onClick={onDone}>
          Cancel
        </button>
        <span className="flow-bar__title">Edit workout</span>
        <span className="flow-bar__spacer" />
      </div>

      <header className="hero hero--compact">
        <SessionIcon icon={look.icon} size={64} className="hero__icon" />
      </header>

      <section className="group group--form">
        <label className="form-row">
          <span className="form-row__label">Session</span>
          <select
            className="select"
            value={draft.typeId}
            onChange={(e) => {
              const type = types.find((t) => t.id === e.target.value)
              if (type) update({ typeId: type.id, typeName: type.name, typeIcon: type.icon })
            }}
          >
            {typeOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="form-row">
          <span className="form-row__label">Date & time</span>
          <input
            className="select"
            type="datetime-local"
            value={toLocalInput(draft.startedAt)}
            max={toLocalInput(Date.now())}
            onChange={(e) => {
              const time = new Date(e.target.value).getTime()
              if (!Number.isNaN(time)) update({ startedAt: time })
            }}
          />
        </label>
      </section>

      <section className="group group--controls">
        <Stepper label="Weight" value={weight} onChange={setWeight} step={profile.weightStep} unit={unit} zeroLabel="Bodyweight" max={1000} />
      </section>

      <section className="group sets" aria-label="Sets">
        {draft.sets.map((set, i) => (
          <div key={i} className={`set${set.done ? ' is-done' : ''}`}>
            <button type="button" className="set__toggle" onClick={() => updateSet(i, { done: !set.done })} aria-pressed={set.done}>
              <span className="check" aria-hidden="true">
                <Icon name="check" size={18} strokeWidth={2.6} />
              </span>
              <span className="set__label">Set {i + 1}</span>
            </button>
            <MiniStepper value={set.reps} onChange={(reps) => updateSet(i, { reps })} suffix="reps" />
          </div>
        ))}
        <div className="set set--actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => update({ sets: [...draft.sets, { reps: draft.sets.at(-1)?.reps ?? 10, done: true }] })}>
            <Icon name="plus" size={16} /> Add set
          </button>
          {draft.sets.length > 1 && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => update({ sets: draft.sets.slice(0, -1) })}>
              <Icon name="minus" size={16} /> Remove last
            </button>
          )}
        </div>
      </section>

      <label className="field">
        <span className="field__label">Notes</span>
        <textarea
          ref={noteRef}
          className="input textarea"
          rows={4}
          placeholder="How did it feel? Anything to remember next time?"
          value={draft.note}
          onChange={(e) => update({ note: e.target.value })}
        />
      </label>

      <div className="sticky-foot">
        <button className="btn btn--primary btn--block btn--lg" onClick={save}>
          Save changes
        </button>
      </div>
    </main>
  )
}
