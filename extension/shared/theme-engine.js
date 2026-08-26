const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function parseColorComponents(input) {
  const value = String(input || '').trim();
  if (!value) {
    return null;
  }

  if (/^(transparent|currentcolor|inherit|initial|unset)$/i.test(value)) {
    return null;
  }

  const hex = value.replace(/^#/, '');
  if (/^[0-9a-f]{3,8}$/i.test(hex)) {
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length === 4) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: parseInt(hex[3] + hex[3], 16) / 255,
      };
    }
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
      };
    }
  }

  const rgbaMatch = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbaMatch) {
    const parts = rgbaMatch[1]
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 3) {
      return {
        r: Number(parts[0]),
        g: Number(parts[1]),
        b: Number(parts[2]),
        a: parts.length >= 4 ? Number(parts[3]) : 1,
      };
    }
  }

  const hslaMatch = value.match(/^hsla?\(([^)]+)\)$/i);
  if (hslaMatch) {
    const parts = hslaMatch[1]
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 3) {
      const h = Number(parts[0].replace(/deg$/i, ''));
      const s = Number(parts[1].replace('%', '')) / 100;
      const l = Number(parts[2].replace('%', '')) / 100;
      const a = parts.length >= 4 ? Number(parts[3]) : 1;
      const c = (1 - Math.abs(2 * l - 1)) * s;
      const hp = ((h % 360) + 360) % 360 / 60;
      const x = c * (1 - Math.abs((hp % 2) - 1));
      let r = 0;
      let g = 0;
      let b = 0;
      if (hp >= 0 && hp < 1) {
        r = c;
        g = x;
      } else if (hp < 2) {
        r = x;
        g = c;
      } else if (hp < 3) {
        g = c;
        b = x;
      } else if (hp < 4) {
        g = x;
        b = c;
      } else if (hp < 5) {
        r = x;
        b = c;
      } else {
        r = c;
        b = x;
      }
      const m = l - c / 2;
      return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255),
        a,
      };
    }
  }

  if (typeof document !== 'undefined') {
    const probe = document.createElement('span');
    probe.style.color = value;
    probe.style.position = 'absolute';
    probe.style.left = '-9999px';
    probe.style.top = '-9999px';
    const parent = document.body || document.documentElement;
    parent.appendChild(probe);
    const computed = getComputedStyle(probe).color;
    probe.remove();
    if (computed && computed !== value) {
      return parseColorComponents(computed);
    }
  }

  return null;
}

function rgbaToCss(color) {
  if (!color) {
    return '';
  }
  const r = clamp(Math.round(color.r), 0, 255);
  const g = clamp(Math.round(color.g), 0, 255);
  const b = clamp(Math.round(color.b), 0, 255);
  const a = color.a == null ? 1 : clamp(Number(color.a), 0, 1);
  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')})`;
  }
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function normalizeColor(value) {
  const parsed = parseColorComponents(value);
  return parsed ? rgbaToCss(parsed) : String(value || '').trim();
}

function luminance(color) {
  const parsed = parseColorComponents(color);
  if (!parsed) {
    return 0;
  }
  const toLinear = (channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return toLinear(parsed.r) * 0.2126 + toLinear(parsed.g) * 0.7152 + toLinear(parsed.b) * 0.0722;
}

function contrastRatio(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

function safeText(background) {
  return contrastRatio('#ffffff', background) >= contrastRatio('#111111', background) ? '#ffffff' : '#111111';
}

function mix(a, b, weight) {
  const left = parseColorComponents(a);
  const right = parseColorComponents(b);
  if (!left || !right) {
    return normalizeColor(a || b);
  }
  const t = clamp(weight, 0, 1);
  return rgbaToCss({
    r: left.r * (1 - t) + right.r * t,
    g: left.g * (1 - t) + right.g * t,
    b: left.b * (1 - t) + right.b * t,
    a: left.a * (1 - t) + right.a * t,
  });
}

function dedupe(values, max = 4) {
  const seen = new Set();
  const out = [];
  for (const item of values || []) {
    const trimmed = String(item || '').trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length >= max) break;
  }
  return out;
}

function isVisibleElement(element) {
  if (!(element instanceof HTMLElement)) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return false;
  }
  const style = getComputedStyle(element);
  return style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
}

function collectStyleColors(style, target) {
  const values = [
    style.color,
    style.backgroundColor,
    style.borderTopColor,
    style.borderRightColor,
    style.borderBottomColor,
    style.borderLeftColor,
    style.outlineColor,
    style.caretColor,
    style.textDecorationColor,
  ];

  for (const value of values) {
    const normalized = normalizeColor(value);
    if (normalized && !/^(transparent|rgba\(0, 0, 0, 0\))$/i.test(normalized)) {
      target.add(normalized);
    }
  }
}

function collectCustomPropertyColors(style, target) {
  const limit = Math.min(style.length, 120);
  for (let index = 0; index < limit; index += 1) {
    const name = style[index];
    if (!name || !name.startsWith('--')) {
      continue;
    }
    const value = style.getPropertyValue(name);
    if (!value) {
      continue;
    }
    const normalized = normalizeColor(value);
    if (normalized && !normalized.startsWith('--') && !/^(transparent|rgba\(0, 0, 0, 0\))$/i.test(normalized)) {
      target.add(normalized);
    }
  }
}

export function normalizeSnapshot(snapshot = {}) {
  return {
    pageMode: snapshot.pageMode || 'mixed',
    pageBackground: normalizeColor(snapshot.pageBackground || '#0f172a'),
    surfaceColors: dedupe(snapshot.surfaceColors || [], 4),
    textColors: dedupe(snapshot.textColors || [], 4),
    mutedTextColors: dedupe(snapshot.mutedTextColors || [], 4),
    borderColors: dedupe(snapshot.borderColors || [], 4),
    brandColors: dedupe(snapshot.brandColors || [], 5),
    accentColors: dedupe(snapshot.accentColors || [], 5),
    linkColors: dedupe(snapshot.linkColors || [], 4),
    buttonColors: dedupe(snapshot.buttonColors || [], 5),
    fontFamilies: dedupe(snapshot.fontFamilies || [], 4),
    headingWeight: snapshot.headingWeight || 700,
    bodyWeight: snapshot.bodyWeight || 400,
    buttonRadius: snapshot.buttonRadius || 16,
    cardRadius: snapshot.cardRadius || 20,
    inputRadius: snapshot.inputRadius || 16,
    shadowSamples: dedupe(snapshot.shadowSamples || [], 3),
    source: {
      hostname: snapshot.source?.hostname || '',
      title: snapshot.source?.title || '',
    },
  };
}

export function scanPageStyle(doc = document) {
  const root = doc.documentElement;
  const body = doc.body || root;
  const selectors = [
    'header',
    'nav',
    'main',
    'section',
    'article',
    'aside',
    'footer',
    'button',
    'a',
    'h1',
    'h2',
    'h3',
    'h4',
    'p',
    'input',
    'select',
    'textarea',
    'label',
    '[role="button"]',
    '[role="link"]',
    '[data-testid]',
  ];
  const samples = [root, body, ...doc.querySelectorAll(selectors.join(','))]
    .filter(isVisibleElement)
    .slice(0, 60);

  const colors = new Set();
  const backgrounds = new Set();
  const borders = new Set();
  const fonts = new Set();
  const shadows = new Set();
  const linkColors = new Set();
  const buttonColors = new Set();
  const radii = [];
  let headingWeight = 700;
  let headingCount = 0;
  let bodyWeight = 400;

  const bodyStyle = getComputedStyle(body);
  const background = normalizeColor(bodyStyle.backgroundColor || getComputedStyle(root).backgroundColor || '#0f172a');
  const bodyModeLum = luminance(background);
  let pageMode = 'mixed';
  if (bodyModeLum < 0.4) {
    pageMode = 'dark';
  } else if (bodyModeLum > 0.62) {
    pageMode = 'light';
  }

  collectCustomPropertyColors(getComputedStyle(root), colors);
  collectCustomPropertyColors(bodyStyle, colors);
  collectCustomPropertyColors(getComputedStyle(root), backgrounds);
  collectCustomPropertyColors(bodyStyle, backgrounds);

  for (const element of samples) {
    const style = getComputedStyle(element);
    collectStyleColors(style, colors);
    collectStyleColors(style, backgrounds);
    collectStyleColors(style, borders);
    if (element instanceof HTMLAnchorElement || style.cursor === 'pointer') {
      linkColors.add(normalizeColor(style.color));
    }
    if (element instanceof HTMLButtonElement || style.display === 'inline-flex' || style.display === 'flex') {
      buttonColors.add(normalizeColor(style.backgroundColor));
    }
    if (style.fontFamily) {
      fonts.add(style.fontFamily);
    }
    if (style.boxShadow && style.boxShadow !== 'none') {
      shadows.add(style.boxShadow);
    }
    const borderRadius = parseFloat(style.borderRadius || '0');
    if (Number.isFinite(borderRadius)) {
      radii.push(borderRadius);
    }
    const weight = Number.parseInt(String(style.fontWeight || '400'), 10);
    if (element.tagName === 'H1' || element.tagName === 'H2' || element.tagName === 'H3') {
      if (Number.isFinite(weight)) {
        headingWeight += weight;
        headingCount += 1;
      }
    } else if (element === body && Number.isFinite(weight)) {
      bodyWeight = weight;
    }
  }

  const brandCandidates = Array.from(new Set([
    ...linkColors,
    ...buttonColors,
    ...colors,
  ]))
    .filter((value) => {
      const lum = luminance(value);
      return lum > 0.04 && lum < 0.96;
    })
    .slice(0, 6);

  return normalizeSnapshot({
    pageMode,
    pageBackground: background,
    surfaceColors: Array.from(backgrounds).filter(Boolean).slice(0, 4),
    textColors: Array.from(colors).filter(Boolean).slice(0, 4),
    mutedTextColors: Array.from(colors).slice(1, 4),
    borderColors: Array.from(borders).filter(Boolean).slice(0, 4),
    brandColors: brandCandidates,
    accentColors: brandCandidates.slice(0, 3),
    linkColors: Array.from(linkColors).filter(Boolean).slice(0, 4),
    buttonColors: Array.from(buttonColors).filter(Boolean).slice(0, 4),
    fontFamilies: Array.from(fonts).slice(0, 4),
    headingWeight: headingCount ? Math.round(headingWeight / headingCount) : 700,
    bodyWeight,
    buttonRadius: radii.length ? clamp(Math.round(radii.reduce((sum, value) => sum + value, 0) / radii.length), 0, 40) : 16,
    cardRadius: radii.length ? clamp(Math.round(radii.reduce((sum, value) => sum + value, 0) / radii.length), 0, 48) : 20,
    inputRadius: radii.length ? clamp(Math.round(radii.reduce((sum, value) => sum + value, 0) / radii.length), 0, 40) : 16,
    shadowSamples: Array.from(shadows).slice(0, 3),
    source: {
      hostname: doc.location?.hostname || location.hostname || '',
      title: doc.title || '',
    },
  });
}

export function applyPrimaryOverride(tokens, primary) {
  const safe = normalizeColor(primary || tokens.primary || '#5f89ff');
  return {
    ...tokens,
    primary: safe,
    primaryText: safeText(safe),
    secondary: tokens.secondary || mix(safe, tokens.surfaceSecondary || tokens.surface || '#111827', 0.3),
    accent: tokens.accent || mix(safe, '#ffffff', 0.15),
    link: tokens.link || safe,
    focusRing: tokens.focusRing || safe,
    spotlightRing: tokens.spotlightRing || safe,
    spotlightGlow: tokens.spotlightGlow || mix(safe, '#ffffff', 0.3),
  };
}

export function generateRecommendations(snapshot) {
  const normalized = normalizeSnapshot(snapshot);
  const base = normalized.brandColors[0] || normalized.buttonColors[0] || normalized.accentColors[0] || '#5f89ff';
  const dark = normalized.pageMode === 'dark' || luminance(normalized.pageBackground) < 0.45;
  const text = safeText(normalized.pageBackground);
  const surface = dark ? mix(normalized.pageBackground, '#0f172a', 0.18) : mix(normalized.pageBackground, '#ffffff', 0.78);
  const surfaceSecondary = dark ? mix(surface, '#ffffff', 0.08) : mix(surface, '#000000', 0.04);
  const accent = normalized.accentColors[0] || mix(base, '#ffffff', 0.15);
  const border = normalized.borderColors[0] || mix(surfaceSecondary, dark ? '#ffffff' : '#000000', 0.12);
  const shadow = normalized.shadowSamples[0] || (dark ? '0 28px 64px rgba(0,0,0,0.42)' : '0 18px 44px rgba(15,23,42,0.12)');

  const build = (id, label, primary, origin) => ({
    id,
    label,
    origin,
    snapshot: normalized,
    tokens: applyPrimaryOverride(
      {
        background: normalized.pageBackground,
        surface,
        surfaceSecondary,
        text,
        mutedText: mix(text, normalized.pageBackground, 0.55),
        primary,
        primaryText: safeText(primary),
        secondary: mix(primary, surfaceSecondary, 0.3),
        accent,
        border,
        assistantBubble: mix(surfaceSecondary, primary, dark ? 0.08 : 0.12),
        assistantText: text,
        userBubble: mix(primary, '#ffffff', dark ? 0.14 : 0.2),
        userText: safeText(primary),
        link: normalized.linkColors[0] || primary,
        focusRing: primary,
        success: dark ? '#75e6b3' : '#1f9d67',
        warning: dark ? '#f7c76d' : '#c77712',
        danger: dark ? '#f28d9e' : '#bf3f5d',
        overlay: dark ? 'rgba(2, 4, 11, 0.68)' : 'rgba(247, 251, 255, 0.58)',
        spotlightRing: primary,
        spotlightGlow: mix(primary, '#ffffff', 0.36),
        tooltipBackground: dark ? mix(surfaceSecondary, '#0a0f18', 0.55) : mix(surfaceSecondary, '#ffffff', 0.34),
        tooltipText: safeText(dark ? mix(surfaceSecondary, '#0a0f18', 0.55) : mix(surfaceSecondary, '#ffffff', 0.34)),
        shadow,
      },
      primary,
    ),
  });

  return [
    build('auto-brand', 'Brand Match', base, 'auto-brand'),
    build('auto-contrast', 'High Contrast', dark ? mix(base, '#ffffff', 0.18) : mix(base, '#000000', 0.18), 'auto-contrast'),
    build('auto-premium', 'Premium Adaptation', mix(base, dark ? '#d8b16a' : '#7cc8ff', 0.2), 'auto-premium'),
  ];
}

export function themeTokensToCss(tokens) {
  return {
    '--siteaware-background': tokens.background,
    '--siteaware-surface': tokens.surface,
    '--siteaware-surface-secondary': tokens.surfaceSecondary,
    '--siteaware-text': tokens.text,
    '--siteaware-muted-text': tokens.mutedText,
    '--siteaware-primary': tokens.primary,
    '--siteaware-primary-text': tokens.primaryText,
    '--siteaware-secondary': tokens.secondary,
    '--siteaware-accent': tokens.accent,
    '--siteaware-border': tokens.border,
    '--siteaware-assistant-bubble': tokens.assistantBubble,
    '--siteaware-assistant-text': tokens.assistantText || tokens.text,
    '--siteaware-user-bubble': tokens.userBubble,
    '--siteaware-user-text': tokens.userText || tokens.primaryText,
    '--siteaware-link': tokens.link || tokens.primary,
    '--siteaware-focus-ring': tokens.focusRing || tokens.primary,
    '--siteaware-success': tokens.success,
    '--siteaware-warning': tokens.warning,
    '--siteaware-danger': tokens.danger,
    '--siteaware-overlay': tokens.overlay || 'rgba(0, 0, 0, 0.58)',
    '--siteaware-spotlight-ring': tokens.spotlightRing || tokens.primary,
    '--siteaware-spotlight-glow': tokens.spotlightGlow || tokens.primary,
    '--siteaware-tooltip-background': tokens.tooltipBackground || tokens.surfaceSecondary,
    '--siteaware-tooltip-text': tokens.tooltipText || tokens.text,
    '--siteaware-shadow': tokens.shadow,
  };
}

export function spotlightTokensToCss(tokens) {
  return {
    '--siteaware-spotlight-ring': tokens.spotlightRing || tokens.primary,
    '--siteaware-spotlight-glow': tokens.spotlightGlow || tokens.primary,
    '--siteaware-overlay': tokens.overlay || 'rgba(0, 0, 0, 0.58)',
    '--siteaware-tooltip-background': tokens.tooltipBackground || tokens.surfaceSecondary,
    '--siteaware-tooltip-text': tokens.tooltipText || tokens.text,
  };
}
