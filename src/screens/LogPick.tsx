import { Link } from 'react-router'
import { Aura } from '../components/Aura'
import { Icon } from '../components/Icon'
import { SessionIcon } from '../components/SessionIcon'
import { useDraft } from '../data/draft'
import { useData } from '../data/store'
import { relativeDay } from '../lib/dates'
import { useBack } from '../lib/hooks'
import { sessionMeta } from '../lib/workouts'

/** Step 1 of logging: what are we training today? */
export function LogPick() {
  const { types, workouts } = useData()!
  const draft = useDraft()
  const back = useBack('/')

  return (
    <main className="page page--sheet">
      <Aura tone="lilac" height={300} />
      <div className="flow-bar">
        <button className="icon-btn" onClick={back} aria-label="Close">
          <Icon name="x" />
        </button>
      </div>

      <div className="sheet">
        <h1 className="title title--center">What are you training today?</h1>
        <p className="subtitle subtitle--center">Pick a session, then confirm today’s weight and sets.</p>

        {draft && (
          <Link to="/log/active" className="banner">
            <SessionIcon icon={draft.typeIcon} size={36} />
            <div className="banner__body">
              <p className="banner__title">{draft.typeName} is still in progress</p>
              <p className="banner__meta">Finish or discard it before starting another.</p>
            </div>
            <span className="banner__action">Resume</span>
          </Link>
        )}

        {types.length > 0 ? (
          <div className="group">
            {types.map((type) => {
              const last = workouts.find((w) => w.typeId === type.id)
              return (
                <Link key={type.id} to={draft ? '/log/active' : `/log/${type.id}`} className="row row--link row--tall">
                  <span className="row__icon row__icon--lg">
                    <SessionIcon icon={type.icon} size={44} />
                  </span>
                  <span className="row__body">
                    <span className="row__title row__title--serif">{type.name}</span>
                    <span className="row__meta">{sessionMeta(type)}</span>
                    <span className="row__meta row__meta--soft">{last ? `Last time ${relativeDay(last.startedAt).toLowerCase()}` : 'Not logged yet'}</span>
                  </span>
                  <Icon name="chevron" size={20} />
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="empty empty--inline">
            <SessionIcon icon="person_lifting_weights" size={80} />
            <p className="empty__text">You haven’t set up any sessions yet. Create one to start logging.</p>
          </div>
        )}

        <Link to="/setup/session/new?next=log" className="btn btn--secondary btn--block">
          <Icon name="plus" size={18} />
          New session
        </Link>
      </div>
    </main>
  )
}
