import { Navigate, useNavigate } from 'react-router'
import { Aura } from '../components/Aura'
import { useConfirm } from '../components/Feedback'
import { Icon } from '../components/Icon'
import { SessionIcon } from '../components/SessionIcon'
import { MiniStepper, Stepper } from '../components/Stepper'
import { setDraft, useDraft, type Draft } from '../data/draft'
import { saveWorkout, useData } from '../data/store'
import { formatDuration } from '../lib/dates'
import { tap, useNow, useWakeLock } from '../lib/hooks'
import { newId, type SetEntry } from '../lib/types'
import { fromUnit, toUnit } from '../lib/units'

/** Step 3 of logging: check off sets as you go, jot a note, finish. */
export function LogActive() {
  const draft = useDraft()
  const { profile } = useData()!
  const navigate = useNavigate()
  const confirm = useConfirm()
  const now = useNow(1000)
  useWakeLock(profile.keepAwake && draft !== null)

  if (!draft) return <Navigate to="/" replace />

  const { unit } = profile
  const update = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch })
  const updateSet = (index: number, patch: Partial<SetEntry>) =>
    update({ sets: draft.sets.map((s, i) => (i === index ? { ...s, ...patch } : s)) })

  const done = draft.sets.filter((s) => s.done).length
  const total = draft.sets.length
  const allDone = done === total

  const toggle = (index: number) => {
    tap()
    updateSet(index, { done: !draft.sets[index].done })
  }

  const addSet = () => update({ sets: [...draft.sets, { reps: draft.sets[total - 1]?.reps ?? 10, done: false }] })
  const removeSet = () => total > 1 && update({ sets: draft.sets.slice(0, -1) })

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
      weightKg: draft.weightKg,
      sets: draft.sets,
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
      <Aura tone="sunset" height={320} glow={0.55 + 0.45 * (done / total)} />
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
          <span style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </header>

      <section className="group group--controls">
        <Stepper
          label="Weight"
          value={Number(toUnit(draft.weightKg, unit).toFixed(2))}
          onChange={(v) => update({ weightKg: fromUnit(v, unit) })}
          step={profile.weightStep}
          unit={unit}
          zeroLabel="Bodyweight"
          max={1000}
        />
      </section>

      <section className="group sets" aria-label="Sets">
        {draft.sets.map((set, i) => (
          <div key={i} className={`set${set.done ? ' is-done' : ''}`}>
            <button type="button" className="set__toggle" onClick={() => toggle(i)} aria-pressed={set.done}>
              <span className="check" aria-hidden="true">
                <Icon name="check" size={18} strokeWidth={2.6} />
              </span>
              <span className="set__label">Set {i + 1}</span>
            </button>
            <MiniStepper value={set.reps} onChange={(reps) => updateSet(i, { reps })} suffix="reps" />
          </div>
        ))}
        <div className="set set--actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={addSet}>
            <Icon name="plus" size={16} /> Add set
          </button>
          {total > 1 && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={removeSet}>
              <Icon name="minus" size={16} /> Remove last
            </button>
          )}
        </div>
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
    </main>
  )
}
