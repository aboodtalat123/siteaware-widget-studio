export const defaultWidgetConfig = {
  version: 1,
  locale: 'ar',
  direction: 'rtl',
  previewOpen: true,
  assistantIcon: 'spark-02',
  launcher: 'glass-launcher',
  chatShell: 'copilot-dock',
  header: 'minimal',
  assistantMessage: 'clean-card',
  userMessage: 'solid',
  inputBar: 'pill',
  sendButton: 'circle',
  sourceCitation: 'compact',
  takeMeThere: 'link',
  appearance: {
    primaryColor: '#2563eb',
    surfaceColor: '#ffffff',
    backgroundColor: '#f7f9fc',
    textColor: '#111827',
    mutedTextColor: '#667085',
    borderColor: '#d8dee9',
    radius: 'lg',
    widgetWidth: 404,
    widgetHeight: 680,
    shadowStrength: 0.38,
    launcherSize: 'md',
    launcherPosition: 'bottom-right',
  },
};

export const catalog = {
  icons: [
    { id: 'spark-02', label: 'Spark', glyph: '✦' },
    { id: 'orb-01', label: 'Orb', glyph: '●' },
    { id: 'halo-07', label: 'Halo', glyph: '◎' },
    { id: 'bot-06', label: 'Bot', glyph: 'AI' },
    { id: 'shield-15', label: 'Shield', glyph: '◆' },
    { id: 'sphere-16', label: 'Sphere', glyph: '◉' },
    { id: 'glyph-19', label: 'Glyph', glyph: '✧' },
    { id: 'premium-20', label: 'Premium', glyph: 'S' },
  ],
  launchers: [
    { id: 'circle-icon', label: 'Circle' },
    { id: 'glass-launcher', label: 'Glass' },
    { id: 'floating-orb', label: 'Orb' },
    { id: 'pill-label', label: 'Pill' },
    { id: 'minimal-outline', label: 'Outline' },
    { id: 'vertical-edge-tab', label: 'Edge Tab' },
  ],
  chatShells: [
    { id: 'copilot-dock', label: 'Copilot Dock' },
    { id: 'liquid-glass', label: 'Apple Glass' },
    { id: 'chatgpt-minimal', label: 'ChatGPT' },
    { id: 'claude-editorial', label: 'Claude' },
    { id: 'gemini-glow', label: 'Gemini' },
    { id: 'enterprise-panel', label: 'Enterprise' },
  ],
  messageStyles: [
    { id: 'clean-card', label: 'Clean Card' },
    { id: 'flat-text', label: 'Flat Text' },
    { id: 'glass', label: 'Glass' },
    { id: 'compact', label: 'Compact' },
  ],
  inputBars: [
    { id: 'pill', label: 'Pill' },
    { id: 'glass', label: 'Glass' },
    { id: 'composer-card', label: 'Card' },
  ],
  sendButtons: [
    { id: 'circle', label: 'Circle' },
    { id: 'square', label: 'Square' },
    { id: 'text', label: 'Text' },
  ],
};

export function sanitizeWidgetConfig(input = {}) {
  const base = structuredClone(defaultWidgetConfig);
  const next = { ...base, ...input };
  const appearance = { ...base.appearance, ...(input.appearance || {}) };
  const allowed = {
    assistantIcon: new Set(catalog.icons.map((item) => item.id)),
    launcher: new Set(catalog.launchers.map((item) => item.id)),
    chatShell: new Set(catalog.chatShells.map((item) => item.id)),
    assistantMessage: new Set(catalog.messageStyles.map((item) => item.id)),
    userMessage: new Set(catalog.messageStyles.map((item) => item.id).concat('solid')),
    inputBar: new Set(catalog.inputBars.map((item) => item.id)),
    sendButton: new Set(catalog.sendButtons.map((item) => item.id)),
  };

  for (const [key, ids] of Object.entries(allowed)) {
    if (!ids.has(next[key])) {
      next[key] = base[key];
    }
  }

  next.locale = next.locale === 'en' ? 'en' : 'ar';
  next.direction = next.direction === 'ltr' ? 'ltr' : 'rtl';
  next.previewOpen = Boolean(next.previewOpen);
  next.appearance = {
    ...appearance,
    primaryColor: safeColor(appearance.primaryColor, base.appearance.primaryColor),
    surfaceColor: safeColor(appearance.surfaceColor, base.appearance.surfaceColor),
    backgroundColor: safeColor(appearance.backgroundColor, base.appearance.backgroundColor),
    textColor: safeColor(appearance.textColor, base.appearance.textColor),
    mutedTextColor: safeColor(appearance.mutedTextColor, base.appearance.mutedTextColor),
    borderColor: safeColor(appearance.borderColor, base.appearance.borderColor),
    radius: ['sm', 'md', 'lg', 'xl'].includes(appearance.radius) ? appearance.radius : base.appearance.radius,
    widgetWidth: clampNumber(appearance.widgetWidth, 320, 520, base.appearance.widgetWidth),
    widgetHeight: clampNumber(appearance.widgetHeight, 440, 760, base.appearance.widgetHeight),
    shadowStrength: clampNumber(appearance.shadowStrength, 0, 1, base.appearance.shadowStrength),
    launcherSize: ['sm', 'md', 'lg'].includes(appearance.launcherSize) ? appearance.launcherSize : base.appearance.launcherSize,
    launcherPosition: ['bottom-right', 'bottom-left', 'left-edge', 'right-edge'].includes(appearance.launcherPosition)
      ? appearance.launcherPosition
      : base.appearance.launcherPosition,
  };
  return next;
}

export function configFromDesignProfile(profile = {}) {
  const base = structuredClone(defaultWidgetConfig);
  const primary = profile.primary || profile.brandColors?.[0] || base.appearance.primaryColor;
  const isDark = profile.themeMode === 'dark';
  return sanitizeWidgetConfig({
    ...base,
    direction: profile.direction === 'ltr' ? 'ltr' : 'rtl',
    chatShell: isDark ? 'gemini-glow' : 'liquid-glass',
    launcher: isDark ? 'floating-orb' : 'glass-launcher',
    assistantMessage: isDark ? 'glass' : 'clean-card',
    inputBar: isDark ? 'glass' : 'pill',
    appearance: {
      ...base.appearance,
      primaryColor: primary,
      surfaceColor: profile.surface || (isDark ? '#101827' : '#ffffff'),
      backgroundColor: profile.background || (isDark ? '#0b1020' : '#f8fafc'),
      textColor: profile.text || (isDark ? '#f8fafc' : '#111827'),
      mutedTextColor: profile.mutedText || (isDark ? '#a6b1c2' : '#667085'),
      borderColor: profile.border || (isDark ? '#263244' : '#dde3eb'),
      radius: profile.radius >= 22 ? 'xl' : profile.radius >= 14 ? 'lg' : profile.radius >= 8 ? 'md' : 'sm',
      launcherPosition: 'bottom-right',
    },
  });
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function safeColor(value, fallback) {
  const text = String(value || '').trim();
  if (/^#[0-9a-f]{3,8}$/i.test(text) || /^rgba?\([^)]+\)$/i.test(text)) {
    return text;
  }
  return fallback;
}
