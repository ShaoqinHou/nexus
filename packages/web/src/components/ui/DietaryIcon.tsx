import { type SVGProps } from 'react';

/**
 * DietaryIcon — the ONLY sanctioned way to render dietary/allergen/spice/promo
 * markers in Nexus UI. Wraps the `/dietary-icons.svg` SVG sprite via
 * `<svg><use href="...">`.
 *
 * See design-system rules: S-DIETARY-SPRITE. Emoji and unicode glyphs for
 * these markers are banned — they render differently per OS and break i18n.
 *
 * Symbol IDs come from `packages/web/public/dietary-icons.svg` and the
 * reference bundle at `design/reference/v1/nexus-design-system/project/assets/dietary-icons.svg`.
 *
 * @example
 *   <DietaryIcon name="vegan" />                         // default h-4 w-4
 *   <DietaryIcon name="spice-3" size="lg" />             // h-6 w-6
 *   <DietaryIcon name="contains-nuts" className="text-warning" />
 */

export type DietaryIconName =
  // Diets
  | 'vegan'
  | 'vegetarian'
  | 'pescatarian'
  | 'halal'
  | 'kosher'
  // Allergen-free
  | 'gluten-free'
  | 'dairy-free'
  | 'nut-free'
  | 'soy-free'
  | 'egg-free'
  | 'shellfish-free'
  | 'msg-free'
  // Contains-allergen warnings
  | 'contains-nuts'
  | 'contains-dairy'
  | 'contains-shellfish'
  | 'contains-egg'
  | 'contains-soy'
  | 'contains-sesame'
  | 'contains-pork'
  | 'contains-alcohol'
  // Spice levels
  | 'spice-1'
  | 'spice-2'
  | 'spice-3'
  // Promo / meta badges
  | 'popular'
  | 'new'
  | 'seasonal'
  | 'chefs-pick'
  | 'house-special'
  | 'hot'
  | 'cold';

type Size = 'sm' | 'md' | 'lg';

interface DietaryIconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: DietaryIconName;
  /** sm = 16px (inline), md = 20px (default chip), lg = 24px (hero) */
  size?: Size;
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function DietaryIcon({
  name,
  size = 'sm',
  className = '',
  ...rest
}: DietaryIconProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      className={`${sizeClasses[size]} shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <use href={`/dietary-icons.svg#di-${name}`} />
    </svg>
  );
}
