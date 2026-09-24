// Builds realistic demo data (9 weeks of training) and the screenshot plan (config.json) for shoot.swift.
// Usage: node plan.mjs <output dir>
import { writeFileSync, mkdirSync } from 'node:fs'

const OUT = process.argv[2]
const BASE = 'http://localhost:5173'
const DAY = 86_400_000
const now = new Date()
const t0 = now.getTime() - 70 * DAY

const ex = (id, name, measure) => ({ id, name, measure, createdAt: t0, updatedAt: t0 })
const library = [
  ex('hip-thrust', 'Hip thrust', 'weight'),
  ex('bss', 'Bulgarian split squat', 'weight'),
  ex('rdl', 'Romanian deadlift', 'weight'),
  ex('kickback', 'Cable kickback', 'weight'),
  ex('squat', 'Squat', 'weight'),
  ex('lunges', 'Walking lunges', 'weight'),
  ex('leg-press', 'Leg press', 'weight'),
  ex('calf', 'Calf raise', 'weight'),
  ex('bench', 'Bench press', 'weight'),
  ex('row', 'Seated row', 'weight'),
  ex('ohp', 'Shoulder press', 'weight'),
  ex('pushups', 'Push-ups', 'reps'),
  ex('plank', 'Plank', 'time'),
  ex('crunches', 'Crunches', 'reps'),
  ex('twists', 'Russian twists', 'reps'),
]
const byId = Object.fromEntries(library.map((e) => [e.id, e]))

// How each exercise progresses with the k-th time its session is done.
const prog = {
  'hip-thrust': (k) => ({ weightKg: 50 + 2.5 * Math.floor(k / 2) }),
  bss: (k) => ({ weightKg: 10 + 2 * Math.floor(k / 3) }),
  rdl: (k) => ({ weightKg: 35 + 2.5 * Math.floor(k / 3) }),
  kickback: (k) => ({ weightKg: 7.5 + 1.25 * Math.floor(k / 3) }),
  squat: (k) => ({ weightKg: 40 + 2.5 * Math.floor(k / 2) }),
  lunges: (k) => ({ weightKg: 8 + 2 * Math.floor(k / 3) }),
  'leg-press': (k) => ({ weightKg: 80 + 5 * Math.floor(k / 2) }),
  calf: (k) => ({ weightKg: 25 + 2.5 * Math.floor(k / 3) }),
  bench: (k) => ({ weightKg: 27.5 + 2.5 * Math.floor(k / 3) }),
  row: (k) => ({ weightKg: 32.5 + 2.5 * Math.floor(k / 3) }),
  ohp: (k) => ({ weightKg: 10 + Math.floor(k / 3) }),
  pushups: (k) => ({ reps: 8 + Math.floor(k / 2) }),
  plank: (k) => ({ seconds: 45 + 5 * Math.floor(k / 2) }),
  crunches: () => ({}),
  twists: () => ({ reps: 20 }),
}

const sessions = [
  { id: 'glutes', name: 'Glutes', icon: 'peach', sets: 4, reps: 12, ex: ['hip-thrust', 'bss', 'rdl', 'kickback'], day: 0 },
  { id: 'upper', name: 'Upper body', icon: 'mechanical_arm', sets: 3, reps: 10, ex: ['bench', 'row', 'ohp', 'pushups'], day: 2 },
  { id: 'legs', name: 'Legs', icon: 'leg', sets: 4, reps: 10, ex: ['squat', 'lunges', 'leg-press', 'calf'], day: 4 },
  { id: 'core', name: 'Core', icon: 'bullseye', sets: 3, reps: 15, ex: ['plank', 'crunches', 'twists'], day: 6 },
]

const logged = (id, k) => {
  const e = byId[id]
  const v = prog[id](k)
  return { exerciseId: id, name: e.name, measure: e.measure, weightKg: v.weightKg ?? null, reps: e.measure === 'reps' ? (v.reps ?? null) : null, seconds: v.seconds ?? null }
}

const notes = {
  'glutes-6': 'New best on hip thrust! Felt strong the whole way.',
  'legs-3': 'Knee a little tight on the lunges, went lighter on the last set.',
  'upper-5': 'Great energy today. Push-ups felt easy, add a few next time.',
  'core-2': 'Plank is getting easier.',
}

// Monday of this week, 18:30.
const monday = new Date(now)
monday.setHours(18, 30, 0, 0)
monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))

// Weekly plan in day order; an extra Saturday Glutes session in the last three weeks.
const plan = [
  { s: sessions[0], day: 0 },
  { s: sessions[1], day: 2 },
  { s: sessions[2], day: 4 },
  { s: sessions[0], day: 5, recent: true },
  { s: sessions[3], day: 6 },
]
const counts = Object.fromEntries(sessions.map((s) => [s.id, 0]))
const workouts = []
for (let week = 8; week >= 0; week--) {
  for (const { s, day, recent } of plan) {
    if (recent && week > 2) continue
    if (s.id === 'core' && week % 2) continue
    if (s.id === 'legs' && week === 5) continue
    const start = new Date(monday)
    start.setDate(monday.getDate() - week * 7 + day)
    if (start.getTime() > now.getTime() - 3 * 3600_000) continue
    const k = counts[s.id]++
    const skipLast = s.id === 'legs' && k % 4 === 3
    workouts.push({
      id: `${s.id}-${k}`,
      typeId: s.id,
      typeName: s.name,
      typeIcon: s.icon,
      startedAt: start.getTime(),
      finishedAt: start.getTime() + (46 + ((k * 7) % 15)) * 60_000,
      reps: s.id === 'upper' && k === 5 ? s.reps + 2 : s.reps,
      done: Array.from({ length: s.sets }, (_, i) => !(skipLast && i === s.sets - 1)),
      exercises: s.ex.map((id) => logged(id, k)),
      note: notes[`${s.id}-${k}`] ?? '',
      createdAt: start.getTime(),
      updatedAt: start.getTime(),
    })
  }
}

const types = sessions.map((s, i) => ({
  id: s.id,
  name: s.name,
  icon: s.icon,
  sets: s.sets,
  reps: s.reps,
  exercises: s.ex.map((id) => {
    const v = prog[id](Math.max(0, counts[s.id] - 1))
    return { exerciseId: id, weightKg: v.weightKg ?? null, reps: v.reps ?? null, seconds: v.seconds ?? null }
  }),
  order: i,
  createdAt: t0 + i,
  updatedAt: t0,
}))

const data = {
  types,
  workouts,
  exercises: library,
  profile: { unit: 'kg', weekStart: 1, weightStep: 2.5, prefill: 'last', keepAwake: true, updatedAt: t0 },
}

// A Glutes workout in progress: 18 minutes in, two rounds done.
const draft = {
  typeId: 'glutes',
  typeName: 'Glutes',
  typeIcon: 'peach',
  reps: 12,
  done: [true, true, false, false],
  exercises: sessions[0].ex.map((id) => logged(id, counts.glutes)),
  note: '',
  startedAt: now.getTime() - 18 * 60_000 - 23_000,
}

const lastGlutes = workouts.filter((w) => w.typeId === 'glutes').at(-1).id
const seed = `localStorage.setItem('wj:data:v1', ${JSON.stringify(JSON.stringify(data))}); localStorage.setItem('wj:device-mode', '1')`
const click = (selector, text) =>
  `const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(e => e.innerText.trim().startsWith(${JSON.stringify(text)})); el.click()`

const steps = [
  { url: `${BASE}/`, wait: 2.5, shot: 'welcome.jpg' },
  { js: seed },
  { url: `${BASE}/`, wait: 2, shot: 'journal.jpg' },
  { js: "document.querySelector('.history-group').scrollIntoView({ block: 'start' }); window.scrollBy(0, -40)", wait: 0.6, shot: 'history.jpg' },
  { url: `${BASE}/?view=progress`, wait: 1.5 },
  { js: click('.chip-row .chip', 'Hip thrust'), wait: 0.6 },
  { js: "document.querySelector('.chip-row .chip.is-active').scrollIntoView({ inline: 'center', block: 'nearest' }); document.querySelector('.chip-row').scrollIntoView({ block: 'start' }); window.scrollBy(0, -24)", wait: 0.6, shot: 'progress.jpg' },
  { url: `${BASE}/log`, wait: 1.5, shot: 'log-pick.jpg' },
  { url: `${BASE}/log/glutes`, wait: 1.5, shot: 'log-confirm.jpg' },
  { url: `${BASE}/setup`, wait: 1.5, shot: 'setup.jpg' },
  { url: `${BASE}/setup?tab=exercises`, wait: 1.5, shot: 'exercises.jpg' },
  { url: `${BASE}/setup/session/glutes`, wait: 1.5, shot: 'session-editor.jpg' },
  { js: click('button', 'Add exercise'), wait: 0.8, shot: 'picker.jpg' },
  { url: `${BASE}/workout/${lastGlutes}`, wait: 1.5, shot: 'workout-detail.jpg' },
  { js: `localStorage.setItem('wj:draft:v2', ${JSON.stringify(JSON.stringify(draft))})` },
  { url: `${BASE}/log/active`, wait: 1.5, shot: 'workout.jpg' },
  { js: click('.plan-row .row', 'Bulgarian'), wait: 0.4 },
  { js: "document.querySelector('.plan-row.is-open').scrollIntoView({ block: 'center' })", wait: 0.5, shot: 'workout-adjust.jpg' },
]

mkdirSync(OUT, { recursive: true })
writeFileSync(`${OUT}/config.json`, JSON.stringify({ width: 390, height: 844, quality: 0.86, outDir: OUT, steps }, null, 2))
console.log(`${workouts.length} workouts, last glutes ${lastGlutes}`)
