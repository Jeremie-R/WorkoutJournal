import { useMemo } from 'react'
import { addDays, dayKey, formatLongDay, formatMonth, startOfWeek } from '../lib/dates'
import { Icon } from './Icon'

interface CalendarProps {
  month: Date
  onMonthChange: (month: Date) => void
  /** Workouts per day, keyed by dayKey. */
  counts: Map<string, number>
  selected: string | null
  onSelect: (day: string | null) => void
  weekStart: 0 | 1
}

const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' })

export function Calendar({ month, onMonthChange, counts, selected, onSelect, weekStart }: CalendarProps) {
  const today = dayKey(Date.now())
  const first = new Date(month.getFullYear(), month.getMonth(), 1)

  const days = useMemo(() => {
    const start = startOfWeek(first, weekStart)
    const lastOfMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0)
    const end = addDays(startOfWeek(lastOfMonth, weekStart), 6)
    const list: Date[] = []
    for (let d = start; d <= end; d = addDays(d, 1)) list.push(d)
    return list
  }, [first.getTime(), weekStart])

  const inMonth = days.filter((d) => d.getMonth() === first.getMonth())
  const monthTotal = inMonth.reduce((sum, d) => sum + (counts.get(dayKey(d)) ?? 0), 0)
  const shift = (delta: number) => onMonthChange(new Date(first.getFullYear(), first.getMonth() + delta, 1))
  const isCurrentMonth = dayKey(first) === dayKey(new Date(new Date().getFullYear(), new Date().getMonth(), 1))

  return (
    <section className="calendar card" aria-label="Workout calendar">
      <header className="calendar__head">
        <div>
          <h2 className="calendar__month">{formatMonth(first)}</h2>
          <p className="calendar__total">
            {monthTotal === 0 ? 'No workouts' : monthTotal === 1 ? '1 workout' : `${monthTotal} workouts`}
          </p>
        </div>
        <div className="calendar__nav">
          <button className="icon-btn icon-btn--plain" onClick={() => shift(-1)} aria-label="Previous month">
            <Icon name="back" size={20} />
          </button>
          <button className="icon-btn icon-btn--plain" onClick={() => shift(1)} disabled={isCurrentMonth} aria-label="Next month">
            <Icon name="chevron" size={20} />
          </button>
        </div>
      </header>
      <div className="calendar__grid" role="grid">
        {days.slice(0, 7).map((d) => (
          <span key={`h${d.getDay()}`} className="calendar__weekday" aria-hidden="true">
            {weekdayFmt.format(d)}
          </span>
        ))}
        {days.map((d) => {
          const key = dayKey(d)
          const count = counts.get(key) ?? 0
          const outside = d.getMonth() !== first.getMonth()
          if (outside) return <span key={key} className="calendar__day is-outside" aria-hidden="true" />
          const classes = ['calendar__day', count && 'has-workout', key === today && 'is-today', key === selected && 'is-selected']
          const label = `${formatLongDay(d.getTime())}${count ? `, ${count} workout${count > 1 ? 's' : ''}` : ''}`
          return (
            <button
              key={key}
              className={classes.filter(Boolean).join(' ')}
              onClick={() => onSelect(key === selected || !count ? null : key)}
              aria-label={label}
              aria-pressed={key === selected}
              disabled={!count}
            >
              {d.getDate()}
              {count > 1 && <span className="calendar__multi" aria-hidden="true" />}
            </button>
          )
        })}
      </div>
    </section>
  )
}
