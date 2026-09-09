// ============================================================================
// SiteAware Widget Studio — shared catalog and configuration.
//
// This is the SINGLE source of truth used by BOTH the Web Studio and the
// Browser Extension. The Web Studio renders the same ids via its React
// preview (src/studioData.tsx); the extension renders them via the shadow-DOM
// renderer in content-script.js. Keep the ids in sync between the two.
//
// Everything here is configuration-only data. No page text, no HTML, no
// executable third-party code, and no secrets may ever live in this module.
// ============================================================================

// Official SiteAware identity mark. Local SVG only (no remote assets, no
// imitation of protected competitor logos). Neutral enough for medical,
// university, SaaS, business and accounting surfaces. Rendered with
// `currentColor` so the launcher/header controls the ink via CSS.
export const OFFICIAL_MARK_SVG = `
<svg viewBox="0 0 24 24" aria-hidden="true" fill="none">
  <rect x="3" y="3" width="18" height="18" rx="6.5" stroke="currentColor" stroke-width="1.8" />
  <path d="M12 6.6c.66 1.86 1.6 2.8 3.46 3.46-1.86.66-2.8 1.6-3.46 3.46-.66-1.86-1.6-2.8-3.46-3.46 1.86-.66 2.8-1.6 3.46-3.46Z" fill="currentColor" />
</svg>`;

// ---------------------------------------------------------------------------
// Catalog categories.
//
// Each item carries `family`, a small renderer hint the shadow-DOM renderer
// uses to choose a concrete visual treatment. Featured items are surfaced
// first in the studio ("Featured"), the rest remain available under
// "More designs" so the Web Studio and Extension stay at parity.
// ---------------------------------------------------------------------------

export const catalog = {
  icons: [
    { id: 'siteaware-official', label: 'SiteAware Official', family: 'official', featured: true, svg: OFFICIAL_MARK_SVG, glyph: 'SA' },
    { id: 'siteaware-minimal', label: 'SiteAware Minimal', family: 'official', featured: true, svg: OFFICIAL_MARK_SVG, glyph: 'S' },
    { id: 'siteaware-glass', label: 'SiteAware Glass', family: 'official', featured: true, svg: OFFICIAL_MARK_SVG, glyph: 'S' },
    { id: 'siteaware-soft', label: 'SiteAware Soft', family: 'official', featured: true, svg: OFFICIAL_MARK_SVG, glyph: '◎' },
    { id: 'siteaware-dark', label: 'SiteAware Dark', family: 'official', featured: true, svg: OFFICIAL_MARK_SVG, glyph: 'SA' },
    { id: 'orb-01', label: 'Orb Core', family: 'orb', glyph: '◉' },
    { id: 'spark-02', label: 'Spark', family: 'spark', glyph: '✦' },
    { id: 'star-03', label: 'Geometric Star', family: 'spark', glyph: '✶' },
    { id: 'nodes-04', label: 'Neural Nodes', family: 'nodes', glyph: '◈' },
    { id: 'eye-05', label: 'AI Eye', family: 'eye', glyph: '◉' },
    { id: 'bot-06', label: 'Minimal Bot', family: 'bot', glyph: '◔' },
    { id: 'halo-07', label: 'Halo', family: 'orb', glyph: '◌' },
    { id: 'cube-08', label: 'Cube', family: 'cube', glyph: '▦' },
    { id: 'wave-09', label: 'Wave', family: 'wave', glyph: '〰' },
    { id: 'constellation-10', label: 'Constellation', family: 'nodes', glyph: '✦' },
    { id: 'hex-11', label: 'Hex AI', family: 'cube', glyph: '⬡' },
    { id: 'pulse-12', label: 'Pulse', family: 'wave', glyph: '〰' },
    { id: 'face-13', label: 'Assistant Face', family: 'bot', glyph: '◔' },
    { id: 'diamond-14', label: 'Diamond', family: 'spark', glyph: '◆' },
    { id: 'shield-15', label: 'Shield Intelligence', family: 'shield', glyph: '◆' },
    { id: 'sphere-16', label: 'Gradient Sphere', family: 'orb', glyph: '●' },
    { id: 'network-17', label: 'Line Network', family: 'nodes', glyph: '◈' },
    { id: 'command-18', label: 'Command Mark', family: 'command', glyph: '⌘' },
    { id: 'glyph-19', label: 'Minimal Glyph', family: 'glyph', glyph: 'Z' },
    { id: 'premium-20', label: 'Premium Abstract', family: 'premium', glyph: '◆' },
  ],

  launchers: [
    { id: 'siteaware-official', label: 'SiteAware Official', family: 'official', featured: true },
    { id: 'minimal-floating', label: 'Minimal Floating', family: 'circle', featured: true },
    { id: 'soft-glass', label: 'Soft Glass', family: 'glass', featured: true },
    { id: 'liquid-launcher', label: 'Liquid Glass', family: 'liquid', featured: true },
    { id: 'compact-pill', label: 'Compact Copilot', family: 'pill', featured: true },
    { id: 'pill-label', label: 'Floating Label', family: 'floating-label', featured: true },
    { id: 'vertical-edge-tab', label: 'Edge Tab', family: 'edge', featured: true },
    { id: 'ai-orb', label: 'AI Orb', family: 'orb', featured: true },
    { id: 'circle-icon', label: 'Circle Icon', family: 'circle' },
    { id: 'rounded-square', label: 'Rounded Square', family: 'circle' },
    { id: 'icon-text', label: 'Icon + Text', family: 'floating-label' },
    { id: 'floating-orb', label: 'Floating Orb', family: 'orb' },
    { id: 'glass-launcher', label: 'Glass Launcher', family: 'glass' },
    { id: 'minimal-outline', label: 'Minimal Outline', family: 'outline' },
    { id: 'soft-shadow', label: 'Soft Shadow', family: 'circle' },
    { id: 'elevated-card', label: 'Elevated Card', family: 'pill' },
    { id: 'compact-tab', label: 'Compact Tab', family: 'edge' },
    { id: 'docked-tab', label: 'Docked Tab', family: 'edge' },
    { id: 'notification', label: 'Notification', family: 'pill' },
    { id: 'premium', label: 'Premium', family: 'premium' },
    { id: 'enterprise', label: 'Enterprise', family: 'pill' },
    { id: 'friendly', label: 'Friendly', family: 'floating-label' },
    { id: 'dark', label: 'Dark Launcher', family: 'circle' },
    { id: 'gradient', label: 'Gradient Launcher', family: 'premium' },
    { id: 'ultra-minimal', label: 'Ultra Minimal', family: 'outline' },
    { id: 'status-dot', label: 'Status Dot', family: 'orb' },
    { id: 'assistant-name', label: 'Assistant Name', family: 'floating-label' },
  ],

  chatShells: [
    { id: 'siteaware-official', label: 'SiteAware Official', family: 'official', featured: true },
    { id: 'minimal-saas', label: 'Minimal SaaS', family: 'minimal', featured: true },
    { id: 'soft-glass-shell', label: 'Soft Glass', family: 'glass', featured: true },
    { id: 'liquid-glass', label: 'Liquid Glass', family: 'liquid', featured: true },
    { id: 'compact-copilot', label: 'Compact Copilot', family: 'copilot', featured: true },
    { id: 'floating-assistant', label: 'Floating Assistant', family: 'floating', featured: true },
    { id: 'premium-dark', label: 'Premium Dark', family: 'dark', featured: true },
    { id: 'native-card', label: 'Native Card', family: 'minimal' },
    { id: 'classic', label: 'Classic', family: 'classic' },
    { id: 'modern-saas', label: 'Modern SaaS', family: 'minimal' },
    { id: 'minimal', label: 'Minimal', family: 'minimal' },
    { id: 'glass', label: 'Glass', family: 'glass' },
    { id: 'compact', label: 'Compact', family: 'copilot' },
    { id: 'premium', label: 'Premium', family: 'premium' },
    { id: 'enterprise', label: 'Enterprise', family: 'enterprise' },
    { id: 'enterprise-panel', label: 'Enterprise Panel', family: 'enterprise' },
    { id: 'rounded', label: 'Rounded', family: 'classic' },
    { id: 'sharp', label: 'Sharp Professional', family: 'enterprise' },
    { id: 'floating-card', label: 'Floating Card', family: 'floating' },
    { id: 'side-panel', label: 'Side-Panel Inspired', family: 'copilot' },
    { id: 'soft-assistant', label: 'Soft Assistant', family: 'classic' },
    { id: 'copilot-dock', label: 'Copilot Dock', family: 'copilot' },
    { id: 'chatgpt-minimal', label: 'ChatGPT Inspired', family: 'minimal' },
    { id: 'claude-editorial', label: 'Claude Inspired', family: 'classic' },
    { id: 'gemini-glow', label: 'Gemini Inspired', family: 'premium' },
  ],

  messageStyles: [
    { id: 'clean-card', label: 'Clean Card', family: 'card', featured: true },
    { id: 'flat-text', label: 'Flat Text', family: 'flat', featured: true },
    { id: 'glass', label: 'Glass', family: 'glass', featured: true },
    { id: 'compact', label: 'Compact', family: 'compact', featured: true },
    { id: 'card', label: 'Card', family: 'card' },
    { id: 'simple-bubble', label: 'Simple Bubble', family: 'card' },
    { id: 'bordered-card', label: 'Bordered Card', family: 'card' },
    { id: 'answer-block', label: 'Answer Block', family: 'compact' },
    { id: 'source-first', label: 'Source-First Answer', family: 'card' },
    { id: 'minimal', label: 'Minimal', family: 'flat' },
    { id: 'modern-saas', label: 'Modern SaaS', family: 'card' },
    { id: 'soft-gray', label: 'Soft Gray', family: 'card' },
    { id: 'premium', label: 'Premium', family: 'card' },
    { id: 'structured', label: 'Structured Response', family: 'card' },
  ],

  userMessages: [
    { id: 'solid', label: 'Solid', family: 'solid', featured: true },
    { id: 'bubble-rounded', label: 'Rounded Bubble', family: 'solid', featured: true },
    { id: 'outline', label: 'Outline', family: 'outline', featured: true },
    { id: 'glass', label: 'Glass', family: 'glass', featured: true },
    { id: 'chip', label: 'Chip', family: 'solid' },
    { id: 'pill', label: 'Pill', family: 'solid' },
    { id: 'compact', label: 'Compact', family: 'solid' },
    { id: 'tail', label: 'Tail', family: 'solid' },
    { id: 'no-tail', label: 'No Tail', family: 'solid' },
    { id: 'wide', label: 'Wide', family: 'solid' },
    { id: 'dense', label: 'Dense', family: 'solid' },
    { id: 'floating', label: 'Floating', family: 'glass' },
    { id: 'premium', label: 'Premium', family: 'solid' },
  ],

  inputBars: [
    { id: 'pill', label: 'Pill', family: 'pill', featured: true },
    { id: 'glass', label: 'Glass', family: 'glass', featured: true },
    { id: 'composer-card', label: 'Card', family: 'card', featured: true },
    { id: 'classic-input', label: 'Classic Input', family: 'pill' },
    { id: 'pill-input', label: 'Pill Input', family: 'pill' },
    { id: 'floating-input', label: 'Floating Input', family: 'floating' },
    { id: 'bordered-input', label: 'Bordered', family: 'pill' },
    { id: 'underline', label: 'Minimal Underline', family: 'underline' },
    { id: 'command-bar', label: 'Command Bar', family: 'card' },
    { id: 'premium-composer', label: 'Premium Composer', family: 'card' },
    { id: 'compact', label: 'Compact', family: 'pill' },
    { id: 'card-composer', label: 'Card Composer', family: 'card' },
    { id: 'glass-composer', label: 'Glass Composer', family: 'glass' },
  ],

  sendButtons: [
    { id: 'circle', label: 'Circle', family: 'circle', featured: true },
    { id: 'square', label: 'Square', family: 'square', featured: true },
    { id: 'text', label: 'Text', family: 'text', featured: true },
    { id: 'send-arrow', label: 'Arrow', family: 'arrow' },
    { id: 'send-plane', label: 'Paper Plane', family: 'arrow' },
    { id: 'send-chevron', label: 'Chevron', family: 'arrow' },
    { id: 'send-pulse', label: 'Pulse', family: 'circle' },
    { id: 'send-filled', label: 'Filled', family: 'text' },
    { id: 'send-outline', label: 'Outline', family: 'square' },
    { id: 'send-icon-only', label: 'Icon Only', family: 'circle' },
    { id: 'send-lift', label: 'Lift', family: 'text' },
    { id: 'send-circle', label: 'Circle', family: 'circle' },
    { id: 'send-square', label: 'Square', family: 'square' },
    { id: 'send-glow', label: 'Glow', family: 'circle' },
    { id: 'send-ghost', label: 'Ghost', family: 'square' },
    { id: 'send-compact', label: 'Compact', family: 'circle' },
    { id: 'send-rail', label: 'Rail', family: 'square' },
    { id: 'send-premium', label: 'Premium', family: 'text' },
  ],

  headers: [
    { id: 'siteaware-official', label: 'SiteAware Official', family: 'official', featured: true },
    { id: 'minimal', label: 'Minimal Header', family: 'minimal', featured: true },
    { id: 'avatar', label: 'Avatar Header', family: 'avatar', featured: true },
    { id: 'status', label: 'Status Header', family: 'status', featured: true },
    { id: 'subtitle', label: 'Subtitle Header', family: 'subtitle', featured: true },
    { id: 'actions', label: 'Actions Header', family: 'actions', featured: true },
    { id: 'header-minimal', label: 'Minimal Header', family: 'minimal' },
    { id: 'header-avatar', label: 'Avatar Header', family: 'avatar' },
    { id: 'header-status', label: 'Status Header', family: 'status' },
    { id: 'header-subtitle', label: 'Subtitle Header', family: 'subtitle' },
    { id: 'header-actions', label: 'Actions Header', family: 'actions' },
    { id: 'header-close', label: 'Close/Minimize', family: 'actions' },
    { id: 'header-enterprise', label: 'Enterprise Header', family: 'actions' },
    { id: 'header-soft', label: 'Soft Header', family: 'subtitle' },
    { id: 'header-premium', label: 'Premium Header', family: 'official' },
    { id: 'header-docked', label: 'Docked Header', family: 'official' },
  ],

  sourceCitations: [
    { id: 'compact', label: 'Compact', family: 'inline', featured: true },
    { id: 'source-inline-badge', label: 'Inline Badge', family: 'inline' },
    { id: 'source-chips', label: 'Source Chips', family: 'chips' },
    { id: 'source-expanding-card', label: 'Expandable Card', family: 'chips' },
    { id: 'source-numbered', label: 'Numbered Citations', family: 'numbered' },
    { id: 'source-urls', label: 'Compact URLs', family: 'numbered' },
    { id: 'source-evidence', label: 'Evidence List', family: 'numbered' },
    { id: 'source-footer', label: 'Source Footer', family: 'footer' },
    { id: 'source-doc-page', label: 'Document/Page Cards', family: 'chips' },
  ],

  takeMeThere: [
    { id: 'link', label: 'Text Link', family: 'link', featured: true },
    { id: 'cta-primary', label: 'Primary Button', family: 'button' },
    { id: 'cta-link', label: 'Text Link', family: 'link' },
    { id: 'cta-arrow', label: 'Arrow Action', family: 'arrow' },
    { id: 'cta-chip', label: 'Compact Chip', family: 'chip' },
    { id: 'cta-destination-card', label: 'Destination Card', family: 'button' },
    { id: 'cta-highlighted', label: 'Highlighted CTA', family: 'button' },
    { id: 'cta-icon-only', label: 'Icon Only', family: 'arrow' },
    { id: 'cta-inline-nav', label: 'Inline Navigation', family: 'chip' },
    { id: 'cta-premium', label: 'Premium CTA', family: 'button' },
    { id: 'cta-subtle', label: 'Subtle Secondary', family: 'link' },
  ],

  // Themes are palette presets that map to appearance color tokens, exactly
  // like the Web Studio's themePalettes. Applying a theme only writes colors,
  // never component ids.
  themes: [
    { id: 'siteaware-default', label: 'SiteAware Default', mode: 'dark', primary: '#7cc8ff', background: '#08111f', surface: '#0f192b', text: '#f6f9ff', muted: '#aebdde', border: 'rgba(150,185,255,0.14)' },
    { id: 'neutral-light', label: 'Neutral Light', mode: 'light', primary: '#2563eb', background: '#f5f7fb', surface: '#ffffff', text: '#101828', muted: '#5b6476', border: 'rgba(16,24,40,0.12)' },
    { id: 'dark', label: 'Dark', mode: 'dark', primary: '#8ad3ff', background: '#05070c', surface: '#0c1119', text: '#f7f9ff', muted: '#98a2b3', border: 'rgba(255,255,255,0.08)' },
    { id: 'midnight', label: 'Midnight', mode: 'dark', primary: '#72c7ff', background: '#07101e', surface: '#0e1828', text: '#f4f8ff', muted: '#a4b4cf', border: 'rgba(130,190,255,0.12)' },
    { id: 'blue-saas', label: 'Blue SaaS', mode: 'dark', primary: '#4fa3ff', background: '#08111b', surface: '#102036', text: '#f6fbff', muted: '#bdd0e6', border: 'rgba(104,163,255,0.16)' },
    { id: 'purple-ai', label: 'Purple AI', mode: 'dark', primary: '#b18cff', background: '#100a1d', surface: '#1a1231', text: '#faf7ff', muted: '#c8bfe5', border: 'rgba(177,140,255,0.16)' },
    { id: 'emerald', label: 'Emerald', mode: 'dark', primary: '#53d79a', background: '#06110e', surface: '#0d1b17', text: '#f4fff9', muted: '#a4c3b5', border: 'rgba(83,215,154,0.16)' },
    { id: 'warm-beige', label: 'Warm Beige', mode: 'dark', primary: '#f0b26f', background: '#15110d', surface: '#221c16', text: '#fff8ef', muted: '#d6c3ad', border: 'rgba(240,178,111,0.16)' },
    { id: 'graphite', label: 'Graphite', mode: 'dark', primary: '#94a3b8', background: '#0a0d12', surface: '#11151c', text: '#f4f7fc', muted: '#9da8ba', border: 'rgba(148,163,184,0.18)' },
    { id: 'healthcare', label: 'Healthcare', mode: 'dark', primary: '#55c7d8', background: '#061216', surface: '#0e1b20', text: '#f2fbfd', muted: '#a7c2c9', border: 'rgba(85,199,216,0.16)' },
    { id: 'education', label: 'Education', mode: 'dark', primary: '#5f89ff', background: '#07101b', surface: '#111c2e', text: '#f7fbff', muted: '#b7c4d8', border: 'rgba(95,137,255,0.16)' },
    { id: 'premium-black', label: 'Premium Black', mode: 'dark', primary: '#d8b16a', background: '#050507', surface: '#101013', text: '#fffdf8', muted: '#b5b5bd', border: 'rgba(216,177,106,0.18)' },
  ],
};

// ---------------------------------------------------------------------------
// Default configuration. Premium by default: the official SiteAware mark,
// an official premium launcher and chat shell, calm neutral-light palette,
// launcher docked bottom-left so it never covers the right-hand side panel.
// ---------------------------------------------------------------------------
export const defaultWidgetConfig = {
  version: 1,
  locale: 'ar',
  direction: 'rtl',
  previewOpen: true,
  assistantName: 'SiteAware',
  assistantIcon: 'siteaware-official',
  launcher: 'minimal-floating',
  chatShell: 'minimal-saas',
  header: 'minimal',
  assistantMessage: 'clean-card',
  userMessage: 'solid',
  inputBar: 'pill',
  sendButton: 'circle',
  sourceCitation: 'compact',
  takeMeThere: 'link',
  theme: 'neutral-light',
  appearance: {
    primaryColor: '#2563eb',
    surfaceColor: '#ffffff',
    backgroundColor: '#f5f7fb',
    textColor: '#101828',
    mutedTextColor: '#5b6476',
    borderColor: 'rgba(16, 24, 40, 0.12)',
    radius: 'lg',
    widgetWidth: 520,
    widgetHeight: 440,
    shadowStrength: 0.38,
    launcherSize: 'md',
    launcherPosition: 'bottom-left',
    density: 'comfortable',
    fontScale: 1,
  },
};

// Lookup from an id to its catalog entry (or undefined). Reads from any
// category, which lets validators and the renderer resolve families without
// hand-maintained id lists.
export function resolveCatalogItem(category, id) {
  const items = catalog[category];
  return Array.isArray(items) ? items.find((item) => item.id === id) : undefined;
}

export function catalogIds() {
  return {
    icons: catalog.icons.map((item) => item.id),
    launchers: catalog.launchers.map((item) => item.id),
    chatShells: catalog.chatShells.map((item) => item.id),
    messageStyles: catalog.messageStyles.map((item) => item.id),
    userMessages: catalog.userMessages.map((item) => item.id),
    inputBars: catalog.inputBars.map((item) => item.id),
    sendButtons: catalog.sendButtons.map((item) => item.id),
    headers: catalog.headers.map((item) => item.id),
    sourceCitations: catalog.sourceCitations.map((item) => item.id),
    takeMeThere: catalog.takeMeThere.map((item) => item.id),
    themes: catalog.themes.map((item) => item.id),
  };
}

// Build the compact "available catalog" object that the AI designer receives:
// ids + labels + families only, no preview markup and no secrets.
export function aiCatalogSummary() {
  return {
    icons: catalog.icons.map(({ id, label, family }) => ({ id, label, family })),
    launchers: catalog.launchers.map(({ id, label, family }) => ({ id, label, family })),
    chatShells: catalog.chatShells.map(({ id, label, family }) => ({ id, label, family })),
    messageStyles: catalog.messageStyles.map(({ id, label, family }) => ({ id, label, family })),
    userMessages: catalog.userMessages.map(({ id, label, family }) => ({ id, label, family })),
    inputBars: catalog.inputBars.map(({ id, label, family }) => ({ id, label, family })),
    sendButtons: catalog.sendButtons.map(({ id, label, family }) => ({ id, label, family })),
    headers: catalog.headers.map(({ id, label, family }) => ({ id, label, family })),
    sourceCitations: catalog.sourceCitations.map(({ id, label, family }) => ({ id, label, family })),
    takeMeThere: catalog.takeMeThere.map(({ id, label, family }) => ({ id, label, family })),
    themes: catalog.themes.map(({ id, label, mode }) => ({ id, label, mode })),
    radius: ['sm', 'md', 'lg', 'xl'],
    density: ['compact', 'comfortable', 'spacious'],
    launcherSize: ['sm', 'md', 'lg'],
    launcherPosition: ['bottom-right', 'bottom-left', 'left-edge', 'right-edge'],
  };
}

const RADIUS_OPTIONS = ['sm', 'md', 'lg', 'xl'];
const DENSITY_OPTIONS = ['compact', 'comfortable', 'spacious'];
const SIZE_OPTIONS = ['sm', 'md', 'lg'];
const POSITION_OPTIONS = ['bottom-right', 'bottom-left', 'left-edge', 'right-edge'];

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function safeColor(value, fallback) {
  const text = String(value ?? '').trim();
  if (/^#[0-9a-f]{3,8}$/i.test(text) || /^rgba?\([^)]+\)$/i.test(text)) {
    return text;
  }
  return fallback;
}

function pickId(value, category, fallback) {
  return resolveCatalogItem(category, value) ? value : fallback;
}

// Validate + normalize any incoming config (from storage, from a message, or
// from an AI design patch). Unknown ids and out-of-range values fall back to
// safe defaults. This is the single trust boundary for configuration.
export function sanitizeWidgetConfig(input = {}) {
  const base = structuredClone(defaultWidgetConfig);
  const next = { ...base, ...(input && typeof input === 'object' ? input : {}) };
  const appearance = { ...base.appearance, ...(next.appearance && typeof next.appearance === 'object' ? next.appearance : {}) };

  next.assistantIcon = pickId(next.assistantIcon, 'icons', base.assistantIcon);
  next.launcher = pickId(next.launcher, 'launchers', base.launcher);
  next.chatShell = pickId(next.chatShell, 'chatShells', base.chatShell);
  next.header = pickId(next.header, 'headers', base.header);
  next.assistantMessage = pickId(next.assistantMessage, 'messageStyles', base.assistantMessage);
  next.userMessage = pickId(next.userMessage, 'userMessages', base.userMessage);
  next.inputBar = pickId(next.inputBar, 'inputBars', base.inputBar);
  next.sendButton = pickId(next.sendButton, 'sendButtons', base.sendButton);
  next.sourceCitation = pickId(next.sourceCitation, 'sourceCitations', base.sourceCitation);
  next.takeMeThere = pickId(next.takeMeThere, 'takeMeThere', base.takeMeThere);
  next.theme = pickId(next.theme, 'themes', base.theme);

  next.locale = next.locale === 'en' ? 'en' : 'ar';
  next.direction = next.direction === 'ltr' ? 'ltr' : 'rtl';
  next.assistantName = String(next.assistantName ?? base.assistantName).replace(/[\r\n\t]/g, ' ').trim().slice(0, 48) || base.assistantName;
  next.previewOpen = Boolean(next.previewOpen);

  next.appearance = {
    ...appearance,
    primaryColor: safeColor(appearance.primaryColor, base.appearance.primaryColor),
    surfaceColor: safeColor(appearance.surfaceColor, base.appearance.surfaceColor),
    backgroundColor: safeColor(appearance.backgroundColor, base.appearance.backgroundColor),
    textColor: safeColor(appearance.textColor, base.appearance.textColor),
    mutedTextColor: safeColor(appearance.mutedTextColor, base.appearance.mutedTextColor),
    borderColor: safeColor(appearance.borderColor, base.appearance.borderColor),
    radius: RADIUS_OPTIONS.includes(appearance.radius) ? appearance.radius : base.appearance.radius,
    widgetWidth: clampNumber(appearance.widgetWidth, 320, 520, base.appearance.widgetWidth),
    widgetHeight: clampNumber(appearance.widgetHeight, 440, 760, base.appearance.widgetHeight),
    shadowStrength: clampNumber(appearance.shadowStrength, 0, 1, base.appearance.shadowStrength),
    launcherSize: SIZE_OPTIONS.includes(appearance.launcherSize) ? appearance.launcherSize : base.appearance.launcherSize,
    launcherPosition: POSITION_OPTIONS.includes(appearance.launcherPosition) ? appearance.launcherPosition : base.appearance.launcherPosition,
    density: DENSITY_OPTIONS.includes(appearance.density) ? appearance.density : base.appearance.density,
    fontScale: clampNumber(appearance.fontScale, 0.9, 1.12, base.appearance.fontScale),
  };

  return next;
}

// Deterministic, offline mapping from a SiteDesignProfile into a valid config.
// No Gemini involved. It harmonizes colors, radius, direction and mode with
// the detected site without copying it verbatim.
export function configFromDesignProfile(profile = {}) {
  const base = structuredClone(defaultWidgetConfig);
  const palette = profile.palette || {};
  const primary = palette.primary?.value || profile.primary || profile.brandColors?.[0] || base.appearance.primaryColor;
  const isDark = profile.mode === 'dark' || profile.themeMode === 'dark';
  const radius = palette.shapeRadius ?? profile.shape?.radius ?? profile.radius ?? 14;

  return sanitizeWidgetConfig({
    ...base,
    direction: profile.direction === 'ltr' ? 'ltr' : 'rtl',
    theme: isDark ? 'siteaware-default' : 'neutral-light',
    chatShell: isDark ? 'premium-dark' : 'siteaware-official',
    launcher: isDark ? 'ai-orb' : 'siteaware-official',
    header: isDark ? 'status' : 'siteaware-official',
    assistantMessage: isDark ? 'glass' : 'clean-card',
    userMessage: isDark ? 'glass' : 'solid',
    inputBar: isDark ? 'glass' : 'pill',
    sendButton: 'circle',
    appearance: {
      ...base.appearance,
      primaryColor: primary,
      surfaceColor: palette.surface?.value || profile.surface || (isDark ? '#0f192b' : '#ffffff'),
      backgroundColor: palette.background?.value || profile.background || (isDark ? '#08111f' : '#f5f7fb'),
      textColor: palette.foreground?.value || profile.text || (isDark ? '#f8fafc' : '#101828'),
      mutedTextColor: palette.muted?.value || profile.mutedText || (isDark ? '#a6b1c2' : '#5b6476'),
      borderColor: palette.border?.value || profile.border || (isDark ? '#263244' : 'rgba(16, 24, 40, 0.12)'),
      radius: radius >= 22 ? 'xl' : radius >= 14 ? 'lg' : radius >= 8 ? 'md' : 'sm',
      launcherPosition: 'bottom-left',
    },
  });
}

// Apply the safe AI design patch. Only catalog-backed ids and bounded numeric
// fields are accepted; anything else is dropped. Returns a sanitized config.
export function applyDesignPatch(config, patch = {}) {
  const base = sanitizeWidgetConfig(config);
  if (!patch || typeof patch !== 'object') {
    return base;
  }
  const next = { ...base };
  const idFields = [
    ['assistantIcon', 'icons'],
    ['launcher', 'launchers'],
    ['chatShell', 'chatShells'],
    ['header', 'headers'],
    ['assistantMessage', 'messageStyles'],
    ['userMessage', 'userMessages'],
    ['inputBar', 'inputBars'],
    ['sendButton', 'sendButtons'],
    ['sourceCitation', 'sourceCitations'],
    ['takeMeThere', 'takeMeThere'],
    ['theme', 'themes'],
  ];
  for (const [field, category] of idFields) {
    if (typeof patch[field] === 'string' && resolveCatalogItem(category, patch[field])) {
      next[field] = patch[field];
    }
  }
  if (patch.locale === 'en' || patch.locale === 'ar') {
    next.locale = patch.locale;
  }
  if (patch.direction === 'ltr' || patch.direction === 'rtl') {
    next.direction = patch.direction;
  }
  if (typeof patch.previewOpen === 'boolean') {
    next.previewOpen = patch.previewOpen;
  }

  const app = patch.appearance && typeof patch.appearance === 'object' ? patch.appearance : {};
  const a = { ...next.appearance };
  if (typeof app.radius === 'string' && RADIUS_OPTIONS.includes(app.radius)) a.radius = app.radius;
  if (typeof app.density === 'string' && DENSITY_OPTIONS.includes(app.density)) a.density = app.density;
  if (typeof app.launcherSize === 'string' && SIZE_OPTIONS.includes(app.launcherSize)) a.launcherSize = app.launcherSize;
  if (typeof app.launcherPosition === 'string' && POSITION_OPTIONS.includes(app.launcherPosition)) a.launcherPosition = app.launcherPosition;
  if (typeof app.primaryColor === 'string' && /^#[0-9a-f]{6}$/i.test(app.primaryColor.trim())) a.primaryColor = app.primaryColor.trim();
  if (typeof app.surfaceColor === 'string' && /^#[0-9a-f]{6}$/i.test(app.surfaceColor.trim())) a.surfaceColor = app.surfaceColor.trim();
  if (typeof app.backgroundColor === 'string' && /^#[0-9a-f]{6}$/i.test(app.backgroundColor.trim())) a.backgroundColor = app.backgroundColor.trim();
  if (typeof app.textColor === 'string' && /^#[0-9a-f]{6}$/i.test(app.textColor.trim())) a.textColor = app.textColor.trim();
  if (typeof app.mutedTextColor === 'string' && /^#[0-9a-f]{6}$/i.test(app.mutedTextColor.trim())) a.mutedTextColor = app.mutedTextColor.trim();
  if (typeof app.borderColor === 'string' && /^#[0-9a-f]{3,8}$/i.test(String(app.borderColor).trim())) a.borderColor = String(app.borderColor).trim();
  if (typeof app.widgetWidth === 'number') a.widgetWidth = clampNumber(Math.round(app.widgetWidth), 320, 520, a.widgetWidth);
  if (typeof app.widgetHeight === 'number') a.widgetHeight = clampNumber(Math.round(app.widgetHeight), 440, 760, a.widgetHeight);
  if (typeof app.shadowStrength === 'number') a.shadowStrength = clampNumber(Number(app.shadowStrength.toFixed(2)), 0, 1, a.shadowStrength);
  if (typeof app.fontScale === 'number') a.fontScale = clampNumber(Number(app.fontScale.toFixed(2)), 0.9, 1.12, a.fontScale);

  return sanitizeWidgetConfig({ ...next, appearance: a });
}

// ---------------------------------------------------------------------------
// Theme palettes -> appearance color tokens. A theme is only ever colors; it
// never mutates component ids. Border colors may be rgba() so they are NOT
// hex-only validated here, but they are still sanitized by sanitizeWidgetConfig.
// ---------------------------------------------------------------------------
export function themeAppearance(themeId, baseAppearance = {}) {
  const theme = resolveCatalogItem('themes', themeId);
  const a = { ...baseAppearance };
  if (!theme) {
    return a;
  }
  return {
    ...a,
    primaryColor: theme.primary,
    surfaceColor: hexOr(theme.surface, a.surfaceColor),
    backgroundColor: hexOr(theme.background, a.backgroundColor),
    textColor: hexOr(theme.text, a.textColor),
    mutedTextColor: hexOr(theme.muted, a.mutedTextColor),
    borderColor: theme.border,
  };
}

function hexOr(value, fallback) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;
}

// Curated complete assistant templates (parity with the Web Studio presets).
// Each `config` is a partial merged over defaultWidgetConfig; ids all resolve
// through the shared catalog so applying is always valid.
export const presets = [
  {
    id: 'siteaware-official',
    label: 'SiteAware Official',
    note: 'Premium baseline',
    config: (() => sanitizeWidgetConfig(defaultWidgetConfig))(),
  },
  {
    id: 'apple-calm',
    label: 'Apple Calm',
    note: 'Quiet editorial',
    config: () => ({
      assistantIcon: 'siteaware-minimal',
      launcher: 'minimal-floating',
      chatShell: 'siteaware-official',
      header: 'minimal',
      assistantMessage: 'flat-text',
      userMessage: 'outline',
      inputBar: 'pill',
      sendButton: 'circle',
      sourceCitation: 'source-footer',
      takeMeThere: 'cta-link',
      theme: 'neutral-light',
      appearance: { radius: 'lg', widgetWidth: 408, widgetHeight: 640, density: 'comfortable', fontScale: 1, shadowStrength: 0.55, launcherSize: 'md', launcherPosition: 'bottom-left', primaryColor: '#111111', surfaceColor: '#ffffff', backgroundColor: '#f5f7fb', textColor: '#101828', mutedTextColor: '#5b6476', borderColor: 'rgba(16,24,40,0.12)' },
    }),
  },
  {
    id: 'copilot-dock',
    label: 'Copilot Dock',
    note: 'Structured side assistant',
    config: () => ({
      assistantIcon: 'star-03',
      launcher: 'circle-icon',
      chatShell: 'compact-copilot',
      header: 'actions',
      assistantMessage: 'modern-saas',
      userMessage: 'bubble-rounded',
      inputBar: 'command-bar',
      sendButton: 'send-circle',
      sourceCitation: 'source-chips',
      takeMeThere: 'cta-primary',
      theme: 'graphite',
      appearance: { radius: 'md', widgetWidth: 420, widgetHeight: 680, density: 'comfortable', fontScale: 1, shadowStrength: 0.7, launcherSize: 'md', launcherPosition: 'bottom-left', primaryColor: '#94a3b8', surfaceColor: '#11151c', backgroundColor: '#0a0d12', textColor: '#f4f7fc', mutedTextColor: '#9da8ba', borderColor: 'rgba(148,163,184,0.18)' },
    }),
  },
  {
    id: 'claude-editorial',
    label: 'Claude Editorial',
    note: 'Warm focused composer',
    config: () => ({
      assistantIcon: 'glyph-19',
      launcher: 'pill-label',
      chatShell: 'soft-assistant',
      header: 'minimal',
      assistantMessage: 'flat-text',
      userMessage: 'outline',
      inputBar: 'composer-card',
      sendButton: 'send-arrow',
      sourceCitation: 'source-footer',
      takeMeThere: 'cta-link',
      theme: 'neutral-light',
      appearance: { radius: 'lg', widgetWidth: 430, widgetHeight: 660, density: 'spacious', fontScale: 1.02, shadowStrength: 0.38, launcherSize: 'md', launcherPosition: 'bottom-left', primaryColor: '#b35c37', surfaceColor: '#ffffff', backgroundColor: '#f5f7fb', textColor: '#101828', mutedTextColor: '#5b6476', borderColor: 'rgba(16,24,40,0.12)' },
    }),
  },
  {
    id: 'gemini-glass',
    label: 'Gemini Glass',
    note: 'Layered glass surfaces',
    config: () => ({
      assistantIcon: 'sphere-16',
      launcher: 'ai-orb',
      chatShell: 'liquid-glass',
      header: 'subtitle',
      assistantMessage: 'card',
      userMessage: 'bubble-rounded',
      inputBar: 'glass',
      sendButton: 'send-circle',
      sourceCitation: 'source-chips',
      takeMeThere: 'cta-chip',
      theme: 'neutral-light',
      appearance: { radius: 'xl', widgetWidth: 430, widgetHeight: 660, density: 'comfortable', fontScale: 1, shadowStrength: 0.6, launcherSize: 'md', launcherPosition: 'bottom-left', primaryColor: '#4285f4', surfaceColor: '#ffffff', backgroundColor: '#f5f7fb', textColor: '#101828', mutedTextColor: '#5b6476', borderColor: 'rgba(16,24,40,0.12)' },
    }),
  },
  {
    id: 'clean-saas',
    label: 'Clean SaaS',
    note: 'Bright product dashboard',
    config: () => ({
      assistantIcon: 'sphere-16',
      launcher: 'minimal-floating',
      chatShell: 'minimal-saas',
      header: 'actions',
      assistantMessage: 'modern-saas',
      userMessage: 'pill',
      inputBar: 'command-bar',
      sendButton: 'send-filled',
      sourceCitation: 'source-inline-badge',
      takeMeThere: 'cta-arrow',
      theme: 'blue-saas',
      appearance: { radius: 'lg', widgetWidth: 420, widgetHeight: 620, density: 'comfortable', fontScale: 1, shadowStrength: 0.8, launcherSize: 'md', launcherPosition: 'bottom-left', primaryColor: '#4fa3ff', surfaceColor: '#102036', backgroundColor: '#08111b', textColor: '#f6fbff', mutedTextColor: '#bdd0e6', borderColor: 'rgba(104,163,255,0.16)' },
    }),
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    note: 'Structured and formal',
    config: () => ({
      assistantIcon: 'shield-15',
      launcher: 'minimal-floating',
      chatShell: 'enterprise',
      header: 'actions',
      assistantMessage: 'structured',
      userMessage: 'outline',
      inputBar: 'bordered-input',
      sendButton: 'send-outline',
      sourceCitation: 'source-evidence',
      takeMeThere: 'cta-inline-nav',
      theme: 'graphite',
      appearance: { radius: 'md', widgetWidth: 440, widgetHeight: 640, density: 'compact', fontScale: 0.98, shadowStrength: 0.7, launcherSize: 'md', launcherPosition: 'bottom-left', primaryColor: '#94a3b8', surfaceColor: '#11151c', backgroundColor: '#0a0d12', textColor: '#f4f7fc', mutedTextColor: '#9da8ba', borderColor: 'rgba(148,163,184,0.18)' },
    }),
  },
  {
    id: 'dark-ai',
    label: 'Dark AI',
    note: 'High contrast futuristic',
    config: () => ({
      assistantIcon: 'premium-20',
      launcher: 'ai-orb',
      chatShell: 'premium-dark',
      header: 'status',
      assistantMessage: 'glass',
      userMessage: 'glass',
      inputBar: 'glass',
      sendButton: 'send-glow',
      sourceCitation: 'source-doc-page',
      takeMeThere: 'cta-premium',
      theme: 'premium-black',
      appearance: { radius: 'xl', widgetWidth: 430, widgetHeight: 640, density: 'comfortable', fontScale: 1.02, shadowStrength: 1, launcherSize: 'lg', launcherPosition: 'bottom-left', primaryColor: '#d8b16a', surfaceColor: '#101013', backgroundColor: '#050507', textColor: '#fffdf8', mutedTextColor: '#b5b5bd', borderColor: 'rgba(216,177,106,0.18)' },
    }),
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    note: 'Calm and trustworthy',
    config: () => ({
      assistantIcon: 'shield-15',
      launcher: 'status-dot',
      chatShell: 'soft-assistant',
      header: 'status',
      assistantMessage: 'bordered-card',
      userMessage: 'outline',
      inputBar: 'classic-input',
      sendButton: 'send-compact',
      sourceCitation: 'source-numbered',
      takeMeThere: 'cta-highlighted',
      theme: 'healthcare',
      appearance: { radius: 'lg', widgetWidth: 420, widgetHeight: 620, density: 'comfortable', fontScale: 1, shadowStrength: 0.8, launcherSize: 'md', launcherPosition: 'bottom-left', primaryColor: '#55c7d8', surfaceColor: '#0e1b20', backgroundColor: '#061216', textColor: '#f2fbfd', mutedTextColor: '#a7c2c9', borderColor: 'rgba(85,199,216,0.16)' },
    }),
  },
  {
    id: 'education',
    label: 'Education',
    note: 'Campus portal friendly',
    config: () => ({
      assistantIcon: 'nodes-04',
      launcher: 'floating-label',
      chatShell: 'minimal-saas',
      header: 'subtitle',
      assistantMessage: 'source-first',
      userMessage: 'pill',
      inputBar: 'composer-card',
      sendButton: 'send-lift',
      sourceCitation: 'source-doc-page',
      takeMeThere: 'cta-subtle',
      theme: 'education',
      appearance: { radius: 'lg', widgetWidth: 440, widgetHeight: 650, density: 'comfortable', fontScale: 1, shadowStrength: 0.85, launcherSize: 'md', launcherPosition: 'bottom-left', primaryColor: '#5f89ff', surfaceColor: '#111c2e', backgroundColor: '#07101b', textColor: '#f7fbff', mutedTextColor: '#b7c4d8', borderColor: 'rgba(95,137,255,0.16)' },
    }),
  },
];

// Resolve a preset into a fully sanitized config.
export function presetConfig(presetId) {
  const preset = presets.find((item) => item.id === presetId);
  if (!preset) {
    return sanitizeWidgetConfig(defaultWidgetConfig);
  }
  const partial = typeof preset.config === 'function' ? preset.config() : preset.config;
  return sanitizeWidgetConfig(partial || {});
}