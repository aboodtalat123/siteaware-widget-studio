export type ColorToken = string;

export type Direction = 'ltr' | 'rtl';
export type Density = 'compact' | 'comfortable' | 'spacious';
export type FontScale = 'sm' | 'md' | 'lg';
export type FontWeight = 400 | 500 | 600 | 700;
export type ShadowStyle = 'none' | 'soft' | 'medium' | 'strong';
export type BorderStyle = 'none' | 'subtle' | 'solid';
export type IconStyle = 'siteaware' | 'minimal' | 'rounded' | 'medical' | 'education' | 'business';
export type ThemeModePreference = 'light' | 'dark' | 'system';

export type DesignProfile = {
  colors?: {
    primary?: ColorToken;
    secondary?: ColorToken;
    accent?: ColorToken;
    background?: ColorToken;
    surface?: ColorToken;
    textPrimary?: ColorToken;
    textSecondary?: ColorToken;
    border?: ColorToken;
  };
  typography?: {
    fontFamily?: string;
    headingFamily?: string;
    fontScale?: FontScale;
    fontWeights?: FontWeight[];
  };
  shape?: {
    borderRadiusSmall?: number;
    borderRadiusMedium?: number;
    borderRadiusLarge?: number;
  };
  spacing?: {
    density?: Density;
    scale?: number;
  };
  effects?: {
    shadow?: ShadowStyle;
    border?: BorderStyle;
  };
  identity?: {
    logo?: {
      kind: 'existing-asset';
      id: string;
      alt?: string;
    };
    iconStyle?: IconStyle;
    direction?: Direction;
    modePreference?: ThemeModePreference;
  };
};

export type WidgetTheme = {
  version: 1;
  direction: Direction;
  launcher: {
    backgroundColor: ColorToken;
    textColor: ColorToken;
    borderColor: ColorToken;
    borderRadius: number;
    size: number;
    shadow: ShadowStyle;
  };
  panel: {
    backgroundColor: ColorToken;
    surfaceColor: ColorToken;
    textColor: ColorToken;
    mutedTextColor: ColorToken;
    borderColor: ColorToken;
    borderRadius: number;
    shadow: ShadowStyle;
  };
  header: {
    backgroundColor: ColorToken;
    textColor: ColorToken;
    borderColor: ColorToken;
  };
  messages: {
    assistantBackgroundColor: ColorToken;
    assistantTextColor: ColorToken;
    userBackgroundColor: ColorToken;
    userTextColor: ColorToken;
    borderRadius: number;
  };
  input: {
    backgroundColor: ColorToken;
    textColor: ColorToken;
    placeholderColor: ColorToken;
    borderColor: ColorToken;
    borderRadius: number;
  };
  buttons: {
    primaryBackgroundColor: ColorToken;
    primaryTextColor: ColorToken;
    secondaryBackgroundColor: ColorToken;
    secondaryTextColor: ColorToken;
    borderRadius: number;
  };
  cards: {
    backgroundColor: ColorToken;
    textColor: ColorToken;
    borderColor: ColorToken;
    borderRadius: number;
  };
  guide: {
    accentColor: ColorToken;
    ringColor: ColorToken;
    overlayColor: ColorToken;
    overlayOpacity: number;
    targetPadding: number;
  };
  typography: {
    fontFamily: string;
    headingFamily: string;
    fontScale: number;
    fontWeight: FontWeight;
  };
  spacing: {
    density: Density;
    scale: number;
  };
};

export type ThemePatch = {
  direction?: Direction;
  launcher?: Partial<WidgetTheme['launcher']>;
  panel?: Partial<WidgetTheme['panel']>;
  header?: Partial<WidgetTheme['header']>;
  messages?: Partial<WidgetTheme['messages']>;
  input?: Partial<WidgetTheme['input']>;
  buttons?: Partial<WidgetTheme['buttons']>;
  cards?: Partial<WidgetTheme['cards']>;
  guide?: Partial<WidgetTheme['guide']>;
  typography?: Partial<WidgetTheme['typography']>;
  spacing?: Partial<WidgetTheme['spacing']>;
};

export type DesignRequest = {
  prompt: string;
  designProfile: DesignProfile;
  currentTheme: WidgetTheme;
};

export type DesignThemeProvider = {
  id: string;
  label: string;
  suggestThemePatch(request: DesignRequest): Promise<unknown>;
};

export type ValidationResult =
  | { ok: true; value: ThemePatch }
  | { ok: false; errors: string[] };

const POLLUTION_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const DANGEROUS_TEXT = /(?:<|>|<\/|script|javascript:|data:|vbscript:|expression\s*\(|url\s*\(|@import|behavior\s*:|on[a-z]+\s*=|;|\{|\})/i;
const SAFE_COLOR = /^(#[0-9a-f]{3}|#[0-9a-f]{6}|rgba?\(\s*(?:25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(?:25[0-5]|2[0-4]\d|1?\d?\d)\s*,\s*(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))$/i;
const SAFE_FONT = /^[a-z0-9 '"_-]{1,80}$/i;

const DEFAULT_THEME: WidgetTheme = {
  version: 1,
  direction: 'ltr',
  launcher: {
    backgroundColor: '#2563eb',
    textColor: '#ffffff',
    borderColor: 'rgba(16, 24, 40, 0.12)',
    borderRadius: 999,
    size: 56,
    shadow: 'medium',
  },
  panel: {
    backgroundColor: '#f5f7fb',
    surfaceColor: '#ffffff',
    textColor: '#101828',
    mutedTextColor: '#5b6476',
    borderColor: 'rgba(16, 24, 40, 0.12)',
    borderRadius: 20,
    shadow: 'medium',
  },
  header: {
    backgroundColor: '#ffffff',
    textColor: '#101828',
    borderColor: 'rgba(16, 24, 40, 0.12)',
  },
  messages: {
    assistantBackgroundColor: '#f2f5fb',
    assistantTextColor: '#101828',
    userBackgroundColor: '#dceafe',
    userTextColor: '#101828',
    borderRadius: 16,
  },
  input: {
    backgroundColor: '#ffffff',
    textColor: '#101828',
    placeholderColor: '#667085',
    borderColor: 'rgba(16, 24, 40, 0.12)',
    borderRadius: 18,
  },
  buttons: {
    primaryBackgroundColor: '#2563eb',
    primaryTextColor: '#ffffff',
    secondaryBackgroundColor: '#eef3fb',
    secondaryTextColor: '#101828',
    borderRadius: 14,
  },
  cards: {
    backgroundColor: '#ffffff',
    textColor: '#101828',
    borderColor: 'rgba(16, 24, 40, 0.12)',
    borderRadius: 16,
  },
  guide: {
    accentColor: '#2563eb',
    ringColor: '#2563eb',
    overlayColor: 'rgba(15, 23, 42, 0.42)',
    overlayOpacity: 0.42,
    targetPadding: 8,
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    headingFamily: 'Inter, system-ui, sans-serif',
    fontScale: 1,
    fontWeight: 500,
  },
  spacing: {
    density: 'comfortable',
    scale: 1,
  },
};

const SCHEMA = {
  launcher: {
    backgroundColor: 'color',
    textColor: 'color',
    borderColor: 'color',
    borderRadius: 'radius',
    size: 'launcherSize',
    shadow: ['none', 'soft', 'medium', 'strong'],
  },
  panel: {
    backgroundColor: 'color',
    surfaceColor: 'color',
    textColor: 'color',
    mutedTextColor: 'color',
    borderColor: 'color',
    borderRadius: 'radius',
    shadow: ['none', 'soft', 'medium', 'strong'],
  },
  header: {
    backgroundColor: 'color',
    textColor: 'color',
    borderColor: 'color',
  },
  messages: {
    assistantBackgroundColor: 'color',
    assistantTextColor: 'color',
    userBackgroundColor: 'color',
    userTextColor: 'color',
    borderRadius: 'radius',
  },
  input: {
    backgroundColor: 'color',
    textColor: 'color',
    placeholderColor: 'color',
    borderColor: 'color',
    borderRadius: 'radius',
  },
  buttons: {
    primaryBackgroundColor: 'color',
    primaryTextColor: 'color',
    secondaryBackgroundColor: 'color',
    secondaryTextColor: 'color',
    borderRadius: 'radius',
  },
  cards: {
    backgroundColor: 'color',
    textColor: 'color',
    borderColor: 'color',
    borderRadius: 'radius',
  },
  guide: {
    accentColor: 'color',
    ringColor: 'color',
    overlayColor: 'color',
    overlayOpacity: 'opacity',
    targetPadding: 'spacing',
  },
  typography: {
    fontFamily: 'font',
    headingFamily: 'font',
    fontScale: 'fontScale',
    fontWeight: [400, 500, 600, 700],
  },
  spacing: {
    density: ['compact', 'comfortable', 'spacious'],
    scale: 'spacingScale',
  },
} as const;

export function getDefaultWidgetTheme(): WidgetTheme {
  return cloneTheme(DEFAULT_THEME);
}

export function validateThemePatch(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isPlainObject(input)) {
    return { ok: false, errors: ['ThemePatch must be a plain object.'] };
  }

  const patch: ThemePatch = {};
  rejectUnsafeKeys(input, 'patch', errors);

  for (const [key, value] of Object.entries(input)) {
    if (key === 'direction') {
      if (value === 'ltr' || value === 'rtl') patch.direction = value;
      else errors.push('direction must be ltr or rtl.');
      continue;
    }

    if (!hasOwn(SCHEMA, key)) {
      errors.push(`Unknown patch section: ${key}.`);
      continue;
    }

    if (!isPlainObject(value)) {
      errors.push(`${key} must be a plain object.`);
      continue;
    }

    rejectUnsafeKeys(value, key, errors);
    const sectionSchema = SCHEMA[key];
    const cleanSection: Record<string, unknown> = {};

    for (const [field, fieldValue] of Object.entries(value)) {
      if (!hasOwn(sectionSchema, field)) {
        errors.push(`Unknown patch field: ${key}.${field}.`);
        continue;
      }

      const clean = validateField(sectionSchema[field], fieldValue, `${key}.${field}`, errors);
      if (clean !== undefined) cleanSection[field] = clean;
    }

    if (Object.keys(cleanSection).length > 0) {
      (patch as Record<string, unknown>)[key] = cleanSection;
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: patch };
}

export function assertValidThemePatch(input: unknown): ThemePatch {
  const result = validateThemePatch(input);
  if (!result.ok) {
    throw new Error(`Invalid ThemePatch: ${result.errors.join(' ')}`);
  }
  return result.value;
}

export function applyThemePatch(currentTheme: WidgetTheme, patch: unknown): WidgetTheme {
  const validPatch = assertValidThemePatch(patch);
  const base = normalizeWidgetTheme(currentTheme);
  const next = cloneTheme(base);

  if (validPatch.direction) next.direction = validPatch.direction;

  for (const key of Object.keys(SCHEMA) as Array<keyof typeof SCHEMA>) {
    const sectionPatch = validPatch[key] as Record<string, unknown> | undefined;
    if (!sectionPatch) continue;
    next[key] = {
      ...(next[key] as Record<string, unknown>),
      ...sectionPatch,
    } as never;
  }

  return normalizeWidgetTheme(next);
}

export function normalizeWidgetTheme(theme: WidgetTheme): WidgetTheme {
  const normalized = applyThemePatchUnsafe(DEFAULT_THEME, theme);
  normalized.version = 1;
  return normalized;
}

export function suggestThemeFromDesignProfile(profile: DesignProfile = {}): WidgetTheme {
  const theme = getDefaultWidgetTheme();
  const colors = profile.colors ?? {};
  const typography = profile.typography ?? {};
  const shape = profile.shape ?? {};
  const spacing = profile.spacing ?? {};
  const effects = profile.effects ?? {};
  const identity = profile.identity ?? {};

  const primary = safeColor(colors.primary);
  const secondary = safeColor(colors.secondary);
  const accent = safeColor(colors.accent);
  const background = safeColor(colors.background);
  const surface = safeColor(colors.surface);
  const textPrimary = safeColor(colors.textPrimary);
  const textSecondary = safeColor(colors.textSecondary);
  const border = safeColor(colors.border);

  if (primary) {
    theme.launcher.backgroundColor = primary;
    theme.buttons.primaryBackgroundColor = primary;
    theme.guide.accentColor = primary;
    theme.guide.ringColor = primary;
  }
  if (secondary) theme.buttons.secondaryBackgroundColor = secondary;
  if (accent) {
    theme.guide.accentColor = accent;
    theme.messages.userBackgroundColor = accent;
  }
  if (background) theme.panel.backgroundColor = background;
  if (surface) {
    theme.panel.surfaceColor = surface;
    theme.header.backgroundColor = surface;
    theme.input.backgroundColor = surface;
    theme.cards.backgroundColor = surface;
  }
  if (textPrimary) {
    theme.panel.textColor = textPrimary;
    theme.header.textColor = textPrimary;
    theme.messages.assistantTextColor = textPrimary;
    theme.input.textColor = textPrimary;
    theme.cards.textColor = textPrimary;
  }
  if (textSecondary) {
    theme.panel.mutedTextColor = textSecondary;
    theme.input.placeholderColor = textSecondary;
  }
  if (border) {
    theme.launcher.borderColor = border;
    theme.panel.borderColor = border;
    theme.header.borderColor = border;
    theme.input.borderColor = border;
    theme.cards.borderColor = border;
  }

  const mediumRadius = boundedNumber(shape.borderRadiusMedium, 0, 32);
  const largeRadius = boundedNumber(shape.borderRadiusLarge, 0, 40);
  if (typeof mediumRadius === 'number') {
    theme.messages.borderRadius = mediumRadius;
    theme.input.borderRadius = mediumRadius;
    theme.buttons.borderRadius = mediumRadius;
    theme.cards.borderRadius = mediumRadius;
  }
  if (typeof largeRadius === 'number') {
    theme.panel.borderRadius = largeRadius;
  }

  const fontFamily = sanitizeFont(typography.fontFamily);
  const headingFamily = sanitizeFont(typography.headingFamily);
  if (fontFamily) theme.typography.fontFamily = fontFamily;
  if (headingFamily) theme.typography.headingFamily = headingFamily;
  if (typography.fontScale === 'sm') theme.typography.fontScale = 0.95;
  if (typography.fontScale === 'md') theme.typography.fontScale = 1;
  if (typography.fontScale === 'lg') theme.typography.fontScale = 1.08;
  if (Array.isArray(typography.fontWeights)) {
    const selected = typography.fontWeights.find((weight) => [400, 500, 600, 700].includes(weight));
    if (selected) theme.typography.fontWeight = selected;
  }

  if (spacing.density) theme.spacing.density = spacing.density;
  const spacingScale = boundedNumber(spacing.scale, 0.8, 1.25);
  if (typeof spacingScale === 'number') theme.spacing.scale = spacingScale;

  if (effects.shadow) {
    theme.launcher.shadow = effects.shadow;
    theme.panel.shadow = effects.shadow;
  }

  if (identity.direction) theme.direction = identity.direction;
  if (identity.modePreference === 'dark') {
    theme.panel.backgroundColor = background ?? '#08111f';
    theme.panel.surfaceColor = surface ?? '#0f192b';
    theme.panel.textColor = textPrimary ?? '#f6f9ff';
    theme.panel.mutedTextColor = textSecondary ?? '#aebdde';
  }

  return normalizeWidgetTheme(theme);
}

export async function validateProviderThemePatch(
  provider: DesignThemeProvider,
  request: DesignRequest,
): Promise<ValidationResult> {
  const output = await provider.suggestThemePatch(request);
  return validateThemePatch(output);
}

function validateField(rule: unknown, value: unknown, path: string, errors: string[]) {
  if (Array.isArray(rule)) {
    if ((rule as unknown[]).includes(value)) return value;
    errors.push(`${path} is outside the allowed set.`);
    return undefined;
  }

  if (rule === 'color') {
    const color = safeColor(value);
    if (color) return color;
    errors.push(`${path} must be a safe color.`);
    return undefined;
  }

  if (rule === 'font') {
    const font = sanitizeFont(value);
    if (font) return font;
    errors.push(`${path} must be a safe font family.`);
    return undefined;
  }

  const rangeMap: Record<string, readonly [number, number]> = {
    radius: [0, 40],
    launcherSize: [40, 88],
    opacity: [0, 0.85],
    spacing: [0, 24],
    spacingScale: [0.8, 1.25],
    fontScale: [0.85, 1.2],
  };
  const range = rangeMap[rule as string];

  if (range) {
    const number = boundedNumber(value, range[0], range[1]);
    if (typeof number === 'number') return number;
    errors.push(`${path} must be a number from ${range[0]} to ${range[1]}.`);
    return undefined;
  }

  errors.push(`${path} has no validator.`);
  return undefined;
}

function applyThemePatchUnsafe(currentTheme: WidgetTheme, patch: WidgetTheme): WidgetTheme {
  const next = cloneTheme(currentTheme);
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'version') continue;
    const nextRecord = next as unknown as Record<string, unknown>;
    if (isPlainObject(value) && isPlainObject(nextRecord[key])) {
      nextRecord[key] = {
        ...(nextRecord[key] as Record<string, unknown>),
        ...value,
      };
    } else {
      nextRecord[key] = value;
    }
  }
  return next;
}

function safeColor(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (DANGEROUS_TEXT.test(text)) return undefined;
  if (!SAFE_COLOR.test(text)) return undefined;
  return text.startsWith('#') ? text.toLowerCase() : text.replace(/\s+/g, ' ');
}

function sanitizeFont(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text || DANGEROUS_TEXT.test(text) || !SAFE_FONT.test(text)) return undefined;
  return text;
}

function boundedNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  if (value < min || value > max) return undefined;
  return value;
}

function rejectUnsafeKeys(value: Record<string, unknown>, path: string, errors: string[]) {
  for (const key of Object.keys(value)) {
    if (POLLUTION_KEYS.has(key)) {
      errors.push(`${path}.${key} is not allowed.`);
    }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn<T extends object>(value: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function cloneTheme(theme: WidgetTheme): WidgetTheme {
  return structuredClone(theme);
}
