import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'

export interface Point {
  value: number
  /** Tooltip / axis label for this point, e.g. "12 Sep". */
  label: string
}

const HEIGHT = 180
const PAD = { top: 26, right: 16, bottom: 26, left: 36 }

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(320)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/** Clean, evenly spaced tick values covering [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.1)
    min -= pad
    max += pad
  }
  const rough = (max - min) / (count - 1)
  const mag = 10 ** Math.floor(Math.log10(rough))
  const norm = rough / mag
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag
  const ticks: number[] = []
  for (let t = Math.floor(min / step) * step; t <= Math.ceil(max / step) * step + step / 2; t += step) {
    ticks.push(Number(t.toFixed(6)))
  }
  return ticks
}

const fmt = (v: number) => String(Number(v.toFixed(2)))

interface ChartProps {
  points: Point[]
  unit: string
  ariaLabel: string
  /** How values read on ticks, labels and the tooltip (e.g. "1:30" for seconds). */
  format?: (value: number) => string
}

interface ChartFrameProps extends ChartProps {
  children: (geo: Geometry) => ReactNode
}

interface Geometry {
  width: number
  x: (i: number) => number
  y: (v: number) => number
  active: number | null
  format: (value: number) => string
}

/**
 * Axes, gridlines, hover/tap readout and keyboard support around the line chart.
 * The readout snaps to the nearest session, so nobody has to hit a 2px line.
 */
function ChartFrame({ points, unit, ariaLabel, format = fmt, children }: ChartFrameProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const values = points.map((p) => p.value)
  const ticks = niceTicks(Math.min(...values), Math.max(...values))
  const lo = ticks[0]
  const hi = ticks[ticks.length - 1]
  const innerW = Math.max(10, width - PAD.left - PAD.right)
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const band = innerW / points.length
  const x = (i: number) => PAD.left + band * (i + 0.5)
  const y = (v: number) => PAD.top + innerH - ((v - lo) / (hi - lo || 1)) * innerH

  const pick = (e: PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect()
    const i = Math.floor((e.clientX - box.left - PAD.left) / band)
    setActive(Math.min(points.length - 1, Math.max(0, i)))
  }

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') setActive((a) => Math.min(points.length - 1, (a ?? -1) + 1))
    else if (e.key === 'ArrowLeft') setActive((a) => Math.max(0, (a ?? points.length) - 1))
    else if (e.key === 'Escape') setActive(null)
    else return
    e.preventDefault()
  }

  const tipLeft = active === null ? 0 : Math.min(width - 60, Math.max(60, x(active)))

  return (
    <div className="chart" ref={ref}>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={ariaLabel}
        tabIndex={0}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart__grid" x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="chart__tick" x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
              {format(t)}
            </text>
          </g>
        ))}
        <text className="chart__tick" x={x(0)} y={HEIGHT - 6} textAnchor={points.length === 1 ? 'middle' : 'start'} dx={points.length === 1 ? 0 : -4}>
          {points[0].label}
        </text>
        {points.length > 1 && (
          <text className="chart__tick" x={x(points.length - 1)} y={HEIGHT - 6} textAnchor="end" dx={4}>
            {points[points.length - 1].label}
          </text>
        )}
        {active !== null && <line className="chart__cross" x1={x(active)} x2={x(active)} y1={PAD.top - 8} y2={HEIGHT - PAD.bottom} />}
        {children({ width, x, y, active, format })}
      </svg>
      {active !== null && (
        <div className="chart__tip" style={{ left: tipLeft }} aria-live="polite">
          <strong>
            {format(points[active].value)} {unit}
          </strong>
          <span>{points[active].label}</span>
        </div>
      )}
    </div>
  )
}

export function LineChart(props: ChartProps) {
  const { points } = props
  return (
    <ChartFrame {...props}>
      {({ x, y, active, format }) => {
        const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.value)}`).join(' ')
        const bottom = HEIGHT - PAD.bottom
        const area = `${line} L${x(points.length - 1)},${bottom} L${x(0)},${bottom} Z`
        const last = points.length - 1
        return (
          <>
            <defs>
              <linearGradient id="chart-wash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#F4A9C8" stopOpacity="0.45" />
                <stop offset="1" stopColor="#C9B6F5" stopOpacity="0" />
              </linearGradient>
            </defs>
            {points.length > 1 && <path d={area} fill="url(#chart-wash)" />}
            {points.length > 1 && <path className="chart__line" d={line} />}
            {points.map((p, i) => (
              <circle key={i} className={`chart__dot${i === active ? ' is-active' : ''}`} cx={x(i)} cy={y(p.value)} r={i === active || i === last ? 5 : 4} />
            ))}
            {active === null && (
              <text className="chart__value" x={x(last)} y={y(points[last].value) - 12} textAnchor={points.length > 1 ? 'end' : 'middle'} dx={points.length > 1 ? 6 : 0}>
                {format(points[last].value)}
              </text>
            )}
          </>
        )
      }}
    </ChartFrame>
  )
}
