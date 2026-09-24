import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Aura } from '../components/Aura'
import { MEASURE_OPTIONS } from '../components/ExercisePicker'
import { useConfirm, useToast } from '../components/Feedback'
import { Icon } from '../components/Icon'
import { Segmented } from '../components/Segmented'
import { deleteExercise, saveExercise, useData } from '../data/store'
import { useBack } from '../lib/hooks'
import type { Measure } from '../lib/types'
import { findByName, usedIn } from '../lib/workouts'

/** Rename an exercise, change how it's measured, or remove it. Changes apply to every session using it. */
export function ExerciseEditor() {
  const { id } = useParams()
  const { exercises, types, workouts } = useData()!
  const navigate = useNavigate()
  const back = useBack('/setup?tab=exercises')
  const confirm = useConfirm()
  const toast = useToast()
  const exercise = exercises.find((e) => e.id === id)
  const [name, setName] = useState(exercise?.name ?? '')
  const [measure, setMeasure] = useState<Measure>(exercise?.measure ?? 'weight')

  if (!exercise) return <Navigate to="/setup?tab=exercises" replace />

  const sessions = usedIn(exercise.id, types)
  const times = workouts.filter((w) => w.done.some(Boolean) && w.exercises.some((ex) => ex.exerciseId === exercise.id)).length
  const duplicate = findByName(name, exercises)
  const nameTaken = duplicate !== undefined && duplicate.id !== exercise.id

  const save = () => {
    saveExercise({ ...exercise, name: name.trim(), measure })
    toast('Exercise saved')
    back()
  }

  const remove = async () => {
    const ok = await confirm({
      title: `Delete ${exercise.name}?`,
      message: [
        sessions.length ? `It will be removed from ${sessions.join(', ')}.` : '',
        times ? 'Past workouts keep it in their history.' : '',
      ]
        .filter(Boolean)
        .join(' ') || 'It isn’t used anywhere yet.',
      confirmLabel: 'Delete exercise',
      danger: true,
    })
    if (!ok) return
    deleteExercise(exercise.id)
    navigate('/setup?tab=exercises', { replace: true })
  }

  return (
    <main className="page page--flow">
      <Aura tone="mint" height={260} />
      <div className="flow-bar">
        <button className="icon-btn" onClick={back} aria-label="Back">
          <Icon name="back" />
        </button>
        <span className="flow-bar__title">Edit exercise</span>
        <span className="flow-bar__spacer" />
      </div>

      <header className="hero hero--compact">
        <input className="input input--title" value={name} onChange={(e) => setName(e.target.value)} aria-label="Exercise name" maxLength={40} />
        <p className="subtitle">
          {sessions.length ? `In ${sessions.join(', ')}` : 'Not in a session yet'}
          {times > 0 && ` · logged ${times} time${times > 1 ? 's' : ''}`}
        </p>
        {nameTaken && <p className="field__error">You already have an exercise with this name.</p>}
      </header>

      <section className="group group--form">
        <div className="form-row form-row--stack">
          <span className="form-row__label">
            Measured by
            <small>Weight for lifts, reps for bodyweight counts like push-ups, time for holds and cardio.</small>
          </span>
          <Segmented label="Measured by" value={measure} onChange={setMeasure} options={MEASURE_OPTIONS} size="sm" />
        </div>
      </section>

      <button className="btn btn--danger-ghost btn--block" onClick={remove}>
        <Icon name="trash" size={18} /> Delete exercise
      </button>

      <div className="sticky-foot">
        <button className="btn btn--primary btn--block btn--lg" onClick={save} disabled={!name.trim() || nameTaken}>
          Save
        </button>
      </div>
    </main>
  )
}
