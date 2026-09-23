import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Aura } from '../components/Aura'
import { Icon } from '../components/Icon'
import { SessionIcon } from '../components/SessionIcon'
import { Stepper } from '../components/Stepper'
import { setDraft, useDraft } from '../data/draft'
import { useData } from '../data/store'
import { relativeDay } from '../lib/dates'
import { useBack } from '../lib/hooks'
import { formatNumber, formatWeight, fromUnit, toUnit } from '../lib/units'
import { makeSets, setsSummary } from '../lib/workouts'

/** Step 2 of logging: confirm or change today's weight, sets and reps. */
export function LogConfigure() {
  const { typeId } = useParams()
  const { types, workouts, profile } = useData()!
  const draft = useDraft()
  const navigate = useNavigate()
  const back = useBack('/log')
  const type = types.find((t) => t.id === typeId)
  const last = workouts.find((w) => w.typeId === typeId)
  const { unit } = profile

  const startKg = profile.prefill === 'last' && last ? last.weightKg : (type?.weightKg ?? 0)
  const [weight, setWeight] = useState(() => Number(toUnit(startKg, unit).toFixed(2)))
  const [sets, setSets] = useState(type?.sets ?? 3)
  const [reps, setReps] = useState(type?.reps ?? 10)

  if (draft) return <Navigate to="/log/active" replace />
  if (!type) return <Navigate to="/log" replace />

  const lastWeight = last ? Number(toUnit(last.weightKg, unit).toFixed(2)) : null

  const start = () => {
    setDraft({
      typeId: type.id,
      typeName: type.name,
      typeIcon: type.icon,
      weightKg: fromUnit(weight, unit),
      sets: makeSets(sets, reps),
      note: '',
      startedAt: Date.now(),
    })
    navigate('/log/active', { replace: true })
  }

  return (
    <main className="page page--flow">
      <Aura tone="lilac" height={340} />
      <div className="flow-bar">
        <button className="icon-btn" onClick={back} aria-label="Back">
          <Icon name="back" />
        </button>
      </div>

      <header className="hero">
        <SessionIcon icon={type.icon} size={104} className="hero__icon" />
        <h1 className="title">{type.name}</h1>
        <p className="subtitle">
          {last
            ? `Last time ${relativeDay(last.startedAt).toLowerCase()}: ${formatWeight(last.weightKg, unit)}, ${setsSummary(last.sets)}`
            : 'First time logging this one. Enjoy it!'}
        </p>
      </header>

      <section className="group group--controls" aria-label="Today's plan">
        <Stepper label="Weight" value={weight} onChange={setWeight} step={profile.weightStep} unit={unit} zeroLabel="Bodyweight" max={1000} />
        <Stepper label="Sets" value={sets} onChange={setSets} min={1} max={20} integer />
        <Stepper label="Reps per set" value={reps} onChange={setReps} min={1} max={100} integer />
      </section>

      {lastWeight !== null && lastWeight !== weight && (
        <button className="chip chip--center" onClick={() => setWeight(lastWeight)}>
          Use last time’s weight: {lastWeight === 0 ? 'bodyweight' : `${formatNumber(lastWeight)} ${unit}`}
        </button>
      )}

      <div className="sticky-foot">
        <button className="btn btn--primary btn--block btn--lg" onClick={start}>
          Start workout
        </button>
      </div>
    </main>
  )
}
