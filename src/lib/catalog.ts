import type { Measure } from './types'

/** Common exercises offered as one-tap suggestions when adding exercises to a session. */
export const CATALOG: { name: string; measure: Measure }[] = [
  // Legs and glutes
  { name: 'Squat', measure: 'weight' },
  { name: 'Front squat', measure: 'weight' },
  { name: 'Goblet squat', measure: 'weight' },
  { name: 'Lunges', measure: 'weight' },
  { name: 'Walking lunges', measure: 'weight' },
  { name: 'Bulgarian split squat', measure: 'weight' },
  { name: 'Leg press', measure: 'weight' },
  { name: 'Leg extension', measure: 'weight' },
  { name: 'Leg curl', measure: 'weight' },
  { name: 'Romanian deadlift', measure: 'weight' },
  { name: 'Deadlift', measure: 'weight' },
  { name: 'Hip thrust', measure: 'weight' },
  { name: 'Glute bridge', measure: 'weight' },
  { name: 'Cable kickback', measure: 'weight' },
  { name: 'Hip abduction machine', measure: 'weight' },
  { name: 'Calf raise', measure: 'weight' },
  { name: 'Step-ups', measure: 'weight' },
  { name: 'Box jumps', measure: 'reps' },
  { name: 'Wall sit', measure: 'time' },
  // Upper body
  { name: 'Bench press', measure: 'weight' },
  { name: 'Incline dumbbell press', measure: 'weight' },
  { name: 'Chest fly', measure: 'weight' },
  { name: 'Push-ups', measure: 'reps' },
  { name: 'Dips', measure: 'reps' },
  { name: 'Shoulder press', measure: 'weight' },
  { name: 'Lateral raise', measure: 'weight' },
  { name: 'Front raise', measure: 'weight' },
  { name: 'Pull-ups', measure: 'reps' },
  { name: 'Lat pulldown', measure: 'weight' },
  { name: 'Seated row', measure: 'weight' },
  { name: 'Bent-over row', measure: 'weight' },
  { name: 'Face pull', measure: 'weight' },
  // Arms
  { name: 'Bicep curl', measure: 'weight' },
  { name: 'Hammer curl', measure: 'weight' },
  { name: 'Tricep pushdown', measure: 'weight' },
  { name: 'Tricep extension', measure: 'weight' },
  { name: 'Skull crushers', measure: 'weight' },
  // Core
  { name: 'Plank', measure: 'time' },
  { name: 'Side plank', measure: 'time' },
  { name: 'Crunches', measure: 'reps' },
  { name: 'Russian twists', measure: 'reps' },
  { name: 'Leg raises', measure: 'reps' },
  { name: 'Dead bug', measure: 'reps' },
  { name: 'Mountain climbers', measure: 'time' },
  { name: 'Ab wheel', measure: 'reps' },
  // Cardio
  { name: 'Treadmill', measure: 'time' },
  { name: 'Stationary bike', measure: 'time' },
  { name: 'Rowing machine', measure: 'time' },
  { name: 'Elliptical', measure: 'time' },
  { name: 'Stair climber', measure: 'time' },
  { name: 'Jump rope', measure: 'time' },
  { name: 'Burpees', measure: 'reps' },
]

export const MEASURE_LABEL: Record<Measure, string> = {
  weight: 'Weight',
  reps: 'Reps',
  time: 'Time',
}
