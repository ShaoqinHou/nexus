// Maps customer-facing dietary-tag and allergen strings (as stored in the
// menu DB) to the canonical DietaryIcon symbol IDs in
// `packages/web/public/dietary-icons.svg`.
//
// Per S-DIETARY-SPRITE: every dietary / allergen / spice / promo render
// site MUST use <DietaryIcon /> via the sprite. Plain text spans alone are
// a violation. This module is the central translation layer between the
// flexible string tags the kitchen / merchant types into the menu CRUD
// and the closed sprite IDs the design system supplies.
//
// Tags that don't map to an icon return null — the caller can fall back
// to text-only rendering for now (and a follow-up commit either adds the
// missing sprite symbol OR aliases the unknown tag to an existing one).

import type { DietaryIconName } from '@web/components/ui';

const DIETARY_TAG_TO_ICON: Record<string, DietaryIconName> = {
  // Diets
  vegetarian: 'vegetarian',
  vegan: 'vegan',
  pescatarian: 'pescatarian',
  halal: 'halal',
  kosher: 'kosher',
  // Allergen-free
  'gluten-free': 'gluten-free',
  'dairy-free': 'dairy-free',
  'nut-free': 'nut-free',
  'soy-free': 'soy-free',
  'egg-free': 'egg-free',
  'shellfish-free': 'shellfish-free',
  'msg-free': 'msg-free',
  // Spice levels — common shorthand maps to spice-2 (default heat).
  spicy: 'spice-2',
  mild: 'spice-1',
  hot: 'hot',
  cold: 'cold',
  'extra-spicy': 'spice-3',
  'spice-1': 'spice-1',
  'spice-2': 'spice-2',
  'spice-3': 'spice-3',
  // Promo / meta badges
  popular: 'popular',
  new: 'new',
  seasonal: 'seasonal',
  'chefs-pick': 'chefs-pick',
  'house-special': 'house-special',
};

/**
 * Returns the canonical sprite name for a dietary tag, or null if the tag
 * has no matching icon (caller should fall back to text-only).
 */
export function dietaryIconName(tag: string): DietaryIconName | null {
  return DIETARY_TAG_TO_ICON[tag.toLowerCase()] ?? null;
}

const ALLERGEN_TO_ICON: Record<string, DietaryIconName> = {
  // Direct allergen names → contains-X warnings.
  nuts: 'contains-nuts',
  'tree-nuts': 'contains-nuts',
  peanuts: 'contains-nuts',
  almond: 'contains-nuts',
  cashew: 'contains-nuts',
  walnut: 'contains-nuts',
  dairy: 'contains-dairy',
  milk: 'contains-dairy',
  lactose: 'contains-dairy',
  shellfish: 'contains-shellfish',
  crustacean: 'contains-shellfish',
  shrimp: 'contains-shellfish',
  crab: 'contains-shellfish',
  lobster: 'contains-shellfish',
  egg: 'contains-egg',
  eggs: 'contains-egg',
  soy: 'contains-soy',
  soya: 'contains-soy',
  soybeans: 'contains-soy',
  sesame: 'contains-sesame',
  pork: 'contains-pork',
  alcohol: 'contains-alcohol',
};

/**
 * Returns the canonical sprite name for an allergen, or null if the
 * allergen has no matching icon. Allergens are inherently warning-class
 * markers — callers should still render in `text-warning` / `text-danger`.
 */
export function allergenIconName(allergen: string): DietaryIconName | null {
  return ALLERGEN_TO_ICON[allergen.toLowerCase()] ?? null;
}

/**
 * Token-mapped Tailwind classes for a dietary-tag chip background + text.
 * Centralized here so MenuBrowse.tsx and ItemDetailSheet.tsx stay aligned.
 */
export function dietaryTagColor(tag: string): string {
  const t = tag.toLowerCase();
  switch (t) {
    case 'vegetarian':
    case 'vegan':
    case 'pescatarian':
      return 'bg-success-light text-success';
    case 'gluten-free':
    case 'dairy-free':
    case 'nut-free':
    case 'soy-free':
    case 'egg-free':
    case 'shellfish-free':
    case 'msg-free':
    case 'halal':
    case 'kosher':
      return 'bg-primary-light text-primary';
    case 'spicy':
    case 'extra-spicy':
    case 'hot':
    case 'spice-1':
    case 'spice-2':
    case 'spice-3':
      return 'bg-warning-light text-warning';
    case 'cold':
      return 'bg-info-light text-info';
    case 'new':
    case 'popular':
    case 'seasonal':
    case 'chefs-pick':
    case 'house-special':
      return 'bg-warning-light text-warning';
    default:
      return 'bg-bg-muted text-text-secondary';
  }
}
