import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { Aura } from '../components/Aura'
import { ExerciseCard } from '../components/ExerciseCard'
import { ExercisePicker } from '../components/ExercisePicker'
import { useConfirm } from '../components/Feedback'
import { Icon } from '../components/Icon'
import { SessionIcon } from '../components/SessionIcon'
import { SetsAndReps } from '../components/SetsAndReps'
import { setDraft, updateDraft, useDraft, type Draft } from '../data/draft'
import { saveWorkout, useData } from '../data/store'
import { formatDuration } from '../lib/dates'
import { useNow, useWakeLock } from '../lib/hooks'
import { newId, type Exercise, type LoggedExercise } from '../lib/types'
import { exerciseName, lastLogged, reshape, setCount, startExercise } from '../lib/workouts'

/** Step 3 of logging: the session's sets × reps, each exercise with a tap per set; a note; finish. */
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
  const { done, total } = setCount(draft.exercises)
  const allDone = total > 0 && done === total
  const update = (patch: Partial<Draft>) => updateDraft((d) => ({ ...d, ...patch }))
  const updateExercise = (index: number, next: LoggedExercise) =>
    updateDraft((d) => ({ ...d, exercises: d.exercises.map((ex, i) => (i === index ? next : ex)) }))

  const removeExercise = (index: number) => {
    setExpanded(null)
    updateDraft((d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== index) }))
  }

  // Added mid-workout: the session's sets and reps, its value from last time if there is one.
  const addExercise = (exercise: Exercise) => {
    const fromLast = data.profile.prefill === 'last'
    updateDraft((d) => {
      const added = startExercise(exercise, {}, lastLogged(exercise.id, data.workouts), fromLast, d.sets, d.reps)
      return { ...d, exercises: [...d.exercises, added] }
    })
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
    saveWorkout({
      id,
      typeId: draft.typeId,
      typeName: draft.typeName,
      typeIcon: draft.typeIcon,
      startedAt: draft.startedAt,
      finishedAt: stamp,
      exercises: draft.exercises,
      note: draft.note.trim(),
      createdAt: stamp,
      updatedAt: stamp,
    })
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

      <SetsAndReps
        sets={draft.sets}
        reps={draft.reps}
        onChange={(next) => updateDraft((d) => ({ ...d, ...next, exercises: reshape(d.exercises, d, next) }))}
      />

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
            onChange={(next) => updateExercise(i, next)}
            onRemove={draft.exercises.length > 1 ? () => removeExercise(i) : undefined}
          />
        ))}
        <button type="button" className="btn btn--secondary btn--block" onClick={() => setPicking(true)}>
          <Icon name="plus" size={18} /> Add an exercise
        </button>
      </section>

      <label className="field">
        <span className="field__label">Notes</span>
        <textarea
          className="input textarea"
          rows={3}
          placeholder="How did it feel? Anything to remember next time?"
          value={draft.note}
          onChange={(e) => update({ note: e.target.value })}
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
