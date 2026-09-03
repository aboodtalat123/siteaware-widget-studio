import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import AutoMatchPanel from './AutoMatchPanel';
import {
  assistantIcons,
  assistantMessages,
  buildThemeStyle,
  categories,
  chatShellVariants,
  headerVariants,
  inputBars,
  launcherVariants,
  presetDefinitions,
  sendButtons,
  sourceCitationVariants,
  takeMeThereVariants,
  themePalettes,
  userMessages,
  type DeviceMode,
  type StudioCategory,
  type StudioConfig,
  type VariantItem,
} from './studioData';
import {
  applyPrimaryOverride,
  analyzeWebsiteStyle,
  autoThemeStorageKey,
  generateThemeRecommendations,
  type WebsiteStyleSnapshot,
  type GeneratedThemeRecommendation,
} from './themeIntelligence';

type PreviewMode = 'build' | 'preview' | 'test';
type StudioMode = PreviewMode | 'auto-match' | 'design';
type ViewMode = 'desktop' | 'tablet' | 'mobile';
type UILocale = 'en' | 'ar';
type ThemeMode = 'light' | 'dark';

type ConversationMessage = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  sources?: string[];
  action?: string;
  status?: 'typing' | 'loading' | 'error';
};

type SavedPreset = {
  id: string;
  name: string;
  config: StudioConfig;
};

type ApiHealth = {
  ok: boolean;
  mode: 'ready' | 'missing_key' | 'error';
  provider: string;
  model: string;
  message: string;
};

type DesignPatch = Partial<Omit<StudioConfig, 'appearance'>> & {
  appearance?: Partial<StudioConfig['appearance']>;
  themeMode?: ThemeMode;
  widgetOpen?: boolean;
  focusCategory?: StudioCategory;
};

type DesignResponse = {
  ok: boolean;
  mode: 'ready' | 'missing_key' | 'error';
  provider: string;
  model: string;
  message: string;
  summary?: string;
  reasoning?: string[];
  patch?: DesignPatch;
};

const storageKey = 'siteaware-widget-studio-config-v2';
const savedPresetsKey = 'siteaware-widget-studio-presets-v1';
const localeKey = 'siteaware-widget-studio-locale-v1';
const themeModeKey = 'siteaware-widget-studio-theme-mode-v1';

const defaultPreset = presetDefinitions.find((preset) => preset.id === 'apple-calm') ?? presetDefinitions[0]!;
const defaultConfig: StudioConfig = defaultPreset.config;
const defaultStyleInput = `:root {
  --primary: #2563eb;
  --background: #ffffff;
  --surface: #f6f8fd;
  --text: #111827;
  --radius: 18px;
}

body {
  font-family: "Manrope", sans-serif;
}`;

const previewSites = [
  {
    id: 'acme',
    name: { en: 'ACME Dashboard', ar: 'لوحة ACME' },
    blurb: { en: 'Billing, API keys, security, and team settings.', ar: 'الفوترة، مفاتيح API، الأمان، وإعدادات الفريق.' },
    vibe: { en: 'Enterprise SaaS', ar: 'برنامج شركات' },
    lines: {
      en: ['Overview', 'Billing', 'Settings', 'API Keys', 'Security'],
      ar: ['نظرة عامة', 'الفوترة', 'الإعدادات', 'مفاتيح API', 'الأمان'],
    },
  },
  {
    id: 'university',
    name: { en: 'Campus Portal', ar: 'بوابة الجامعة' },
    blurb: { en: 'Admissions, programs, schedules, and support.', ar: 'القبول، البرامج، الجداول، والدعم.' },
    vibe: { en: 'University', ar: 'جامعة' },
    lines: {
      en: ['Admissions', 'Programs', 'Academic Calendar', 'Financial Aid', 'Help Center'],
      ar: ['القبول', 'البرامج', 'التقويم الأكاديمي', 'المساعدات المالية', 'مركز المساعدة'],
    },
  },
  {
    id: 'shop',
    name: { en: 'Commerce Store', ar: 'متجر إلكتروني' },
    blurb: { en: 'Orders, shipping, returns, and payment preferences.', ar: 'الطلبات، الشحن، المرتجعات، وتفضيلات الدفع.' },
    vibe: { en: 'E-commerce', ar: 'تجارة إلكترونية' },
    lines: {
      en: ['Orders', 'Shipping', 'Returns', 'Payments', 'Support'],
      ar: ['الطلبات', 'الشحن', 'المرتجعات', 'المدفوعات', 'الدعم'],
    },
  },
  {
    id: 'clinic',
    name: { en: 'Clinic Admin', ar: 'إدارة العيادة' },
    blurb: { en: 'Appointments, patient tools, and intake workflows.', ar: 'المواعيد، أدوات المرضى، ومسارات الاستقبال.' },
    vibe: { en: 'Healthcare', ar: 'صحة' },
    lines: {
      en: ['Appointments', 'Patients', 'Intake', 'Billing', 'Messages'],
      ar: ['المواعيد', 'المرضى', 'الاستقبال', 'الفوترة', 'الرسائل'],
    },
  },
] as const;

const designPromptSuggestions = {
  ar: [
    'خلّي التصميم أبيض ونظيف، والأيقونة دائرية، والمحادثة احترافية على اليسار.',
    'بدي ستايل جامعي قريب من الصور: أيقونة يمين صغيرة وشات يسار طويل.',
    'خفف الاستدارة، كبّر عرض المحادثة، وخلي زر الإرسال دائري وواضح.',
    'اعمل شكل مؤسسي رسمي بالأسود والأبيض مع محادثة مرتبة ومصادر واضحة.',
  ],
  en: [
    'Make it a clean white widget with a circular launcher and a structured left chat panel.',
    'Create a university-style assistant with a compact right icon and a tall left docked chat.',
    'Reduce corner radius, widen the chat, and use a more obvious circular send button.',
    'Give it a formal black-and-white enterprise style with clear citations and tidy spacing.',
  ],
} as const;

function buildInitialConversation(locale: UILocale): ConversationMessage[] {
  if (locale === 'ar') {
    return [
      {
        id: 1,
        role: 'assistant',
        text: 'أهلاً، أقدر أساعدك داخل هذه الصفحة. اسألني عن أي إعداد أو زر.',
        sources: ['نظرة الإعدادات', 'مركز المساعدة'],
        action: 'افتح المصدر',
      },
      {
        id: 2,
        role: 'user',
        text: 'من وين أغير مفتاح API؟',
      },
      {
        id: 3,
        role: 'assistant',
        text: 'تقدر تغيّر مفاتيح API من الإعدادات > مفاتيح API. أنا لقيت الخيار في القائمة الجانبية وتأكدت من شرح المساعدة.',
        sources: ['الإعدادات > مفاتيح API', 'مقال الأمان', 'الموقع الحالي'],
        action: 'خذني لهناك',
      },
    ];
  }

  return [
    {
      id: 1,
      role: 'assistant',
      text: 'Hi, I can help with anything on this page. Ask me where a setting lives or what a control does.',
      sources: ['Settings overview', 'Help center'],
      action: 'Open source',
    },
    {
      id: 2,
      role: 'user',
      text: 'Where can I change my API key?',
    },
    {
      id: 3,
      role: 'assistant',
      text: 'You can manage your API keys from Settings → API Keys. I found the control in the left rail and the help article confirms it.',
      sources: ['Settings → API Keys', 'Help article: Account Security', 'Current site'],
      action: 'Take me there',
    },
  ];
}

function buildThemeModeStyle(themeMode: ThemeMode): CSSProperties {
  if (themeMode === 'dark') {
    return {
      colorScheme: 'dark',
      ['--background' as never]: '#07111d',
      ['--surface' as never]: '#0f1a2b',
      ['--surface-secondary' as never]: '#142338',
      ['--text' as never]: '#f7fbff',
      ['--muted-text' as never]: '#a9b8d1',
      ['--border' as never]: 'rgba(138, 195, 255, 0.16)',
      ['--assistant-bubble' as never]: 'rgba(255, 255, 255, 0.06)',
      ['--user-bubble' as never]: 'rgba(124, 200, 255, 0.18)',
    };
  }

  return {
    colorScheme: 'light',
    ['--background' as never]: '#f6f8fd',
    ['--surface' as never]: '#ffffff',
    ['--surface-secondary' as never]: '#eef3fb',
    ['--text' as never]: '#111827',
    ['--muted-text' as never]: '#556170',
    ['--border' as never]: 'rgba(17, 24, 39, 0.12)',
    ['--assistant-bubble' as never]: '#f3f6fb',
    ['--user-bubble' as never]: '#dbeafe',
  };
}

function buildConversationFallback(locale: UILocale, currentSiteName: string) {
  return locale === 'ar'
    ? {
        text: `حاليًا Gemini غير متصل، فعم أعرض معاينة محلية. اربط المفتاح بالخلفية عشان يجاوب مباشرة على ${currentSiteName}.`,
        sources: ['Gemini API', currentSiteName],
        action: 'ربط Gemini',
      }
    : {
        text: `Gemini is not connected yet, so this is a local preview. Connect the backend key to get live replies on ${currentSiteName}.`,
        sources: ['Gemini API', currentSiteName],
        action: 'Connect Gemini',
      };
}

function loadConfig(): StudioConfig {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return defaultConfig;
    }
    const parsed = JSON.parse(raw) as Partial<StudioConfig>;
    return {
      ...defaultConfig,
      ...parsed,
      appearance: {
        ...defaultConfig.appearance,
        ...(parsed.appearance ?? {}),
      },
    };
  } catch {
    return defaultConfig;
  }
}

function storeConfig(config: StudioConfig) {
  localStorage.setItem(storageKey, JSON.stringify(config, null, 2));
}

function loadAutoTheme(): GeneratedThemeRecommendation | null {
  try {
    const raw = localStorage.getItem(autoThemeStorageKey);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as GeneratedThemeRecommendation;
  } catch {
    return null;
  }
}

function storeAutoTheme(theme: GeneratedThemeRecommendation | null) {
  if (!theme) {
    localStorage.removeItem(autoThemeStorageKey);
    return;
  }
  localStorage.setItem(autoThemeStorageKey, JSON.stringify(theme, null, 2));
}

function loadSavedPresets(): SavedPreset[] {
  try {
    const raw = localStorage.getItem(savedPresetsKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as SavedPreset[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function storeSavedPresets(presets: SavedPreset[]) {
  localStorage.setItem(savedPresetsKey, JSON.stringify(presets, null, 2));
}

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function extractStyleSnapshot(input: string, locale: UILocale): WebsiteStyleSnapshot {
  const hexMatches = [...input.matchAll(/#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g)].map((match) => match[0]);
  const uniqueColors = Array.from(new Set(hexMatches));
  const fontMatch = input.match(/font-family\s*:\s*([^;]+);?/i);
  const fontFamilies = fontMatch
    ? (fontMatch[1] ?? '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : ['"Space Grotesk"', '"Inter"', 'system-ui'];
  const radiusMatch = input.match(/(?:border-radius|radius)\s*[:=]\s*(\d+(?:\.\d+)?)px/i);
  const radiusValue = radiusMatch ? Number(radiusMatch[1]) : 18;
  const darkHint = /#0[0-9a-f]{2,}|#1[0-9a-f]{2,}|#2[0-9a-f]{2,}|dark|black|#111|#222/i.test(input);
  const lightHint = /white|light|#fff|#f[0-9a-f]{2,}/i.test(input);
  const pageMode = darkHint && !lightHint ? 'dark' : !darkHint && lightHint ? 'light' : 'mixed';
  const brand = uniqueColors[0] ?? '#2563eb';
  const background = uniqueColors[1] ?? (pageMode === 'dark' ? '#0f172a' : '#ffffff');
  const surface = uniqueColors[2] ?? (pageMode === 'dark' ? '#111827' : '#f6f8fd');
  const text = uniqueColors[3] ?? (pageMode === 'dark' ? '#f8fafc' : '#111827');
  const muted = uniqueColors[4] ?? (pageMode === 'dark' ? '#94a3b8' : '#6b7280');
  const border = uniqueColors[5] ?? (pageMode === 'dark' ? '#334155' : '#dbe4f0');
  const accent = uniqueColors[6] ?? brand;

  return {
    pageMode,
    pageBackground: background,
    surfaceColors: [surface, background],
    textColors: [text],
    mutedTextColors: [muted],
    borderColors: [border],
    brandColors: [brand],
    accentColors: [accent],
    linkColors: [brand],
    buttonColors: [brand, accent],
    fontFamilies,
    headingWeight: 700,
    bodyWeight: 400,
    buttonRadius: radiusValue,
    cardRadius: radiusValue,
    inputRadius: radiusValue,
    source: {
      hostname: locale === 'ar' ? 'style.input' : 'style.input',
      title: locale === 'ar' ? 'تحليل ستايل الموقع' : 'Website style input',
    },
  };
}

function getCollection(category: StudioCategory): VariantItem[] {
  switch (category) {
    case 'assistantIcon':
      return assistantIcons;
    case 'launcher':
      return launcherVariants;
    case 'chatShell':
      return chatShellVariants;
    case 'assistantMessage':
      return assistantMessages;
    case 'userMessage':
      return userMessages;
    case 'inputBar':
      return inputBars;
    case 'sendButton':
      return sendButtons;
    case 'header':
      return headerVariants;
    case 'sourceCitation':
      return sourceCitationVariants;
    case 'takeMeThere':
      return takeMeThereVariants;
    case 'theme':
      return themePalettes.map((theme) => ({
        id: theme.id,
        label: theme.label,
        note: theme.note,
        preview: <span>{theme.label.split(' ')[0]}</span>,
        keywords: [theme.id, theme.label, theme.note],
      }));
  }
}

function App() {
  const [config, setConfig] = useState<StudioConfig>(loadConfig);
  const [mode, setMode] = useState<StudioMode>('build');
  const [viewMode, setViewMode] = useState<ViewMode>('desktop');
  const [selectedSite, setSelectedSite] = useState<(typeof previewSites)[number]>(previewSites[0]);
  const [locale, setLocale] = useState<UILocale>(() => {
    const stored = localStorage.getItem(localeKey);
    return stored === 'ar' ? 'ar' : 'en';
  });
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(themeModeKey);
    return stored === 'dark' ? 'dark' : 'light';
  });
  const [selectedCategory, setSelectedCategory] = useState<StudioCategory>('launcher');
  const [search, setSearch] = useState('');
  const [conversation, setConversation] = useState<ConversationMessage[]>(() => buildInitialConversation('en'));
  const [composer, setComposer] = useState('Where can I change my API key?');
  const [widgetOpen, setWidgetOpen] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [apiHealth, setApiHealth] = useState<ApiHealth | null>(null);
  const [activeAutoTheme, setActiveAutoTheme] = useState<GeneratedThemeRecommendation | null>(loadAutoTheme);
  const [namedPreset, setNamedPreset] = useState('My preset');
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>(loadSavedPresets);
  const [designPrompt, setDesignPrompt] = useState(() =>
    'Make the launcher compact on the far right and the assistant a wider left dock with a clean white theme.',
  );
  const [designStatus, setDesignStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [designSummary, setDesignSummary] = useState('');
  const [designReasoning, setDesignReasoning] = useState<string[]>([]);
  const [styleInput, setStyleInput] = useState(defaultStyleInput);
  const [styleAnalysis, setStyleAnalysis] = useState('');
  const [styleStatus, setStyleStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [styleReasoning, setStyleReasoning] = useState<string[]>([]);

  useEffect(() => {
    storeConfig(config);
  }, [config]);

  useEffect(() => {
    storeAutoTheme(activeAutoTheme);
  }, [activeAutoTheme]);

  useEffect(() => {
    storeSavedPresets(savedPresets);
  }, [savedPresets]);

  useEffect(() => {
    localStorage.setItem(localeKey, locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  useEffect(() => {
    localStorage.setItem(themeModeKey, themeMode);
  }, [themeMode]);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | undefined;

    async function loadHealth() {
      try {
        const response = await fetch('/api/health');
        const data = (await response.json()) as ApiHealth;
        if (!cancelled) {
          setApiHealth(data);
          if (data.mode === 'ready') {
            if (intervalId) {
              window.clearInterval(intervalId);
            }
          }
        }
      } catch {
        if (!cancelled) {
          setApiHealth({
            ok: false,
            mode: 'error',
            provider: 'gemini',
            model: 'gemini-3.7-flash',
            message: 'Backend API is unavailable.',
          });
        }
      }
    }

    void loadHealth();
    intervalId = window.setInterval(() => {
      void loadHealth();
    }, 2500);

    return () => {
      cancelled = true;
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  useEffect(() => {
    setConversation(buildInitialConversation(locale));
    setComposer(locale === 'ar' ? 'من وين أغير مفتاح API؟' : 'Where can I change my API key?');
    setWidgetOpen(true);
    setStatus('idle');
    setIsTyping(false);
    setDesignPrompt(
      locale === 'ar'
        ? 'خلّي أيقونة الذكاء على أقصى اليمين والمحادثة على أقصى اليسار بشكل أبيض مرتب.'
        : 'Keep the AI launcher on the far right and the assistant on the far left with a clean white look.',
    );
  }, [selectedSite.id, locale]);

  const resolvedAutoTheme = activeAutoTheme ? applyPrimaryOverride(activeAutoTheme, config.appearance.primaryColor) : null;
  const activeTheme = resolvedAutoTheme ?? themePalettes.find((theme) => theme.id === config.theme) ?? themePalettes[0]!;
  const currentIconPreview = assistantIcons.find((item) => item.id === config.assistantIcon)?.preview ?? assistantIcons[0]?.preview ?? null;
  const currentChatShell = chatShellVariants.find((item) => item.id === config.chatShell);
  const currentAssistantMessage = assistantMessages.find((item) => item.id === config.assistantMessage);
  const currentUserMessage = userMessages.find((item) => item.id === config.userMessage);
  const currentInputBar = inputBars.find((item) => item.id === config.inputBar);
  const currentSendButton = sendButtons.find((item) => item.id === config.sendButton);
  const currentHeader = headerVariants.find((item) => item.id === config.header);
  const currentSource = sourceCitationVariants.find((item) => item.id === config.sourceCitation);
  const currentCta = takeMeThereVariants.find((item) => item.id === config.takeMeThere);
  const currentSourceLabel =
    sourceCitationVariants.find((item) => item.id === config.sourceCitation)?.label ?? (locale === 'ar' ? 'المصادر' : 'Sources');
  const currentCtaLabel = takeMeThereVariants.find((item) => item.id === config.takeMeThere)?.label ?? (locale === 'ar' ? 'خذني لهناك' : 'Take me there');
  const extraCategory: StudioCategory = ['assistantIcon', 'chatShell', 'theme'].includes(selectedCategory)
    ? 'launcher'
    : selectedCategory;
  const currentSite = locale === 'ar'
    ? {
        name: selectedSite.name.ar,
        blurb: selectedSite.blurb.ar,
        vibe: selectedSite.vibe.ar,
        lines: selectedSite.lines.ar,
      }
    : {
        name: selectedSite.name.en,
        blurb: selectedSite.blurb.en,
        vibe: selectedSite.vibe.en,
        lines: selectedSite.lines.en,
      };
  const activeCategoryItems = useMemo(() => {
    const items = getCollection(extraCategory);
    const query = search.trim().toLowerCase();
    if (!query) {
      return items;
    }
    return items.filter((item) => {
      const haystack = [item.id, item.label, item.note, ...(item.keywords ?? [])].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [search, extraCategory]);

  const visibleCounts = {
    assistantIcon: assistantIcons.length,
    launcher: launcherVariants.length,
    chatShell: chatShellVariants.length,
    assistantMessage: assistantMessages.length,
    userMessage: userMessages.length,
    inputBar: inputBars.length,
    sendButton: sendButtons.length,
    header: headerVariants.length,
    sourceCitation: sourceCitationVariants.length,
    takeMeThere: takeMeThereVariants.length,
    theme: themePalettes.length,
  };

  function updateConfig<K extends keyof StudioConfig>(key: K, value: StudioConfig[K]) {
    setConfig((previous) => ({ ...previous, [key]: value }));
  }

  function updateAppearance<K extends keyof StudioConfig['appearance']>(key: K, value: StudioConfig['appearance'][K]) {
    setConfig((previous) => ({
      ...previous,
      appearance: {
        ...previous.appearance,
        [key]: value,
      },
    }));
  }

  function applyPreset(presetId: string) {
    const preset = presetDefinitions.find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }
    setConfig(preset.config);
    setThemeMode(['dark-ai', 'premium'].includes(presetId) ? 'dark' : 'light');
    setActiveAutoTheme(null);
    setWidgetOpen(true);
    setConversation(buildInitialConversation(locale));
    setComposer(locale === 'ar' ? 'من وين أغير مفتاح API؟' : 'Where can I change my API key?');
  }

  function savePreset() {
    storeConfig(config);
  }

  function saveNamedPreset() {
    const name = namedPreset.trim() || 'Untitled preset';
    setSavedPresets((previous) => [
      { id: `${Date.now()}`, name, config: structuredClone(config) },
      ...previous,
    ]);
  }

  function duplicatePreset(preset: SavedPreset) {
    setSavedPresets((previous) => [
      { id: `${Date.now()}`, name: `${preset.name} copy`, config: structuredClone(preset.config) },
      ...previous,
    ]);
  }

  function renamePreset(preset: SavedPreset) {
    const nextName = window.prompt('Rename preset', preset.name)?.trim();
    if (!nextName) {
      return;
    }
    setSavedPresets((previous) => previous.map((entry) => (entry.id === preset.id ? { ...entry, name: nextName } : entry)));
  }

  function deletePreset(preset: SavedPreset) {
    setSavedPresets((previous) => previous.filter((entry) => entry.id !== preset.id));
  }

  function applySavedPreset(preset: SavedPreset) {
    setConfig(preset.config);
    setActiveAutoTheme(null);
    setWidgetOpen(true);
  }

  function applyCopilotTemplate() {
    setConfig((previous) => ({
      ...previous,
      assistantIcon: 'spark-02',
      launcher: 'circle-icon',
      chatShell: 'side-panel',
      assistantMessage: 'modern-saas',
      userMessage: 'bubble-rounded',
      inputBar: 'floating-input',
      sendButton: 'send-circle',
      header: 'header-docked',
      sourceCitation: 'source-chips',
      takeMeThere: 'cta-primary',
      theme: 'neutral-light',
      themeOrigin: 'manual',
      appearance: {
        ...previous.appearance,
        radius: 'md',
        widgetWidth: 420,
        widgetHeight: 720,
        density: 'comfortable',
        shadowStrength: 0.72,
        launcherSize: 'md',
        launcherPosition: 'bottom-right',
        primaryColor: '#111111',
      },
    }));
    setActiveAutoTheme(null);
    setThemeMode('light');
    setViewMode('desktop');
    setWidgetOpen(true);
    setMode('preview');
  }

  function buildDesignCatalog() {
    return {
      assistantIcon: assistantIcons.map(({ id, label, note }) => ({ id, label, note })),
      launcher: launcherVariants.map(({ id, label, note }) => ({ id, label, note })),
      chatShell: chatShellVariants.map(({ id, label, note }) => ({ id, label, note })),
      header: headerVariants.map(({ id, label, note }) => ({ id, label, note })),
      assistantMessage: assistantMessages.map(({ id, label, note }) => ({ id, label, note })),
      userMessage: userMessages.map(({ id, label, note }) => ({ id, label, note })),
      inputBar: inputBars.map(({ id, label, note }) => ({ id, label, note })),
      sendButton: sendButtons.map(({ id, label, note }) => ({ id, label, note })),
      sourceCitation: sourceCitationVariants.map(({ id, label, note }) => ({ id, label, note })),
      takeMeThere: takeMeThereVariants.map(({ id, label, note }) => ({ id, label, note })),
      theme: themePalettes.map(({ id, label, note }) => ({ id, label, note })),
      radius: ['sm', 'md', 'lg', 'xl'],
      density: ['compact', 'comfortable', 'spacious'],
      launcherSize: ['sm', 'md', 'lg'],
      launcherPosition: ['bottom-right', 'bottom-left', 'left-edge', 'right-edge'],
      focusCategory: categories.map(({ id, label }) => ({ id, label })),
    };
  }

  function normalizeDesignPatch(patch: DesignPatch | undefined): DesignPatch {
    if (!patch || typeof patch !== 'object') {
      return {};
    }

    const categoryIds = new Set(categories.map((item) => item.id));
    const optionSets = {
      assistantIcon: new Set(assistantIcons.map((item) => item.id)),
      launcher: new Set(launcherVariants.map((item) => item.id)),
      chatShell: new Set(chatShellVariants.map((item) => item.id)),
      header: new Set(headerVariants.map((item) => item.id)),
      assistantMessage: new Set(assistantMessages.map((item) => item.id)),
      userMessage: new Set(userMessages.map((item) => item.id)),
      inputBar: new Set(inputBars.map((item) => item.id)),
      sendButton: new Set(sendButtons.map((item) => item.id)),
      sourceCitation: new Set(sourceCitationVariants.map((item) => item.id)),
      takeMeThere: new Set(takeMeThereVariants.map((item) => item.id)),
      theme: new Set(themePalettes.map((item) => item.id)),
    } as const;

    const nextPatch: DesignPatch = {};
    for (const key of Object.keys(optionSets) as Array<keyof typeof optionSets>) {
      const candidate = patch[key];
      if (typeof candidate === 'string' && optionSets[key].has(candidate)) {
        nextPatch[key] = candidate as never;
      }
    }

    if (patch.appearance && typeof patch.appearance === 'object') {
      const appearance = patch.appearance;
      const nextAppearance: Partial<StudioConfig['appearance']> = {};

      if (appearance.radius && ['sm', 'md', 'lg', 'xl'].includes(appearance.radius)) {
        nextAppearance.radius = appearance.radius;
      }
      if (typeof appearance.widgetWidth === 'number') {
        nextAppearance.widgetWidth = clamp(Math.round(appearance.widgetWidth), 360, 520);
      }
      if (typeof appearance.widgetHeight === 'number') {
        nextAppearance.widgetHeight = clamp(Math.round(appearance.widgetHeight), 500, 760);
      }
      if (appearance.density && ['compact', 'comfortable', 'spacious'].includes(appearance.density)) {
        nextAppearance.density = appearance.density;
      }
      if (typeof appearance.fontScale === 'number') {
        nextAppearance.fontScale = clamp(Number(appearance.fontScale.toFixed(2)), 0.9, 1.12);
      }
      if (typeof appearance.shadowStrength === 'number') {
        nextAppearance.shadowStrength = clamp(Number(appearance.shadowStrength.toFixed(2)), 0.45, 1.2);
      }
      if (appearance.launcherSize && ['sm', 'md', 'lg'].includes(appearance.launcherSize)) {
        nextAppearance.launcherSize = appearance.launcherSize;
      }
      if (appearance.launcherPosition && ['bottom-right', 'bottom-left', 'left-edge', 'right-edge'].includes(appearance.launcherPosition)) {
        nextAppearance.launcherPosition = appearance.launcherPosition;
      }
      if (typeof appearance.primaryColor === 'string' && /^#[0-9a-f]{6}$/i.test(appearance.primaryColor.trim())) {
        nextAppearance.primaryColor = appearance.primaryColor.trim();
      }

      if (Object.keys(nextAppearance).length) {
        nextPatch.appearance = nextAppearance;
      }
    }

    if (patch.themeMode === 'light' || patch.themeMode === 'dark') {
      nextPatch.themeMode = patch.themeMode;
    }
    if (typeof patch.widgetOpen === 'boolean') {
      nextPatch.widgetOpen = patch.widgetOpen;
    }
    if (typeof patch.focusCategory === 'string' && categoryIds.has(patch.focusCategory)) {
      nextPatch.focusCategory = patch.focusCategory;
    }

    return nextPatch;
  }

  function applyDesignPatch(patch: DesignPatch) {
    const normalized = normalizeDesignPatch(patch);
    const { appearance, themeMode: nextThemeMode, widgetOpen: nextWidgetOpen, focusCategory, ...rest } = normalized;

    if (Object.keys(rest).length || appearance) {
      setConfig((previous) => ({
        ...previous,
        ...rest,
        appearance: {
          ...previous.appearance,
          ...(appearance ?? {}),
        },
      }));
      setActiveAutoTheme(null);
    }

    if (nextThemeMode) {
      setThemeMode(nextThemeMode);
    }
    if (typeof nextWidgetOpen === 'boolean') {
      setWidgetOpen(nextWidgetOpen);
    } else {
      setWidgetOpen(true);
    }
    if (focusCategory) {
      setSelectedCategory(focusCategory);
    }
  }

  function resetStudio() {
    setConfig(defaultConfig);
    setActiveAutoTheme(null);
    setSelectedCategory('launcher');
    setSearch('');
    setMode('build');
    setViewMode('desktop');
    setSelectedSite(previewSites[0]);
    setConversation(buildInitialConversation(locale));
    setComposer(locale === 'ar' ? 'من وين أغير مفتاح API؟' : 'Where can I change my API key?');
    setWidgetOpen(true);
  }

  function exportConfig() {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'siteaware-widget-studio-config.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function appendAssistantReply(reply: ConversationMessage) {
    setConversation((previous) => [...previous, reply]);
  }

  async function runTest() {
    if (!composer.trim() || isTyping) {
      return;
    }

    const userInput = composer.trim();
    const lastMessage = conversation[conversation.length - 1];
    const nextId = (lastMessage?.id ?? 0) + 1;
    const userMessage: ConversationMessage = {
      id: nextId,
      role: 'user',
      text: userInput,
    };

    const loadingMessage: ConversationMessage = {
      id: nextId + 1,
      role: 'assistant',
      text: locale === 'ar'
        ? 'أبحث في الصفحة الحالية ومصادر المحاكاة...'
        : 'Searching the selected page and your mock knowledge sources...',
      status: 'loading',
    };

    setConversation((previous) => [...previous, userMessage, loadingMessage]);
    // Keep the composer ready for the next question while Gemini is replying.
    setComposer('');
    setWidgetOpen(true);
    setIsTyping(true);
    setStatus('loading');

    try {
      if (apiHealth?.mode === 'ready') {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            locale,
            site: currentSite,
            // A smaller recent context keeps everyday replies responsive.
            conversation: [...conversation, userMessage].slice(-6),
            composer: userInput,
            config,
          }),
        });

        const data = (await response.json()) as Partial<ConversationMessage> & { reply?: string };
        if (!response.ok) {
          throw new Error(data.reply ?? `Request failed with ${response.status}`);
        }

        const replyText =
          typeof data.reply === 'string' && data.reply.trim().length
            ? data.reply.trim()
            : locale === 'ar'
              ? 'Gemini رجع بدون نص واضح، فعم أعرض الرد الافتراضي.'
              : 'Gemini returned no visible text, so the fallback response is shown.';

        setConversation((previous) =>
          previous
            .filter((message) => message.id !== loadingMessage.id)
            .concat({
              id: nextId + 2,
              role: 'assistant',
              text: replyText,
            }),
        );
        setStatus('idle');
      } else {
        const fallback = buildConversationFallback(locale, currentSite.name);
        setConversation((previous) =>
          previous
            .filter((message) => message.id !== loadingMessage.id)
            .concat({
              id: nextId + 2,
              role: 'assistant',
              text: fallback.text,
              sources: fallback.sources,
              action: fallback.action,
            }),
        );
        setStatus('error');
      }
    } catch {
      const fallback = buildConversationFallback(locale, currentSite.name);
      setConversation((previous) =>
        previous
          .filter((message) => message.id !== loadingMessage.id)
          .concat({
            id: nextId + 2,
            role: 'assistant',
            text: fallback.text,
            sources: fallback.sources,
            action: fallback.action,
          }),
      );
      setStatus('error');
    } finally {
      setIsTyping(false);
    }
  }

  function triggerErrorDemo() {
    const lastMessage = conversation[conversation.length - 1];
    const nextId = (lastMessage?.id ?? 0) + 1;
    appendAssistantReply({
      id: nextId,
      role: 'assistant',
      text:
        locale === 'ar'
          ? 'ما لقيت جوابًا موثوقًا في المصادر التجريبية. جرّب قسمًا آخر أو صغ السؤال بشكل مختلف.'
          : 'I could not find a reliable answer in the mock sources. Try another page section or rephrase your question.',
      status: 'error',
    });
    setStatus('error');
    setWidgetOpen(true);
  }

  function applyGeneratedTheme(recommendation: GeneratedThemeRecommendation) {
    setActiveAutoTheme(recommendation);
    setConfig((previous) => ({
      ...previous,
      theme: recommendation.themeId,
      themeOrigin: recommendation.origin,
      appearance: {
        ...previous.appearance,
        ...recommendation.appearance,
        primaryColor: recommendation.appearance.primaryColor,
      },
    }));
    setMode('auto-match');
    setWidgetOpen(true);
  }

  async function analyzeStyleInput() {
    if (!styleInput.trim()) {
      setStyleStatus('error');
      setStyleAnalysis(locale === 'ar' ? 'الصق CSS أو ألوان الموقع أولاً.' : 'Paste the website CSS or brand colors first.');
      return;
    }

    const snapshot = extractStyleSnapshot(styleInput, locale);
    const analysis = analyzeWebsiteStyle(snapshot);
    const recommendation = generateThemeRecommendations(snapshot)[0];

    if (!recommendation) {
      return;
    }

    const localSummary =
      locale === 'ar'
        ? `فهمت الستايل محلياً: ${analysis.inferredPageMode}، اللون الأساسي ${analysis.inferredPrimary}، والانحناء ${analysis.inferredRadius}.`
        : `Local style match: ${analysis.inferredPageMode}, primary ${analysis.inferredPrimary}, radius ${analysis.inferredRadius}.`;

    setStyleStatus(apiHealth?.mode === 'ready' ? 'loading' : 'idle');
    setStyleAnalysis(localSummary);
    setStyleReasoning(analysis.contrastNotes.slice(0, 3));
    setSelectedCategory('launcher');
    setActiveAutoTheme(recommendation);
    setConfig((previous) => ({
      ...previous,
      theme: recommendation.themeId,
      themeOrigin: recommendation.origin,
      appearance: {
        ...previous.appearance,
        ...recommendation.appearance,
        primaryColor: recommendation.appearance.primaryColor,
      },
    }));
    setThemeMode(snapshot.pageMode === 'dark' ? 'dark' : 'light');
    setWidgetOpen(true);

    if (apiHealth?.mode !== 'ready') {
      setStyleAnalysis(
        locale === 'ar'
          ? `${localSummary} تم تطبيق الاقتراح الآمن، وGemini غير متصل حالياً لإضافة رأيه.`
          : `${localSummary} The safe match is applied; Gemini is not connected for a second opinion.`,
      );
      return;
    }

    try {
      const response = await fetch('/api/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale,
          prompt:
            locale === 'ar'
              ? `حلّل CSS التالي واختر من الكتالوج شكل أيقونة وlauncher وتمبليت محادثة يناسب الموقع. حافظ على المساعد كلوحة جانبية يسار تضغط الصفحة، واشرح باختصار لماذا الاختيار مناسب. CSS:\n${styleInput.slice(0, 12000)}`
              : `Analyze this CSS and choose a matching icon, launcher, and chat template from the catalog. Keep the assistant as a left dock that pushes the page, and briefly explain why it fits. CSS:\n${styleInput.slice(0, 12000)}`,
          site: currentSite,
          config,
          themeMode: snapshot.pageMode === 'dark' ? 'dark' : 'light',
          catalog: buildDesignCatalog(),
        }),
      });
      const data = (await response.json()) as DesignResponse;
      if (!response.ok) {
        throw new Error(data.message || `Request failed with ${response.status}`);
      }

      applyDesignPatch(data.patch ?? {});
      setActiveAutoTheme(recommendation);
      setStyleAnalysis(data.summary ? `${localSummary} ${data.summary}` : localSummary);
      setStyleReasoning(Array.isArray(data.reasoning) ? data.reasoning.slice(0, 4) : analysis.contrastNotes.slice(0, 3));
      setStyleStatus('idle');
    } catch (error) {
      setStyleStatus('error');
      setStyleAnalysis(
        `${localSummary} ${
          locale === 'ar'
            ? 'تم تطبيق المطابقة المحلية، لكن تعذر أخذ اقتراح Gemini الآن.'
            : 'The local match is applied, but Gemini could not add a recommendation right now.'
        }`,
      );
      setStyleReasoning(error instanceof Error ? [error.message] : analysis.contrastNotes.slice(0, 3));
    }
  }

  async function runDesignCopilot() {
    if (!designPrompt.trim()) {
      return;
    }

    setMode('design');
    setDesignStatus('loading');
    setDesignSummary('');
    setDesignReasoning([]);

    try {
      const response = await fetch('/api/design', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locale,
          prompt: designPrompt.trim(),
          site: currentSite,
          config,
          themeMode,
          catalog: buildDesignCatalog(),
        }),
      });

      const data = (await response.json()) as DesignResponse;
      if (!response.ok) {
        throw new Error(data.message || `Request failed with ${response.status}`);
      }

      applyDesignPatch(data.patch ?? {});
      setDesignSummary(
        data.summary ??
          (locale === 'ar'
            ? 'تم تطبيق تعديلات الذكاء على التصميم الحالي.'
            : 'The AI designer applied changes to the current widget.'),
      );
      setDesignReasoning(Array.isArray(data.reasoning) ? data.reasoning.slice(0, 4) : []);
      setDesignStatus('idle');
    } catch (error) {
      setDesignStatus('error');
      setDesignSummary(
        error instanceof Error && error.message
          ? error.message
          : locale === 'ar'
            ? 'تعذر تنفيذ تعديل الذكاء الآن.'
            : 'The AI designer could not apply changes right now.',
      );
      setDesignReasoning([]);
    }
  }

  const themeStyle = buildThemeStyle(activeTheme, config.appearance);
  const modeStyle = buildThemeModeStyle(themeMode);
  const apiStatusLabel =
    apiHealth?.mode === 'ready'
      ? locale === 'ar'
        ? 'Gemini متصل'
        : 'Gemini connected'
      : apiHealth?.mode === 'missing_key'
        ? locale === 'ar'
          ? 'Gemini غير متصل · أضف GEMINI_API_KEY'
          : 'Gemini disconnected · add GEMINI_API_KEY'
        : locale === 'ar'
          ? 'Gemini غير متاح'
          : 'Gemini unavailable';

  return (
    <div
      className={classNames(
        'app-shell',
        `theme-${themeMode}`,
        `radius-${config.appearance.radius}`,
        `density-${config.appearance.density}`,
        `launcher-${config.appearance.launcherPosition}`,
        `launcher-size-${config.appearance.launcherSize}`,
        `view-${viewMode}`,
        `theme-${activeTheme.id}`,
        `mode-${mode}`,
        widgetOpen && 'assistant-live-open',
      )}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      lang={locale}
      style={{ ...themeStyle, ...modeStyle }}
    >
      <header className="hero">
        <div className="hero-copy">
          <div className="eyebrow">{locale === 'ar' ? 'استوديو SiteAware' : 'SiteAware Widget Studio'}</div>
          <div className="hero-title-row">
            <h1>{locale === 'ar' ? 'صمّم. عاين. اختبر.' : 'Design. Preview. Test.'}</h1>
            <div className={classNames('api-status-pill', 'hero-status', apiHealth?.mode ?? 'error')}>
              <strong>{apiStatusLabel}</strong>
              <span>{locale === 'ar' ? 'Gemini من الخلفية' : 'Server-side Gemini'}</span>
            </div>
          </div>
          <p>
            {locale === 'ar'
              ? 'اختَر شكل الأيقونة والمحادثة من نفس الموقع، وكل تغيير يظهر فورًا على المساعد الحقيقي المدمج في الشاشة.'
              : 'Choose the launcher and chat style on this page, and every change appears instantly on the real integrated assistant.'}
          </p>
          <div className="hero-meta">
            <span>{locale === 'ar' ? 'الأيقونة فوق الموقع الحقيقي' : 'Launcher lives on the real page'}</span>
            <span>{locale === 'ar' ? 'لوحة الذكاء تصغّر الصفحة كاملة' : 'AI dock resizes the whole page'}</span>
          </div>
        </div>
        <div className="hero-actions">
          <button className={classNames('secondary-button', locale === 'ar' && 'active')} onClick={() => setLocale('ar')}>
            AR
          </button>
          <button className={classNames('secondary-button', locale === 'en' && 'active')} onClick={() => setLocale('en')}>
            EN
          </button>
          <button className={classNames('secondary-button', themeMode === 'light' && 'active')} onClick={() => setThemeMode('light')}>
            {locale === 'ar' ? 'فاتح' : 'Light'}
          </button>
          <button className={classNames('secondary-button', themeMode === 'dark' && 'active')} onClick={() => setThemeMode('dark')}>
            {locale === 'ar' ? 'داكن' : 'Dark'}
          </button>
          <button className="primary-button" onClick={savePreset}>
            {locale === 'ar' ? 'احفظ الإعداد' : 'Save Preset'}
          </button>
          <button className="secondary-button" onClick={exportConfig}>
            {locale === 'ar' ? 'تصدير JSON' : 'Export JSON'}
          </button>
          <button className="secondary-button" onClick={resetStudio}>
            {locale === 'ar' ? 'إعادة ضبط' : 'Reset'}
          </button>
        </div>
      </header>

      <section className="mode-strip panel">
        <div className="mode-buttons">
          {(['build', 'design', 'preview', 'test', 'auto-match'] as const).map((item) => (
            <button
              key={item}
              className={classNames('mode-pill', mode === item && 'active')}
              onClick={() => {
                setMode(item);
                if (item === 'preview' || item === 'test') {
                  setViewMode('desktop');
                  setWidgetOpen(true);
                }
              }}
            >
              {item === 'build'
                ? locale === 'ar'
                  ? 'البناء'
                  : 'Build'
                : item === 'design'
                  ? locale === 'ar'
                    ? 'مصمم AI'
                    : 'AI Designer'
                : item === 'preview'
                  ? locale === 'ar'
                    ? 'الموقع الحي'
                    : 'Live Website'
                  : item === 'test'
                    ? locale === 'ar'
                      ? 'تجربة'
                      : 'Test Experience'
                    : 'AUTO MATCH'}
            </button>
          ))}
        </div>
        <div className="mode-stat">
          <strong>{Object.values(visibleCounts).reduce((sum, count) => sum + count, 0)}</strong>
          {locale === 'ar' ? 'خيار تصميم' : 'variant options'}
        </div>
      </section>

      <main className="studio-grid">
        <aside className="panel left-rail">
          {mode === 'auto-match' ? (
            <AutoMatchPanel onApplyTheme={applyGeneratedTheme} currentPrimaryColor={config.appearance.primaryColor} />
          ) : mode === 'design' ? (
            <>
              <section className="panel-section sticky">
                <div className="panel-heading">
                  <h2>{locale === 'ar' ? 'مصمم الذكاء' : 'AI Designer'}</h2>
                  <span>{locale === 'ar' ? 'Copilot للتنسيق' : 'Design copilot'}</span>
                </div>
                <p className="copilot-intro">
                  {locale === 'ar'
                    ? 'اكتب كيف تريد شكل الأيقونة والمحادثة والثيم، وسأحوّل الطلب إلى إعدادات حقيقية تطبق مباشرة على اليسار واليمين والوسط.'
                    : 'Describe the launcher, chat shell, and overall style, and the copilot will convert that request into real widget settings.'}
                </p>
                <textarea
                  className="copilot-textarea"
                  rows={7}
                  value={designPrompt}
                  onChange={(event) => setDesignPrompt(event.target.value)}
                  placeholder={locale === 'ar' ? 'مثال: خلي التصميم أبيض، زر الإرسال دائري، والمحادثة مرتبة مثل بوابة جامعية.' : 'Example: Make it white, use a circular send button, and keep the left dock tidy like a university portal.'}
                />
                <div className="auto-actions">
                  <button className="primary-button" onClick={runDesignCopilot} type="button">
                    {designStatus === 'loading'
                      ? locale === 'ar'
                        ? 'جاري التطبيق...'
                        : 'Applying...'
                      : locale === 'ar'
                        ? 'طبّق بالذكاء'
                        : 'Apply with AI'}
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => {
                      setDesignPrompt(designPromptSuggestions[locale][0]);
                    }}
                    type="button"
                  >
                    {locale === 'ar' ? 'حمّل مثال' : 'Load Example'}
                  </button>
                </div>
              </section>

              <section className="panel-section">
                <div className="panel-heading">
                  <h2>{locale === 'ar' ? 'أوامر جاهزة' : 'Prompt Shortcuts'}</h2>
                  <span>{locale === 'ar' ? 'ابدأ منها' : 'Start from these'}</span>
                </div>
                <div className="copilot-suggestion-grid">
                  {designPromptSuggestions[locale].map((suggestion) => (
                    <button key={suggestion} className="sample-card" onClick={() => setDesignPrompt(suggestion)} type="button">
                      <strong>{locale === 'ar' ? 'اقتراح' : 'Suggestion'}</strong>
                      <span>{suggestion}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="panel-section">
                <div className="panel-heading">
                  <h2>{locale === 'ar' ? 'آخر نتيجة' : 'Last Result'}</h2>
                  <span>{locale === 'ar' ? 'ملخص التعديلات' : 'Applied changes'}</span>
                </div>
                <div className={classNames('copilot-result-card', designStatus === 'error' && 'error')}>
                  <strong>
                    {designStatus === 'loading'
                      ? locale === 'ar'
                        ? 'Gemini يعيد تركيب التصميم الآن'
                        : 'Gemini is recomposing the widget now'
                      : locale === 'ar'
                        ? 'ملخص التنفيذ'
                        : 'Execution summary'}
                  </strong>
                  <p>
                    {designSummary ||
                      (locale === 'ar'
                        ? 'سيظهر هنا سبب التغييرات التي طبقها الذكاء على الأيقونة والمحادثة والثيم.'
                        : 'The copilot will explain the design changes it applied to the launcher, chat shell, and theme.')}
                  </p>
                </div>
                <div className="copilot-insight-list">
                  {designReasoning.length ? (
                    designReasoning.map((reason) => (
                      <div key={reason} className="analysis-card">
                        <strong>{locale === 'ar' ? 'سبب' : 'Reason'}</strong>
                        <span>{reason}</span>
                      </div>
                    ))
                  ) : (
                    <div className="analysis-card">
                      <strong>{locale === 'ar' ? 'ماذا يفعل؟' : 'What it does'}</strong>
                      <span>
                        {locale === 'ar'
                          ? 'يقرأ طلبك، يختار من القوالب المسموحة فقط، ثم يطبقها على المعاينة الحالية بدون تخريب الهيكل.'
                          : 'It reads your prompt, chooses only from the allowed design variants, and applies them to the live preview without freeform CSS drift.'}
                      </span>
                    </div>
                  )}
                </div>
              </section>
            </>
          ) : (
            <>
              <section className="panel-section experience-templates-section">
                <div className="section-kicker">{locale === 'ar' ? 'ابدأ من شكل جاهز' : 'Start with a complete look'}</div>
                <div className="panel-heading section-heading-large">
                  <h2>{locale === 'ar' ? 'قوالب مساعد كاملة' : 'Complete assistant templates'}</h2>
                  <span>{locale === 'ar' ? 'طبّق القالب ثم عدّل كل تفصيل' : 'Apply, then tune every detail'}</span>
                </div>
                <div className="experience-template-grid">
                  {presetDefinitions.map((preset) => {
                    const presetTheme = themePalettes.find((theme) => theme.id === preset.config.theme);
                    const isActive = config.chatShell === preset.config.chatShell
                      && config.assistantMessage === preset.config.assistantMessage
                      && config.sendButton === preset.config.sendButton
                      && config.theme === preset.config.theme;
                    return (
                      <button
                        key={preset.id}
                        className={classNames('experience-template-card', `template-${preset.id}`, isActive && 'active')}
                        onClick={() => applyPreset(preset.id)}
                        style={{ ['--template-accent' as string]: presetTheme?.tokens.primary ?? config.appearance.primaryColor }}
                        type="button"
                      >
                        <span className="experience-template-visual" aria-hidden="true">
                          <span className="template-window-top"><i /><i /><i /></span>
                          <span className="template-answer-line long" />
                          <span className="template-answer-line" />
                          <span className="template-user-line" />
                          <span className="template-input-line"><i /><b>↑</b></span>
                        </span>
                        <span className="experience-template-copy">
                          <strong>{preset.label}</strong>
                          <small>{preset.note}</small>
                        </span>
                        <span className="template-apply">{locale === 'ar' ? 'تطبيق' : 'Apply'}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="panel-section sticky">
                <div className="panel-heading">
                  <h2>{locale === 'ar' ? '1. ستايل الموقع' : '1. Site Style'}</h2>
                  <span>{locale === 'ar' ? 'الصق CSS أو ألوان الموقع' : 'Paste CSS or brand styles'}</span>
                </div>
                <textarea
                  className="style-intake"
                  rows={8}
                  value={styleInput}
                  onChange={(event) => setStyleInput(event.target.value)}
                  placeholder={locale === 'ar' ? 'الصق هنا CSS أو ألوان الموقع أو font-family أو border-radius...' : 'Paste CSS, colors, font-family, border-radius, or style notes here...'}
                />
                <div className="auto-actions">
                  <button className="primary-button" onClick={analyzeStyleInput} type="button" disabled={styleStatus === 'loading'}>
                    {styleStatus === 'loading'
                      ? locale === 'ar'
                        ? 'Gemini يختار الأنسب...'
                        : 'Gemini is matching...'
                      : locale === 'ar'
                        ? 'حلّل واقترح الشكل'
                        : 'Analyze & Recommend'}
                  </button>
                  <button className="secondary-button" onClick={() => applyPreset('siteaware-default')} type="button">
                    {locale === 'ar' ? 'إرجاع الافتراضي' : 'Reset Default'}
                  </button>
                </div>
                <p className="style-intake-note">
                  {styleAnalysis ||
                    (locale === 'ar'
                      ? 'هذه أول خطوة: ضع ستايل الموقع هنا، وسأطلع الألوان والانحناءات وأطبقها على المعاينة.'
                      : 'Start here by pasting the site style. The studio will infer colors and shape cues and apply them to the preview.')}
                </p>
                {styleReasoning.length ? (
                  <div className={classNames('style-reasoning', styleStatus === 'error' && 'error')}>
                    <strong>{locale === 'ar' ? 'لماذا هذا الشكل؟' : 'Why this match?'}</strong>
                    {styleReasoning.map((reason) => <span key={reason}>{reason}</span>)}
                  </div>
                ) : null}
              </section>

              <section className="panel-section">
                <div className="panel-heading">
                  <h2>{locale === 'ar' ? '2. أيقونات الذكاء' : '2. AI Icons'}</h2>
                  <span>{locale === 'ar' ? 'اختر الشكل وسيظهر فورًا' : 'Pick one and see it instantly'}</span>
                </div>
                <div className="variant-grid assistantIcon-gallery">
                  {assistantIcons.map((item) => (
                    <button
                      key={item.id}
                      className={classNames('variant-card', config.assistantIcon === item.id && 'active')}
                      onClick={() => updateConfig('assistantIcon', item.id)}
                      title={item.note}
                    >
                      <div className="variant-preview">{item.preview}</div>
                      <strong>{item.label}</strong>
                      <span>{item.note}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="panel-section">
                <div className="panel-heading">
                  <h2>{locale === 'ar' ? '3. تمبليت المحادثة' : '3. Chat Templates'}</h2>
                  <span>{locale === 'ar' ? 'شكل نافذة المحادثة كاملة' : 'The complete conversation frame'}</span>
                </div>
                <div className="chat-template-grid">
                  {chatShellVariants.map((item) => (
                    <button
                      key={item.id}
                      className={classNames('chat-template-card', `choice-${item.id}`, config.chatShell === item.id && 'active')}
                      onClick={() => updateConfig('chatShell', item.id)}
                      type="button"
                    >
                      <span className="chat-template-mini" aria-hidden="true">
                        <span className="mini-chat-head"><i /><b /><i /></span>
                        <span className="mini-chat-answer"><i /><i /></span>
                        <span className="mini-chat-user" />
                        <span className="mini-chat-composer"><i /><b>↑</b></span>
                      </span>
                      <span className="choice-copy">
                        <strong>{item.label}</strong>
                        <small>{item.note}</small>
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="panel-section">
                <div className="panel-heading">
                  <h2>{locale === 'ar' ? '4. شكل رد الذكاء' : '4. AI Response Styles'}</h2>
                  <span>{locale === 'ar' ? 'كيف يظهر الجواب والمصادر' : 'How answers and sources appear'}</span>
                </div>
                <div className="response-style-grid">
                  {assistantMessages.map((item) => (
                    <button
                      key={item.id}
                      className={classNames('response-style-card', `choice-${item.id}`, config.assistantMessage === item.id && 'active')}
                      onClick={() => updateConfig('assistantMessage', item.id)}
                      type="button"
                    >
                      <span className="response-style-mini" aria-hidden="true">
                        <span className="response-mini-meta"><i /> SiteAware</span>
                        <span className="response-mini-line long" />
                        <span className="response-mini-line" />
                        <span className="response-mini-sources"><i /><i /></span>
                      </span>
                      <strong>{item.label}</strong>
                      <small>{item.note}</small>
                    </button>
                  ))}
                </div>
              </section>

              <section className="panel-section composer-library-section">
                <div className="panel-heading">
                  <h2>{locale === 'ar' ? '5. السؤال وزر الإرسال' : '5. Composer & Send Button'}</h2>
                  <span>{locale === 'ar' ? 'اختر الحقل والزر كل واحد لحاله' : 'Choose the field and action separately'}</span>
                </div>
                <h3 className="choice-subheading">{locale === 'ar' ? 'شكل حقل السؤال' : 'Input bar style'}</h3>
                <div className="composer-style-grid">
                  {inputBars.map((item) => (
                    <button
                      key={item.id}
                      className={classNames('composer-style-card', `choice-${item.id}`, config.inputBar === item.id && 'active')}
                      onClick={() => updateConfig('inputBar', item.id)}
                      type="button"
                    >
                      <span className="composer-style-mini" aria-hidden="true">
                        <span>{locale === 'ar' ? 'اسأل أي شيء...' : 'Ask anything...'}</span>
                        <i>+</i>
                      </span>
                      <strong>{item.label}</strong>
                    </button>
                  ))}
                </div>
                <h3 className="choice-subheading send-heading">{locale === 'ar' ? 'شكل زر الإرسال' : 'Send button style'}</h3>
                <div className="send-style-grid">
                  {sendButtons.map((item) => (
                    <button
                      key={item.id}
                      className={classNames('send-style-card', `choice-${item.id}`, config.sendButton === item.id && 'active')}
                      onClick={() => updateConfig('sendButton', item.id)}
                      type="button"
                    >
                      <span className="send-style-demo" aria-hidden="true">{item.preview}</span>
                      <span><strong>{item.label}</strong><small>{item.note}</small></span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="panel-section">
                <div className="panel-heading">
                  <h2>{locale === 'ar' ? '6. أشهر الألوان' : '6. Popular Colors'}</h2>
                  <span>{locale === 'ar' ? 'اختيار سريع للهوية' : 'Quick visual direction'}</span>
                </div>
                <div className="theme-grid">
                  {themePalettes.map((theme) => (
                    <button
                      key={theme.id}
                      className={classNames('theme-card', config.theme === theme.id && 'active')}
                      onClick={() => updateConfig('theme', theme.id)}
                      title={theme.note}
                    >
                      <strong>{theme.label}</strong>
                      <span>{theme.note}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="panel-section">
                <div className="panel-heading">
                  <h2>{locale === 'ar' ? '7. التفاصيل المتقدمة' : '7. Advanced Details'}</h2>
                  <span>{locale === 'ar' ? 'المشغّل ورسالتك والرأس والمصادر' : 'Launcher, your message, header, sources'}</span>
                </div>
                <div className="category-list">
                  {categories
                    .filter((category) => !['assistantIcon', 'chatShell', 'assistantMessage', 'inputBar', 'sendButton', 'theme'].includes(category.id))
                    .map((category) => (
                      <button
                        key={category.id}
                        className={classNames('category-pill', extraCategory === category.id && 'active')}
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        <strong>{category.label}</strong>
                        <span>{category.note}</span>
                      </button>
                    ))}
                </div>
                <input
                  className="search-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={locale === 'ar' ? 'ابحث داخل الخيارات الإضافية' : 'Search the extra options'}
                />
                <div className={classNames('variant-grid', `${extraCategory}-gallery`)}>
                  {activeCategoryItems.map((item) => {
                    const selectedValue = config[extraCategory as keyof StudioConfig];
                    const isActive = typeof selectedValue === 'string' && selectedValue === item.id;
                    return (
                      <button
                        key={item.id}
                        className={classNames('variant-card', isActive && 'active')}
                        onClick={() => updateConfig(extraCategory as keyof StudioConfig, item.id as never)}
                        title={item.note}
                      >
                        <div className="variant-preview">{item.preview}</div>
                        <strong>{item.label}</strong>
                        <span>{item.note}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </aside>

        <section className="preview-column">
          <div className="preview-toolbar panel">
            <div className="panel-heading">
              <h2>{locale === 'ar' ? 'المساعد يعمل على هذا الموقع الآن' : 'Assistant live on this website'}</h2>
              <span>{locale === 'ar' ? 'بدون محاكي' : 'No simulator'}</span>
            </div>
              <div className="toolbar-row">
                <div className="device-toggle" role="tablist" aria-label="Preview size">
                {(['desktop', 'tablet', 'mobile'] as ViewMode[]).map((item) => (
                  <button key={item} className={classNames('device-pill', viewMode === item && 'active')} onClick={() => setViewMode(item)}>
                    {locale === 'ar' ? (item === 'desktop' ? 'سطح المكتب' : item === 'tablet' ? 'تابلت' : 'هاتف') : item}
                  </button>
                ))}
              </div>
              <div className="site-toggle">
                {previewSites.map((site) => (
                  <button
                    key={site.id}
                    className={classNames('site-pill', selectedSite.id === site.id && 'active')}
                    onClick={() => setSelectedSite(site)}
                  >
                    {locale === 'ar' ? site.vibe.ar : site.vibe.en}
                  </button>
                ))}
              </div>
              <div className={classNames('preview-ai-state', apiHealth?.mode ?? 'error')}>
                <span aria-hidden="true" />
                <strong>{apiStatusLabel}</strong>
              </div>
              <button className="copilot-template-button" onClick={applyCopilotTemplate} type="button">
                {locale === 'ar' ? 'طبّق قالب Copilot الجاهز' : 'Apply Copilot Template'}
              </button>
              <button className={classNames('toggle-launcher', widgetOpen && 'active')} onClick={() => setWidgetOpen((previous) => !previous)}>
                {widgetOpen ? (locale === 'ar' ? 'الويدجت مفتوح' : 'Widget open') : locale === 'ar' ? 'الويدجت مغلق' : 'Widget closed'}
              </button>
            </div>
          </div>

          <div className={classNames('laptop-preview-stage', widgetOpen && 'assistant-open')} dir="ltr">
                <div className="assistant-dock" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                  <div
                    className={classNames(
                      'widget-shell',
                      currentChatShell?.className,
                      currentHeader?.className,
                      widgetOpen && 'open',
                    )}
                  >
                    <div className={classNames('widget-header', currentHeader?.className)}>
                      <div className="widget-title">
                        <div className="widget-avatar">{currentIconPreview}</div>
                        <div>
                          <strong>{locale === 'ar' ? 'مساعد SiteAware' : 'SiteAware Assistant'}</strong>
                          <span>{locale === 'ar' ? `مساعد رسمي مدمج على ${currentSite.vibe}` : `Formal embedded assistant for ${currentSite.vibe}`}</span>
                        </div>
                      </div>
                      <div className="widget-actions">
                        <button
                          className="action-icon"
                          onClick={() => setWidgetOpen(false)}
                          aria-label={locale === 'ar' ? 'تصغير المساعد' : 'Minimize assistant'}
                          type="button"
                        >
                          −
                        </button>
                        <button
                          className="action-icon"
                          onClick={() => setWidgetOpen(false)}
                          aria-label={locale === 'ar' ? 'إغلاق المساعد' : 'Close assistant'}
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <div className="conversation" aria-live="polite">
                      {conversation.map((message) => {
                        if (message.role === 'user') {
                          return (
                            <div key={message.id} className={classNames('message-row', 'user-row')}>
                              <div className={classNames('message-card', 'user-message', currentUserMessage?.className)}>
                                <p>{message.text}</p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div key={message.id} className={classNames('message-row', 'assistant-row')}>
                            <div className="message-avatar">{currentIconPreview}</div>
                            <div className={classNames('message-card', 'assistant-message', currentAssistantMessage?.className)}>
                              <div className="message-meta">
                                <span>SiteAware</span>
                                {message.status === 'typing' ? <span className="status-dot">{locale === 'ar' ? 'يكتب' : 'typing'}</span> : null}
                                {message.status === 'loading' ? <span className="status-dot status-loading">{locale === 'ar' ? 'جاري' : 'loading'}</span> : null}
                                {message.status === 'error' ? <span className="status-dot status-error">{locale === 'ar' ? 'خطأ' : 'error'}</span> : null}
                              </div>
                              <p>{message.text}</p>
                              {message.sources?.length ? (
                                <div className={classNames('source-block', currentSource?.className)}>
                                  <div className="source-label">{currentSourceLabel}</div>
                                  <div className="source-pills">
                                    {message.sources.map((source, index) => (
                                      <span key={source} className="source-pill">
                                        {index + 1}. {source}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                              {message.action ? (
                                <div className="action-row">
                                  <button className={classNames('cta-button', currentCta?.className)} type="button">
                                    {currentCtaLabel || message.action}
                                  </button>
                                  <button className="ghost-button subtle" type="button">
                                    {locale === 'ar' ? 'عرض المصدر' : 'View source'}
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}

                      {isTyping ? (
                        <div className="typing-row">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                        </div>
                      ) : null}
                    </div>

                    <div className={classNames('composer', 'widget-input', currentInputBar?.className)}>
                      <input
                        value={composer}
                        onChange={(event) => setComposer(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            runTest();
                          }
                        }}
                        placeholder={locale === 'ar' ? 'اكتب سؤالك...' : 'Ask a question about this site...'}
                      />
                      <button
                        className={classNames('send-button', currentSendButton?.className)}
                        onClick={runTest}
                        type="button"
                        disabled={isTyping || !composer.trim()}
                        aria-label={locale === 'ar' ? 'إرسال السؤال' : 'Send question'}
                      >
                        {['send-filled', 'send-outline', 'send-lift', 'send-glow', 'send-ghost', 'send-rail', 'send-premium'].includes(config.sendButton)
                          ? locale === 'ar' ? 'إرسال' : 'Send'
                          : currentSendButton?.preview ?? (locale === 'ar' ? 'إرسال' : 'Send')}
                      </button>
                    </div>

                    <div className="composer-actions">
                      <button className="ghost-button" onClick={runTest} type="button">
                        {locale === 'ar' ? 'معاينة / اختبار' : 'Preview / Test'}
                      </button>
                      <button className="ghost-button subtle" onClick={triggerErrorDemo} type="button">
                        {locale === 'ar' ? 'حالة خطأ' : 'Error state'}
                      </button>
                      <span className={classNames('status-line', status)}>
                        {locale === 'ar' ? 'الحالة' : 'status'}: {mode}
                      </span>
                    </div>
                  </div>
                </div>

          </div>

          <div className="site-launcher-overlay live-site-launcher" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <button
              className={classNames(
                'launcher-node',
                `launcher-${config.launcher}`,
                `launcher-size-${config.appearance.launcherSize}`,
                widgetOpen && 'open',
              )}
              onClick={() => setWidgetOpen((previous) => !previous)}
              aria-label={widgetOpen ? (locale === 'ar' ? 'أغلق المساعد' : 'Close assistant') : locale === 'ar' ? 'افتح المساعد' : 'Open assistant'}
              aria-pressed={widgetOpen}
              type="button"
            >
              <div className="launcher-preview">{currentIconPreview}</div>
              <div className="launcher-copy">
                <strong>{locale === 'ar' ? 'اسأل الذكاء' : 'Ask AI'}</strong>
                <span>{widgetOpen ? (locale === 'ar' ? 'المساعد مفتوح' : 'Assistant open') : locale === 'ar' ? 'اضغط للفتح' : 'Click to open'}</span>
              </div>
              <span className="launcher-badge">3</span>
            </button>
          </div>
        </section>

        <aside className="panel right-rail">
          <section className="panel-section sticky">
            <div className="panel-heading">
              <h2>{locale === 'ar' ? 'تحكم سريع' : 'Quick Controls'}</h2>
              <span>{locale === 'ar' ? 'المقاسات والألوان' : 'Size and colors'}</span>
            </div>
            <div className="demo-kit">
              <div>
                <strong>{locale === 'ar' ? 'حزمة العرض' : 'Demo Kit'}</strong>
                <span>{locale === 'ar' ? 'الإعداد' : 'Preset'}: {config.theme}</span>
              </div>
              <div>
                <strong>{locale === 'ar' ? 'مصدر الثيم' : 'Theme origin'}</strong>
                <span>{config.themeOrigin ?? 'manual'}</span>
              </div>
              <div>
                <strong>{locale === 'ar' ? 'الجهاز' : 'Preview device'}</strong>
                <span>{viewMode}</span>
              </div>
              <div>
                <strong>{locale === 'ar' ? 'هوية الموقع' : 'Site palette'}</strong>
                <span>{currentSite.vibe}</span>
              </div>
              <div>
                <strong>{locale === 'ar' ? 'الحالة' : 'Selected target'}</strong>
                <span>{widgetOpen ? (locale === 'ar' ? 'الويدجت مفتوح' : 'Widget open') : locale === 'ar' ? 'الويدجت مخفي' : 'Widget hidden'}</span>
              </div>
              <div>
                <strong>{locale === 'ar' ? 'وضع الضبط' : 'Config status'}</strong>
                <span>{activeAutoTheme ? (locale === 'ar' ? 'تطبيق تلقائي' : 'Auto theme applied') : locale === 'ar' ? 'وضع يدوي' : 'Manual design mode'}</span>
              </div>
            </div>
            <div className="settings-grid">
              <label>
                {locale === 'ar' ? 'اللون الأساسي' : 'Primary color'}
                <input type="color" value={config.appearance.primaryColor} onChange={(event) => updateAppearance('primaryColor', event.target.value)} />
              </label>
              <label>
                {locale === 'ar' ? 'نصف القطر' : 'Corner radius'}
                <select value={config.appearance.radius} onChange={(event) => updateAppearance('radius', event.target.value as StudioConfig['appearance']['radius'])}>
                  <option value="sm">{locale === 'ar' ? 'صغير' : 'Small'}</option>
                  <option value="md">{locale === 'ar' ? 'متوسط' : 'Medium'}</option>
                  <option value="lg">{locale === 'ar' ? 'كبير' : 'Large'}</option>
                  <option value="xl">{locale === 'ar' ? 'كبير جدًا' : 'Extra large'}</option>
                </select>
              </label>
              <label>
                {locale === 'ar' ? 'عرض الويدجت' : 'Widget width'}
                <input
                  type="range"
                  min={360}
                  max={520}
                  step={4}
                  value={config.appearance.widgetWidth}
                  onChange={(event) => updateAppearance('widgetWidth', Number(event.target.value))}
                />
              </label>
              <label>
                {locale === 'ar' ? 'ارتفاع الويدجت' : 'Widget height'}
                <input
                  type="range"
                  min={500}
                  max={760}
                  step={4}
                  value={config.appearance.widgetHeight}
                  onChange={(event) => updateAppearance('widgetHeight', Number(event.target.value))}
                />
              </label>
              <label>
                {locale === 'ar' ? 'الكثافة' : 'Density'}
                <select value={config.appearance.density} onChange={(event) => updateAppearance('density', event.target.value as StudioConfig['appearance']['density'])}>
                  <option value="compact">{locale === 'ar' ? 'مضغوط' : 'Compact'}</option>
                  <option value="comfortable">{locale === 'ar' ? 'مريح' : 'Comfortable'}</option>
                  <option value="spacious">{locale === 'ar' ? 'واسع' : 'Spacious'}</option>
                </select>
              </label>
              <label>
                {locale === 'ar' ? 'قوة الظل' : 'Shadow strength'}
                <input
                  type="range"
                  min={0.45}
                  max={1.2}
                  step={0.05}
                  value={config.appearance.shadowStrength}
                  onChange={(event) => updateAppearance('shadowStrength', Number(event.target.value))}
                />
              </label>
              <label>
                {locale === 'ar' ? 'حجم الخط' : 'Font scale'}
                <input
                  type="range"
                  min={0.9}
                  max={1.12}
                  step={0.01}
                  value={config.appearance.fontScale}
                  onChange={(event) => updateAppearance('fontScale', Number(event.target.value))}
                />
              </label>
              <label>
                {locale === 'ar' ? 'مكان الأيقونة' : 'Launcher position'}
                <select
                  value={config.appearance.launcherPosition}
                  onChange={(event) => updateAppearance('launcherPosition', event.target.value as StudioConfig['appearance']['launcherPosition'])}
                >
                  <option value="bottom-right">{locale === 'ar' ? 'أسفل يمين' : 'Bottom right'}</option>
                  <option value="bottom-left">{locale === 'ar' ? 'أسفل يسار' : 'Bottom left'}</option>
                  <option value="left-edge">{locale === 'ar' ? 'حافة اليسار' : 'Left edge'}</option>
                  <option value="right-edge">{locale === 'ar' ? 'حافة اليمين' : 'Right edge'}</option>
                </select>
              </label>
              <label>
                {locale === 'ar' ? 'حجم الأيقونة' : 'Launcher size'}
                <select value={config.appearance.launcherSize} onChange={(event) => updateAppearance('launcherSize', event.target.value as StudioConfig['appearance']['launcherSize'])}>
                  <option value="sm">{locale === 'ar' ? 'صغير' : 'Small'}</option>
                  <option value="md">{locale === 'ar' ? 'متوسط' : 'Medium'}</option>
                  <option value="lg">{locale === 'ar' ? 'كبير' : 'Large'}</option>
                </select>
              </label>
            </div>
          </section>

          <section className="panel-section">
            <div className="panel-heading">
              <h2>{locale === 'ar' ? 'إعدادات محفوظة' : 'Named Presets'}</h2>
              <span>{savedPresets.length} {locale === 'ar' ? 'محفوظ' : 'saved'}</span>
            </div>
            <div className="auto-actions">
              <input
                className="search-input"
                value={namedPreset}
                onChange={(event) => setNamedPreset(event.target.value)}
                placeholder={locale === 'ar' ? 'اسم الإعداد' : 'Preset name'}
              />
              <button className="primary-button" onClick={saveNamedPreset}>
                {locale === 'ar' ? 'حفظ الإعداد' : 'Save Named Preset'}
              </button>
            </div>
            <div className="preset-library">
              {savedPresets.length ? (
                savedPresets.map((preset) => (
                  <div key={preset.id} className="preset-library-card">
                    <div>
                      <strong>{preset.name}</strong>
                      <span>{preset.config.themeOrigin ?? 'manual'}</span>
                    </div>
                    <div className="preset-library-actions">
                      <button className="ghost-button" onClick={() => applySavedPreset(preset)}>
                        {locale === 'ar' ? 'تطبيق' : 'Apply'}
                      </button>
                      <button className="ghost-button" onClick={() => duplicatePreset(preset)}>
                        {locale === 'ar' ? 'نسخ' : 'Duplicate'}
                      </button>
                      <button className="ghost-button" onClick={() => renamePreset(preset)}>
                        {locale === 'ar' ? 'تعديل الاسم' : 'Rename'}
                      </button>
                      <button className="ghost-button subtle" onClick={() => deletePreset(preset)}>
                        {locale === 'ar' ? 'حذف' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="empty-state">
                  {locale === 'ar'
                    ? 'لا توجد إعدادات محفوظة بعد. احفظ واحدًا من التكوين الحالي.'
                    : 'No saved presets yet. Save one from the current config.'}
                </p>
              )}
            </div>
          </section>

        </aside>
      </main>
    </div>
  );
}

export default App;
