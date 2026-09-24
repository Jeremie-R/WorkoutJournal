import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Aura } from '../components/Aura'
import { ExercisePicker } from '../components/ExercisePicker'
import { ExerciseRow } from '../components/ExerciseRow'
import { useConfirm } from '../components/Feedback'
import { Icon } from '../components/Icon'
import { SessionIcon } from '../components/SessionIcon'
import { SetsCard } from '../components/SetsCard'
import { setDraft, updateDraft, useDraft } from '../data/draft'
import { saveWorkout, useData } from '../data/store'
import { formatDuration } from '../lib/dates'
import { useNow, useWakeLock } from '../lib/hooks'
import { newId, type Exercise, type LoggedExercise } from '../lib/types'
import { exerciseName, lastLogged, resizeSets, setCount, startExercise } from '../lib/workouts'

/** Step 3 of logging: check off each set (a round through every exercise), adjust exercises as you go, finish. */
export function LogActive() {
  const draft = useDraft()
  const data = useData()!
  const navigate = useNavigate()
  const confirm = useConfirm()
  const now = useNow(1000)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [picking, setPicking] = useState(false)
  useWakeLock(data.profile.keepAwake && draft !== null)

  if (!draft) return <Navigate to="/" replace />

  const { unit, weightStep } = data.profile
  const { done, total } = setCount(draft)
  const allDone = total > 0 && done === total

  const updateExercise = (index: number, next: LoggedExercise) =>
    updateDraft((d) => ({ ...d, exercises: d.exercises.map((ex, i) => (i === index ? next : ex)) }))

  const removeExercise = (index: number) => {
    setExpanded(null)
    updateDraft((d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== index) }))
  }

  // Added mid-workout: its value from last time if there is one.
  const addExercise = (exercise: Exercise) => {
    const added = startExercise(exercise, {}, lastLogged(exercise.id, data.workouts), data.profile.prefill === 'last')
    updateDraft((d) => ({ ...d, exercises: [...d.exercises, added] }))
  }

  const finish = async () => {
    if (done === 0) {
      const ok = await confirm({
        title: 'No sets checked off',
        message: 'Save this workout anyway? You can still edit it later from your journal.',
        confirmLabel: 'Save anyway',
        cancelLabel: 'Keep going',
      })
      if (!ok) return
    }
    const stamp = Date.now()
    const id = newId()
    saveWorkout({ ...draft, id, note: draft.note.trim(), finishedAt: stamp, createdAt: stamp, updatedAt: stamp })
    setDraft(null)
    navigate('/', { replace: true, state: { saved: id } })
  }

  const discard = async () => {
    const ok = await confirm({
      title: 'Discard this workout?',
      message: 'The sets you checked off won’t be saved.',
      confirmLabel: 'Discard',
      danger: true,
    })
    if (!ok) return
    setDraft(null)
    navigate('/', { replace: true })
  }

  return (
    <main className="page page--flow">
      <Aura tone="sunset" height={320} glow={0.55 + 0.45 * (total ? done / total : 0)} />
      <div className="flow-bar">
        <button className="btn btn--ghost btn--sm" onClick={discard}>
          Discard
        </button>
        <span className="timer" aria-label="Time since start">
          <Icon name="clock" size={16} />
          {formatDuration(now - draft.startedAt)}
        </span>
        <button className="btn btn--ghost btn--sm" onClick={() => navigate('/')}>
          Later
        </button>
      </div>

      <header className="hero hero--compact">
        <SessionIcon icon={draft.typeIcon} size={72} className="hero__icon" />
        <h1 className="title">{draft.typeName}</h1>
        <p className="subtitle" aria-live="polite">
          {allDone ? 'All sets done. Great work!' : `${done} of ${total} sets done`}
        </p>
        <div className="progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
          <span style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
        </div>
      </header>

      <SetsCard
        done={draft.done}
        reps={draft.reps}
        onToggle={(i) => updateDraft((d) => ({ ...d, done: d.done.map((x, j) => (j === i ? !x : x)) }))}
        onChange={({ sets, reps }) => updateDraft((d) => ({ ...d, reps, done: resizeSets(d.done, sets) }))}
      />

      <section>
        <h2 className="section-title">Exercises</h2>
        <div className="group">
          {draft.exercises.map((ex, i) => (
            <ExerciseRow
              key={`${ex.exerciseId ?? 'session'}-${i}`}
              ex={ex}
              name={exerciseName(ex, data.exercises)}
              workoutReps={draft.reps}
              unit={unit}
              weightStep={weightStep}
              expanded={expanded === i}
              onToggle={() => setExpanded((cur) => (cur === i ? null : i))}
              onChange={(next) => updateExercise(i, next)}
              onRemove={draft.exercises.length > 1 ? () => removeExercise(i) : undefined}
            />
          ))}
          <button type="button" className="row row--link plan-add" onClick={() => setPicking(true)}>
            <span className="plan-add__icon" aria-hidden="true">
              <Icon name="plus" size={18} strokeWidth={2.2} />
            </span>
            <span className="row__title">Add an exercise</span>
          </button>
        </div>
      </section>

      <label className="field">
        <span className="field__label">Notes</span>
        <textarea
          className="input textarea"
          rows={3}
          placeholder="How did it feel? Anything to remember next time?"
          value={draft.note}
          onChange={(e) => updateDraft((d) => ({ ...d, note: e.target.value }))}
        />
      </label>

      <div className="sticky-foot">
        <button className={`btn btn--primary btn--block btn--lg${allDone ? ' btn--glow' : ''}`} onClick={finish}>
          Finish workout
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
