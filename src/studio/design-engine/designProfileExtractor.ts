import type { DesignProfile, Density, FontScale, FontWeight, IconStyle, ThemeModePreference } from './themeFoundation';

export type WeightedValue<T> = {
  value: T;
  count?: number;
  confidence?: number;
};

export type SafeStyleEvidence = {
  colors?: {
    foreground?: Array<WeightedValue<string>>;
    background?: Array<WeightedValue<string>>;
    surface?: Array<WeightedValue<string>>;
    accent?: Array<WeightedValue<string>>;
    border?: Array<WeightedValue<string>>;
  };
  typography?: {
    fontFamilies?: Array<WeightedValue<string>>;
    fontSizes?: Array<WeightedValue<number>>;
    fontWeights?: Array<WeightedValue<number>>;
  };
  shape?: {
    borderRadii?: Array<WeightedValue<number>>;
  };
  spacing?: {
    values?: Array<WeightedValue<number>>;
  };
  controls?: {
    button?: {
      background?: Array<WeightedValue<string>>;
      radius?: Array<WeightedValue<number>>;
    };
    input?: {
      surface?: Array<WeightedValue<string>>;
      radius?: Array<WeightedValue<number>>;
    };
  };
  identity?: {
    direction?: WeightedValue<'rtl' | 'ltr'>;
    modePreference?: WeightedValue<'light' | 'dark'>;
    iconStyleHints?: Array<WeightedValue<IconStyle>>;
  };
};

const SAFE_COLOR = /^(#[0-9a-f]{3}|#[0-9a-f]{6}|rgba?\(\s*(?:25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(?:25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))$/i;
const UNSAFE_TEXT = /(?:<|>|script|javascript:|data:|url\s*\(|@import|;|\{|\}|=)/i;
const SAFE_FONT = /^[a-z0-9 ,'"_-]{1,80}$/i;
const FONT_WEIGHTS = new Set<FontWeight>([400, 500, 600, 700]);
const ICON_STYLES = new Set<IconStyle>(['siteaware', 'minimal', 'rounded', 'medical', 'education', 'business']);

export function extractDesignProfile(evidence: SafeStyleEvidence = {}): DesignProfile {
  const foreground = rankValue(evidence.colors?.foreground, normalizeColor);
  const background = rankValue(evidence.colors?.background, normalizeColor);
  const surface = rankValue(evidence.colors?.surface, normalizeColor);
  const accent = rankValue([
    ...(evidence.colors?.accent ?? []),
    ...(evidence.controls?.button?.background ?? []),
  ], normalizeColor);
  const border = rankValue(evidence.colors?.border, normalizeColor);
  const fontFamily = rankValue(evidence.typography?.fontFamilies, sanitizeFontFamily);
  const fontWeight = rankValue(evidence.typography?.fontWeights, normalizeFontWeight);
  const radius = medianNumber([
    ...(evidence.shape?.borderRadii ?? []),
    ...(evidence.controls?.button?.radius ?? []),
    ...(evidence.controls?.input?.radius ?? []),
  ]);
  const spacing = medianNumber(evidence.spacing?.values);
  const modePreference = normalizeMode(evidence.identity?.modePreference?.value);
  const direction = evidence.identity?.direction?.value === 'rtl' ? 'rtl' : evidence.identity?.direction?.value === 'ltr' ? 'ltr' : undefined;
  const iconStyle = rankValue(evidence.identity?.iconStyleHints, normalizeIconStyle);

  const profile: DesignProfile = {};

  const colors: NonNullable<DesignProfile['colors']> = {};
  if (accent) {
    colors.primary = accent;
    colors.accent = accent;
  }
  if (background) colors.background = background;
  if (surface) colors.surface = surface;
  if (foreground) colors.textPrimary = foreground;
  if (border) colors.border = border;
  if (Object.keys(colors).length) profile.colors = colors;

  const typography: NonNullable<DesignProfile['typography']> = {};
  if (fontFamily) {
    typography.fontFamily = fontFamily;
    typography.headingFamily = fontFamily;
  }
  const fontScale = inferFontScale(evidence.typography?.fontSizes);
  if (fontScale) typography.fontScale = fontScale;
  if (fontWeight) typography.fontWeights = [fontWeight];
  if (Object.keys(typography).length) profile.typography = typography;

  if (typeof radius === 'number') {
    const bounded = clamp(radius, 0, 40);
    profile.shape = {
      borderRadiusSmall: clamp(Math.round(bounded * 0.6), 0, 24),
      borderRadiusMedium: clamp(Math.round(bounded), 0, 32),
      borderRadiusLarge: clamp(Math.round(bounded * 1.4), 0, 40),
    };
  }

  if (typeof spacing === 'number') {
    profile.spacing = {
      density: inferDensity(spacing),
      scale: clamp(round(spacing / 16), 0.8, 1.25),
    };
  }

  const identity: NonNullable<DesignProfile['identity']> = {};
  if (direction) identity.direction = direction;
  if (modePreference) identity.modePreference = modePreference;
  if (iconStyle) identity.iconStyle = iconStyle;
  if (Object.keys(identity).length) profile.identity = identity;

  if (border) profile.effects = { border: 'subtle' };

  return profile;
}

function rankValue<TInput, TOutput>(items: Array<WeightedValue<TInput>> | undefined, normalize: (value: TInput) => TOutput | undefined): TOutput | undefined {
  if (!Array.isArray(items)) return undefined;
  const scores = new Map<string, { value: TOutput; score: number; index: number }>();
  items.forEach((item, index) => {
    const value = normalize(item.value);
    if (value === undefined) return;
    const key = String(value).toLowerCase();
    const score = Math.max(1, item.count ?? 1) * clamp(item.confidence ?? 1, 0, 1);
    const existing = scores.get(key);
    if (!existing || score > existing.score || (score === existing.score && index < existing.index)) {
      scores.set(key, { value, score, index });
    }
  });
  return [...scores.values()].sort((a, b) => b.score - a.score || a.index - b.index)[0]?.value;
}

function medianNumber(items: Array<WeightedValue<number>> | undefined): number | undefined {
  if (!Array.isArray(items)) return undefined;
  const values = items
    .flatMap((item) => {
      if (typeof item.value !== 'number' || !Number.isFinite(item.value)) return [];
      return Array(Math.max(1, Math.min(12, Math.round(item.count ?? 1)))).fill(item.value);
    })
    .sort((a, b) => a - b);
  if (!values.length) return undefined;
  return values[Math.floor((values.length - 1) / 2)];
}

function normalizeColor(value: string): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!SAFE_COLOR.test(text) || UNSAFE_TEXT.test(text)) return undefined;
  return text.startsWith('#') ? text.toLowerCase() : text.replace(/\s+/g, ' ');
}

function sanitizeFontFamily(value: string): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text || UNSAFE_TEXT.test(text) || !SAFE_FONT.test(text)) return undefined;
  return text;
}

function normalizeFontWeight(value: number): FontWeight | undefined {
  if (!Number.isFinite(value)) return undefined;
  const rounded = Math.round(value / 100) * 100 as FontWeight;
  return FONT_WEIGHTS.has(rounded) ? rounded : undefined;
}

function inferFontScale(items: Array<WeightedValue<number>> | undefined): FontScale | undefined {
  const median = medianNumber(items);
  if (typeof median !== 'number') return undefined;
  if (median <= 14) return 'sm';
  if (median >= 18) return 'lg';
  return 'md';
}

function inferDensity(spacing: number): Density {
  if (spacing <= 10) return 'compact';
  if (spacing >= 20) return 'spacious';
  return 'comfortable';
}

function normalizeMode(value: unknown): ThemeModePreference | undefined {
  return value === 'light' || value === 'dark' ? value : undefined;
}

function normalizeIconStyle(value: IconStyle): IconStyle | undefined {
  return ICON_STYLES.has(value) ? value : undefined;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
