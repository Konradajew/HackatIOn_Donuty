const MULTIPLIERS: Record<string, number[]> = {
  // index 0 unused; indices 1-5 = difficulty 1-5
  DMG:         [0, 1.00, 1.25, 1.50, 1.75, 2.00],
  DOT:         [0, 1.00, 1.20, 1.40, 1.60, 1.80],
  POISON:      [0, 1.00, 1.20, 1.40, 1.60, 1.80],
  HEAL:        [0, 1.00, 1.10, 1.25, 1.40, 1.60],
  DMG_BLOCK:   [0, 1.00, 1.00, 1.20, 1.40, 1.50],
  HEAL_REMOVE: [0, 1.00, 1.00, 1.25, 1.50, 1.50],
  TIME_BUFF:   [0, 1.00, 1.00, 1.00, 1.25, 1.50],
};

export function damageMultiplier(cardType: string, difficulty: number): number {
  const d = Math.max(1, Math.min(5, Math.round(difficulty)));
  const row = MULTIPLIERS[cardType] ?? MULTIPLIERS.DMG;
  return row[d];
}

export function applyEffect(baseVal: number, cardType: string, difficulty: number): number {
  return Math.ceil(baseVal * damageMultiplier(cardType, difficulty));
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
