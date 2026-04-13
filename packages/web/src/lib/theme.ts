// --- HSL Utilities ---

function hexToRGB(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHSL(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHSL(hex: string): [number, number, number] {
  const [r, g, b] = hexToRGB(hex);
  return rgbToHSL(r, g, b);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// --- Contrast ---

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRGB(hex).map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function textColorOnBrand(brandHex: string): string {
  return contrastRatio('#ffffff', brandHex) >= contrastRatio('#111827', brandHex) ? '#ffffff' : '#111827';
}

// --- Palette Generation ---

export interface ThemePalette {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  brand: string;
  brandHover: string;
  textOnBrand: string;
}

export function generatePalette(brandHex: string, isDark: boolean): ThemePalette {
  const [h, s, l] = hexToHSL(brandHex);

  if (isDark) {
    return {
      primary: hslToHex(h, Math.min(s, 70), clamp(l, 55, 70)),
      primaryHover: hslToHex(h, Math.min(s, 70), clamp(l - 5, 48, 63)),
      primaryLight: hslToHex(h, Math.min(s, 40), 18),
      brand: brandHex,
      brandHover: hslToHex(h, s, clamp(l - 10, 25, 50)),
      textOnBrand: textColorOnBrand(hslToHex(h, Math.min(s, 70), clamp(l, 55, 70))),
    };
  }

  return {
    primary: hslToHex(h, s, clamp(l, 35, 55)),
    primaryHover: hslToHex(h, s, clamp(l - 8, 28, 47)),
    primaryLight: hslToHex(h, Math.min(s, 90), 93),
    brand: brandHex,
    brandHover: hslToHex(h, s, clamp(l - 10, 25, 50)),
    textOnBrand: textColorOnBrand(hslToHex(h, s, clamp(l, 35, 55))),
  };
}

// --- Preset Themes ---

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  brandColor: string;
  fontFamily: string;
  borderRadius: 'sharp' | 'rounded' | 'pill';
  surfaceStyle: 'flat' | 'subtle' | 'elevated';
}

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'modern-minimal', name: 'Modern Minimal', description: 'Clean and contemporary', brandColor: '#111827', fontFamily: 'DM Sans', borderRadius: 'rounded', surfaceStyle: 'flat' },
  { id: 'classic-bistro', name: 'Classic Bistro', description: 'Warm and traditional', brandColor: '#7c2d12', fontFamily: 'Playfair Display', borderRadius: 'sharp', surfaceStyle: 'elevated' },
  { id: 'vibrant-street', name: 'Vibrant Street', description: 'Bold and energetic', brandColor: '#ea580c', fontFamily: 'Space Grotesk', borderRadius: 'pill', surfaceStyle: 'flat' },
  { id: 'fine-dining', name: 'Fine Dining', description: 'Elegant and refined', brandColor: '#1e3a5f', fontFamily: 'Cormorant Garamond', borderRadius: 'sharp', surfaceStyle: 'elevated' },
  { id: 'warm-cafe', name: 'Warm Cafe', description: 'Cozy and inviting', brandColor: '#b45309', fontFamily: 'Nunito', borderRadius: 'pill', surfaceStyle: 'subtle' },
  { id: 'bold-casual', name: 'Bold Casual', description: 'Fun and straightforward', brandColor: '#dc2626', fontFamily: 'Plus Jakarta Sans', borderRadius: 'rounded', surfaceStyle: 'flat' },
];

// --- Theme Application ---

export interface OperatingHoursEntry {
  day: number; // 0=Sun, 1=Mon, ..., 6=Sat
  open: string; // "09:00"
  close: string; // "22:00"
}

export interface TenantThemeSettings {
  brandColor?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  preset?: string;
  fontFamily?: string;
  borderRadius?: 'sharp' | 'rounded' | 'pill';
  surfaceStyle?: 'flat' | 'subtle' | 'elevated';
  operatingHours?: OperatingHoursEntry[];
  lastOrderMinutesBefore?: number; // Stop accepting orders X min before closing (0 = no restriction)
  taxRate?: number;       // e.g. 15 for 15% GST
  taxInclusive?: boolean; // true = prices already include tax
  taxLabel?: string;      // e.g. "GST", "VAT", "Tax"
  contactPhone?: string;  // Restaurant contact phone number
  primaryLocale?: string;    // Restaurant's primary language (e.g. 'en', 'zh') — customers see this by default
  supportedLocales?: string[]; // Additional languages for customer translation
}

/** Subtract minutes from a "HH:MM" time string */
function subtractMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m - minutes;
  if (total < 0) return '00:00';
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/** Check if restaurant is currently open based on operating hours */
export function isOpenNow(hours?: OperatingHoursEntry[]): { open: boolean; nextChange?: string } {
  if (!hours || hours.length === 0) return { open: true }; // No hours set = always open

  const now = new Date();
  const day = now.getDay();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const todayHours = hours.find((h) => h.day === day);
  if (!todayHours) return { open: false, nextChange: 'tomorrow' };

  const isOpen = time >= todayHours.open && time < todayHours.close;
  return {
    open: isOpen,
    nextChange: isOpen ? `Closes at ${todayHours.close}` : `Opens at ${todayHours.open}`,
  };
}

/** Check if ordering is currently accepted (accounts for lastOrderMinutesBefore cutoff) */
export function isOrderingOpen(
  hours?: OperatingHoursEntry[],
  lastOrderMinutesBefore?: number,
): { open: boolean; orderingClosed: boolean; kitchenClosesAt?: string; nextChange?: string } {
  const status = isOpenNow(hours);
  if (!status.open) return { open: false, orderingClosed: false, nextChange: status.nextChange };

  // Restaurant is open — check last-order cutoff
  if (!lastOrderMinutesBefore || lastOrderMinutesBefore <= 0 || !hours || hours.length === 0) {
    return { open: true, orderingClosed: false, nextChange: status.nextChange };
  }

  const now = new Date();
  const day = now.getDay();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const todayHours = hours.find((h) => h.day === day);
  if (!todayHours) return { open: true, orderingClosed: false, nextChange: status.nextChange };

  const cutoff = subtractMinutes(todayHours.close, lastOrderMinutesBefore);

  if (time >= cutoff) {
    return {
      open: true,
      orderingClosed: true,
      kitchenClosesAt: cutoff,
      nextChange: status.nextChange,
    };
  }

  return { open: true, orderingClosed: false, kitchenClosesAt: cutoff, nextChange: status.nextChange };
}

const RADIUS_MAP: Record<string, Record<string, string>> = {
  sharp: { sm: '0.125rem', md: '0.25rem', lg: '0.375rem', xl: '0.5rem', full: '9999px' },
  rounded: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
  pill: { sm: '0.5rem', md: '0.75rem', lg: '1rem', xl: '1.5rem', full: '9999px' },
};

const SHADOW_MAP: Record<string, Record<string, string>> = {
  flat: { sm: 'none', md: 'none', lg: 'none' },
  subtle: { sm: '0 1px 2px 0 rgb(0 0 0 / 0.03)', md: '0 2px 4px -1px rgb(0 0 0 / 0.06)', lg: '0 4px 6px -2px rgb(0 0 0 / 0.05)' },
  elevated: { sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)', md: '0 4px 6px -1px rgb(0 0 0 / 0.1)', lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)' },
};

export function applyTenantTheme(settings: TenantThemeSettings, isDark: boolean): void {
  const root = document.documentElement;

  // Apply preset defaults if set
  let effective = { ...settings };
  if (settings.preset) {
    const preset = THEME_PRESETS.find(p => p.id === settings.preset);
    if (preset) {
      effective = {
        brandColor: preset.brandColor,
        fontFamily: preset.fontFamily,
        borderRadius: preset.borderRadius,
        surfaceStyle: preset.surfaceStyle,
        ...settings, // user overrides win
      };
    }
  }

  // Colors from brand
  if (effective.brandColor) {
    const palette = generatePalette(effective.brandColor, isDark);
    root.style.setProperty('--color-primary', palette.primary);
    root.style.setProperty('--color-primary-hover', palette.primaryHover);
    root.style.setProperty('--color-primary-light', palette.primaryLight);
    root.style.setProperty('--color-brand', palette.brand);
    root.style.setProperty('--color-brand-hover', palette.brandHover);
  }

  // Font
  if (effective.fontFamily) {
    root.style.setProperty('--font-sans', `'${effective.fontFamily}', system-ui, -apple-system, sans-serif`);
    // Load Google Font
    loadGoogleFont(effective.fontFamily);
  }

  // Radius
  const radius = RADIUS_MAP[effective.borderRadius ?? 'rounded'];
  if (radius) {
    root.style.setProperty('--radius-sm', radius.sm);
    root.style.setProperty('--radius-md', radius.md);
    root.style.setProperty('--radius-lg', radius.lg);
    root.style.setProperty('--radius-xl', radius.xl);
  }

  // Shadows
  const shadows = SHADOW_MAP[effective.surfaceStyle ?? 'subtle'];
  if (shadows) {
    root.style.setProperty('--shadow-sm', shadows.sm);
    root.style.setProperty('--shadow-md', shadows.md);
    root.style.setProperty('--shadow-lg', shadows.lg);
  }
}

export function clearTenantTheme(): void {
  const root = document.documentElement;
  const props = [
    '--color-primary', '--color-primary-hover', '--color-primary-light',
    '--color-brand', '--color-brand-hover',
    '--font-sans', '--radius-sm', '--radius-md', '--radius-lg', '--radius-xl',
    '--shadow-sm', '--shadow-md', '--shadow-lg',
  ];
  props.forEach(p => root.style.removeProperty(p));
}

function loadGoogleFont(fontFamily: string): void {
  const id = `gfont-${fontFamily.replace(/\s/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;500;600;700&display=swap`;
  document.head.appendChild(link);
}
