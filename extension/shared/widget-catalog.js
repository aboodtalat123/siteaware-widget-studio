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
    launcherPosition: 'bottom-left',
  },
};

export const catalog = {
  icons: [
    { id: 'siteaware-official', label: 'Official', glyph: 'SA', featured: true },
    { id: 'siteaware-glass', label: 'Glass Mark', glyph: 'S', featured: true },
    { id: 'siteaware-minimal', label: 'Minimal', glyph: 'S', featured: true },
    { id: 'siteaware-soft', label: 'Soft', glyph: '◎', featured: true },
    { id: 'siteaware-dark', label: 'Dark', glyph: 'SA', featured: true },
    { id: 'spark-02', label: 'Alt Spark', glyph: '✦' },
    { id: 'orb-01', label: 'Alt Orb', glyph: '●' },
    { id: 'shield-15', label: 'Alt Shield', glyph: '◆' },
  ],
  launchers: [
    { id: 'minimal-floating', label: 'Minimal Floating', featured: true },
    { id: 'soft-glass', label: 'Soft Glass', featured: true },
    { id: 'liquid-launcher', label: 'Liquid Glass', featured: true },
    { id: 'compact-pill', label: 'Compact Pill', featured: true },
    { id: 'ai-orb', label: 'AI Orb', featured: true },
    { id: 'docked-tab', label: 'Docked Tab', featured: true },
    { id: 'circle-icon', label: 'Classic Circle' },
    { id: 'glass-launcher', label: 'Classic Glass' },
    { id: 'floating-orb', label: 'Classic Orb' },
    { id: 'pill-label', label: 'Classic Pill' },
    { id: 'minimal-outline', label: 'Outline' },
    { id: 'vertical-edge-tab', label: 'Edge Tab' },
  ],
  chatShells: [
    { id: 'minimal-saas', label: 'Minimal SaaS', featured: true },
    { id: 'soft-glass-shell', label: 'Soft Glass', featured: true },
    { id: 'liquid-glass', label: 'Liquid Glass', featured: true },
    { id: 'native-card', label: 'Native Card', featured: true },
    { id: 'compact-copilot', label: 'Compact Copilot', featured: true },
    { id: 'premium-dark', label: 'Premium Dark', featured: true },
    { id: 'copilot-dock', label: 'Classic Copilot' },
    { id: 'chatgpt-minimal', label: 'ChatGPT Inspired' },
    { id: 'claude-editorial', label: 'Claude Inspired' },
    { id: 'gemini-glow', label: 'Gemini Inspired' },
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
  next.assistantName = String(next.assistantName || base.assistantName).trim().slice(0, 48) || base.assistantName;
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
  const palette = profile.palette || {};
  const primary = palette.primary?.value || profile.primary || profile.brandColors?.[0] || base.appearance.primaryColor;
  const isDark = profile.mode === 'dark' || profile.themeMode === 'dark';
  return sanitizeWidgetConfig({
    ...base,
    direction: profile.direction === 'ltr' ? 'ltr' : 'rtl',
    chatShell: isDark ? 'premium-dark' : 'minimal-saas',
    launcher: isDark ? 'ai-orb' : 'minimal-floating',
    assistantMessage: isDark ? 'glass' : 'clean-card',
    inputBar: isDark ? 'glass' : 'pill',
    appearance: {
      ...base.appearance,
      primaryColor: primary,
      surfaceColor: palette.surface?.value || profile.surface || (isDark ? '#101827' : '#ffffff'),
      backgroundColor: palette.background?.value || profile.background || (isDark ? '#0b1020' : '#f8fafc'),
      textColor: palette.foreground?.value || profile.text || (isDark ? '#f8fafc' : '#111827'),
      mutedTextColor: palette.muted?.value || profile.mutedText || (isDark ? '#a6b1c2' : '#667085'),
      borderColor: palette.border?.value || profile.border || (isDark ? '#263244' : '#dde3eb'),
      radius: (profile.shape?.radius || profile.radius) >= 22 ? 'xl' : (profile.shape?.radius || profile.radius) >= 14 ? 'lg' : (profile.shape?.radius || profile.radius) >= 8 ? 'md' : 'sm',
      launcherPosition: 'bottom-left',
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
