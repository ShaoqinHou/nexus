import { describe, it, expect } from 'vitest';
import { dietaryIconName, allergenIconName, dietaryTagColor } from '@web/lib/dietary';

// ---------------------------------------------------------------------------
// dietaryIconName
// ---------------------------------------------------------------------------

describe('dietaryIconName', () => {
  it('returns the canonical icon name for a known tag', () => {
    expect(dietaryIconName('vegetarian')).toBe('vegetarian');
  });

  it('is case-insensitive (SPICY → spice-2)', () => {
    expect(dietaryIconName('SPICY')).toBe('spice-2');
  });

  it('handles mixed case', () => {
    expect(dietaryIconName('Vegan')).toBe('vegan');
  });

  it('maps spice variants correctly', () => {
    expect(dietaryIconName('mild')).toBe('spice-1');
    expect(dietaryIconName('extra-spicy')).toBe('spice-3');
  });

  it('returns null for an unknown tag', () => {
    expect(dietaryIconName('unknown-tag')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(dietaryIconName('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// allergenIconName
// ---------------------------------------------------------------------------

describe('allergenIconName', () => {
  it('maps peanuts to contains-nuts', () => {
    expect(allergenIconName('peanuts')).toBe('contains-nuts');
  });

  it('is case-insensitive (Crab → contains-shellfish)', () => {
    expect(allergenIconName('Crab')).toBe('contains-shellfish');
  });

  it('maps dairy to contains-dairy', () => {
    expect(allergenIconName('dairy')).toBe('contains-dairy');
  });

  it('maps egg to contains-egg', () => {
    expect(allergenIconName('egg')).toBe('contains-egg');
  });

  it('returns null for an unknown allergen', () => {
    expect(allergenIconName('made-up')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// dietaryTagColor
// ---------------------------------------------------------------------------

describe('dietaryTagColor', () => {
  it('returns success classes for vegan', () => {
    expect(dietaryTagColor('vegan')).toBe('bg-success-light text-success');
  });

  it('returns warning classes for spicy', () => {
    expect(dietaryTagColor('spicy')).toBe('bg-warning-light text-warning');
  });

  it('returns primary classes for gluten-free', () => {
    expect(dietaryTagColor('gluten-free')).toBe('bg-primary-light text-primary');
  });

  it('falls back to muted classes for an unknown tag', () => {
    expect(dietaryTagColor('unknown')).toBe('bg-bg-muted text-text-secondary');
  });

  it('is case-insensitive (VEGAN → success classes)', () => {
    expect(dietaryTagColor('VEGAN')).toBe('bg-success-light text-success');
  });
});
