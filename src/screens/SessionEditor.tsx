import { useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { Aura } from '../components/Aura'
import { useConfirm, useToast } from '../components/Feedback'
import { Icon } from '../components/Icon'
import { SessionIcon } from '../components/SessionIcon'
import { Stepper } from '../components/Stepper'
import { deleteType, saveType, useData } from '../data/store'
import { useBack } from '../lib/hooks'
import { EMOJI_PREFIX, ICONS } from '../lib/icons'
import { newId, type SessionType } from '../lib/types'
import { fromUnit, toUnit } from '../lib/units'

/** Create or edit a session type: name, icon, and the defaults used when logging it. */
export function SessionEditor() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { types, workouts, profile } = useData()!
  const navigate = useNavigate()
  const back = useBack('/setup')
  const confirm = useConfirm()
  const toast = useToast()
  const { unit } = profile

  const existing = types.find((t) => t.id === id)
  const isNew = id === 'new'
  const [name, setName] = useState(existing?.name ?? '')
  const [icon, setIcon] = useState(existing?.icon ?? 'person_lifting_weights')
  const [sets, setSets] = useState(existing?.sets ?? 3)
  const [reps, setReps] = useState(existing?.reps ?? 10)
  const [weight, setWeight] = useState(() => Number(toUnit(existing?.weightKg ?? 0, unit).toFixed(2)))
  const [emoji, setEmoji] = useState(existing?.icon.startsWith(EMOJI_PREFIX) ? existing.icon.slice(EMOJI_PREFIX.length) : '')

  if (!isNew && !existing) return <Navigate to="/setup" replace />

  const pickIcon = (iconId: string, label: string) => {
    setIcon(iconId)
    setEmoji('')
    // Naming "Glutes" after tapping the peach saves a step.
    if (!name.trim()) setName(label)
  }

  const save = () => {
    const now = Date.now()
    const type: SessionType = {
      id: existing?.id ?? newId(),
      name: name.trim(),
      icon,
      sets,
      reps,
      weightKg: fromUnit(weight, unit),
      order: existing?.order ?? Math.max(-1, ...types.map((t) => t.order)) + 1,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    saveType(type)
    if (params.get('next') === 'log') navigate(`/log/${type.id}`, { replace: true })
    else {
      toast(isNew ? `${type.name} added` : 'Session saved')
      back()
    }
  }

  const remove = async () => {
    const count = workouts.filter((w) => w.typeId === existing!.id).length
    const ok = await confirm({
      title: `Delete ${existing!.name}?`,
      message: count
        ? `Your ${count} logged workout${count > 1 ? 's' : ''} stay in your journal.`
        : 'You haven’t logged this session yet.',
      confirmLabel: 'Delete session',
      danger: true,
    })
    if (!ok) return
    deleteType(existing!.id)
    navigate('/setup', { replace: true })
  }

  return (
    <main className="page page--flow">
      <Aura tone="mint" height={320} />
      <div className="flow-bar">
        <button className="icon-btn" onClick={back} aria-label="Back">
          <Icon name="back" />
        </button>
        <span className="flow-bar__title">{isNew ? 'New session' : 'Edit session'}</span>
        <span className="flow-bar__spacer" />
      </div>

      <header className="hero hero--compact">
        <SessionIcon icon={icon} size={96} className="hero__icon" />
        <input
          className="input input--title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name it, e.g. Glutes"
          aria-label="Session name"
          maxLength={40}
          autoFocus={isNew}
        />
      </header>

      <section>
        <h2 className="section-title">Icon</h2>
        <div className="card icon-picker">
          <div className="icon-grid" role="radiogroup" aria-label="Icon">
            {ICONS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={icon === option.id}
                aria-label={option.label}
                title={option.label}
                className={`icon-grid__item${icon === option.id ? ' is-active' : ''}`}
                onClick={() => pickIcon(option.id, option.label)}
              >
                <SessionIcon icon={option.id} size={36} />
              </button>
            ))}
          </div>
          <label className="form-row form-row--inset">
            <span className="form-row__label">Or any emoji</span>
            <input
              className="input input--emoji"
              value={emoji}
              placeholder="🙂"
              aria-label="Custom emoji"
              onChange={(e) => {
                // Keep just the first emoji (grapheme), which may be several code points.
                const first = [...new Intl.Segmenter().segment(e.target.value.trim())][0]?.segment ?? ''
                setEmoji(first)
                if (first) setIcon(EMOJI_PREFIX + first)
              }}
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="section-title">Defaults when you log it</h2>
        <div className="group group--controls">
          <Stepper label="Sets" value={sets} onChange={setSets} min={1} max={20} integer />
          <Stepper label="Reps per set" value={reps} onChange={setReps} min={1} max={100} integer />
          <Stepper label="Weight" value={weight} onChange={setWeight} step={profile.weightStep} unit={unit} zeroLabel="Bodyweight" max={1000} />
        </div>
      </section>

      {!isNew && (
        <button className="btn btn--danger-ghost btn--block" onClick={remove}>
          <Icon name="trash" size={18} /> Delete session
        </button>
      )}

      <div className="sticky-foot">
        <button className="btn btn--primary btn--block btn--lg" onClick={save} disabled={!name.trim()}>
          {params.get('next') === 'log' ? 'Save and continue' : isNew ? 'Add session' : 'Save'}
        </button>
      </div>
    </main>
  )
}
