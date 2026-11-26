export const ease = {
  out: [0.15, 1, 0.3, 1],
  in: [0.4, 0, 1, 1],
  standard: [0.4, 0, 0.2, 1],
} as const;

export const spring = {
  drop: { type: 'spring', stiffness: 500, damping: 38, mass: 0.9 },
  layout: { type: 'spring', stiffness: 400, damping: 36 },
  pop: { type: 'spring', stiffness: 520, damping: 30 },
} as const;

export const duration = {
  instant: 0.08,
  fast: 0.12,
  base: 0.18,
  moderate: 0.25,
  slow: 0.35,
} as const;
