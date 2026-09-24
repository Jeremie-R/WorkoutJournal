import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Aura } from '../components/Aura'
import { ExerciseCard } from '../components/ExerciseCard'
import { ExercisePicker } from '../components/ExercisePicker'
import { useConfirm, useToast } from '../components/Feedback'
import { Icon } from '../components/Icon'
import { SessionIcon } from '../components/SessionIcon'
import { SetsAndReps } from '../components/SetsAndReps'
import { deleteWorkout, saveWorkout, useData } from '../data/store'
import { formatLongDay, formatMinutes, formatTime, toLocalInput } from '../lib/dates'
import { useBack } from '../lib/hooks'
import type { Exercise, LoggedExercise, Workout } from '../lib/types'
import { exerciseName, formatValue, lastLogged, reshape, setCount, startExercise, workoutLook, workoutShape } from '../lib/workouts'

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
  const { types, exercises, profile } = useData()!
  const back = useBack('/')
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()
  const { name, icon } = workoutLook(workout, types)
  const { done, total } = setCount(workout.exercises)
  const shape = workoutShape(workout.exercises)

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

      <div className="tiles">
        <div className="tile">
          <span className="tile__label">Sets done</span>
          <span className="tile__value">
            {done}
            <small>/{total}</small>
          </span>
        </div>
        <div className="tile">
          <span className="tile__label">Exercises</span>
          <span className="tile__value">{workout.exercises.length}</span>
        </div>
      </div>

      <section>
        <h2 className="section-title">
          Exercises · {shape.sets} × {shape.reps}
        </h2>
        <div className="group">
          {workout.exercises.map((ex, i) => (
            <div key={i} className="done-row">
              <div className="done-row__top">
                <span className="done-row__name">{exerciseName(ex, exercises)}</span>
                <span className="done-row__value">{formatValue(ex, profile.unit)}</span>
              </div>
              <div className="done-row__sets" aria-label={`${ex.done.filter(Boolean).length} of ${ex.done.length} sets done`}>
                {ex.done.map((d, j) => (
                  <span key={j} className={`mini-dot${d ? ' is-done' : ''}`} />
                ))}
              </div>
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
  const data = useData()!
  const toast = useToast()
  const { unit, weightStep } = data.profile
  const [draft, setDraft] = useState(workout)
  const [shape, setShape] = useState(() => workoutShape(workout.exercises))
  const [expanded, setExpanded] = useState<number | null>(null)
  const [picking, setPicking] = useState(false)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const look = workoutLook(draft, data.types)

  // Tapping the note on the view screen opens the editor with the cursor in the note.
  useEffect(() => {
    const el = noteRef.current
    if (!focusNote || !el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [focusNote])

  const setExercises = (change: (list: LoggedExercise[]) => LoggedExercise[]) => setDraft((d) => ({ ...d, exercises: change(d.exercises) }))

  const addExercise = (exercise: Exercise) =>
    setExercises((list) => {
      const added = startExercise(exercise, {}, lastLogged(exercise.id, data.workouts), false, shape.sets, shape.reps)
      // Added after the fact: assume those sets were done.
      return [...list, { ...added, done: added.done.map(() => true) }]
    })

  const changeShape = (next: { sets: number; reps: number }) => {
    setExercises((list) => reshape(list, shape, next))
    setShape(next)
  }

  const save = () => {
    // Keep the original duration when the start time moves.
    const duration = workout.finishedAt ? workout.finishedAt - workout.startedAt : null
    saveWorkout({ ...draft, note: draft.note.trim(), finishedAt: duration === null ? null : draft.startedAt + duration })
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
        <h1 className="title title--sm">{look.name}</h1>
      </header>

      <section className="group group--form">
        <label className="form-row">
          <span className="form-row__label">Date & time</span>
          <input
            className="select"
            type="datetime-local"
            value={toLocalInput(draft.startedAt)}
            max={toLocalInput(Date.now())}
            onChange={(e) => {
              const time = new Date(e.target.value).getTime()
              if (!Number.isNaN(time)) setDraft((d) => ({ ...d, startedAt: time }))
            }}
          />
        </label>
      </section>

      <SetsAndReps sets={shape.sets} reps={shape.reps} onChange={changeShape} />

      <section className="ex-list" aria-label="Exercises">
        {draft.exercises.map((ex, i) => (
          <ExerciseCard
            key={`${ex.exerciseId ?? 'session'}-${i}`}
            ex={ex}
            name={exerciseName(ex, data.exercises)}
            unit={unit}
            weightStep={weightStep}
            expanded={expanded === i}
            onToggle={() => setExpanded((cur) => (cur === i ? null : i))}
            onChange={(next) => setExercises((list) => list.map((e, j) => (j === i ? next : e)))}
            onRemove={
              draft.exercises.length > 1
                ? () => {
                    setExpanded(null)
                    setExercises((list) => list.filter((_, j) => j !== i))
                  }
                : undefined
            }
          />
        ))}
        <button type="button" className="btn btn--secondary btn--block" onClick={() => setPicking(true)}>
          <Icon name="plus" size={18} /> Add an exercise
        </button>
      </section>

      <label className="field">
        <span className="field__label">Notes</span>
        <textarea
          ref={noteRef}
          className="input textarea"
          rows={4}
          placeholder="How did it feel? Anything to remember next time?"
          value={draft.note}
          onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
        />
      </label>

      <div className="sticky-foot">
        <button className="btn btn--primary btn--block btn--lg" onClick={save}>
          Save changes
        </button>
      </div>

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        excluded={new Set(draft.exercises.flatMap((ex) => (ex.exerciseId ? [ex.exerciseId] : [])))}
        onPick={addExercise}
      />
    </main>
  )
}
