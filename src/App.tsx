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
  autoThemeStorageKey,
  type GeneratedThemeRecommendation,
} from './themeIntelligence';

type PreviewMode = 'build' | 'preview' | 'test';
type StudioMode = PreviewMode | 'auto-match';
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

const storageKey = 'siteaware-widget-studio-config-v2';
const savedPresetsKey = 'siteaware-widget-studio-presets-v1';
const localeKey = 'siteaware-widget-studio-locale-v1';
const themeModeKey = 'siteaware-widget-studio-theme-mode-v1';

const defaultPreset = presetDefinitions.find((preset) => preset.id === 'siteaware-default') ?? presetDefinitions[0]!;
const defaultConfig: StudioConfig = defaultPreset.config;

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

function safeImportConfig(raw: unknown): StudioConfig | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const parsed = raw as Partial<StudioConfig>;
  const appearance = parsed.appearance ?? {};
  return {
    ...defaultConfig,
    ...parsed,
    appearance: {
      ...defaultConfig.appearance,
      ...appearance,
    },
  };
}

function classNames(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
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
  const [selectedCategory, setSelectedCategory] = useState<StudioCategory>('assistantIcon');
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
  const [importConfigText, setImportConfigText] = useState(() => JSON.stringify(loadConfig(), null, 2));

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
  }, [selectedSite.id, locale]);

  const resolvedAutoTheme = activeAutoTheme ? applyPrimaryOverride(activeAutoTheme, config.appearance.primaryColor) : null;
  const activeTheme = resolvedAutoTheme ?? themePalettes.find((theme) => theme.id === config.theme) ?? themePalettes[0]!;
  const currentIconPreview = assistantIcons.find((item) => item.id === config.assistantIcon)?.preview ?? assistantIcons[0]?.preview ?? null;
  const currentSourceLabel =
    sourceCitationVariants.find((item) => item.id === config.sourceCitation)?.label ?? (locale === 'ar' ? 'المصادر' : 'Sources');
  const currentCtaLabel = takeMeThereVariants.find((item) => item.id === config.takeMeThere)?.label ?? (locale === 'ar' ? 'خذني لهناك' : 'Take me there');
  const currentCategory = categories.find((entry) => entry.id === selectedCategory) ?? categories[0]!;
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
    const items = getCollection(selectedCategory);
    const query = search.trim().toLowerCase();
    if (!query) {
      return items;
    }
    return items.filter((item) => {
      const haystack = [item.id, item.label, item.note, ...(item.keywords ?? [])].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [search, selectedCategory]);

  const configJson = useMemo(() => JSON.stringify(config, null, 2), [config]);

  const previewScale = viewMode === 'mobile' ? 0.86 : viewMode === 'tablet' ? 0.94 : 1;

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

  function resetStudio() {
    setConfig(defaultConfig);
    setActiveAutoTheme(null);
    setSelectedCategory('assistantIcon');
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

  async function copyConfigJson() {
    await navigator.clipboard.writeText(configJson);
  }

  function importConfigJson() {
    try {
      const parsed = JSON.parse(importConfigText);
      const imported = safeImportConfig(parsed);
      if (!imported) {
        return;
      }
      setConfig(imported);
      setActiveAutoTheme(null);
    } catch {
      // Keep the current config if JSON parsing fails.
    }
  }

  function appendAssistantReply(reply: ConversationMessage) {
    setConversation((previous) => [...previous, reply]);
  }

  async function runTest() {
    if (!composer.trim()) {
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
            conversation: [...conversation, userMessage].slice(-10),
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

  const themeStyle = buildThemeStyle(activeTheme, config.appearance);
  const modeStyle = buildThemeModeStyle(themeMode);
  const apiStatusLabel =
    apiHealth?.mode === 'ready'
      ? locale === 'ar'
        ? `Gemini متصل · ${apiHealth.model}`
        : `Gemini connected · ${apiHealth.model}`
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
      )}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      lang={locale}
      style={{ ...themeStyle, ...modeStyle }}
    >
      <header className="hero">
        <div>
          <div className="eyebrow">{locale === 'ar' ? 'استوديو SiteAware' : 'SiteAware Widget Studio'}</div>
          <h1>{locale === 'ar' ? 'صمّم. عاين. اختبر.' : 'Design. Preview. Test.'}</h1>
          <p>
            {locale === 'ar'
              ? 'ابنِ أشكال المساعد والمحادثة بصريًا، بدّل بين الإعدادات، وصدّر نفس عقد التصميم الذي سيقرأه الويدجت لاحقًا.'
              : 'Build widget variants visually, search the galleries, switch between presets, and export the same design contract the real widget can read later.'}
          </p>
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
          {(['build', 'preview', 'test', 'auto-match'] as const).map((item) => (
            <button key={item} className={classNames('mode-pill', mode === item && 'active')} onClick={() => setMode(item)}>
              {item === 'build'
                ? locale === 'ar'
                  ? 'البناء'
                  : 'Build'
                : item === 'preview'
                  ? locale === 'ar'
                    ? 'معاينة'
                    : 'Preview'
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
          ) : (
            <>
              <section className="panel-section sticky">
                <div className="panel-heading">
                  <h2>{locale === 'ar' ? 'الإعدادات' : 'Presets'}</h2>
                  <span>{locale === 'ar' ? 'تركيبات جاهزة' : 'Curated combinations'}</span>
                </div>
                <div className="preset-grid">
                  {presetDefinitions.map((preset) => (
                    <button
                      key={preset.id}
                      className={classNames('preset-card', config.theme === preset.config.theme && config.launcher === preset.config.launcher && 'active')}
                      onClick={() => applyPreset(preset.id)}
                    >
                      <strong>{preset.label}</strong>
                      <span>{preset.note}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="panel-section">
                <div className="panel-heading">
                  <h2>{locale === 'ar' ? 'اختيار الشكل' : 'Shape picker'}</h2>
                  <span>{locale === 'ar' ? 'الأيقونة + المحادثة' : 'Icon + chat shell'}</span>
                </div>
                <div className="design-focus-grid">
                  <button className={classNames('design-focus-card', selectedCategory === 'assistantIcon' && 'active')} onClick={() => setSelectedCategory('assistantIcon')}>
                    <strong>{locale === 'ar' ? 'أيقونة المساعد' : 'Assistant icon'}</strong>
                    <span>{assistantIcons.find((item) => item.id === config.assistantIcon)?.label ?? (locale === 'ar' ? 'اختر شكل الأيقونة' : 'Pick the icon shape')}</span>
                  </button>
                  <button className={classNames('design-focus-card', selectedCategory === 'chatShell' && 'active')} onClick={() => setSelectedCategory('chatShell')}>
                    <strong>{locale === 'ar' ? 'شكل المحادثة' : 'Chat shell'}</strong>
                    <span>{chatShellVariants.find((item) => item.id === config.chatShell)?.label ?? (locale === 'ar' ? 'اختر واجهة المحادثة' : 'Pick the chat window style')}</span>
                  </button>
                  <button className={classNames('design-focus-card', selectedCategory === 'launcher' && 'active')} onClick={() => setSelectedCategory('launcher')}>
                    <strong>{locale === 'ar' ? 'زر الفتح' : 'Launcher'}</strong>
                    <span>{launcherVariants.find((item) => item.id === config.launcher)?.label ?? (locale === 'ar' ? 'شكل الزر الصغير' : 'Pick the trigger button')}</span>
                  </button>
                </div>
              </section>

              <section className="panel-section sticky">
                <div className="panel-heading">
                  <h2>{locale === 'ar' ? 'الفئات' : 'Categories'}</h2>
                  <span>{categories.length} {locale === 'ar' ? 'مجموعة' : 'groups'}</span>
                </div>
                <div className="category-list">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      className={classNames('category-pill', selectedCategory === category.id && 'active')}
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <strong>{category.label}</strong>
                      <span>{category.note}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="panel-section">
                <div className="panel-heading">
                  <h2>{locale === 'ar' ? 'بحث' : 'Search'}</h2>
                  <span>{locale === 'ar' ? 'صفِّ المعرض الحالي' : 'Filter the active gallery'}</span>
                </div>
                <input
                  className="search-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={locale === 'ar' ? 'ابحث في الأسماء أو الوصف أو الكلمات المفتاحية' : 'Search labels, notes, or keywords'}
                />
              </section>

              <section className="panel-section">
                <div className="panel-heading">
                  <h2>{currentCategory.label}</h2>
                  <span>{activeCategoryItems.length} {locale === 'ar' ? 'ظاهر' : 'visible'}</span>
                </div>
                <div className={classNames('variant-grid', `${selectedCategory}-gallery`)}>
                  {activeCategoryItems.map((item) => {
                    const selectedValue = config[selectedCategory as keyof StudioConfig];
                    const isActive = typeof selectedValue === 'string' && selectedValue === item.id;
                    return (
                      <button
                        key={item.id}
                        className={classNames('variant-card', isActive && 'active')}
                        onClick={() => updateConfig(selectedCategory as keyof StudioConfig, item.id as never)}
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
              <h2>{locale === 'ar' ? 'معاينة مباشرة' : 'Live Preview'}</h2>
              <span>{currentSite.name}</span>
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
              <button className={classNames('toggle-launcher', widgetOpen && 'active')} onClick={() => setWidgetOpen((previous) => !previous)}>
                {widgetOpen ? (locale === 'ar' ? 'الويدجت مفتوح' : 'Widget open') : locale === 'ar' ? 'الويدجت مغلق' : 'Widget closed'}
              </button>
            </div>
          </div>

          <div className="site-frame panel">
            <div className={classNames('site-frame-inner', `scale-${viewMode}`)}>
              <div className="site-chrome">
                <div className="site-address">{currentSite.name.toLowerCase().replace(/\s+/g, '.')} .demo</div>
                <div className="site-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>

              <div className="mock-site">
                <div className="mock-hero">
                  <span className="mock-kicker">{locale === 'ar' ? 'موقع تجريبي تفاعلي' : 'Interactive mock website'}</span>
                  <h3>{currentSite.name}</h3>
                  <p>{currentSite.blurb}</p>
                </div>

                <div className="mock-content">
                  {currentSite.lines.map((line, index) => (
                    <div key={line} className={classNames('mock-row', index === 2 && 'highlight')}>
                      <span>{line}</span>
                      <button>{locale === 'ar' ? 'افتح' : 'Open'}</button>
                    </div>
                  ))}
                </div>

                <div
                  className={classNames(
                    'launcher-node',
                    `launcher-${config.launcher}`,
                    `launcher-size-${config.appearance.launcherSize}`,
                    !widgetOpen && 'open',
                  )}
                >
                <div className="launcher-preview">{currentIconPreview}</div>
                  <div className="launcher-copy">
                    <strong>SiteAware</strong>
                    <span>{locale === 'ar' ? 'اسأل الموقع' : 'Ask the site'}</span>
                  </div>
                  <span className="launcher-badge">3</span>
                </div>

                <div
                  className={classNames(
                    'widget-shell',
                    `shell-${config.chatShell}`,
                    `header-${config.header}`,
                    `assistant-${config.assistantMessage}`,
                    `user-${config.userMessage}`,
                    `input-${config.inputBar}`,
                    `send-${config.sendButton}`,
                    `source-${config.sourceCitation}`,
                    `cta-${config.takeMeThere}`,
                    widgetOpen && 'open',
                  )}
                  style={{
                    width: 'min(var(--widget-width), calc(100% - 52px))',
                    height: 'min(var(--widget-height), 100%)',
                    maxHeight: 'calc(100% - 40px)',
                  }}
                >
                  <div className={classNames('widget-header', config.header)}>
                    <div className="widget-title">
                      <div className="widget-avatar">{currentIconPreview}</div>
                      <div>
                        <strong>SiteAware</strong>
                        <span>{locale === 'ar' ? `المساعد التجريبي على ${currentSite.vibe}` : `Mock assistant on ${currentSite.vibe}`}</span>
                      </div>
                    </div>
                    <div className="widget-actions">
                      <button className="action-icon">−</button>
                      <button className="action-icon">×</button>
                    </div>
                  </div>

                  <div className="conversation" aria-live="polite">
                    {conversation.map((message) => {
                      if (message.role === 'user') {
  return (
                          <div key={message.id} className={classNames('message-row', 'user-row')}>
                            <div className={classNames('message-card', 'user-message')}>
                              <p>{message.text}</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={message.id} className={classNames('message-row', 'assistant-row')}>
                          <div className="message-avatar">{currentIconPreview}</div>
                          <div className={classNames('message-card', 'assistant-message')}>
                            <div className="message-meta">
                              <span>SiteAware</span>
                              {message.status === 'typing' ? <span className="status-dot">{locale === 'ar' ? 'يكتب' : 'typing'}</span> : null}
                              {message.status === 'loading' ? <span className="status-dot status-loading">{locale === 'ar' ? 'جاري' : 'loading'}</span> : null}
                              {message.status === 'error' ? <span className="status-dot status-error">{locale === 'ar' ? 'خطأ' : 'error'}</span> : null}
                            </div>
                            <p>{message.text}</p>
                            {message.sources?.length ? (
                              <div className="source-block">
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
                                <button className="cta-button">{currentCtaLabel || message.action}</button>
                                <button className="ghost-button subtle">{locale === 'ar' ? 'عرض المصدر' : 'View source'}</button>
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

                  <div className={classNames('composer', 'widget-input')}>
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
                    <button className="send-button" onClick={runTest}>
                      {locale === 'ar' ? 'إرسال' : 'Send'}
                    </button>
                  </div>

                  <div className="composer-actions">
                    <button className="ghost-button" onClick={runTest}>
                      {locale === 'ar' ? 'معاينة / اختبار' : 'Preview / Test'}
                    </button>
                    <button className="ghost-button subtle" onClick={triggerErrorDemo}>
                      {locale === 'ar' ? 'حالة خطأ' : 'Error state'}
                    </button>
                    <span className={classNames('status-line', status)}>
                      {locale === 'ar' ? 'الحالة' : 'status'}: {mode}
                    </span>
                  </div>
                </div>
              </div>
              <div className={classNames('api-status-pill', apiHealth?.mode ?? 'error')}>
                <strong>{apiStatusLabel}</strong>
                <span>{locale === 'ar' ? 'استخدم Gemini الحقيقي من الخلفية' : 'Use the live Gemini backend'}</span>
              </div>
            </div>
          </div>
        </section>

        <aside className="panel right-rail">
          <section className="panel-section sticky">
            <div className="panel-heading">
              <h2>{locale === 'ar' ? 'التحكم العام' : 'Global Controls'}</h2>
              <span>{locale === 'ar' ? 'الألوان + الترتيب' : 'Design tokens + layout'}</span>
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
              <h2>{locale === 'ar' ? 'عقد الإعدادات' : 'Config Contract'}</h2>
              <span>{locale === 'ar' ? 'JSON قابل للتصدير' : 'Serializable JSON'}</span>
            </div>
            <textarea className="auto-json" rows={10} value={importConfigText} onChange={(event) => setImportConfigText(event.target.value)} />
            <div className="auto-actions">
                      <button className="secondary-button" onClick={copyConfigJson}>
                {locale === 'ar' ? 'نسخ JSON' : 'Copy Config JSON'}
              </button>
              <button className="secondary-button" onClick={importConfigJson}>
                {locale === 'ar' ? 'استيراد JSON' : 'Import Config JSON'}
              </button>
            </div>
            <pre className="code-block">{configJson}</pre>
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

          <section className="panel-section">
            <div className="panel-heading">
              <h2>{locale === 'ar' ? 'مكتبة الألوان' : 'Palette Library'}</h2>
              <span>{themePalettes.length} {locale === 'ar' ? 'ثيم' : 'themes'}</span>
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
        </aside>
      </main>
    </div>
  );
}

export default App;
