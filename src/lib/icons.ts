// 3D icons from Microsoft's Fluent Emoji (MIT, see public/icons/fluent/LICENSE.txt).
export const ICONS: { id: string; label: string }[] = [
  { id: 'peach', label: 'Glutes' },
  { id: 'flexed_biceps', label: 'Arms' },
  { id: 'leg', label: 'Legs' },
  { id: 'person_lifting_weights', label: 'Lifting' },
  { id: 'mechanical_arm', label: 'Upper body' },
  { id: 'mechanical_leg', label: 'Lower body' },
  { id: 'bullseye', label: 'Core' },
  { id: 'bone', label: 'Back' },
  { id: 'rock', label: 'Heavy' },
  { id: 'boxing_glove', label: 'Boxing' },
  { id: 'person_running', label: 'Running' },
  { id: 'running_shoe', label: 'Cardio' },
  { id: 'person_biking', label: 'Cycling' },
  { id: 'person_rowing_boat', label: 'Rowing' },
  { id: 'person_swimming', label: 'Swimming' },
  { id: 'person_climbing', label: 'Climbing' },
  { id: 'person_in_lotus_position', label: 'Yoga' },
  { id: 'person_cartwheeling', label: 'Mobility' },
  { id: 'man_dancing', label: 'Dance' },
  { id: 'tennis', label: 'Tennis' },
  { id: 'anatomical_heart', label: 'Heart' },
  { id: 'lungs', label: 'Breath' },
  { id: 'brain', label: 'Focus' },
  { id: 'fire', label: 'Burn' },
  { id: 'high_voltage', label: 'Power' },
  { id: 'rocket', label: 'Explosive' },
  { id: 'stopwatch', label: 'Timed' },
  { id: 'mountain', label: 'Endurance' },
  { id: 'water_wave', label: 'Flow' },
  { id: 'seedling', label: 'Growth' },
  { id: 'sparkles', label: 'Fresh' },
  { id: 'red_heart', label: 'Love' },
  { id: 'hundred_points', label: '100' },
  { id: 'trophy', label: 'Trophy' },
  { id: 'sports_medal', label: 'Medal' },
]

const known = new Set(ICONS.map((i) => i.id))

export function iconSrc(id: string): string | null {
  return known.has(id) ? `/icons/fluent/${id}.png` : null
}

export const EMOJI_PREFIX = 'emoji:'
