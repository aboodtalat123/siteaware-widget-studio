import type { CSSProperties, ReactNode } from 'react';

export type StudioCategory =
  | 'assistantIcon'
  | 'launcher'
  | 'chatShell'
  | 'assistantMessage'
  | 'userMessage'
  | 'inputBar'
  | 'sendButton'
  | 'header'
  | 'sourceCitation'
  | 'takeMeThere'
  | 'theme';

export type DensityMode = 'compact' | 'comfortable' | 'spacious';
export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export type ThemeTokens = {
  background: string;
  surface: string;
  surfaceSecondary: string;
  text: string;
  mutedText: string;
  primary: string;
  primaryText: string;
  secondary?: string;
  accent?: string;
  border: string;
  assistantBubble: string;
  assistantText?: string;
  userBubble: string;
  userText?: string;
  link?: string;
  focusRing?: string;
  success: string;
  warning: string;
  danger: string;
  overlay?: string;
  spotlightRing?: string;
  spotlightGlow?: string;
  tooltipBackground?: string;
  tooltipText?: string;
  shadow: string;
};

export type ThemePalette = {
  id: string;
  label: string;
  note: string;
  tokens: ThemeTokens;
};

export type AppearanceConfig = {
  radius: 'sm' | 'md' | 'lg' | 'xl';
  widgetWidth: number;
  widgetHeight: number;
  density: DensityMode;
  fontScale: number;
  shadowStrength: number;
  launcherSize: 'sm' | 'md' | 'lg';
  launcherPosition: 'bottom-right' | 'bottom-left' | 'left-edge' | 'right-edge';
  primaryColor: string;
};

export type StudioConfig = {
  assistantIcon: string;
  launcher: string;
  chatShell: string;
  header: string;
  assistantMessage: string;
  userMessage: string;
  inputBar: string;
  sendButton: string;
  sourceCitation: string;
  takeMeThere: string;
  theme: string;
  themeOrigin?: 'manual' | 'auto-brand' | 'auto-contrast' | 'auto-premium';
  appearance: AppearanceConfig;
};

export type VariantItem = {
  id: string;
  label: string;
  note: string;
  preview: ReactNode;
  keywords: string[];
  className?: string;
};

export type PresetDefinition = {
  id: string;
  label: string;
  note: string;
  config: StudioConfig;
};

export const themePalettes: ThemePalette[] = [
  {
    id: 'siteaware-default',
    label: 'SiteAware Default',
    note: 'Balanced dark studio neutral',
    tokens: {
      background: '#08111f',
      surface: '#0f192b',
      surfaceSecondary: '#132137',
      text: '#f6f9ff',
      mutedText: '#aebdde',
      primary: '#7cc8ff',
      primaryText: '#06111e',
      border: 'rgba(150, 185, 255, 0.14)',
      assistantBubble: 'rgba(255, 255, 255, 0.06)',
      userBubble: 'rgba(124, 200, 255, 0.18)',
      success: '#7ef0c4',
      warning: '#ffd166',
      danger: '#ff8e99',
      shadow: '0 24px 60px rgba(0, 0, 0, 0.36)',
    },
  },
  {
    id: 'neutral-light',
    label: 'Neutral Light',
    note: 'Soft editorial paper tone',
    tokens: {
      background: '#f5f7fb',
      surface: '#ffffff',
      surfaceSecondary: '#eef3fb',
      text: '#101828',
      mutedText: '#5b6476',
      primary: '#2563eb',
      primaryText: '#ffffff',
      border: 'rgba(16, 24, 40, 0.12)',
      assistantBubble: '#f2f5fb',
      userBubble: '#dceafe',
      success: '#10855a',
      warning: '#ca8a04',
      danger: '#c2415b',
      shadow: '0 24px 60px rgba(16, 24, 40, 0.12)',
    },
  },
  {
    id: 'dark',
    label: 'Dark',
    note: 'High-contrast neutral dark',
    tokens: {
      background: '#05070c',
      surface: '#0c1119',
      surfaceSecondary: '#111927',
      text: '#f7f9ff',
      mutedText: '#98a2b3',
      primary: '#8ad3ff',
      primaryText: '#06101a',
      border: 'rgba(255, 255, 255, 0.08)',
      assistantBubble: 'rgba(255, 255, 255, 0.06)',
      userBubble: 'rgba(138, 211, 255, 0.16)',
      success: '#6ee7b7',
      warning: '#fbbf24',
      danger: '#f87171',
      shadow: '0 28px 72px rgba(0, 0, 0, 0.5)',
    },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    note: 'Blue-black studio depth',
    tokens: {
      background: '#07101e',
      surface: '#0e1828',
      surfaceSecondary: '#13243a',
      text: '#f4f8ff',
      mutedText: '#a4b4cf',
      primary: '#72c7ff',
      primaryText: '#06101c',
      border: 'rgba(130, 190, 255, 0.12)',
      assistantBubble: 'rgba(255, 255, 255, 0.06)',
      userBubble: 'rgba(114, 199, 255, 0.18)',
      success: '#5eead4',
      warning: '#facc15',
      danger: '#fb7185',
      shadow: '0 28px 70px rgba(0, 0, 0, 0.42)',
    },
  },
  {
    id: 'blue-saas',
    label: 'Blue SaaS',
    note: 'Friendly product blue',
    tokens: {
      background: '#08111b',
      surface: '#102036',
      surfaceSecondary: '#18304d',
      text: '#f6fbff',
      mutedText: '#bdd0e6',
      primary: '#4fa3ff',
      primaryText: '#ffffff',
      border: 'rgba(104, 163, 255, 0.16)',
      assistantBubble: 'rgba(255, 255, 255, 0.06)',
      userBubble: 'rgba(79, 163, 255, 0.2)',
      success: '#46d39b',
      warning: '#f5bf54',
      danger: '#ef7488',
      shadow: '0 26px 64px rgba(6, 15, 28, 0.48)',
    },
  },
  {
    id: 'purple-ai',
    label: 'Purple AI',
    note: 'Inventive AI product glow',
    tokens: {
      background: '#100a1d',
      surface: '#1a1231',
      surfaceSecondary: '#27184b',
      text: '#faf7ff',
      mutedText: '#c8bfe5',
      primary: '#b18cff',
      primaryText: '#12071f',
      border: 'rgba(177, 140, 255, 0.16)',
      assistantBubble: 'rgba(255, 255, 255, 0.06)',
      userBubble: 'rgba(177, 140, 255, 0.2)',
      success: '#75e6b3',
      warning: '#f5c66d',
      danger: '#f9839b',
      shadow: '0 28px 72px rgba(8, 4, 18, 0.5)',
    },
  },
  {
    id: 'emerald',
    label: 'Emerald',
    note: 'Fresh green operational tone',
    tokens: {
      background: '#06110e',
      surface: '#0d1b17',
      surfaceSecondary: '#14312a',
      text: '#f4fff9',
      mutedText: '#a4c3b5',
      primary: '#53d79a',
      primaryText: '#04110c',
      border: 'rgba(83, 215, 154, 0.16)',
      assistantBubble: 'rgba(255, 255, 255, 0.06)',
      userBubble: 'rgba(83, 215, 154, 0.18)',
      success: '#54d79a',
      warning: '#f3c74b',
      danger: '#f4898e',
      shadow: '0 26px 64px rgba(4, 15, 12, 0.46)',
    },
  },
  {
    id: 'warm-beige',
    label: 'Warm Beige',
    note: 'Soft product warmth',
    tokens: {
      background: '#15110d',
      surface: '#221c16',
      surfaceSecondary: '#2e261f',
      text: '#fff8ef',
      mutedText: '#d6c3ad',
      primary: '#f0b26f',
      primaryText: '#1d1208',
      border: 'rgba(240, 178, 111, 0.16)',
      assistantBubble: 'rgba(255, 255, 255, 0.05)',
      userBubble: 'rgba(240, 178, 111, 0.18)',
      success: '#8bd18a',
      warning: '#ffd166',
      danger: '#f19aa1',
      shadow: '0 28px 72px rgba(11, 7, 2, 0.48)',
    },
  },
  {
    id: 'graphite',
    label: 'Graphite',
    note: 'Neutral enterprise graphite',
    tokens: {
      background: '#0a0d12',
      surface: '#11151c',
      surfaceSecondary: '#171d26',
      text: '#f4f7fc',
      mutedText: '#9da8ba',
      primary: '#94a3b8',
      primaryText: '#0b1017',
      border: 'rgba(148, 163, 184, 0.18)',
      assistantBubble: 'rgba(255, 255, 255, 0.05)',
      userBubble: 'rgba(148, 163, 184, 0.18)',
      success: '#66d9a8',
      warning: '#f8c85e',
      danger: '#ee8695',
      shadow: '0 30px 78px rgba(0, 0, 0, 0.52)',
    },
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    note: 'Calm teal clinical tone',
    tokens: {
      background: '#061216',
      surface: '#0e1b20',
      surfaceSecondary: '#14262d',
      text: '#f2fbfd',
      mutedText: '#a7c2c9',
      primary: '#55c7d8',
      primaryText: '#041316',
      border: 'rgba(85, 199, 216, 0.16)',
      assistantBubble: 'rgba(255, 255, 255, 0.05)',
      userBubble: 'rgba(85, 199, 216, 0.2)',
      success: '#76e4c0',
      warning: '#f4c860',
      danger: '#f38da1',
      shadow: '0 28px 66px rgba(3, 14, 16, 0.46)',
    },
  },
  {
    id: 'education',
    label: 'Education',
    note: 'Academic blue slate',
    tokens: {
      background: '#07101b',
      surface: '#111c2e',
      surfaceSecondary: '#17263d',
      text: '#f7fbff',
      mutedText: '#b7c4d8',
      primary: '#5f89ff',
      primaryText: '#07101b',
      border: 'rgba(95, 137, 255, 0.16)',
      assistantBubble: 'rgba(255, 255, 255, 0.05)',
      userBubble: 'rgba(95, 137, 255, 0.18)',
      success: '#67d7a8',
      warning: '#f7c658',
      danger: '#ef8ea2',
      shadow: '0 28px 70px rgba(4, 11, 24, 0.48)',
    },
  },
  {
    id: 'premium-black',
    label: 'Premium Black',
    note: 'Luxury black with gold accents',
    tokens: {
      background: '#050507',
      surface: '#101013',
      surfaceSecondary: '#17171c',
      text: '#fffdf8',
      mutedText: '#b5b5bd',
      primary: '#d8b16a',
      primaryText: '#110d07',
      border: 'rgba(216, 177, 106, 0.18)',
      assistantBubble: 'rgba(255, 255, 255, 0.05)',
      userBubble: 'rgba(216, 177, 106, 0.16)',
      success: '#7fe0b4',
      warning: '#ffcc66',
      danger: '#f28c98',
      shadow: '0 34px 82px rgba(0, 0, 0, 0.64)',
    },
  },
];

const iconStroke = (accent: string, secondary = accent) => ({
  stroke: accent,
  fill: 'none',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export const assistantIcons: VariantItem[] = [
  {
    id: 'orb-01',
    label: 'Orb Core',
    note: 'Radiant ring core',
    keywords: ['orb', 'halo', 'core'],
    preview: (
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="12" {...iconStroke('currentColor')} />
        <circle cx="20" cy="20" r="5" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'spark-02',
    label: 'Spark',
    note: 'Sharp four-point flare',
    keywords: ['spark', 'star', 'flare'],
    preview: (
      <svg viewBox="0 0 40 40">
        <path d="M20 6l2.8 8.2L31 17l-8.2 2.8L20 28l-2.8-8.2L9 17l8.2-2.8L20 6Z" {...iconStroke('currentColor')} />
      </svg>
    ),
  },
  {
    id: 'star-03',
    label: 'Geometric Star',
    note: 'Layered star geometry',
    keywords: ['star', 'geometric'],
    preview: (
      <svg viewBox="0 0 40 40">
        <path d="M20 5l4.8 10.2L35 20l-10.2 4.8L20 35l-4.8-10.2L5 20l10.2-4.8L20 5Z" {...iconStroke('currentColor')} />
        <path d="M20 11l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6Z" fill="currentColor" opacity="0.28" />
      </svg>
    ),
  },
  {
    id: 'nodes-04',
    label: 'Neural Nodes',
    note: 'Connected intelligence graph',
    keywords: ['nodes', 'network', 'graph'],
    preview: (
      <svg viewBox="0 0 40 40">
        <path d="M10 28l10-16 10 8" {...iconStroke('currentColor')} />
        <circle cx="10" cy="28" r="2.8" fill="currentColor" />
        <circle cx="20" cy="12" r="2.8" fill="currentColor" />
        <circle cx="30" cy="20" r="2.8" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'eye-05',
    label: 'AI Eye',
    note: 'Observant assistant eye',
    keywords: ['eye', 'vision', 'watch'],
    preview: (
      <svg viewBox="0 0 40 40">
        <path d="M6 20c3.8-5.8 8.9-8.8 14-8.8S30.2 14.2 34 20c-3.8 5.8-8.9 8.8-14 8.8S9.8 25.8 6 20Z" {...iconStroke('currentColor')} />
        <circle cx="20" cy="20" r="4.2" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'bot-06',
    label: 'Minimal Bot',
    note: 'Friendly face with ears',
    keywords: ['bot', 'face', 'assistant'],
    preview: (
      <svg viewBox="0 0 40 40">
        <rect x="10" y="13" width="20" height="16" rx="7" {...iconStroke('currentColor')} />
        <circle cx="16" cy="20" r="1.8" fill="currentColor" />
        <circle cx="24" cy="20" r="1.8" fill="currentColor" />
        <path d="M15 26c1.5 1 3 1.5 5 1.5s3.5-.5 5-1.5" {...iconStroke('currentColor')} />
      </svg>
    ),
  },
  {
    id: 'halo-07',
    label: 'Halo',
    note: 'Open ring with glow',
    keywords: ['halo', 'ring'],
    preview: (
      <svg viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="11" {...iconStroke('currentColor')} strokeDasharray="18 8" />
        <circle cx="20" cy="20" r="4" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'cube-08',
    label: 'Cube',
    note: 'Structured intelligence cube',
    keywords: ['cube', 'block', 'enterprise'],
    preview: (
      <svg viewBox="0 0 40 40">
        <path d="M12 14l8-4 8 4v12l-8 4-8-4V14Z" {...iconStroke('currentColor')} />
        <path d="M20 10v16M12 14l8 4 8-4" {...iconStroke('currentColor')} opacity="0.8" />
      </svg>
    ),
  },
  {
    id: 'wave-09',
    label: 'Wave',
    note: 'Flowing signal wave',
    keywords: ['wave', 'flow', 'signal'],
    preview: (
      <svg viewBox="0 0 40 40">
        <path d="M6 21c4-8 8-8 12 0s8 8 16 0" {...iconStroke('currentColor')} />
        <path d="M6 27c4-5 8-5 12 0s8 5 16 0" {...iconStroke('currentColor')} opacity="0.55" />
      </svg>
    ),
  },
  {
    id: 'constellation-10',
    label: 'Constellation',
    note: 'Connected sparkle nodes',
    keywords: ['constellation', 'stars', 'network'],
    preview: (
      <svg viewBox="0 0 40 40">
        <path d="M11 27l7-11 11 3" {...iconStroke('currentColor')} />
        <circle cx="11" cy="27" r="2.4" fill="currentColor" />
        <circle cx="18" cy="16" r="2.4" fill="currentColor" />
        <circle cx="29" cy="19" r="2.4" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'hex-11',
    label: 'Hex AI',
    note: 'Hexagonal intelligence mark',
    keywords: ['hex', 'hexagon', 'ai'],
    preview: (
      <svg viewBox="0 0 40 40">
        <path d="M20 6l10 6v12l-10 6-10-6V12l10-6Z" {...iconStroke('currentColor')} />
        <circle cx="20" cy="20" r="4" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'pulse-12',
    label: 'Pulse',
    note: 'Heartbeat signal mark',
    keywords: ['pulse', 'heartbeat', 'signal'],
    preview: (
      <svg viewBox="0 0 40 40">
        <path d="M6 22h7l3-8 5 16 3-8h10" {...iconStroke('currentColor')} />
      </svg>
    ),
  },
  {
    id: 'face-13',
    label: 'Assistant Face',
    note: 'Polished friendly face',
    keywords: ['face', 'assistant', 'friendly'],
    preview: (
      <svg viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="11" {...iconStroke('currentColor')} />
        <circle cx="16" cy="19" r="1.6" fill="currentColor" />
        <circle cx="24" cy="19" r="1.6" fill="currentColor" />
        <path d="M15 25.5c1.4 1.1 3.1 1.6 5 1.6s3.6-.5 5-1.6" {...iconStroke('currentColor')} />
      </svg>
    ),
  },
  {
    id: 'diamond-14',
    label: 'Diamond',
    note: 'Refined premium gem',
    keywords: ['diamond', 'premium', 'gem'],
    preview: (
      <svg viewBox="0 0 40 40">
        <path d="M20 6l8 7-8 21-8-21 8-7Z" {...iconStroke('currentColor')} />
        <path d="M12 13h16" {...iconStroke('currentColor')} opacity="0.45" />
      </svg>
    ),
  },
  {
    id: 'shield-15',
    label: 'Shield Intelligence',
    note: 'Trust and security cue',
    keywords: ['shield', 'security', 'trust'],
    preview: (
      <svg viewBox="0 0 40 40">
        <path d="M20 6l10 4v8c0 7-4.7 11-10 16-5.3-5-10-9-10-16V10l10-4Z" {...iconStroke('currentColor')} />
        <path d="M16 19l3 3 6-7" {...iconStroke('currentColor')} />
      </svg>
    ),
  },
  {
    id: 'sphere-16',
    label: 'Gradient Sphere',
    note: 'Layered depth sphere',
    keywords: ['sphere', 'gradient', 'orb'],
    preview: (
      <svg viewBox="0 0 40 40">
        <defs>
          <radialGradient id="sphere-grad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.18" />
          </radialGradient>
        </defs>
        <circle cx="20" cy="20" r="12" fill="url(#sphere-grad)" />
        <circle cx="20" cy="20" r="12" {...iconStroke('currentColor')} opacity="0.45" />
      </svg>
    ),
  },
  {
    id: 'network-17',
    label: 'Line Network',
    note: 'Thin connected network',
    keywords: ['network', 'line', 'graph'],
    preview: (
      <svg viewBox="0 0 40 40">
        <path d="M10 29l10-13 10 7" {...iconStroke('currentColor')} />
        <path d="M12 14l7 2 9-5" {...iconStroke('currentColor')} opacity="0.5" />
        <circle cx="10" cy="29" r="2.4" fill="currentColor" />
        <circle cx="20" cy="16" r="2.4" fill="currentColor" />
        <circle cx="30" cy="23" r="2.4" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'command-18',
    label: 'Command Mark',
    note: 'Terminal-inspired intelligence',
    keywords: ['command', 'terminal', 'prompt'],
    preview: (
      <svg viewBox="0 0 40 40">
        <path d="M10 13l7 7-7 7" {...iconStroke('currentColor')} />
        <path d="M20 27h10" {...iconStroke('currentColor')} />
      </svg>
    ),
  },
  {
    id: 'glyph-19',
    label: 'Minimal Glyph',
    note: 'Subtle monogram glyph',
    keywords: ['glyph', 'minimal', 'monogram'],
    preview: (
      <svg viewBox="0 0 40 40">
        <path d="M14 10h12l-5 10 5 10H14l5-10-5-10Z" {...iconStroke('currentColor')} />
      </svg>
    ),
  },
  {
    id: 'premium-20',
    label: 'Premium Abstract',
    note: 'Sharp abstract luxury mark',
    keywords: ['premium', 'abstract', 'luxury'],
    preview: (
      <svg viewBox="0 0 40 40">
        <path d="M20 7l8 6-2 10-6 10-6-10-2-10 8-6Z" {...iconStroke('currentColor')} />
        <path d="M20 13l4 4-4 10-4-10 4-4Z" fill="currentColor" opacity="0.25" />
      </svg>
    ),
  },
];

export const launcherVariants: VariantItem[] = [
  { id: 'circle-icon', label: 'Circle Icon', note: 'Minimal round launcher', keywords: ['circle', 'icon', 'minimal'], preview: <span>◉</span>, className: 'launcher-circle-icon' },
  { id: 'rounded-square', label: 'Rounded Square', note: 'Compact square tile', keywords: ['square', 'rounded'], preview: <span>▣</span>, className: 'launcher-rounded-square' },
  { id: 'pill-label', label: 'Pill with Label', note: 'Text-forward pill', keywords: ['pill', 'label'], preview: <span>Ask AI</span>, className: 'launcher-pill-label' },
  { id: 'icon-text', label: 'Icon + Text', note: 'Balanced trigger', keywords: ['icon', 'text'], preview: <span>✦ Ask AI</span>, className: 'launcher-icon-text' },
  { id: 'floating-orb', label: 'Floating Orb', note: 'Radiant orb trigger', keywords: ['floating', 'orb'], preview: <span>◉</span>, className: 'launcher-floating-orb' },
  { id: 'glass-launcher', label: 'Glass Launcher', note: 'Frosted surface', keywords: ['glass'], preview: <span>Glass</span>, className: 'launcher-glass' },
  { id: 'minimal-outline', label: 'Minimal Outline', note: 'Thin stroke launcher', keywords: ['outline', 'minimal'], preview: <span>○</span>, className: 'launcher-outline' },
  { id: 'soft-shadow', label: 'Soft Shadow', note: 'Gentle floating shadow', keywords: ['shadow', 'soft'], preview: <span>◌</span>, className: 'launcher-shadow' },
  { id: 'elevated-card', label: 'Elevated Card', note: 'Card-like action', keywords: ['card', 'elevated'], preview: <span>AI</span>, className: 'launcher-card' },
  { id: 'compact-tab', label: 'Compact Tab', note: 'Tiny edge tab', keywords: ['compact', 'tab'], preview: <span>AI</span>, className: 'launcher-compact-tab' },
  { id: 'vertical-edge-tab', label: 'Vertical Edge Tab', note: 'Rotated side tab', keywords: ['vertical', 'edge'], preview: <span>Support</span>, className: 'launcher-vertical-edge' },
  { id: 'notification', label: 'Notification', note: 'Unread badge trigger', keywords: ['notification', 'badge'], preview: <span>AI</span>, className: 'launcher-notification' },
  { id: 'premium', label: 'Premium', note: 'Luxury metallic button', keywords: ['premium', 'luxury'], preview: <span>Premium AI</span>, className: 'launcher-premium' },
  { id: 'enterprise', label: 'Enterprise', note: 'Structured business badge', keywords: ['enterprise', 'business'], preview: <span>Enterprise Assist</span>, className: 'launcher-enterprise' },
  { id: 'friendly', label: 'Friendly', note: 'Warm approachable pill', keywords: ['friendly', 'warm'], preview: <span>Need help?</span>, className: 'launcher-friendly' },
  { id: 'dark', label: 'Dark Launcher', note: 'Deep contrast action', keywords: ['dark'], preview: <span>◉</span>, className: 'launcher-dark' },
  { id: 'gradient', label: 'Gradient Launcher', note: 'Bold gradient surface', keywords: ['gradient'], preview: <span>✦</span>, className: 'launcher-gradient' },
  { id: 'ultra-minimal', label: 'Ultra Minimal', note: 'Tiny tactile point', keywords: ['ultra', 'minimal'], preview: <span>·</span>, className: 'launcher-ultra-minimal' },
  { id: 'status-dot', label: 'Status Dot', note: 'Availability indicator', keywords: ['status', 'dot'], preview: <span>●</span>, className: 'launcher-status-dot' },
  { id: 'assistant-name', label: 'Assistant Name', note: 'Named assistant button', keywords: ['assistant', 'name'], preview: <span>SiteAware Assistant</span>, className: 'launcher-assistant-name' },
];

export const chatShellVariants: VariantItem[] = [
  { id: 'classic', label: 'Classic', note: 'Traditional assistant window', keywords: ['classic'], preview: <span>Classic</span>, className: 'shell-classic' },
  { id: 'modern-saas', label: 'Modern SaaS', note: 'Dashboard friendly shell', keywords: ['saas', 'modern'], preview: <span>SaaS</span>, className: 'shell-modern-saas' },
  { id: 'minimal', label: 'Minimal', note: 'No-frills shell', keywords: ['minimal'], preview: <span>Minimal</span>, className: 'shell-minimal' },
  { id: 'glass', label: 'Glass', note: 'Translucent layered shell', keywords: ['glass'], preview: <span>Glass</span>, className: 'shell-glass' },
  { id: 'compact', label: 'Compact', note: 'Dense footprint', keywords: ['compact'], preview: <span>Compact</span>, className: 'shell-compact' },
  { id: 'premium', label: 'Premium', note: 'Luxury framed shell', keywords: ['premium'], preview: <span>Premium</span>, className: 'shell-premium' },
  { id: 'enterprise', label: 'Enterprise', note: 'Structured toolbar shell', keywords: ['enterprise'], preview: <span>Enterprise</span>, className: 'shell-enterprise' },
  { id: 'rounded', label: 'Rounded', note: 'Soft rounded edges', keywords: ['rounded'], preview: <span>Rounded</span>, className: 'shell-rounded' },
  { id: 'sharp', label: 'Sharp Professional', note: 'Angular business shell', keywords: ['sharp', 'professional'], preview: <span>Sharp</span>, className: 'shell-sharp' },
  { id: 'floating-card', label: 'Floating Card', note: 'Detached floating card', keywords: ['floating', 'card'], preview: <span>Floating</span>, className: 'shell-floating-card' },
  { id: 'side-panel', label: 'Side-Panel Inspired', note: 'Docked panel look', keywords: ['side', 'panel'], preview: <span>Panel</span>, className: 'shell-side-panel' },
  { id: 'soft-assistant', label: 'Soft Assistant', note: 'Gentle conversational shell', keywords: ['soft', 'assistant'], preview: <span>Soft</span>, className: 'shell-soft-assistant' },
];

export const assistantMessages: VariantItem[] = [
  { id: 'simple-bubble', label: 'Simple Bubble', note: 'Baseline rounded bubble', keywords: ['simple', 'bubble'], preview: <span>Bubble</span>, className: 'assistant-simple-bubble' },
  { id: 'flat-text', label: 'Flat Text', note: 'No framing, just response', keywords: ['flat', 'text'], preview: <span>Text</span>, className: 'assistant-flat-text' },
  { id: 'card', label: 'Card', note: 'Raised content card', keywords: ['card'], preview: <span>Card</span>, className: 'assistant-card' },
  { id: 'bordered-card', label: 'Bordered Card', note: 'Outlined answer block', keywords: ['bordered'], preview: <span>Bordered</span>, className: 'assistant-bordered-card' },
  { id: 'answer-block', label: 'Answer Block', note: 'Structured response block', keywords: ['answer', 'block'], preview: <span>Answer</span>, className: 'assistant-answer-block' },
  { id: 'source-first', label: 'Source-First Answer', note: 'Citation bar first', keywords: ['source', 'citation'], preview: <span>Sources</span>, className: 'assistant-source-first' },
  { id: 'minimal', label: 'Minimal', note: 'Quiet message styling', keywords: ['minimal'], preview: <span>Min</span>, className: 'assistant-minimal' },
  { id: 'modern-saas', label: 'Modern SaaS', note: 'Clean and balanced', keywords: ['modern', 'saas'], preview: <span>SaaS</span>, className: 'assistant-modern-saas' },
  { id: 'soft-gray', label: 'Soft Gray', note: 'Muted neutral fill', keywords: ['soft', 'gray'], preview: <span>Gray</span>, className: 'assistant-soft-gray' },
  { id: 'premium', label: 'Premium', note: 'Luxury treatment', keywords: ['premium'], preview: <span>Premium</span>, className: 'assistant-premium' },
  { id: 'compact', label: 'Compact', note: 'Tighter density', keywords: ['compact'], preview: <span>Compact</span>, className: 'assistant-compact' },
  { id: 'structured', label: 'Structured Response', note: 'Bulleted and labeled', keywords: ['structured'], preview: <span>Structured</span>, className: 'assistant-structured' },
];

export const userMessages: VariantItem[] = [
  { id: 'bubble-rounded', label: 'Rounded Bubble', note: 'Comfortable full bubble', keywords: ['bubble', 'rounded'], preview: <span>Rounded</span>, className: 'user-rounded' },
  { id: 'chip', label: 'Chip', note: 'Small compact chip', keywords: ['chip'], preview: <span>Chip</span>, className: 'user-chip' },
  { id: 'pill', label: 'Pill', note: 'Long pill shape', keywords: ['pill'], preview: <span>Pill</span>, className: 'user-pill' },
  { id: 'outline', label: 'Outline', note: 'Bordered user message', keywords: ['outline'], preview: <span>Outline</span>, className: 'user-outline' },
  { id: 'glass', label: 'Glass', note: 'Translucent user message', keywords: ['glass'], preview: <span>Glass</span>, className: 'user-glass' },
  { id: 'compact', label: 'Compact', note: 'Low padding and density', keywords: ['compact'], preview: <span>Compact</span>, className: 'user-compact' },
  { id: 'tail', label: 'Tail', note: 'Message with tail', keywords: ['tail'], preview: <span>Tail</span>, className: 'user-tail' },
  { id: 'no-tail', label: 'No Tail', note: 'Plain message slab', keywords: ['no', 'tail'], preview: <span>No Tail</span>, className: 'user-no-tail' },
  { id: 'wide', label: 'Wide', note: 'Spans wider width', keywords: ['wide'], preview: <span>Wide</span>, className: 'user-wide' },
  { id: 'dense', label: 'Dense', note: 'Tight padding and line-height', keywords: ['dense'], preview: <span>Dense</span>, className: 'user-dense' },
  { id: 'floating', label: 'Floating', note: 'Detached shadow chip', keywords: ['floating'], preview: <span>Floating</span>, className: 'user-floating' },
  { id: 'premium', label: 'Premium', note: 'Polished luxury chip', keywords: ['premium'], preview: <span>Premium</span>, className: 'user-premium' },
];

export const inputBars: VariantItem[] = [
  { id: 'classic-input', label: 'Classic Input', note: 'Reliable baseline field', keywords: ['classic'], preview: <span>Classic</span>, className: 'input-classic' },
  { id: 'pill-input', label: 'Pill', note: 'Rounded pill composer', keywords: ['pill'], preview: <span>Pill</span>, className: 'input-pill' },
  { id: 'floating-input', label: 'Floating Input', note: 'Detached floating field', keywords: ['floating'], preview: <span>Floating</span>, className: 'input-floating' },
  { id: 'bordered-input', label: 'Bordered', note: 'Structured border field', keywords: ['bordered'], preview: <span>Bordered</span>, className: 'input-bordered' },
  { id: 'underline', label: 'Minimal Underline', note: 'Text-first underline', keywords: ['underline'], preview: <span>Underline</span>, className: 'input-underline' },
  { id: 'command-bar', label: 'Command Bar', note: 'Quick command style', keywords: ['command'], preview: <span>Command</span>, className: 'input-command-bar' },
  { id: 'premium-composer', label: 'Premium Composer', note: 'Luxury large composer', keywords: ['premium'], preview: <span>Premium</span>, className: 'input-premium' },
  { id: 'compact', label: 'Compact', note: 'Condensed input bar', keywords: ['compact'], preview: <span>Compact</span>, className: 'input-compact' },
  { id: 'card-composer', label: 'Card Composer', note: 'Card-based entry area', keywords: ['card'], preview: <span>Card</span>, className: 'input-card' },
  { id: 'glass-composer', label: 'Glass Composer', note: 'Frosted transparent composer', keywords: ['glass'], preview: <span>Glass</span>, className: 'input-glass' },
];

export const sendButtons: VariantItem[] = [
  { id: 'send-arrow', label: 'Arrow', note: 'Slim arrow send', keywords: ['arrow'], preview: <span>→</span>, className: 'send-arrow' },
  { id: 'send-plane', label: 'Paper Plane', note: 'Playful plane icon', keywords: ['plane'], preview: <span>✈</span>, className: 'send-plane' },
  { id: 'send-chevron', label: 'Chevron', note: 'Crisp directional chevron', keywords: ['chevron'], preview: <span>›</span>, className: 'send-chevron' },
  { id: 'send-pulse', label: 'Pulse', note: 'Circular pulsing send', keywords: ['pulse'], preview: <span>◉</span>, className: 'send-pulse' },
  { id: 'send-filled', label: 'Filled', note: 'Classic filled action', keywords: ['filled'], preview: <span>Send</span>, className: 'send-filled' },
  { id: 'send-outline', label: 'Outline', note: 'Outlined action button', keywords: ['outline'], preview: <span>Send</span>, className: 'send-outline' },
  { id: 'send-icon-only', label: 'Icon Only', note: 'Icon-only control', keywords: ['icon', 'only'], preview: <span>➜</span>, className: 'send-icon-only' },
  { id: 'send-lift', label: 'Lift', note: 'Elevated small capsule', keywords: ['lift'], preview: <span>Send</span>, className: 'send-lift' },
  { id: 'send-circle', label: 'Circle', note: 'Round compact send', keywords: ['circle'], preview: <span>→</span>, className: 'send-circle' },
  { id: 'send-square', label: 'Square', note: 'Square button send', keywords: ['square'], preview: <span>↗</span>, className: 'send-square' },
  { id: 'send-glow', label: 'Glow', note: 'Glowing accent button', keywords: ['glow'], preview: <span>Send</span>, className: 'send-glow' },
  { id: 'send-ghost', label: 'Ghost', note: 'Subtle ghost button', keywords: ['ghost'], preview: <span>Send</span>, className: 'send-ghost' },
  { id: 'send-compact', label: 'Compact', note: 'Small dense send', keywords: ['compact'], preview: <span>↪</span>, className: 'send-compact' },
  { id: 'send-rail', label: 'Rail', note: 'Vertical rail send', keywords: ['rail'], preview: <span>Rail</span>, className: 'send-rail' },
  { id: 'send-premium', label: 'Premium', note: 'Luxury send control', keywords: ['premium'], preview: <span>Send</span>, className: 'send-premium' },
];

export const headerVariants: VariantItem[] = [
  { id: 'header-minimal', label: 'Minimal Header', note: 'Quiet and slim', keywords: ['minimal'], preview: <span>Minimal</span>, className: 'header-minimal' },
  { id: 'header-avatar', label: 'Avatar Header', note: 'Avatar plus name', keywords: ['avatar'], preview: <span>Avatar</span>, className: 'header-avatar' },
  { id: 'header-status', label: 'Status Header', note: 'Online indicator', keywords: ['status'], preview: <span>Status</span>, className: 'header-status' },
  { id: 'header-subtitle', label: 'Subtitle Header', note: 'Extra context line', keywords: ['subtitle'], preview: <span>Subtitle</span>, className: 'header-subtitle' },
  { id: 'header-actions', label: 'Actions Header', note: 'Action buttons included', keywords: ['actions'], preview: <span>Actions</span>, className: 'header-actions' },
  { id: 'header-close', label: 'Close/Minimize', note: 'Window controls included', keywords: ['close', 'minimize'], preview: <span>Controls</span>, className: 'header-close' },
  { id: 'header-enterprise', label: 'Enterprise Header', note: 'Business structured header', keywords: ['enterprise'], preview: <span>Enterprise</span>, className: 'header-enterprise' },
  { id: 'header-soft', label: 'Soft Header', note: 'Gentle rounded treatment', keywords: ['soft'], preview: <span>Soft</span>, className: 'header-soft' },
  { id: 'header-premium', label: 'Premium Header', note: 'Luxury gradient bar', keywords: ['premium'], preview: <span>Premium</span>, className: 'header-premium' },
  { id: 'header-docked', label: 'Docked Header', note: 'Docked panel header', keywords: ['docked'], preview: <span>Docked</span>, className: 'header-docked' },
];

export const sourceCitationVariants: VariantItem[] = [
  { id: 'source-inline-badge', label: 'Inline Badge', note: 'Inline source tag', keywords: ['inline', 'badge'], preview: <span>Inline</span>, className: 'source-inline-badge' },
  { id: 'source-chips', label: 'Source Chips', note: 'Chips with IDs', keywords: ['chips'], preview: <span>Chips</span>, className: 'source-chips' },
  { id: 'source-expanding-card', label: 'Expandable Card', note: 'Card with summary', keywords: ['expandable', 'card'], preview: <span>Expand</span>, className: 'source-expanding-card' },
  { id: 'source-numbered', label: 'Numbered Citations', note: 'Numbered citation list', keywords: ['numbered'], preview: <span>1.</span>, className: 'source-numbered' },
  { id: 'source-urls', label: 'Compact URLs', note: 'Compact link list', keywords: ['url'], preview: <span>Links</span>, className: 'source-urls' },
  { id: 'source-evidence', label: 'Evidence List', note: 'Evidence bullets', keywords: ['evidence'], preview: <span>Evidence</span>, className: 'source-evidence' },
  { id: 'source-footer', label: 'Source Footer', note: 'Footer-aligned sources', keywords: ['footer'], preview: <span>Footer</span>, className: 'source-footer' },
  { id: 'source-doc-page', label: 'Document/Page Cards', note: 'Source cards with page labels', keywords: ['document', 'page'], preview: <span>Docs</span>, className: 'source-doc-page' },
];

export const takeMeThereVariants: VariantItem[] = [
  { id: 'cta-primary', label: 'Primary Button', note: 'Main action button', keywords: ['primary'], preview: <span>Take me there</span>, className: 'cta-primary' },
  { id: 'cta-link', label: 'Text Link', note: 'Light inline link', keywords: ['link'], preview: <span>Open</span>, className: 'cta-link' },
  { id: 'cta-arrow', label: 'Arrow Action', note: 'Arrow-led navigation', keywords: ['arrow'], preview: <span>→</span>, className: 'cta-arrow' },
  { id: 'cta-chip', label: 'Compact Chip', note: 'Small chip action', keywords: ['chip'], preview: <span>Go</span>, className: 'cta-chip' },
  { id: 'cta-destination-card', label: 'Destination Card', note: 'Card-style target', keywords: ['destination', 'card'], preview: <span>Destination</span>, className: 'cta-destination-card' },
  { id: 'cta-highlighted', label: 'Highlighted CTA', note: 'Highlighted destination', keywords: ['highlighted'], preview: <span>Highlighted</span>, className: 'cta-highlighted' },
  { id: 'cta-icon-only', label: 'Icon Only', note: 'Icon-only CTA', keywords: ['icon'], preview: <span>↗</span>, className: 'cta-icon-only' },
  { id: 'cta-inline-nav', label: 'Inline Navigation', note: 'Inline nav button', keywords: ['inline', 'navigation'], preview: <span>Navigate</span>, className: 'cta-inline-nav' },
  { id: 'cta-premium', label: 'Premium CTA', note: 'Luxury call to action', keywords: ['premium'], preview: <span>Premium</span>, className: 'cta-premium' },
  { id: 'cta-subtle', label: 'Subtle Secondary', note: 'Soft secondary action', keywords: ['subtle', 'secondary'], preview: <span>View source</span>, className: 'cta-subtle' },
];

export const presetDefinitions: PresetDefinition[] = [
  {
    id: 'apple-calm',
    label: 'Apple Calm',
    note: 'Quiet editorial layout with restrained controls',
    config: {
      assistantIcon: 'spark-02',
      launcher: 'glass-launcher',
      chatShell: 'minimal',
      header: 'header-minimal',
      assistantMessage: 'flat-text',
      userMessage: 'outline',
      inputBar: 'pill-input',
      sendButton: 'send-circle',
      sourceCitation: 'source-footer',
      takeMeThere: 'cta-link',
      theme: 'neutral-light',
      appearance: {
        radius: 'lg',
        widgetWidth: 408,
        widgetHeight: 640,
        density: 'comfortable',
        fontScale: 1,
        shadowStrength: 0.55,
        launcherSize: 'md',
        launcherPosition: 'bottom-right',
        primaryColor: '#111111',
      },
    },
  },
  {
    id: 'copilot-dock',
    label: 'Copilot Dock',
    note: 'Full-height side assistant with structured answers',
    config: {
      assistantIcon: 'star-03',
      launcher: 'circle-icon',
      chatShell: 'side-panel',
      header: 'header-docked',
      assistantMessage: 'modern-saas',
      userMessage: 'bubble-rounded',
      inputBar: 'command-bar',
      sendButton: 'send-circle',
      sourceCitation: 'source-chips',
      takeMeThere: 'cta-primary',
      theme: 'graphite',
      appearance: {
        radius: 'md',
        widgetWidth: 420,
        widgetHeight: 680,
        density: 'comfortable',
        fontScale: 1,
        shadowStrength: 0.7,
        launcherSize: 'md',
        launcherPosition: 'bottom-right',
        primaryColor: '#202124',
      },
    },
  },
  {
    id: 'claude-editorial',
    label: 'Claude Editorial',
    note: 'Warm editorial answers with a calm, focused composer',
    config: {
      assistantIcon: 'glyph-19',
      launcher: 'pill-label',
      chatShell: 'soft-assistant',
      header: 'header-minimal',
      assistantMessage: 'flat-text',
      userMessage: 'outline',
      inputBar: 'card-composer',
      sendButton: 'send-arrow',
      sourceCitation: 'source-footer',
      takeMeThere: 'cta-link',
      theme: 'neutral-light',
      appearance: {
        radius: 'lg',
        widgetWidth: 430,
        widgetHeight: 660,
        density: 'spacious',
        fontScale: 1.02,
        shadowStrength: 0.38,
        launcherSize: 'md',
        launcherPosition: 'bottom-right',
        primaryColor: '#b35c37',
      },
    },
  },
  {
    id: 'chatgpt-minimal',
    label: 'ChatGPT Minimal',
    note: 'Conversation-first layout with restrained monochrome controls',
    config: {
      assistantIcon: 'orb-01',
      launcher: 'minimal-outline',
      chatShell: 'minimal',
      header: 'header-minimal',
      assistantMessage: 'minimal',
      userMessage: 'outline',
      inputBar: 'pill-input',
      sendButton: 'send-circle',
      sourceCitation: 'source-inline-badge',
      takeMeThere: 'cta-subtle',
      theme: 'neutral-light',
      appearance: {
        radius: 'lg',
        widgetWidth: 440,
        widgetHeight: 680,
        density: 'comfortable',
        fontScale: 1,
        shadowStrength: 0.45,
        launcherSize: 'md',
        launcherPosition: 'bottom-right',
        primaryColor: '#111111',
      },
    },
  },
  {
    id: 'gemini-glass',
    label: 'Gemini Glass',
    note: 'Layered glass surfaces with bright, helpful answer cards',
    config: {
      assistantIcon: 'sphere-16',
      launcher: 'floating-orb',
      chatShell: 'glass',
      header: 'header-subtitle',
      assistantMessage: 'card',
      userMessage: 'bubble-rounded',
      inputBar: 'glass-composer',
      sendButton: 'send-circle',
      sourceCitation: 'source-chips',
      takeMeThere: 'cta-chip',
      theme: 'neutral-light',
      appearance: {
        radius: 'xl',
        widgetWidth: 430,
        widgetHeight: 660,
        density: 'comfortable',
        fontScale: 1,
        shadowStrength: 0.6,
        launcherSize: 'md',
        launcherPosition: 'bottom-right',
        primaryColor: '#4285f4',
      },
    },
  },
  {
    id: 'intercom-support',
    label: 'Support Messenger',
    note: 'Friendly service chat with a direct conversation flow',
    config: {
      assistantIcon: 'bot-06',
      launcher: 'notification',
      chatShell: 'rounded',
      header: 'header-status',
      assistantMessage: 'simple-bubble',
      userMessage: 'pill',
      inputBar: 'pill-input',
      sendButton: 'send-filled',
      sourceCitation: 'source-inline-badge',
      takeMeThere: 'cta-highlighted',
      theme: 'blue-saas',
      appearance: {
        radius: 'xl',
        widgetWidth: 400,
        widgetHeight: 640,
        density: 'comfortable',
        fontScale: 1,
        shadowStrength: 0.68,
        launcherSize: 'md',
        launcherPosition: 'bottom-right',
        primaryColor: '#1769e0',
      },
    },
  },
  {
    id: 'siteaware-default',
    label: 'SiteAware Default',
    note: 'Balanced baseline setup',
    config: {
      assistantIcon: 'orb-01',
      launcher: 'circle-icon',
      chatShell: 'glass',
      header: 'header-avatar',
      assistantMessage: 'source-first',
      userMessage: 'bubble-rounded',
      inputBar: 'floating-input',
      sendButton: 'send-arrow',
      sourceCitation: 'source-chips',
      takeMeThere: 'cta-primary',
      theme: 'neutral-light',
      appearance: {
        radius: 'xl',
        widgetWidth: 420,
        widgetHeight: 620,
        density: 'comfortable',
        fontScale: 1,
        shadowStrength: 0.9,
        launcherSize: 'md',
        launcherPosition: 'bottom-left',
        primaryColor: '#7cc8ff',
      },
    },
  },
  {
    id: 'clean-saas',
    label: 'Clean SaaS',
    note: 'Bright product dashboard',
    config: {
      assistantIcon: 'sphere-16',
      launcher: 'icon-text',
      chatShell: 'modern-saas',
      header: 'header-actions',
      assistantMessage: 'modern-saas',
      userMessage: 'pill',
      inputBar: 'command-bar',
      sendButton: 'send-filled',
      sourceCitation: 'source-inline-badge',
      takeMeThere: 'cta-arrow',
      theme: 'blue-saas',
      appearance: {
        radius: 'lg',
        widgetWidth: 420,
        widgetHeight: 620,
        density: 'comfortable',
        fontScale: 1,
        shadowStrength: 0.8,
        launcherSize: 'md',
        launcherPosition: 'bottom-right',
        primaryColor: '#4fa3ff',
      },
    },
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    note: 'Structured and formal',
    config: {
      assistantIcon: 'shield-15',
      launcher: 'enterprise',
      chatShell: 'enterprise',
      header: 'header-enterprise',
      assistantMessage: 'structured',
      userMessage: 'outline',
      inputBar: 'bordered-input',
      sendButton: 'send-outline',
      sourceCitation: 'source-evidence',
      takeMeThere: 'cta-inline-nav',
      theme: 'graphite',
      appearance: {
        radius: 'md',
        widgetWidth: 440,
        widgetHeight: 640,
        density: 'compact',
        fontScale: 0.98,
        shadowStrength: 0.7,
        launcherSize: 'md',
        launcherPosition: 'right-edge',
        primaryColor: '#94a3b8',
      },
    },
  },
  {
    id: 'dark-ai',
    label: 'Dark AI',
    note: 'High contrast futuristic',
    config: {
      assistantIcon: 'premium-20',
      launcher: 'gradient',
      chatShell: 'glass',
      header: 'header-premium',
      assistantMessage: 'premium',
      userMessage: 'floating',
      inputBar: 'glass-composer',
      sendButton: 'send-glow',
      sourceCitation: 'source-doc-page',
      takeMeThere: 'cta-premium',
      theme: 'premium-black',
      appearance: {
        radius: 'xl',
        widgetWidth: 430,
        widgetHeight: 640,
        density: 'comfortable',
        fontScale: 1.02,
        shadowStrength: 1,
        launcherSize: 'lg',
        launcherPosition: 'bottom-left',
        primaryColor: '#d8b16a',
      },
    },
  },
  {
    id: 'friendly',
    label: 'Friendly',
    note: 'Warm approachable assistant',
    config: {
      assistantIcon: 'face-13',
      launcher: 'friendly',
      chatShell: 'soft-assistant',
      header: 'header-soft',
      assistantMessage: 'soft-gray',
      userMessage: 'tail',
      inputBar: 'pill-input',
      sendButton: 'send-circle',
      sourceCitation: 'source-footer',
      takeMeThere: 'cta-chip',
      theme: 'warm-beige',
      appearance: {
        radius: 'xl',
        widgetWidth: 410,
        widgetHeight: 600,
        density: 'comfortable',
        fontScale: 1.02,
        shadowStrength: 0.75,
        launcherSize: 'md',
        launcherPosition: 'bottom-right',
        primaryColor: '#f0b26f',
      },
    },
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    note: 'Calm and trustworthy',
    config: {
      assistantIcon: 'shield-15',
      launcher: 'status-dot',
      chatShell: 'rounded',
      header: 'header-status',
      assistantMessage: 'bordered-card',
      userMessage: 'outline',
      inputBar: 'classic-input',
      sendButton: 'send-compact',
      sourceCitation: 'source-numbered',
      takeMeThere: 'cta-highlighted',
      theme: 'healthcare',
      appearance: {
        radius: 'lg',
        widgetWidth: 420,
        widgetHeight: 620,
        density: 'comfortable',
        fontScale: 1,
        shadowStrength: 0.8,
        launcherSize: 'md',
        launcherPosition: 'bottom-right',
        primaryColor: '#55c7d8',
      },
    },
  },
  {
    id: 'education',
    label: 'Education',
    note: 'Campus portal friendly',
    config: {
      assistantIcon: 'nodes-04',
      launcher: 'assistant-name',
      chatShell: 'side-panel',
      header: 'header-subtitle',
      assistantMessage: 'source-first',
      userMessage: 'pill',
      inputBar: 'card-composer',
      sendButton: 'send-lift',
      sourceCitation: 'source-doc-page',
      takeMeThere: 'cta-subtle',
      theme: 'education',
      appearance: {
        radius: 'lg',
        widgetWidth: 440,
        widgetHeight: 650,
        density: 'comfortable',
        fontScale: 1,
        shadowStrength: 0.85,
        launcherSize: 'md',
        launcherPosition: 'left-edge',
        primaryColor: '#5f89ff',
      },
    },
  },
  {
    id: 'premium',
    label: 'Premium',
    note: 'Polished luxury product',
    config: {
      assistantIcon: 'premium-20',
      launcher: 'premium',
      chatShell: 'premium',
      header: 'header-premium',
      assistantMessage: 'premium',
      userMessage: 'premium',
      inputBar: 'premium-composer',
      sendButton: 'send-premium',
      sourceCitation: 'source-expanding-card',
      takeMeThere: 'cta-destination-card',
      theme: 'premium-black',
      appearance: {
        radius: 'xl',
        widgetWidth: 440,
        widgetHeight: 660,
        density: 'spacious',
        fontScale: 1.04,
        shadowStrength: 1,
        launcherSize: 'lg',
        launcherPosition: 'right-edge',
        primaryColor: '#d8b16a',
      },
    },
  },
];

export const categories: { id: StudioCategory; label: string; note: string }[] = [
  { id: 'assistantIcon', label: 'AI Icons', note: '20 icon treatments' },
  { id: 'launcher', label: 'Launchers', note: '20 trigger styles' },
  { id: 'chatShell', label: 'Chat Shells', note: '12 window styles' },
  { id: 'assistantMessage', label: 'AI Messages', note: '12 response styles' },
  { id: 'userMessage', label: 'User Messages', note: '12 user bubbles' },
  { id: 'inputBar', label: 'Input Bars', note: '10 composer styles' },
  { id: 'sendButton', label: 'Send Buttons', note: '15 send actions' },
  { id: 'header', label: 'Headers', note: '10 header layouts' },
  { id: 'sourceCitation', label: 'Sources', note: '8 citation patterns' },
  { id: 'takeMeThere', label: 'CTA', note: '10 destination actions' },
  { id: 'theme', label: 'Themes', note: '12 palettes' },
];

export function buildThemeStyle(palette: ThemePalette, appearance: AppearanceConfig): CSSProperties {
  const tokens = 'tokens' in palette ? palette.tokens : palette;
  const secondary = tokens.secondary ?? tokens.primary;
  const accent = tokens.accent ?? tokens.primary;
  const assistantText = tokens.assistantText ?? tokens.text;
  const userText = tokens.userText ?? tokens.primaryText;
  const link = tokens.link ?? tokens.primary;
  const focusRing = tokens.focusRing ?? tokens.primary;
  const overlay = tokens.overlay ?? 'rgba(0, 0, 0, 0.42)';
  const spotlightRing = tokens.spotlightRing ?? tokens.primary;
  const spotlightGlow = tokens.spotlightGlow ?? tokens.primary;
  const tooltipBackground = tokens.tooltipBackground ?? tokens.surfaceSecondary;
  const tooltipText = tokens.tooltipText ?? tokens.text;

  return {
    ['--background' as never]: tokens.background,
    ['--surface' as never]: tokens.surface,
    ['--surface-secondary' as never]: tokens.surfaceSecondary,
    ['--text' as never]: tokens.text,
    ['--muted-text' as never]: tokens.mutedText,
    ['--primary' as never]: appearance.primaryColor || tokens.primary,
    ['--primary-text' as never]: tokens.primaryText,
    ['--secondary' as never]: secondary,
    ['--accent' as never]: accent,
    ['--border' as never]: tokens.border,
    ['--assistant-bubble' as never]: tokens.assistantBubble,
    ['--assistant-text' as never]: assistantText,
    ['--user-bubble' as never]: tokens.userBubble,
    ['--user-text' as never]: userText,
    ['--link' as never]: link,
    ['--focus-ring' as never]: focusRing,
    ['--success' as never]: tokens.success,
    ['--warning' as never]: tokens.warning,
    ['--danger' as never]: tokens.danger,
    ['--overlay' as never]: overlay,
    ['--spotlight-ring' as never]: spotlightRing,
    ['--spotlight-glow' as never]: spotlightGlow,
    ['--tooltip-background' as never]: tooltipBackground,
    ['--tooltip-text' as never]: tooltipText,
    ['--shadow-color' as never]: tokens.shadow,
    ['--radius' as never]: appearance.radius === 'sm' ? '14px' : appearance.radius === 'md' ? '18px' : appearance.radius === 'lg' ? '24px' : '30px',
    ['--font-scale' as never]: String(appearance.fontScale),
    ['--shadow-strength' as never]: String(appearance.shadowStrength),
    ['--widget-width' as never]: `${appearance.widgetWidth}px`,
    ['--widget-height' as never]: `${appearance.widgetHeight}px`,
    ['--launcher-size' as never]: appearance.launcherSize,
  } as CSSProperties;
}
