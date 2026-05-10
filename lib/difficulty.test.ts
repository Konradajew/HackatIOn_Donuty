import { applyEffect, damageMultiplier, shuffleArray } from './difficulty';

describe('damageMultiplier', () => {
  it('returns 1.00 for difficulty=1, cardType=DMG', () => {
    expect(damageMultiplier('DMG', 1)).toBe(1.0);
  });

  it('scales DMG to 2.00 at difficulty=5', () => {
    expect(damageMultiplier('DMG', 5)).toBe(2.0);
  });

  it('clamps difficulty into 1..5', () => {
    expect(damageMultiplier('DMG', 0)).toBe(damageMultiplier('DMG', 1));
    expect(damageMultiplier('DMG', 99)).toBe(damageMultiplier('DMG', 5));
  });

  it('falls back to DMG row for unknown cardType', () => {
    expect(damageMultiplier('UNKNOWN', 3)).toBe(damageMultiplier('DMG', 3));
  });
});

describe('applyEffect', () => {
  it('rounds up fractional results', () => {
    expect(applyEffect(3, 'DMG', 2)).toBe(Math.ceil(3 * 1.25));
  });

  it('returns integers for whole multipliers', () => {
    expect(applyEffect(10, 'DMG', 5)).toBe(20);
  });
});

describe('shuffleArray', () => {
  it('preserves length', () => {
    expect(shuffleArray([1, 2, 3, 4, 5])).toHaveLength(5);
  });

  it('preserves the multiset of elements', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffleArray(input);
    expect([...out].sort()).toEqual([...input].sort());
  });

  it('does not mutate the input array', () => {
    const input = [1, 2, 3];
    shuffleArray(input);
    expect(input).toEqual([1, 2, 3]);
  });
});
