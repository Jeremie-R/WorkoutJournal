import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { Aura } from '../components/Aura'
import { Icon } from '../components/Icon'
import { SessionIcon } from '../components/SessionIcon'
import { Stepper } from '../components/Stepper'
import { setDraft, useDraft } from '../data/draft'
import { useData } from '../data/store'
import { relativeDay } from '../lib/dates'
import { useBack } from '../lib/hooks'
import { formatValue, missingValue, planWorkout, setCount } from '../lib/workouts'

/** Step 2 of logging: confirm today's sets and reps (for every exercise), see what each exercise starts at, go. */
export function LogConfigure() {
  const { typeId } = useParams()
  const data = useData()!
  const draft = useDraft()
  const navigate = useNavigate()
  const back = useBack('/log')
  const type = data.types.find((t) => t.id === typeId)
  const last = data.workouts.find((w) => w.typeId === typeId)
  const { unit } = data.profile

  const [sets, setSets] = useState(type?.sets ?? 3)
  const [reps, setReps] = useState(type?.reps ?? 10)

  if (draft) return <Navigate to="/log/active" replace />
  if (!type) return <Navigate to="/log" replace />

  const exercises = planWorkout(type, data)
  const hasExercises = type.exercises.length > 0
  const lastSets = last && setCount(last)

  const start = () => {
    const done = Array<boolean>(sets).fill(false)
    setDraft({ typeId: type.id, typeName: type.name, typeIcon: type.icon, reps, done, exercises, note: '', startedAt: Date.now() })
    navigate('/log/active', { replace: true })
  }

  return (
    <main className="page page--flow">
      <Aura tone="lilac" height={340} />
      <div className="flow-bar">
        <button className="icon-btn" onClick={back} aria-label="Back">
          <Icon name="back" />
        </button>
        <Link to={`/setup/session/${type.id}`} className="btn btn--secondary btn--sm">
          <Icon name="pencil" size={16} /> Edit session
        </Link>
      </div>

      <header className="hero">
        <SessionIcon icon={type.icon} size={104} className="hero__icon" />
        <h1 className="title">{type.name}</h1>
        <p className="subtitle">
          {last && lastSets
            ? `Last time ${relativeDay(last.startedAt).toLowerCase()}: ${lastSets.done} of ${lastSets.total} sets`
            : 'First time logging this one. Enjoy it!'}
        </p>
      </header>

      <section className="group group--controls" aria-label="Today's plan">
        <Stepper label="Sets" value={sets} onChange={setSets} min={1} max={20} integer />
        <Stepper label="Reps per set" value={reps} onChange={setReps} min={1} max={100} integer />
      </section>

      {hasExercises ? (
        <section>
          <h2 className="section-title">Today’s exercises</h2>
          <div className="group">
            {exercises.map((ex) => (
              <div key={ex.exerciseId} className="row row--compact">
                <span className="row__body">
                  <span className="row__title">{ex.name}</span>
                </span>
                {missingValue(ex) ? (
                  <span className="row__meta row__meta--soft">{ex.measure === 'time' ? 'Time' : 'Weight'} to add</span>
                ) : (
                  <span className="row__value">{formatValue(ex, unit, ex.measure === 'reps' ? reps : undefined)}</span>
                )}
              </div>
            ))}
          </div>
          <p className="fineprint fineprint--left">You can change any exercise as you go.</p>
        </section>
      ) : (
        <p className="fineprint">
          No exercises in this session yet, so you’ll just check off sets.{' '}
          <Link to={`/setup/session/${type.id}`} className="link">
            Add exercises
          </Link>
        </p>
      )}

      <div className="sticky-foot">
        <button className="btn btn--primary btn--block btn--lg" onClick={start}>
          Start workout
        </button>
      </div>
    </main>
  )
}
