import type { AppearanceConfig, ThemeTokens } from './studioData';

export type WebsiteStyleSnapshot = {
  pageMode: 'light' | 'dark' | 'mixed';
  pageBackground: string;
  surfaceColors: string[];
  textColors: string[];
  mutedTextColors: string[];
  borderColors: string[];
  brandColors: string[];
  accentColors: string[];
  linkColors: string[];
  buttonColors: string[];
  fontFamilies: string[];
  headingWeight?: number;
  bodyWeight?: number;
  buttonRadius?: number;
  cardRadius?: number;
  inputRadius?: number;
  shadowSamples?: string[];
  source?: {
    hostname?: string;
    title?: string;
  };
};

export type ThemeStrategy = 'BRAND_MATCH' | 'HIGH_CONTRAST' | 'PREMIUM_ADAPTATION';

export type ThemeOrigin = 'manual' | 'auto-brand' | 'auto-contrast' | 'auto-premium';

export type ContrastStatus = 'PASS' | 'WARN';

export type ContrastPair = {
  label: string;
  foreground: string;
  background: string;
  ratio: number;
  status: ContrastStatus;
};

export type SpotlightTheme = {
  overlayColor: string;
  overlayOpacity: number;
  ringColor: string;
  ringWidth: number;
  glowColor: string;
  tooltipBackground: string;
  tooltipText: string;
  targetPadding: number;
};

export type GeneratedThemeRecommendation = {
  id: string;
  strategy: ThemeStrategy;
  origin: ThemeOrigin;
  label: string;
  note: string;
  themeId: string;
  tokens: ThemeTokens;
  appearance: AppearanceConfig;
  spotlight: SpotlightTheme;
  explanation: string[];
  contrastPairs: ContrastPair[];
  swatches: {
    background: string;
    surface: string;
    surfaceSecondary: string;
    primary: string;
    accent: string;
    text: string;
    mutedText: string;
  };
};

export type StyleAnalysis = {
  snapshot: WebsiteStyleSnapshot;
  inferredPageMode: 'light' | 'dark' | 'mixed';
  inferredPrimary: string;
  inferredAccent: string;
  inferredBackground: string;
  inferredSurface: string;
  inferredText: string;
  inferredFont: string;
  inferredRadius: 'sm' | 'md' | 'lg' | 'xl';
  contrastNotes: string[];
  summary: string;
};

export const autoThemeStorageKey = 'siteaware-widget-studio-auto-theme-v1';

export const sampleWebsiteSnapshots: Array<{ id: string; label: string; note: string; snapshot: WebsiteStyleSnapshot }> = [
  {
    id: 'dark-saas',
    label: 'Dark SaaS',
    note: 'Blue black product dashboard',
    snapshot: {
      pageMode: 'dark',
      pageBackground: '#08111f',
      surfaceColors: ['#0d1726', '#111d31', '#16253d'],
      textColors: ['#f4f7ff', '#edf3ff'],
      mutedTextColors: ['#aab7d4', '#8fa0be'],
      borderColors: ['#21304c', '#2a3a5b'],
      brandColors: ['#68c1ff', '#4f8dff'],
      accentColors: ['#7ef0c4', '#7bd4ff'],
      linkColors: ['#7ab7ff'],
      buttonColors: ['#4f8dff', '#2d64f1'],
      fontFamilies: ['"Space Grotesk"', '"Inter"', 'system-ui'],
      buttonRadius: 18,
      cardRadius: 24,
      inputRadius: 18,
      shadowSamples: ['0 16px 40px rgba(0,0,0,0.32)'],
      source: { hostname: 'acme.demo', title: 'Dark SaaS' },
    },
  },
  {
    id: 'light-saas',
    label: 'Light SaaS',
    note: 'White dashboard with blue accent',
    snapshot: {
      pageMode: 'light',
      pageBackground: '#f6f8fd',
      surfaceColors: ['#ffffff', '#f3f7ff', '#edf3ff'],
      textColors: ['#101828', '#243041'],
      mutedTextColors: ['#667085', '#8b94a7'],
      borderColors: ['#d3ddee', '#e4eaf5'],
      brandColors: ['#2c6bed', '#418cff'],
      accentColors: ['#1d9bf0', '#5b8cff'],
      linkColors: ['#205fd4'],
      buttonColors: ['#2c6bed', '#1f58d8'],
      fontFamilies: ['"Inter"', '"Space Grotesk"', 'system-ui'],
      buttonRadius: 14,
      cardRadius: 18,
      inputRadius: 14,
      shadowSamples: ['0 18px 44px rgba(15, 23, 42, 0.10)'],
      source: { hostname: 'saas.example', title: 'Light SaaS' },
    },
  },
  {
    id: 'university-portal',
    label: 'University Portal',
    note: 'Academic portal with calm blue structure',
    snapshot: {
      pageMode: 'light',
      pageBackground: '#eef4ff',
      surfaceColors: ['#ffffff', '#f8fbff', '#eaf1ff'],
      textColors: ['#122033', '#21314d'],
      mutedTextColors: ['#64748b', '#7d8ca2'],
      borderColors: ['#d6e2f5', '#c8d9ee'],
      brandColors: ['#3567ff', '#244edb'],
      accentColors: ['#4f8cff', '#35a8ff'],
      linkColors: ['#295be6'],
      buttonColors: ['#3567ff', '#264fda'],
      fontFamilies: ['"IBM Plex Sans"', '"Space Grotesk"', 'system-ui'],
      buttonRadius: 14,
      cardRadius: 18,
      inputRadius: 14,
      shadowSamples: ['0 14px 36px rgba(37, 54, 110, 0.12)'],
      source: { hostname: 'portal.university.edu', title: 'University Portal' },
    },
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    note: 'Calm clinical surfaces and teal accents',
    snapshot: {
      pageMode: 'light',
      pageBackground: '#f3fbfc',
      surfaceColors: ['#ffffff', '#f7fcfd', '#eef9fb'],
      textColors: ['#0f1720', '#223140'],
      mutedTextColors: ['#63747e', '#7f9099'],
      borderColors: ['#d8e9ec', '#cae0e4'],
      brandColors: ['#3fb8c7', '#2b98ad'],
      accentColors: ['#56d3b2', '#63c9dd'],
      linkColors: ['#2390c6'],
      buttonColors: ['#3fb8c7', '#2b98ad'],
      fontFamilies: ['"Inter"', '"IBM Plex Sans"', 'system-ui'],
      buttonRadius: 16,
      cardRadius: 20,
      inputRadius: 14,
      shadowSamples: ['0 16px 40px rgba(19, 72, 84, 0.10)'],
      source: { hostname: 'clinic.example', title: 'Healthcare' },
    },
  },
  {
    id: 'ecommerce',
    label: 'Ecommerce',
    note: 'Warm commerce UI with orange and red signals',
    snapshot: {
      pageMode: 'light',
      pageBackground: '#fff8f2',
      surfaceColors: ['#ffffff', '#fff5eb', '#fff0e2'],
      textColors: ['#24160f', '#3c2a20'],
      mutedTextColors: ['#71594d', '#8d7162'],
      borderColors: ['#efd7c4', '#e9c9ae'],
      brandColors: ['#f36c2c', '#f59e42'],
      accentColors: ['#ff8d4f', '#f43f5e'],
      linkColors: ['#dd5b20'],
      buttonColors: ['#f36c2c', '#e85d25'],
      fontFamilies: ['"Inter"', '"Space Grotesk"', 'system-ui'],
      buttonRadius: 18,
      cardRadius: 20,
      inputRadius: 16,
      shadowSamples: ['0 18px 40px rgba(118, 56, 18, 0.12)'],
      source: { hostname: 'store.example', title: 'Ecommerce' },
    },
  },
  {
    id: 'corporate',
    label: 'Corporate',
    note: 'Neutral enterprise sheet with indigo accents',
    snapshot: {
      pageMode: 'mixed',
      pageBackground: '#f4f6fa',
      surfaceColors: ['#ffffff', '#f7f8fb', '#eef1f7'],
      textColors: ['#111827', '#283246'],
      mutedTextColors: ['#667085', '#7b8797'],
      borderColors: ['#d7dce6', '#cfd7e2'],
      brandColors: ['#5b6bff', '#4d5bd5'],
      accentColors: ['#7c8cff', '#4ea1ff'],
      linkColors: ['#4658d8'],
      buttonColors: ['#5b6bff', '#4450ca'],
      fontFamilies: ['"IBM Plex Sans"', '"Inter"', 'system-ui'],
      buttonRadius: 12,
      cardRadius: 16,
      inputRadius: 12,
      shadowSamples: ['0 16px 32px rgba(17, 24, 39, 0.10)'],
      source: { hostname: 'corp.example', title: 'Corporate' },
    },
  },
  {
    id: 'taqat-dark-orange',
    label: 'Taqat-like Dark/Orange',
    note: 'Dark orange portal style',
    snapshot: {
      pageMode: 'dark',
      pageBackground: '#0d1219',
      surfaceColors: ['#141b24', '#182130', '#202b3c'],
      textColors: ['#f7f5f1', '#ece8de'],
      mutedTextColors: ['#b8b0a2', '#9e988d'],
      borderColors: ['#273142', '#334054'],
      brandColors: ['#f97316', '#ff8a3d'],
      accentColors: ['#ffb347', '#fdba74'],
      linkColors: ['#ff9c45'],
      buttonColors: ['#f97316', '#ea580c'],
      fontFamilies: ['"Noto Sans Arabic"', '"Space Grotesk"', 'system-ui'],
      buttonRadius: 16,
      cardRadius: 22,
      inputRadius: 16,
      shadowSamples: ['0 20px 48px rgba(0, 0, 0, 0.34)'],
      source: { hostname: 'portal.taqat.example', title: 'Taqat-like Dark/Orange' },
    },
  },
  {
    id: 'university-blue',
    label: 'University Blue Portal',
    note: 'Blue-heavy academic portal',
    snapshot: {
      pageMode: 'light',
      pageBackground: '#edf4ff',
      surfaceColors: ['#ffffff', '#f6faff', '#eaf1ff'],
      textColors: ['#122033', '#24364d'],
      mutedTextColors: ['#667085', '#7f8da5'],
      borderColors: ['#d6e3f7', '#c8d9ef'],
      brandColors: ['#2f5cff', '#376bff'],
      accentColors: ['#58a8ff', '#7ea7ff'],
      linkColors: ['#2f5cff'],
      buttonColors: ['#2f5cff', '#244edb'],
      fontFamilies: ['"IBM Plex Sans"', '"Inter"', 'system-ui'],
      buttonRadius: 14,
      cardRadius: 18,
      inputRadius: 14,
      shadowSamples: ['0 16px 38px rgba(37, 54, 110, 0.10)'],
      source: { hostname: 'blue.university.example', title: 'University Blue Portal' },
    },
  },
];

type RGB = { r: number; g: number; b: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value);
}

function rgbToCss(rgb: RGB) {
  return `rgb(${round(rgb.r)}, ${round(rgb.g)}, ${round(rgb.b)})`;
}

function rgbToHex(rgb: RGB) {
  return `#${[rgb.r, rgb.g, rgb.b]
    .map((value) => clamp(round(value), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function parseColor(input: string): RGB | null {
  const value = input.trim();
  if (!value) {
    return null;
  }

  const hex = value.replace(/^#/, '');
  if (/^[0-9a-f]{3,8}$/i.test(hex)) {
    if (hex.length === 3 || hex.length === 4) {
      const r = hex[0]!;
      const g = hex[1]!;
      const b = hex[2]!;
      return {
        r: parseInt(r + r, 16),
        g: parseInt(g + g, 16),
        b: parseInt(b + b, 16),
      };
    }

    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  const rgbMatch = value.match(/rgba?\(([^)]+)\)/i);
  if (rgbMatch) {
    const payload = rgbMatch[1]!;
    const parts = payload
      .split(',')
      .map((item) => item.trim())
      .slice(0, 3)
      .map((item) => Number(item));
    if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
      return {
        r: clamp(parts[0]!, 0, 255),
        g: clamp(parts[1]!, 0, 255),
        b: clamp(parts[2]!, 0, 255),
      };
    }
  }

  return null;
}

export function relativeLuminance(input: string | RGB) {
  const rgb = typeof input === 'string' ? parseColor(input) : input;
  if (!rgb) {
    return 0;
  }

  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  const [r = 0, g = 0, b = 0] = channels;
  return r * 0.2126 + g * 0.7152 + b * 0.0722;
}

export function contrastRatio(foreground: string, background: string) {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  if (!fg || !bg) {
    return 1;
  }

  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function blend(a: string, b: string, weight: number) {
  const left = parseColor(a);
  const right = parseColor(b);
  if (!left || !right) {
    return a;
  }

  const t = clamp(weight, 0, 1);
  return rgbToHex({
    r: left.r * (1 - t) + right.r * t,
    g: left.g * (1 - t) + right.g * t,
    b: left.b * (1 - t) + right.b * t,
  });
}

function lighten(color: string, amount: number) {
  return blend(color, '#ffffff', clamp(amount, 0, 1));
}

function darken(color: string, amount: number) {
  return blend(color, '#000000', clamp(amount, 0, 1));
}

function saturateColor(color: string, amount: number) {
  const rgb = parseColor(color);
  if (!rgb) {
    return color;
  }

  const avg = (rgb.r + rgb.g + rgb.b) / 3;
  return rgbToHex({
    r: avg + (rgb.r - avg) * (1 + amount),
    g: avg + (rgb.g - avg) * (1 + amount),
    b: avg + (rgb.b - avg) * (1 + amount),
  });
}

function desaturateColor(color: string, amount: number) {
  const rgb = parseColor(color);
  if (!rgb) {
    return color;
  }

  const avg = (rgb.r + rgb.g + rgb.b) / 3;
  return rgbToHex({
    r: avg + (rgb.r - avg) * (1 - amount),
    g: avg + (rgb.g - avg) * (1 - amount),
    b: avg + (rgb.b - avg) * (1 - amount),
  });
}

function dedupeBounded(values: string[] = [], max = 4) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(trimmed);
    if (result.length >= max) {
      break;
    }
  }
  return result;
}

function normalizeColorList(values: string[] | undefined, max = 4) {
  return dedupeBounded(
    (values ?? [])
      .map((value) => normalizeColorString(value))
      .filter((value): value is string => Boolean(value)),
    max,
  );
}

function normalizeFontFamilies(values: string[] | undefined) {
  return dedupeBounded(values, 4);
}

function normalizeColorString(value: string) {
  const rgb = parseColor(value);
  if (rgb) {
    return rgbToHex(rgb);
  }
  const trimmed = value.trim();
  return trimmed || null;
}

export function normalizeSnapshot(input: Partial<WebsiteStyleSnapshot>): WebsiteStyleSnapshot {
  return {
    pageMode: input.pageMode ?? 'mixed',
    pageBackground: normalizeColorString(input.pageBackground ?? '#0f172a') ?? '#0f172a',
    surfaceColors: normalizeColorList(input.surfaceColors, 4),
    textColors: normalizeColorList(input.textColors, 4),
    mutedTextColors: normalizeColorList(input.mutedTextColors, 4),
    borderColors: normalizeColorList(input.borderColors, 4),
    brandColors: normalizeColorList(input.brandColors, 5),
    accentColors: normalizeColorList(input.accentColors, 5),
    linkColors: normalizeColorList(input.linkColors, 4),
    buttonColors: normalizeColorList(input.buttonColors, 5),
    fontFamilies: normalizeFontFamilies(input.fontFamilies),
    headingWeight: clamp(input.headingWeight ?? 700, 300, 900),
    bodyWeight: clamp(input.bodyWeight ?? 400, 300, 900),
    buttonRadius: clamp(input.buttonRadius ?? 16, 0, 40),
    cardRadius: clamp(input.cardRadius ?? 20, 0, 48),
    inputRadius: clamp(input.inputRadius ?? 16, 0, 40),
    shadowSamples: normalizeColorList(input.shadowSamples, 3),
    source: {
      hostname: input.source?.hostname?.trim() || undefined,
      title: input.source?.title?.trim() || undefined,
    },
  };
}

function averageLuminance(colors: string[]) {
  if (!colors.length) {
    return 0;
  }
  return colors.reduce((sum, color) => sum + relativeLuminance(color), 0) / colors.length;
}

function isNearNeutral(color: string) {
  const rgb = parseColor(color);
  if (!rgb) {
    return true;
  }
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  return max - min < 18;
}

function isNearExtreme(color: string) {
  const luminance = relativeLuminance(color);
  return luminance < 0.05 || luminance > 0.95;
}

function scoreCandidate(color: string, weight: number, background: string) {
  const brightness = relativeLuminance(color);
  const contrast = contrastRatio(color, background);
  const rgb = parseColor(color);
  if (!rgb) {
    return -Infinity;
  }

  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  const neutralityPenalty = isNearNeutral(color) ? 0.9 : 0;
  const extremePenalty = isNearExtreme(color) ? 1.25 : 0;
  return weight * 5 + saturation * 3 + contrast * 2 - neutralityPenalty - extremePenalty + Math.abs(0.5 - brightness);
}

function collectCandidates(snapshot: WebsiteStyleSnapshot) {
  const combined: Array<{ color: string; weight: number; source: 'brand' | 'button' | 'accent' | 'link' }> = [];
  snapshot.brandColors.forEach((color, index) => combined.push({ color, weight: 5 - index * 0.2, source: 'brand' }));
  snapshot.buttonColors.forEach((color, index) => combined.push({ color, weight: 4 - index * 0.15, source: 'button' }));
  snapshot.accentColors.forEach((color, index) => combined.push({ color, weight: 3 - index * 0.1, source: 'accent' }));
  snapshot.linkColors.forEach((color, index) => combined.push({ color, weight: 2.5 - index * 0.08, source: 'link' }));
  return combined;
}

function pickPrimary(snapshot: WebsiteStyleSnapshot, background: string) {
  const candidates = collectCandidates(snapshot)
    .map((candidate) => ({
      ...candidate,
      score: scoreCandidate(candidate.color, candidate.weight, background),
    }))
    .sort((a, b) => b.score - a.score);

  const best = candidates.find((candidate) => Boolean(parseColor(candidate.color)) && !isNearNeutral(candidate.color));
  return best?.color ?? snapshot.brandColors[0] ?? snapshot.buttonColors[0] ?? snapshot.accentColors[0] ?? snapshot.linkColors[0] ?? '#5f89ff';
}

function pickBackgroundTone(snapshot: WebsiteStyleSnapshot) {
  const page = normalizeColorString(snapshot.pageBackground) ?? '#0f172a';
  const surfaceAvg = averageLuminance(snapshot.surfaceColors.length ? snapshot.surfaceColors : [page]);
  const pageLum = relativeLuminance(page);
  const explicitDark = snapshot.pageMode === 'dark';
  const explicitLight = snapshot.pageMode === 'light';
  const inferredDark = pageLum < 0.35 || surfaceAvg < 0.4;
  const inferredLight = pageLum > 0.63 || surfaceAvg > 0.58;

  if (explicitDark || (snapshot.pageMode === 'mixed' && inferredDark && !inferredLight)) {
    return { tone: 'dark' as const, page, pageLum };
  }
  if (explicitLight || (snapshot.pageMode === 'mixed' && inferredLight && !inferredDark)) {
    return { tone: 'light' as const, page, pageLum };
  }
  return { tone: pageLum < 0.5 ? 'dark' as const : 'light' as const, page, pageLum };
}

function safeTextForBackground(background: string) {
  return contrastRatio('#ffffff', background) >= contrastRatio('#111111', background) ? '#ffffff' : '#111111';
}

function safeTextForColor(background: string, preferred: string) {
  if (contrastRatio(preferred, background) >= 4.5) {
    return normalizeColorString(preferred) ?? preferred;
  }
  const whiteContrast = contrastRatio('#ffffff', background);
  const blackContrast = contrastRatio('#111111', background);
  const fallback = whiteContrast >= blackContrast ? '#ffffff' : '#111111';
  if (contrastRatio(fallback, background) >= 4.5) {
    return fallback;
  }

  const direction = relativeLuminance(background) < 0.5 ? '#ffffff' : '#000000';
  let candidate = preferred;
  for (let index = 0; index < 8; index += 1) {
    candidate = blend(candidate, direction, 0.14);
    if (contrastRatio(candidate, background) >= 4.5) {
      return candidate;
    }
  }
  return fallback;
}

function safeAccent(base: string, background: string, tone: 'light' | 'dark') {
  const candidate = normalizeColorString(base) ?? base;
  if (contrastRatio(candidate, background) >= 3) {
    return candidate;
  }
  return tone === 'dark' ? lighten(candidate, 0.2) : darken(candidate, 0.2);
}

function chooseMuted(text: string, background: string) {
  return contrastRatio(text, background) >= 7 ? blend(text, background, 0.45) : blend(text, background, 0.32);
}

function inferRadiusClass(snapshot: WebsiteStyleSnapshot): 'sm' | 'md' | 'lg' | 'xl' {
  const samples = [snapshot.buttonRadius, snapshot.cardRadius, snapshot.inputRadius].filter((value): value is number => typeof value === 'number');
  if (!samples.length) {
    return 'lg';
  }
  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  if (average <= 10) return 'sm';
  if (average <= 16) return 'md';
  if (average <= 24) return 'lg';
  return 'xl';
}

function inferFont(snapshot: WebsiteStyleSnapshot) {
  return snapshot.fontFamilies[0] ?? 'Space Grotesk';
}

function inferContrastNotes(snapshot: WebsiteStyleSnapshot, background: string, primary: string, text: string) {
  const notes: string[] = [];
  const textContrast = contrastRatio(text, background);
  const primaryContrast = contrastRatio(primary, background);
  if (textContrast < 4.5) {
    notes.push('Text contrast is below the preferred 4.5:1 target and was adapted.');
  } else {
    notes.push('Text contrast clears the preferred 4.5:1 target.');
  }
  if (primaryContrast < 3) {
    notes.push('Brand color was reinforced to remain visible on the widget surface.');
  } else {
    notes.push('Brand color remains visible on the selected surface.');
  }
  if (snapshot.pageMode === 'dark') {
    notes.push('Dark page detected from the explicit mode and luminance check.');
  } else if (snapshot.pageMode === 'light') {
    notes.push('Light page detected from the explicit mode and luminance check.');
  } else {
    notes.push('Mixed page context balanced from background and surface samples.');
  }
  return notes;
}

function createThemeId(strategy: ThemeStrategy, snapshot: WebsiteStyleSnapshot) {
  const payload = JSON.stringify({
    strategy,
    pageMode: snapshot.pageMode,
    pageBackground: snapshot.pageBackground,
    brandColors: snapshot.brandColors,
    accentColors: snapshot.accentColors,
    linkColors: snapshot.linkColors,
    buttonColors: snapshot.buttonColors,
    source: snapshot.source,
  });
  let hash = 5381;
  for (let index = 0; index < payload.length; index += 1) {
    hash = (hash * 33) ^ payload.charCodeAt(index);
  }
  return `${strategy.toLowerCase()}-${Math.abs(hash).toString(36).slice(0, 7)}`;
}

function contrastStatus(ratio: number, threshold: number) {
  return ratio >= threshold ? 'PASS' : 'WARN';
}

function buildContrastPairs(tokens: ThemeTokens, spotlight: SpotlightTheme): ContrastPair[] {
  return [
    {
      label: 'Primary / Primary text',
      foreground: tokens.primaryText,
      background: tokens.primary,
      ratio: contrastRatio(tokens.primaryText, tokens.primary),
      status: contrastStatus(contrastRatio(tokens.primaryText, tokens.primary), 4.5),
    },
    {
      label: 'Surface / Text',
      foreground: tokens.text,
      background: tokens.surface,
      ratio: contrastRatio(tokens.text, tokens.surface),
      status: contrastStatus(contrastRatio(tokens.text, tokens.surface), 4.5),
    },
    {
      label: 'User bubble / User text',
      foreground: tokens.userText ?? tokens.primaryText,
      background: tokens.userBubble,
      ratio: contrastRatio(tokens.userText ?? tokens.primaryText, tokens.userBubble),
      status: contrastStatus(contrastRatio(tokens.userText ?? tokens.primaryText, tokens.userBubble), 4.5),
    },
    {
      label: 'Assistant bubble / Assistant text',
      foreground: tokens.assistantText ?? tokens.text,
      background: tokens.assistantBubble,
      ratio: contrastRatio(tokens.assistantText ?? tokens.text, tokens.assistantBubble),
      status: contrastStatus(contrastRatio(tokens.assistantText ?? tokens.text, tokens.assistantBubble), 4.5),
    },
    {
      label: 'Tooltip / Tooltip text',
      foreground: tokens.tooltipText ?? tokens.text,
      background: tokens.tooltipBackground ?? tokens.surfaceSecondary,
      ratio: contrastRatio(tokens.tooltipText ?? tokens.text, tokens.tooltipBackground ?? tokens.surfaceSecondary),
      status: contrastStatus(contrastRatio(tokens.tooltipText ?? tokens.text, tokens.tooltipBackground ?? tokens.surfaceSecondary), 4.5),
    },
    {
      label: 'Spotlight ring / page background',
      foreground: spotlight.ringColor,
      background: tokens.background,
      ratio: contrastRatio(spotlight.ringColor, tokens.background),
      status: contrastStatus(contrastRatio(spotlight.ringColor, tokens.background), 3),
    },
  ];
}

function buildSpotlight(snapshot: WebsiteStyleSnapshot, primary: string, surface: string, mode: 'light' | 'dark') {
  const overlayColor = mode === 'dark' ? '#02040b' : '#f7fbff';
  const ringColor = safeAccent(primary, snapshot.pageBackground, mode);
  const glowColor = mode === 'dark' ? lighten(ringColor, 0.35) : darken(ringColor, 0.12);
  const tooltipBackground = mode === 'dark' ? blend(surface, '#0a0f18', 0.55) : blend(surface, '#ffffff', 0.34);
  const tooltipText = safeTextForColor(tooltipBackground, mode === 'dark' ? '#f8fbff' : '#101828');
  return {
    overlayColor,
    overlayOpacity: mode === 'dark' ? 0.68 : 0.56,
    ringColor,
    ringWidth: mode === 'dark' ? 2.4 : 2,
    glowColor,
    tooltipBackground,
    tooltipText,
    targetPadding: mode === 'dark' ? 12 : 10,
  };
}

function buildThemeTokens(snapshot: WebsiteStyleSnapshot, strategy: ThemeStrategy): { tokens: ThemeTokens; appearance: AppearanceConfig; spotlight: SpotlightTheme; reason: string[]; origin: ThemeOrigin } {
  const normalized = normalizeSnapshot(snapshot);
  const tone = pickBackgroundTone(normalized);
  const backgroundBase = tone.page;
  const surfaceBase = normalized.surfaceColors[0] ?? (tone.tone === 'dark' ? '#111827' : '#ffffff');
  const surfaceSecondaryBase = normalized.surfaceColors[1] ?? blend(surfaceBase, tone.tone === 'dark' ? '#182636' : '#eef2f8', 0.35);
  const primaryBase = pickPrimary(normalized, backgroundBase);
  const accentCandidate = normalized.accentColors[0] ?? normalized.buttonColors[0] ?? primaryBase;
  const linkCandidate = normalized.linkColors[0] ?? accentCandidate;

  let origin: ThemeOrigin = 'auto-brand';
  let primary = primaryBase;
  let surface = surfaceBase;
  let surfaceSecondary = surfaceSecondaryBase;
  let text = normalized.textColors[0] ?? safeTextForBackground(surfaceBase);
  let mutedText = normalized.mutedTextColors[0] ?? chooseMuted(text, surfaceBase);
  let secondary = blend(primaryBase, surfaceSecondaryBase, tone.tone === 'dark' ? 0.28 : 0.18);
  let accent = accentCandidate;
  let link = linkCandidate;
  let assistantBubble = tone.tone === 'dark' ? blend(surfaceSecondaryBase, '#ffffff', 0.04) : blend(surfaceSecondaryBase, '#ffffff', 0.16);
  let userBubble = tone.tone === 'dark' ? blend(primaryBase, '#ffffff', 0.12) : blend(primaryBase, '#ffffff', 0.18);
  let shadow = normalized.shadowSamples?.[0] ?? (tone.tone === 'dark' ? '0 28px 64px rgba(0, 0, 0, 0.42)' : '0 18px 44px rgba(15, 23, 42, 0.12)');
  let appearance: AppearanceConfig = {
    radius: inferRadiusClass(normalized),
    widgetWidth: tone.tone === 'dark' ? 428 : 420,
    widgetHeight: tone.tone === 'dark' ? 640 : 620,
    density: tone.tone === 'dark' ? 'comfortable' : 'comfortable',
    fontScale: 1,
    shadowStrength: tone.tone === 'dark' ? 0.92 : 0.86,
    launcherSize: tone.tone === 'dark' ? 'md' : 'md',
    launcherPosition: tone.tone === 'dark' ? 'bottom-right' : 'bottom-right',
    primaryColor: primary,
  };
  let explanation: string[] = [];

  if (strategy === 'BRAND_MATCH') {
    origin = 'auto-brand';
    primary = safeAccent(primaryBase, surfaceBase, tone.tone);
    text = safeTextForColor(surfaceBase, normalized.textColors[0] ?? safeTextForBackground(surfaceBase));
    mutedText = chooseMuted(text, surfaceBase);
    secondary = blend(primary, surfaceSecondaryBase, 0.34);
    accent = safeAccent(accentCandidate, surfaceBase, tone.tone);
    link = safeAccent(linkCandidate, surfaceBase, tone.tone);
    assistantBubble = tone.tone === 'dark' ? blend(surfaceSecondaryBase, primary, 0.08) : blend(surfaceSecondaryBase, primary, 0.12);
    userBubble = tone.tone === 'dark' ? blend(primary, '#ffffff', 0.16) : blend(primary, '#ffffff', 0.22);
    appearance = {
      ...appearance,
      radius: inferRadiusClass(normalized),
      widgetWidth: tone.tone === 'dark' ? 424 : 418,
      widgetHeight: tone.tone === 'dark' ? 632 : 618,
      shadowStrength: tone.tone === 'dark' ? 0.9 : 0.84,
      primaryColor: primary,
    };
    explanation = [
      'Primary color derived from repeated CTA/button color.',
      tone.tone === 'dark'
        ? 'Dark site context kept the widget in a dark-adapted shell.'
        : 'Light site context kept the widget aligned to the page surface.',
      'Widget radius follows the site card/button radius language.',
    ];
  } else if (strategy === 'HIGH_CONTRAST') {
    origin = 'auto-contrast';
    const contrastPrimary = [primaryBase, ...normalized.brandColors, ...normalized.buttonColors, ...normalized.accentColors]
      .map((color) => safeAccent(color, surfaceBase, tone.tone))
      .sort((a, b) => contrastRatio(a, surfaceBase) - contrastRatio(b, surfaceBase))
      .pop();
    primary = contrastPrimary ?? safeAccent(primaryBase, surfaceBase, tone.tone);
    const invertSurface = tone.tone === 'dark' ? lighten(surfaceBase, 0.08) : darken(surfaceBase, 0.06);
    surface = invertSurface;
    surfaceSecondary = tone.tone === 'dark' ? lighten(surfaceBase, 0.14) : darken(surfaceBase, 0.11);
    text = safeTextForColor(surface, normalized.textColors[0] ?? safeTextForBackground(surface));
    mutedText = chooseMuted(text, surface);
    secondary = blend(primary, surfaceSecondary, 0.22);
    accent = safeAccent(accentCandidate, surface, tone.tone);
    link = safeAccent(linkCandidate, surface, tone.tone);
    assistantBubble = tone.tone === 'dark' ? lighten(surfaceSecondary, 0.07) : darken(surfaceSecondary, 0.06);
    userBubble = tone.tone === 'dark' ? blend(primary, '#ffffff', 0.22) : blend(primary, '#ffffff', 0.12);
    appearance = {
      ...appearance,
      radius: inferRadiusClass(normalized),
      widgetWidth: tone.tone === 'dark' ? 436 : 430,
      widgetHeight: tone.tone === 'dark' ? 650 : 628,
      density: 'compact',
      shadowStrength: tone.tone === 'dark' ? 1 : 0.92,
      primaryColor: primary,
    };
    explanation = [
      'Primary color selected for the highest safe contrast against the widget surface.',
      'Widget shell adjusted for readability without forcing a foreign-looking inversion.',
      'Foregrounds were corrected when the raw brand color failed contrast checks.',
    ];
  } else {
    origin = 'auto-premium';
    primary = desaturateColor(safeAccent(primaryBase, surfaceBase, tone.tone), 0.18);
    const premiumAccent = normalized.accentColors[0] ?? normalized.brandColors[0] ?? primaryBase;
    secondary = tone.tone === 'dark' ? lighten(desaturateColor(primary, 0.28), 0.08) : darken(desaturateColor(primary, 0.22), 0.05);
    accent = tone.tone === 'dark' ? lighten(desaturateColor(premiumAccent, 0.2), 0.05) : darken(desaturateColor(premiumAccent, 0.16), 0.04);
    link = safeAccent(linkCandidate, surfaceBase, tone.tone);
    surface = tone.tone === 'dark' ? blend(surfaceBase, '#0d1119', 0.16) : blend(surfaceBase, '#ffffff', 0.06);
    surfaceSecondary = tone.tone === 'dark' ? blend(surfaceBase, '#171a23', 0.14) : blend(surfaceBase, '#f2f5fb', 0.12);
    text = safeTextForColor(surface, normalized.textColors[0] ?? safeTextForBackground(surface));
    mutedText = chooseMuted(text, surface);
    assistantBubble = tone.tone === 'dark' ? blend(surfaceSecondary, primary, 0.12) : blend(surfaceSecondary, primary, 0.08);
    userBubble = tone.tone === 'dark' ? blend(primary, '#ffffff', 0.14) : blend(primary, '#ffffff', 0.2);
    shadow = tone.tone === 'dark' ? '0 32px 80px rgba(0, 0, 0, 0.56)' : '0 26px 60px rgba(15, 23, 42, 0.18)';
    appearance = {
      ...appearance,
      radius: inferRadiusClass(normalized) === 'sm' ? 'md' : inferRadiusClass(normalized),
      widgetWidth: tone.tone === 'dark' ? 440 : 432,
      widgetHeight: tone.tone === 'dark' ? 660 : 644,
      density: 'spacious',
      shadowStrength: tone.tone === 'dark' ? 1 : 0.94,
      primaryColor: primary,
    };
    explanation = [
      'Primary color softened for a premium, polished adaptation.',
      'Surface tones were refined to feel native to the site instead of harshly inverted.',
      'Radius was nudged upward to match the card hierarchy on the page.',
    ];
  }

  const spotlight = buildSpotlight(normalized, primary, surfaceSecondary, tone.tone);
  const assistantText = safeTextForColor(assistantBubble, text);
  const userText = safeTextForColor(userBubble, text);
  const tooltipBackground = spotlight.tooltipBackground;
  const tooltipText = spotlight.tooltipText;
  const border = normalized.borderColors[0] ?? blend(surfaceSecondary, tone.tone === 'dark' ? '#ffffff' : '#000000', 0.12);
  const success = tone.tone === 'dark' ? '#75e6b3' : '#1f9d67';
  const warning = tone.tone === 'dark' ? '#f7c76d' : '#c77712';
  const danger = tone.tone === 'dark' ? '#f28d9e' : '#bf3f5d';

  const tokens: ThemeTokens = {
    background: backgroundBase,
    surface,
    surfaceSecondary,
    text,
    mutedText,
    primary,
    primaryText: safeTextForColor(primary, primary),
    secondary,
    accent,
    border,
    assistantBubble,
    assistantText,
    userBubble,
    userText,
    link,
    focusRing: safeAccent(primary, surface, tone.tone),
    success,
    warning,
    danger,
    overlay: spotlight.overlayColor,
    spotlightRing: spotlight.ringColor,
    spotlightGlow: spotlight.glowColor,
    tooltipBackground,
    tooltipText,
    shadow,
  };

  const contrastPairs = buildContrastPairs(tokens, spotlight);
  const summary = [
    `Page mode: ${tone.tone}`,
    `Primary brand color: ${primary}`,
    `Secondary/accent: ${accent}`,
    `Background: ${backgroundBase}`,
    `Surface: ${surface}`,
    `Text: ${text}`,
    `Font: ${inferFont(normalized)}`,
    `Radius style: ${appearance.radius}`,
  ];

  return { tokens, appearance, spotlight, reason: explanation, origin };
}

export function analyzeWebsiteStyle(snapshotInput: WebsiteStyleSnapshot) {
  const snapshot = normalizeSnapshot(snapshotInput);
  const page = pickBackgroundTone(snapshot);
  const primary = pickPrimary(snapshot, page.page);
  const surface = snapshot.surfaceColors[0] ?? (page.tone === 'dark' ? '#111827' : '#ffffff');
  const text = snapshot.textColors[0] ?? safeTextForColor(surface, safeTextForBackground(surface));
  const accent = snapshot.accentColors[0] ?? snapshot.buttonColors[0] ?? primary;
  const radius = inferRadiusClass(snapshot);
  const notes = inferContrastNotes(snapshot, surface, primary, text);
  const font = inferFont(snapshot);
  const summary = `Analyzed ${snapshot.source?.title ?? snapshot.source?.hostname ?? 'website'} and identified a ${page.tone} surface with ${radius} radius cues.`;

  return {
    snapshot,
    inferredPageMode: page.tone,
    inferredPrimary: primary,
    inferredAccent: accent,
    inferredBackground: snapshot.pageBackground,
    inferredSurface: surface,
    inferredText: text,
    inferredFont: font,
    inferredRadius: radius,
    contrastNotes: notes,
    summary,
  } satisfies StyleAnalysis;
}

export function generateThemeRecommendations(snapshotInput: WebsiteStyleSnapshot) {
  const snapshot = normalizeSnapshot(snapshotInput);
  const strategies: Array<{ strategy: ThemeStrategy; label: string; note: string }> = [
    { strategy: 'BRAND_MATCH', label: 'Brand Match', note: 'Preserve the site identity while keeping the widget safe.' },
    { strategy: 'HIGH_CONTRAST', label: 'High Contrast', note: 'Prioritize visibility and strict foreground/background contrast.' },
    { strategy: 'PREMIUM_ADAPTATION', label: 'Premium Adaptation', note: 'Refine the site language into a polished premium widget.' },
  ];

  return strategies.map((item) => {
    const theme = buildThemeTokens(snapshot, item.strategy);
    const themeId = createThemeId(item.strategy, snapshot);
    return {
      id: themeId,
      strategy: item.strategy,
      origin: theme.origin,
      label: item.label,
      note: item.note,
      themeId,
      tokens: theme.tokens,
      appearance: theme.appearance,
      spotlight: theme.spotlight,
      explanation: [...theme.reason, ...inferContrastNotes(snapshot, theme.tokens.surface, theme.tokens.primary, theme.tokens.text)],
      contrastPairs: buildContrastPairs(theme.tokens, theme.spotlight),
      swatches: {
        background: theme.tokens.background,
        surface: theme.tokens.surface,
        surfaceSecondary: theme.tokens.surfaceSecondary,
        primary: theme.tokens.primary,
        accent: theme.tokens.accent ?? theme.tokens.primary,
        text: theme.tokens.text,
        mutedText: theme.tokens.mutedText,
      },
    } satisfies GeneratedThemeRecommendation;
  });
}

export function applyPrimaryOverride(theme: GeneratedThemeRecommendation, primaryColor: string) {
  const normalized = normalizeColorString(primaryColor) ?? theme.tokens.primary;
  const background = theme.tokens.surface;
  const safePrimary = safeAccent(normalized, background, relativeLuminance(background) < 0.5 ? 'dark' : 'light');
  const primaryText = safeTextForColor(safePrimary, theme.tokens.primaryText);
  const secondary = blend(safePrimary, theme.tokens.surfaceSecondary, 0.3);
  const accent = blend(safePrimary, theme.tokens.accent ?? safePrimary, 0.2);
  const link = safeAccent(theme.tokens.link ?? safePrimary, background, relativeLuminance(background) < 0.5 ? 'dark' : 'light');
  const assistantBubble = blend(theme.tokens.assistantBubble, safePrimary, 0.04);
  const userBubble = blend(theme.tokens.userBubble, safePrimary, 0.05);

  const tokens: ThemeTokens = {
    ...theme.tokens,
    primary: safePrimary,
    primaryText,
    secondary,
    accent,
    link,
    focusRing: safePrimary,
    assistantBubble,
    userBubble,
  };

  return {
    ...theme,
    tokens,
    swatches: {
      ...theme.swatches,
      primary: safePrimary,
      accent,
      surface: theme.tokens.surface,
      surfaceSecondary: theme.tokens.surfaceSecondary,
      text: theme.tokens.text,
      mutedText: theme.tokens.mutedText,
      background: theme.tokens.background,
    },
    contrastPairs: buildContrastPairs(tokens, theme.spotlight),
  } satisfies GeneratedThemeRecommendation;
}

export function spotlightTokensToCss(spotlight: SpotlightTheme) {
  return {
    overlayColor: spotlight.overlayColor,
    overlayOpacity: spotlight.overlayOpacity,
    ringColor: spotlight.ringColor,
    ringWidth: spotlight.ringWidth,
    glowColor: spotlight.glowColor,
    tooltipBackground: spotlight.tooltipBackground,
    tooltipText: spotlight.tooltipText,
    targetPadding: spotlight.targetPadding,
  };
}

export function themeTokensToCss(tokens: ThemeTokens) {
  return {
    background: tokens.background,
    surface: tokens.surface,
    surfaceSecondary: tokens.surfaceSecondary,
    text: tokens.text,
    mutedText: tokens.mutedText,
    primary: tokens.primary,
    primaryText: tokens.primaryText,
    secondary: tokens.secondary ?? tokens.primary,
    accent: tokens.accent ?? tokens.primary,
    border: tokens.border,
    assistantBubble: tokens.assistantBubble,
    assistantText: tokens.assistantText ?? tokens.text,
    userBubble: tokens.userBubble,
    userText: tokens.userText ?? tokens.primaryText,
    link: tokens.link ?? tokens.primary,
    focusRing: tokens.focusRing ?? tokens.primary,
    success: tokens.success,
    warning: tokens.warning,
    danger: tokens.danger,
    overlay: tokens.overlay ?? 'rgba(0, 0, 0, 0.42)',
    spotlightRing: tokens.spotlightRing ?? tokens.primary,
    spotlightGlow: tokens.spotlightGlow ?? tokens.primary,
    tooltipBackground: tokens.tooltipBackground ?? tokens.surfaceSecondary,
    tooltipText: tokens.tooltipText ?? tokens.text,
    shadow: tokens.shadow,
  };
}
