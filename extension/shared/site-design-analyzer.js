const MAX_SAMPLES = 180;

export async function scanSiteDesignV2(doc = document) {
  await waitForStablePage(doc);
  const root = doc.documentElement;
  const body = doc.body || root;
  const elements = representativeElements(doc);
  const cssVars = collectRootVariables(root);
  const classified = elements.map(classifyElement).filter(Boolean);
  const background = inferBackground(body, classified);
  const palette = inferPalette(classified, cssVars, background);
  const typography = inferTypography(classified, body);
  const shape = inferShape(classified);
  const effects = inferEffects(classified);
  const direction = inferDirection(root, body, classified);
  const mode = inferMode(background.value, palette.surface.value);
  const overall = average([palette.primary.confidence, palette.surface.confidence, typography.confidence, shape.confidence]);

  return {
    version: 2,
    origin: doc.location?.origin || location.origin,
    hostname: doc.location?.hostname || location.hostname,
    mode,
    direction,
    palette,
    typography,
    shape,
    effects,
    confidence: {
      overall: roundConfidence(overall),
      primary: palette.primary.confidence,
      surface: palette.surface.confidence,
      typography: typography.confidence,
    },
    evidence: {
      visibleElementsSampled: elements.length,
      interactiveElementsSampled: classified.filter((item) => item.role === 'interactive').length,
      cssVariablesUsed: cssVars.length,
      colorCandidates: unique(classified.flatMap((item) => [item.color, item.backgroundColor, item.borderColor]).filter(Boolean)).length,
    },
  };
}

async function waitForStablePage(doc) {
  if (doc.readyState === 'loading') {
    await new Promise((resolve) => doc.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  if (doc.fonts?.ready) {
    await Promise.race([doc.fonts.ready.catch(() => undefined), wait(260)]);
  }
  await wait(120);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function representativeElements(doc) {
  const selectors = [
    'html', 'body', 'header', 'nav', 'main', 'aside', 'footer',
    'section', 'article', '[role="main"]', '[role="navigation"]',
    'button', 'a[href]', 'input', 'select', 'textarea', '[role="button"]',
    '[aria-current]', '[aria-selected="true"]', '[class*="active"]',
    '[class*="card"]', '[class*="panel"]', '[class*="modal"]', '[class*="dialog"]',
    '[class*="toolbar"]', '[class*="sidebar"]', '[class*="container"]',
  ];
  const seen = new Set();
  const result = [];
  for (const element of doc.querySelectorAll(selectors.join(','))) {
    if (!(element instanceof HTMLElement)) continue;
    if (element.closest('#siteaware-preview-root')) continue;
    if (seen.has(element)) continue;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (!rect.width || !rect.height || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
    seen.add(element);
    result.push(element);
    if (result.length >= MAX_SAMPLES) break;
  }
  return result;
}

function classifyElement(element) {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const tag = element.tagName.toLowerCase();
  const className = typeof element.className === 'string' ? element.className.toLowerCase() : '';
  const roleAttr = element.getAttribute('role') || '';
  const role = element.matches('button,a[href],input,select,textarea,[role="button"],[aria-current],[aria-selected="true"]')
    ? 'interactive'
    : /card|panel|modal|dialog|popover|sheet/.test(className)
      ? 'surface'
      : /header|nav|aside|toolbar|navigation/.test(`${tag} ${className} ${roleAttr}`)
        ? 'navigation'
        : rect.width * rect.height > window.innerWidth * window.innerHeight * 0.18
          ? 'background'
          : 'content';
  return {
    role,
    tag,
    area: Math.round(rect.width * rect.height),
    color: normalizeColor(style.color),
    backgroundColor: normalizeColor(style.backgroundColor),
    borderColor: normalizeColor(style.borderColor || style.borderTopColor),
    outlineColor: normalizeColor(style.outlineColor),
    fontFamily: style.fontFamily,
    fontSize: number(style.fontSize),
    fontWeight: number(style.fontWeight),
    lineHeight: number(style.lineHeight),
    letterSpacing: number(style.letterSpacing),
    direction: style.direction === 'rtl' ? 'rtl' : 'ltr',
    borderRadius: number(style.borderRadius),
    borderWidth: number(style.borderTopWidth),
    boxShadow: style.boxShadow && style.boxShadow !== 'none' ? style.boxShadow : '',
  };
}

function collectRootVariables(root) {
  const style = getComputedStyle(root);
  const vars = [];
  for (let index = 0; index < style.length; index += 1) {
    const name = style[index];
    if (!name?.startsWith('--')) continue;
    if (!/(background|foreground|primary|secondary|accent|card|surface|border|muted|ring|brand|color)/i.test(name)) continue;
    const value = normalizeColor(style.getPropertyValue(name));
    if (!value) continue;
    vars.push({ name, value });
    if (vars.length >= 64) break;
  }
  return vars;
}

function inferBackground(body, samples) {
  const bodyColor = normalizeColor(getComputedStyle(body).backgroundColor);
  const large = samples.filter((item) => item.role === 'background' && item.backgroundColor);
  const ranked = rankColors(large.map((item) => ({ value: item.backgroundColor, score: Math.max(1, item.area / 50000) })));
  return token(ranked[0]?.value || bodyColor || '#ffffff', ranked[0] ? 0.86 : 0.56, large.length || 1);
}

function inferPalette(samples, cssVars, background) {
  const surfaces = rankColors(samples
    .filter((item) => ['surface', 'navigation', 'content'].includes(item.role) && usefulSurface(item.backgroundColor, background.value))
    .map((item) => ({ value: item.backgroundColor, score: Math.max(1, item.area / 42000) })));

  const foregrounds = rankColors(samples
    .filter((item) => item.color && contrast(item.color, background.value) > 2.4)
    .map((item) => ({ value: item.color, score: item.role === 'content' ? 2 : 1 })));

  const borders = rankColors(samples
    .filter((item) => item.borderColor && !isNeutralExtreme(item.borderColor))
    .map((item) => ({ value: item.borderColor, score: item.borderWidth ? 2 : 1 })));

  const variablePrimary = rankColors(cssVars
    .filter((item) => /(primary|accent|brand|ring)/i.test(item.name) && !isNeutral(item.value) && !isNeutralExtreme(item.value))
    .map((item) => ({ value: item.value, score: /primary|brand/i.test(item.name) ? 7 : 4 })));

  const interactive = rankColors(samples
    .filter((item) => item.role === 'interactive')
    .flatMap((item) => [
      { value: item.backgroundColor, score: colorScore(item.backgroundColor, background.value, 6) },
      { value: item.color, score: colorScore(item.color, background.value, 3) },
      { value: item.borderColor, score: colorScore(item.borderColor, background.value, 2) },
      { value: item.outlineColor, score: colorScore(item.outlineColor, background.value, 2) },
    ]));

  const primary = variablePrimary[0]?.score >= 7 ? variablePrimary[0] : interactive[0] || variablePrimary[0];
  const surface = surfaces[0]?.value || (isDark(background.value) ? '#111827' : '#ffffff');
  const text = foregrounds[0]?.value || (isDark(surface) ? '#f8fafc' : '#111827');
  const muted = foregrounds.find((item) => item.value !== text)?.value || mixReadable(text, surface);
  const border = borders[0]?.value || (isDark(surface) ? '#263244' : '#dde3eb');

  return {
    primary: token(primary?.value || '#2563eb', confidence(primary?.score || 0, 12), countColor(samples, primary?.value)),
    background,
    surface: token(surface, surfaces[0] ? 0.78 : 0.48, countColor(samples, surface)),
    foreground: token(text, foregrounds[0] ? 0.82 : 0.52, countColor(samples, text)),
    muted: token(muted, 0.62, countColor(samples, muted)),
    border: token(border, borders[0] ? 0.74 : 0.45, countColor(samples, border)),
    accent: token((interactive[1] || variablePrimary[1] || primary)?.value || primary?.value || '#2563eb', 0.58, 1),
  };
}

function inferTypography(samples, body) {
  const bodyStyle = getComputedStyle(body);
  const fonts = rankStrings(samples.map((item) => item.fontFamily).filter(Boolean));
  const sizes = samples.map((item) => item.fontSize).filter(Boolean);
  const weights = samples.map((item) => item.fontWeight).filter(Boolean);
  return {
    fontFamily: fonts[0]?.value || bodyStyle.fontFamily || 'system-ui',
    baseSize: median(sizes) || number(bodyStyle.fontSize) || 16,
    commonWeights: rankStrings(weights.map(String)).slice(0, 4).map((item) => Number(item.value)),
    lineHeight: median(samples.map((item) => item.lineHeight).filter(Boolean)) || 1.5,
    letterSpacing: median(samples.map((item) => item.letterSpacing).filter((item) => Number.isFinite(item))) || 0,
    confidence: confidence((fonts[0]?.count || 0) + sizes.length / 12, 16),
  };
}

function inferShape(samples) {
  const interactive = samples.filter((item) => item.role === 'interactive').map((item) => item.borderRadius).filter(Boolean);
  const surfaces = samples.filter((item) => item.role === 'surface').map((item) => item.borderRadius).filter(Boolean);
  const inputs = samples.filter((item) => ['input', 'select', 'textarea'].includes(item.tag)).map((item) => item.borderRadius).filter(Boolean);
  const radius = median([...interactive, ...surfaces, ...inputs]);
  const language = radius >= 24 ? 'pill' : radius >= 16 ? 'rounded' : radius >= 8 ? 'subtle' : 'square';
  return {
    radius: Math.round(radius || 12),
    buttonRadius: Math.round(median(interactive) || radius || 12),
    inputRadius: Math.round(median(inputs) || radius || 12),
    cardRadius: Math.round(median(surfaces) || radius || 12),
    language,
    confidence: confidence(interactive.length + surfaces.length + inputs.length, 36),
  };
}

function inferEffects(samples) {
  const shadows = samples.map((item) => item.boxShadow).filter(Boolean);
  const borders = samples.filter((item) => item.borderWidth > 0).length;
  let shadowStyle = 'none';
  if (shadows.length > 8) shadowStyle = 'elevated';
  else if (shadows.length > 3) shadowStyle = 'soft';
  else if (shadows.length > 0) shadowStyle = 'subtle';
  return {
    shadowStyle,
    representativeShadow: shadows[0] || '',
    borderUsage: borders / Math.max(samples.length, 1) > 0.35 ? 'common' : 'light',
  };
}

function inferDirection(root, body, samples) {
  const explicit = root.dir || body.dir;
  if (explicit === 'rtl' || explicit === 'ltr') return explicit;
  const bodyDirection = getComputedStyle(body).direction;
  if (bodyDirection === 'rtl') return 'rtl';
  const rtlCount = samples.filter((item) => item.direction === 'rtl').length;
  return rtlCount > samples.length / 2 ? 'rtl' : 'ltr';
}

function inferMode(background, surface) {
  const avg = average([luminance(background), luminance(surface)]);
  if (avg < 0.38) return 'dark';
  if (avg > 0.66) return 'light';
  return 'mixed';
}

function rankColors(entries) {
  const map = new Map();
  for (const entry of entries) {
    if (!entry.value) continue;
    map.set(entry.value, (map.get(entry.value) || 0) + Math.max(0, entry.score || 1));
  }
  return [...map.entries()].map(([value, score]) => ({ value, score })).sort((a, b) => b.score - a.score);
}

function rankStrings(values) {
  const map = new Map();
  for (const value of values) map.set(value, (map.get(value) || 0) + 1);
  return [...map.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
}

function normalizeColor(value) {
  const text = String(value || '').trim();
  if (!text || /transparent|currentcolor|inherit|initial|unset/i.test(text) || /^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/i.test(text)) return '';
  return text;
}

function colorScore(value, background, base) {
  if (!value || isNeutralExtreme(value) || isNeutral(value)) return 0;
  return base + saturation(value) * 4 + Math.min(contrast(value, background), 8) * 0.8;
}

function usefulSurface(value, background) {
  if (!value) return false;
  return contrast(value, background) < 2.8 || isNeutral(value);
}

function countColor(samples, value) {
  if (!value) return 0;
  return samples.filter((item) => [item.color, item.backgroundColor, item.borderColor].includes(value)).length;
}

function token(value, confidenceValue, evidenceCount) {
  return {
    value,
    confidence: roundConfidence(confidenceValue),
    evidenceCount: evidenceCount || 0,
  };
}

function confidence(value, max) {
  return Math.min(0.96, Math.max(0.18, value / max));
}

function roundConfidence(value) {
  return Math.round(value * 100) / 100;
}

function number(value) {
  const parsed = Number.parseFloat(String(value || ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] || 0;
}

function average(values) {
  const valid = values.filter((value) => Number.isFinite(value));
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
}

function unique(values) {
  return [...new Set(values)];
}

function rgb(value) {
  const match = String(value).match(/rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

function luminance(value) {
  const color = rgb(value);
  if (!color) return /^#fff/i.test(value) ? 1 : /^#000/i.test(value) ? 0 : 0.5;
  return (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
}

function contrast(a, b) {
  const left = luminance(a);
  const right = luminance(b);
  return (Math.max(left, right) + 0.05) / (Math.min(left, right) + 0.05);
}

function saturation(value) {
  const color = rgb(value);
  if (!color) return 0.6;
  const max = Math.max(color.r, color.g, color.b);
  const min = Math.min(color.r, color.g, color.b);
  return max === 0 ? 0 : (max - min) / max;
}

function isNeutral(value) {
  const color = rgb(value);
  if (!color) return false;
  return Math.max(color.r, color.g, color.b) - Math.min(color.r, color.g, color.b) < 24;
}

function isNeutralExtreme(value) {
  const luma = luminance(value);
  return luma < 0.06 || luma > 0.94;
}

function isDark(value) {
  return luminance(value) < 0.45;
}

function mixReadable(text, surface) {
  return isDark(surface) ? 'rgba(226, 232, 240, 0.72)' : 'rgba(71, 85, 105, 0.78)';
}
