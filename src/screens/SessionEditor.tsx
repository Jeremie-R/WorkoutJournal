import { useState } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router'
import { Aura } from '../components/Aura'
import { ValueFields } from '../components/ExerciseRow'
import { ExercisePicker } from '../components/ExercisePicker'
import { useConfirm, useToast } from '../components/Feedback'
import { Icon } from '../components/Icon'
import { SessionIcon } from '../components/SessionIcon'
import { Stepper } from '../components/Stepper'
import { deleteType, saveType, useData } from '../data/store'
import { useBack } from '../lib/hooks'
import { EMOJI_PREFIX, ICONS } from '../lib/icons'
import { newId, type Exercise, type PlannedExercise, type SessionType, type Unit } from '../lib/types'
import { formatSeconds, formatWeight } from '../lib/units'
import { emptyPlan } from '../lib/workouts'

/** Create or edit a session type: name, icon, its usual sets and reps, and the exercises it includes. */
export function SessionEditor() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const { types, workouts, exercises, profile } = useData()!
  const navigate = useNavigate()
  const back = useBack('/setup')
  const confirm = useConfirm()
  const toast = useToast()

  const existing = types.find((t) => t.id === id)
  const isNew = id === 'new'
  const [name, setName] = useState(existing?.name ?? '')
  const [icon, setIcon] = useState(existing?.icon ?? 'person_lifting_weights')
  const [sets, setSets] = useState(existing?.sets ?? 3)
  const [reps, setReps] = useState(existing?.reps ?? 10)
  const [plan, setPlan] = useState<PlannedExercise[]>(existing?.exercises ?? [])
  const [emoji, setEmoji] = useState(existing?.icon.startsWith(EMOJI_PREFIX) ? existing.icon.slice(EMOJI_PREFIX.length) : '')
  const [showIcons, setShowIcons] = useState(isNew)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)

  if (!isNew && !existing) return <Navigate to="/setup" replace />

  const pickIcon = (iconId: string, label: string) => {
    setIcon(iconId)
    setEmoji('')
    // Naming "Glutes" after tapping the peach saves a step.
    if (!name.trim()) setName(label)
  }

  const updatePlan = (index: number, patch: Partial<PlannedExercise>) => setPlan((list) => list.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  const move = (index: number, dir: -1 | 1) =>
    setPlan((list) => {
      const next = [...list]
      ;[next[index], next[index + dir]] = [next[index + dir], next[index]]
      return next
    })

  const save = () => {
    const now = Date.now()
    const type: SessionType = {
      ...existing,
      id: existing?.id ?? newId(),
      name: name.trim(),
      icon,
      sets,
      reps,
      exercises: plan,
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
        ? `Your ${count} logged workout${count > 1 ? 's' : ''} stay in your journal. Its exercises stay in your list.`
        : 'Its exercises stay in your list for other sessions.',
      confirmLabel: 'Delete session',
      danger: true,
    })
    if (!ok) return
    deleteType(existing!.id)
    navigate('/setup', { replace: true })
  }

  const planned = plan.flatMap((p, index) => {
    const exercise = exercises.find((e) => e.id === p.exerciseId)
    return exercise ? [{ p, index, exercise }] : []
  })

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
        <button type="button" className="hero__icon-btn" onClick={() => setShowIcons((v) => !v)} aria-label="Change icon" aria-expanded={showIcons}>
          <SessionIcon icon={icon} size={96} className="hero__icon" />
          <span className="hero__icon-edit" aria-hidden="true">
            <Icon name="pencil" size={14} />
          </span>
        </button>
        <input
          className="input input--title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name it, e.g. Legs"
          aria-label="Session name"
          maxLength={40}
          autoFocus={isNew}
        />
      </header>

      {showIcons && (
        <section className="card icon-picker">
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
        </section>
      )}

      <section>
        <h2 className="section-title">Sets and reps, for every exercise</h2>
        <div className="group group--controls">
          <Stepper label="Sets" value={sets} onChange={setSets} min={1} max={20} integer />
          <Stepper label="Reps per set" value={reps} onChange={setReps} min={1} max={100} integer />
        </div>
      </section>

      <section>
        <h2 className="section-title">Exercises</h2>
        <div className="group">
          {planned.map(({ p, index, exercise }) => (
            <PlanRow
              key={p.exerciseId}
              plan={p}
              exercise={exercise}
              sessionReps={reps}
              unit={profile.unit}
              weightStep={profile.weightStep}
              expanded={expanded === p.exerciseId}
              onToggle={() => setExpanded((cur) => (cur === p.exerciseId ? null : p.exerciseId))}
              onChange={(patch) => updatePlan(index, patch)}
              onMove={(dir) => move(index, dir)}
              canMoveUp={index > 0}
              canMoveDown={index < plan.length - 1}
              onRemove={() => setPlan((list) => list.filter((_, i) => i !== index))}
            />
          ))}
          <button type="button" className="row row--link plan-add" onClick={() => setPicking(true)}>
            <span className="plan-add__icon" aria-hidden="true">
              <Icon name="plus" size={18} strokeWidth={2.2} />
            </span>
            <span className="row__title">Add exercise</span>
          </button>
        </div>
        <p className="fineprint fineprint--left">
          {planned.length
            ? 'Weights and times are optional. Leave them empty and fill them in during your first workout; they’re remembered for next time.'
            : 'Add the exercises this session includes, like Squat or Lunges. Without any, you just check off sets.'}
        </p>
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

      <ExercisePicker
        open={picking}
        onClose={() => setPicking(false)}
        excluded={new Set(plan.map((p) => p.exerciseId))}
        onPick={(exercise) => setPlan((list) => [...list, emptyPlan(exercise.id)])}
      />
    </main>
  )
}

interface PlanRowProps {
  plan: PlannedExercise
  exercise: Exercise
  sessionReps: number
  unit: Unit
  weightStep: number
  expanded: boolean
  onToggle: () => void
  onChange: (patch: Partial<PlannedExercise>) => void
  onMove: (dir: -1 | 1) => void
  canMoveUp: boolean
  canMoveDown: boolean
  onRemove: () => void
}

/** One exercise in the session. Collapsed it shows its value; expanded it edits it. Sets and reps are the session's. */
function PlanRow({ plan, exercise, sessionReps, unit, weightStep, expanded, onToggle, onChange, onMove, canMoveUp, canMoveDown, onRemove }: PlanRowProps) {
  const { summary, empty } = planSummary(plan, exercise, sessionReps, unit)

  return (
    <div className={`plan-row${expanded ? ' is-open' : ''}`}>
      <button type="button" className="row row--link" onClick={onToggle} aria-expanded={expanded}>
        <span className="row__body">
          <span className="row__title">{exercise.name}</span>
          <span className={`row__meta${empty ? ' row__meta--soft' : ''}`}>{summary}</span>
        </span>
        <span className="plan-row__chevron" aria-hidden="true">
          <Icon name="chevron" size={18} />
        </span>
      </button>
      {expanded && (
        <div className="plan-row__edit">
          <ValueFields
            measure={exercise.measure}
            weightKg={plan.weightKg}
            reps={plan.reps ?? sessionReps}
            seconds={plan.seconds}
            // A rep count equal to the session's is stored as "follow the session".
            onChange={(patch) => onChange({ ...patch, ...(patch.reps !== undefined && { reps: patch.reps === sessionReps ? null : patch.reps }) })}
            unit={unit}
            weightStep={weightStep}
          />
          <div className="plan-row__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onMove(-1)} disabled={!canMoveUp}>
              Move up
            </button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onMove(1)} disabled={!canMoveDown}>
              Move down
            </button>
            <button type="button" className="btn btn--ghost btn--sm plan-row__remove" onClick={onRemove}>
              <Icon name="trash" size={16} /> Remove
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function planSummary(plan: PlannedExercise, exercise: Exercise, sessionReps: number, unit: Unit) {
  if (exercise.measure === 'time') {
    return plan.seconds ? { summary: formatSeconds(plan.seconds), empty: false } : { summary: 'Tap to set a time', empty: true }
  }
  if (exercise.measure === 'reps') return { summary: `${plan.reps ?? sessionReps} reps`, empty: false }
  return plan.weightKg ? { summary: formatWeight(plan.weightKg, unit), empty: false } : { summary: 'Tap to set a weight', empty: true }
}
