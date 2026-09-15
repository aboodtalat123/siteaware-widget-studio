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
import { analyzeReferenceImage, readSafeLauncherAsset, type ReferenceImageProfile } from './studio/reference/referenceImageAnalyzer';
import {
  applyPrimaryOverride,
  analyzeWebsiteStyle,
  autoThemeStorageKey,
  generateThemeRecommendations,
  type WebsiteStyleSnapshot,
  type GeneratedThemeRecommendation,
} from './themeIntelligence';
import { UnifiedSiteAwareExtensionAdapter, resolveLearnSeed } from './studio/adapters/UnifiedSiteAwareExtensionAdapter';

type AppProps = {
  adapter?: typeof UnifiedSiteAwareExtensionAdapter;
};

type PreviewMode = 'build' | 'preview' | 'test';
type StudioMode = 
  | 'build'
  | 'design' 
  | 'preview' 
  | 'test' 
  | 'auto-match'
  | 'overview'
  | 'application' 
  | 'learn' 
  | 'brain' 
  | 'knowledge' 
  | 'test' 
  | 'assist' 
  | 'settings';
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

type DesignHistoryEntry = {
  id: number;
  label: string;
  config: StudioConfig;
  themeMode: ThemeMode;
  widgetOpen: boolean;
};

type PendingDesignAction = {
  summary: string;
  reasoning: string[];
  patch: DesignPatch;
  changes: string[];
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

function labelForVariant(collection: Array<{ id: string; label: string }>, id: unknown) {
  if (typeof id !== 'string') return '';
  return collection.find((item) => item.id === id)?.label ?? id;
}

function describeDesignPatch(
  patch: DesignPatch,
  currentConfig: StudioConfig,
  currentThemeMode: ThemeMode,
  locale: UILocale,
) {
  const changes: string[] = [];
  const add = (label: string, from: string | number | boolean, to: string | number | boolean) => {
    if (String(from) !== String(to)) {
      changes.push(`${label}: ${from} -> ${to}`);
    }
  };

  const labels = locale === 'ar'
    ? {
        theme: 'الثيم',
        icon: 'الأيقونة',
        launcher: 'المشغّل',
        chat: 'نافذة المحادثة',
        assistant: 'رد الذكاء',
        user: 'رسالة المستخدم',
        input: 'حقل السؤال',
        send: 'زر الإرسال',
        sources: 'المصادر',
        cta: 'زر التوجيه',
        radius: 'الاستدارة',
        width: 'العرض',
        height: 'الارتفاع',
        density: 'الكثافة',
        shadow: 'الظل',
        size: 'حجم الأيقونة',
        position: 'مكان الأيقونة',
        color: 'اللون الأساسي',
        mode: 'وضع العرض',
        open: 'حالة المحادثة',
      }
    : {
        theme: 'Theme',
        icon: 'Icon',
        launcher: 'Launcher',
        chat: 'Chat shell',
        assistant: 'Assistant message',
        user: 'User message',
        input: 'Composer',
        send: 'Send button',
        sources: 'Sources',
        cta: 'CTA',
        radius: 'Radius',
        width: 'Width',
        height: 'Height',
        density: 'Density',
        shadow: 'Shadow',
        size: 'Launcher size',
        position: 'Launcher position',
        color: 'Primary color',
        mode: 'Theme mode',
        open: 'Chat open',
      };

  add(labels.theme, labelForVariant(themePalettes, currentConfig.theme), labelForVariant(themePalettes, patch.theme) || currentConfig.theme);
  add(labels.icon, labelForVariant(assistantIcons, currentConfig.assistantIcon), labelForVariant(assistantIcons, patch.assistantIcon) || currentConfig.assistantIcon);
  add(labels.launcher, labelForVariant(launcherVariants, currentConfig.launcher), labelForVariant(launcherVariants, patch.launcher) || currentConfig.launcher);
  add(labels.chat, labelForVariant(chatShellVariants, currentConfig.chatShell), labelForVariant(chatShellVariants, patch.chatShell) || currentConfig.chatShell);
  add(labels.assistant, labelForVariant(assistantMessages, currentConfig.assistantMessage), labelForVariant(assistantMessages, patch.assistantMessage) || currentConfig.assistantMessage);
  add(labels.user, labelForVariant(userMessages, currentConfig.userMessage), labelForVariant(userMessages, patch.userMessage) || currentConfig.userMessage);
  add(labels.input, labelForVariant(inputBars, currentConfig.inputBar), labelForVariant(inputBars, patch.inputBar) || currentConfig.inputBar);
  add(labels.send, labelForVariant(sendButtons, currentConfig.sendButton), labelForVariant(sendButtons, patch.sendButton) || currentConfig.sendButton);
  add(labels.sources, labelForVariant(sourceCitationVariants, currentConfig.sourceCitation), labelForVariant(sourceCitationVariants, patch.sourceCitation) || currentConfig.sourceCitation);
  add(labels.cta, labelForVariant(takeMeThereVariants, currentConfig.takeMeThere), labelForVariant(takeMeThereVariants, patch.takeMeThere) || currentConfig.takeMeThere);

  if (patch.appearance) {
    const appearance = patch.appearance;
    if (appearance.radius) add(labels.radius, currentConfig.appearance.radius, appearance.radius);
    if (typeof appearance.widgetWidth === 'number') add(labels.width, currentConfig.appearance.widgetWidth, appearance.widgetWidth);
    if (typeof appearance.widgetHeight === 'number') add(labels.height, currentConfig.appearance.widgetHeight, appearance.widgetHeight);
    if (appearance.density) add(labels.density, currentConfig.appearance.density, appearance.density);
    if (typeof appearance.shadowStrength === 'number') add(labels.shadow, currentConfig.appearance.shadowStrength, appearance.shadowStrength);
    if (appearance.launcherSize) add(labels.size, currentConfig.appearance.launcherSize, appearance.launcherSize);
    if (appearance.launcherPosition) add(labels.position, currentConfig.appearance.launcherPosition, appearance.launcherPosition);
    if (appearance.primaryColor) add(labels.color, currentConfig.appearance.primaryColor, appearance.primaryColor);
  }

  if (patch.themeMode) add(labels.mode, currentThemeMode, patch.themeMode);
  if (typeof patch.widgetOpen === 'boolean') add(labels.open, true, patch.widgetOpen);

  return changes.slice(0, 10);
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

type OwnerPanelProps = {
  mode: string;
  locale: UILocale;
  ownerLoading: boolean;
  ownerError: string;
  ownerCaps: Record<string, any> | null;
  ownerProfile: Record<string, any> | null;
  ownerReadiness: Record<string, any> | null;
  ownerPage: Record<string, any> | null;
  ownerMap: Record<string, any> | null;
  ownerAppearance: Record<string, any> | null;
  learnSession: Record<string, any> | null;
  learnCoverage?: Record<string, any> | null;
  learnReliability?: Record<string, any> | null;
  extHealth?: Record<string, any> | null;
  appName: string;
  setAppName: (v: string) => void;
  appUrl: string;
  setAppUrl: (v: string) => void;
  appOrigin: string;
  setAppOrigin: (v: string) => void;
  appScope: string;
  setAppScope: (v: string) => void;
  appLang: string;
  setAppLang: (v: string) => void;
  appBudget: number;
  setAppBudget: (v: number) => void;
  appAdded: boolean;
  setAppAdded: (v: boolean) => void;
  designProfile: Record<string, any> | null;
  mgmtKey: string;
  setMgmtKey: (v: string) => void;
  testQuestion: string;
  setTestQuestion: (v: string) => void;
  testResult: Record<string, any> | null;
  testStructuralId: string;
  testHighlightOk: boolean | null;
  testVerify: Record<string, any> | null;
  assistInput: string;
  setAssistInput: (v: string) => void;
  assistLog: Array<{ role: 'user' | 'assistant'; text: string }>;
  learnVisits: Array<{ route: string; status: string }>;
  assistSending: boolean;
  fmtOwner: (v: unknown) => string;
  onRefresh: () => void;
  onStartLearn: () => void;
  onLearnAction: (a: 'pause' | 'resume' | 'stop') => void;
  onLearnPass: () => void;
  onDetectDesign: () => void;
  onAutoMatch: () => void;
  onTakeSiteColors: () => void;
  onSaveAppearance: () => void;
  onTestResolve: () => void;
  onTestHighlight: () => void;
  onTestVerify: () => void;
  onAssistSend: () => void;
};

function OwnerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="analysis-card">
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

function OwnerPanel(props: OwnerPanelProps) {
  const { mode, locale } = props;
  const ar = locale === 'ar';
  const title: Record<string, [string, string, string]> = {
    overview: [ar ? 'نظرة عامة' : 'Overview', ar ? 'قيم حقيقية من الخلفية' : 'Real backend values', 'overview'],
    application: [ar ? 'التطبيق' : 'Application', ar ? 'إعداد حقيقي' : 'Real onboarding', 'application'],
    learn: [ar ? 'التعلم' : 'Learn', ar ? 'جلسات حقيقية' : 'Real sessions', 'learn'],
    brain: [ar ? 'الدماغ' : 'Brain', ar ? 'خريطة التطبيق' : 'Application map', 'brain'],
    knowledge: [ar ? 'المعرفة' : 'Knowledge', ar ? 'مصادر حقيقية' : 'Real sources', 'knowledge'],
    test: [ar ? 'الاختبار 5C/5D/5E' : 'Test 5C / 5D / 5E', ar ? 'تحقق حقيقي' : 'Real verification', 'test'],
    assist: [ar ? 'المساعد' : 'Assist', ar ? 'إجابات موثقة' : 'Grounded answers', 'assist'],
    settings: [ar ? 'الإعدادات' : 'Settings', ar ? 'المظهر والوضع' : 'Appearance and mode', 'settings'],
  };
  const [heading, sub] = title[mode] ?? [mode, ''];
  const map = props.ownerMap as any;
  const caps = props.ownerCaps as any;

  return (
    <>
      <section className="panel-section sticky">
        <div className="panel-heading">
          <h2>{heading}</h2>
          <span>{sub}</span>
        </div>
        <p className="copilot-intro">
          {ar
            ? 'GUIDE ONLY — المرحلة 6 مغلقة. القيم الحقيقية فقط، وغير المتاح يظهر صراحة.'
            : 'GUIDE ONLY — Stage 6 OFF. Real values only; unavailable is shown explicitly.'}
        </p>
        <div className="auto-actions">
          <button className="primary-button" onClick={props.onRefresh} type="button" disabled={props.ownerLoading}>
            {props.ownerLoading ? (ar ? 'جاري التحديث...' : 'Refreshing...') : ar ? 'تحديث البيانات' : 'Refresh data'}
          </button>
        </div>
        {props.ownerError ? (
          <div className="copilot-result-card error">
            <strong>{ar ? 'غير متاح' : 'Unavailable'}</strong>
            <p>{props.ownerError}</p>
          </div>
        ) : null}
      </section>

      {mode === 'overview' ? (
        <section className="panel-section">
          <div className="panel-heading">
            <h2>{ar ? 'حالة التطبيق' : 'Application state'}</h2>
            <span>{ar ? 'من الخلفية' : 'From backend'}</span>
          </div>
          <div className="copilot-insight-list">
            <OwnerRow label={ar ? 'التطبيق' : 'Application'} value={props.fmtOwner(props.ownerProfile?.site_id ?? props.appName)} />
            <OwnerRow label="Origin" value={props.fmtOwner(props.ownerProfile?.origin ?? props.appOrigin)} />
            <OwnerRow label={ar ? 'الصفحة الحالية' : 'Current page'} value={props.fmtOwner(props.ownerPage?.path ?? props.ownerPage?.url)} />
            <OwnerRow label={ar ? 'النطاق' : 'Access scope'} value={props.fmtOwner(props.ownerProfile?.access_scope ?? props.appScope)} />
            <OwnerRow label={ar ? 'الجاهزية' : 'Readiness'} value={props.fmtOwner(props.ownerReadiness?.state)} />
            <OwnerRow label={ar ? 'حالة التعلم' : 'Learning state'} value={props.fmtOwner((props.learnSession as any)?.state ?? map?.state)} />
            <OwnerRow label={ar ? 'الصفحات المرصودة' : 'Pages observed'} value={props.fmtOwner(map?.pages_observed)} />
            <OwnerRow label={ar ? 'العقد / الروابط' : 'Graph nodes / edges'} value={`${props.fmtOwner(map?.graph_nodes)} / ${props.fmtOwner(map?.graph_edges)}`} />
            <OwnerRow label="Auto Knowledge" value={props.fmtOwner(map?.auto_knowledge_sources)} />
            <OwnerRow label="Customer Knowledge" value={props.fmtOwner(map?.customer_knowledge_sources)} />
            <OwnerRow label={ar ? 'المظهر' : 'Appearance'} value={props.ownerAppearance ? (ar ? 'مكوّن' : 'Configured') : 'UNAVAILABLE / NOT LEARNED'} />
            <OwnerRow label="Stage 6" value={caps ? `GUIDE ONLY (stage6=${String(caps.stage6)})` : 'GUIDE ONLY'} />
          </div>
        </section>
      ) : null}

      {mode === 'application' ? (
        <>
          <section className="panel-section">
            <div className="panel-heading">
              <h2>{ar ? 'إضافة تطبيق' : 'Add application'}</h2>
              <span>{ar ? 'بدون بيانات حساسة' : 'No sensitive data'}</span>
            </div>
            <div className="settings-grid">
              <label>
                {ar ? 'اسم التطبيق' : 'Application Name'}
                <input className="search-input" value={props.appName} onChange={(e) => props.setAppName(e.target.value)} />
              </label>
              <label>
                {ar ? 'رابط التطبيق' : 'Application URL'}
                <input className="search-input" value={props.appUrl} onChange={(e) => props.setAppUrl(e.target.value)} />
              </label>
              <label>
                {ar ? 'الأصل المسموح' : 'Allowed Origin'}
                <input className="search-input" value={props.appOrigin} onChange={(e) => props.setAppOrigin(e.target.value)} />
              </label>
              <label>
                {ar ? 'نطاق التعلم' : 'Learning Scope'}
                <select className="search-input" value={props.appScope} onChange={(e) => props.setAppScope(e.target.value)}>
                  <option value="PUBLIC">PUBLIC</option>
                  <option value="AUTHENTICATED">AUTHENTICATED</option>
                </select>
              </label>
              <label>
                {ar ? 'اللغة' : 'Language'}
                <select className="search-input" value={props.appLang} onChange={(e) => props.setAppLang(e.target.value)}>
                  <option value="AUTO">AUTO</option>
                  <option value="AR">AR</option>
                  <option value="EN">EN</option>
                </select>
              </label>
              <label>
                {ar ? 'ميزانية التعلم' : 'Learning budget'}
                <input className="search-input" type="number" min={1} max={25} value={props.appBudget} onChange={(e) => props.setAppBudget(Number(e.target.value))} />
              </label>
            </div>
            <div className="auto-actions">
              <button className="primary-button" type="button" onClick={() => props.setAppAdded(true)}>
                {ar ? 'إضافة التطبيق' : 'ADD APPLICATION'}
              </button>
            </div>
          </section>
          <section className="panel-section">
            <div className="panel-heading">
              <h2>{ar ? 'التحقق من الجاهزية' : 'Readiness check'}</h2>
              <span>{ar ? 'تسجيل دخول يدوي' : 'Manual login'}</span>
            </div>
            <p className="copilot-intro">
              {ar
                ? 'افتح التطبيق في التبويب النشط وسجل الدخول بنفسك، ثم اضغط تحقق. لا نطلب اسم مستخدم أو كلمة مرور أو رموز.'
                : 'Open the application in the active tab and log in yourself, then verify. We never ask for username, password, or tokens.'}
            </p>
            <div className="auto-actions">
              <button className="secondary-button" type="button" onClick={() => window.open(props.appUrl, '_blank')}>
                {ar ? 'فتح التطبيق' : 'OPEN APPLICATION'}
              </button>
              <button className="primary-button" type="button" onClick={props.onRefresh}>
                {ar ? 'لقد سجلت الدخول — تحقق' : 'I HAVE LOGGED IN — verify'}
              </button>
            </div>
            {props.appAdded ? (
              <div className="copilot-insight-list">
                <OwnerRow label={ar ? 'تطابق الأصل' : 'Origin match'} value={props.fmtOwner(props.ownerReadiness?.inScope ? 'MATCH' : 'MISMATCH')} />
                <OwnerRow label={ar ? 'التبويب متصل' : 'Tab connected'} value={props.fmtOwner(props.ownerPage?.url ? 'CONNECTED' : 'NOT CONNECTED')} />
                <OwnerRow label={ar ? 'سياق مصادق' : 'Authenticated context'} value={props.fmtOwner(props.ownerReadiness?.state)} />
                <OwnerRow label={ar ? 'الصفحة الآمنة الحالية' : 'Current safe page'} value={props.fmtOwner(props.ownerPage?.path)} />
                <OwnerRow label={ar ? 'هوية التطبيق' : 'Application identity'} value={props.fmtOwner(props.ownerProfile?.site_id)} />
              </div>
            ) : null}
          </section>
        </>
      ) : null}

      {mode === 'learn' ? (
        <section className="panel-section">
          <div className="panel-heading">
            <h2>{ar ? 'التعلم التفاعلي' : 'Interactive learning'}</h2>
            <span>{ar ? 'مراقبة آمنة فقط' : 'Safe observation only'}</span>
          </div>
          <div className="auto-actions">
            <button className="primary-button" type="button" onClick={props.onStartLearn} disabled={props.ownerLoading}>
              {ar ? 'بدء التعلم' : 'START LEARN'}
            </button>
            <button className="secondary-button" type="button" onClick={() => props.onLearnAction('pause')}>
              {ar ? 'إيقاف مؤقت' : 'PAUSE'}
            </button>
            <button className="secondary-button" type="button" onClick={() => props.onLearnAction('resume')}>
              {ar ? 'استئناف' : 'RESUME'}
            </button>
            <button className="secondary-button" type="button" onClick={() => props.onLearnAction('stop')}>
              {ar ? 'إيقاف' : 'STOP'}
            </button>
            <button className="secondary-button" type="button" onClick={props.onLearnPass} disabled={props.ownerLoading}>
              {ar ? 'تمريرة تعلم واحدة (تصحيح)' : 'Single learn pass (debug)'}
            </button>
          </div>
          <p className="copilot-intro">
            {ar
              ? 'بدء التعلم يبدأ من الصفحة الحالية المسجلة ويتابع تلقائيا عبر الحدود الآمنة. استكشاف الحالة البنيوية الآمنة مفعّل عبر ترخيص Core D3 مع تتبع محدود لتحولات الحالة. إجراءات Stage 6 تبقى معطلة.'
              : 'START LEARN seeds from the current authenticated page and traverses automatically via the safe backend frontier. Safe structural state exploration is enabled through Core D3 authorization and bounded state transition tracking. Stage 6 actions remain disabled.'}
          </p>
          <div className="copilot-insight-list">
            <OwnerRow label={ar ? 'الجلسة' : 'Session'} value={props.fmtOwner((props.learnSession as any)?.session_id)} />
            <OwnerRow label={ar ? 'الحالة' : 'State'} value={props.fmtOwner((props.learnSession as any)?.state)} />
            <OwnerRow label={ar ? 'المسار الحالي' : 'Current route'} value={props.fmtOwner((props.learnSession as any)?.current_item)} />
            <OwnerRow label={ar ? 'الصفحات المرصودة' : 'Pages observed'} value={props.fmtOwner((props.learnSession as any)?.pages_observed)} />
            <OwnerRow label={ar ? 'الحدود' : 'Frontier'} value={props.fmtOwner((props.learnSession as any)?.frontier_depth)} />
            <OwnerRow label={ar ? 'العقد / الروابط' : 'Nodes / edges'} value={`${props.fmtOwner((props.learnSession as any)?.nodes_added)} / ${props.fmtOwner((props.learnSession as any)?.edges_added)}`} />
            <OwnerRow label={ar ? 'تفاعلات آمنة' : 'Safe interactions'} value={props.fmtOwner((props.learnSession as any)?.interactions_explored)} />
            <OwnerRow label={ar ? 'مرفوض' : 'Rejected'} value={props.fmtOwner((props.learnSession as any)?.rejected_routes)} />
            <OwnerRow label={ar ? 'التغطية (D6)' : 'Coverage (D6)'} value={props.fmtOwner((props.learnCoverage as any)?.verdict)} />
            <OwnerRow label={ar ? 'أسباب التغطية' : 'Coverage reasons'} value={props.fmtOwner(Array.isArray((props.learnCoverage as any)?.reasons) ? (props.learnCoverage as any).reasons.join('; ') : (props.learnCoverage as any)?.reasons)} />
            <OwnerRow label={ar ? 'سبب الإنهاء (D7)' : 'Termination (D7)'} value={props.fmtOwner((props.learnReliability as any)?.termination_reason)} />
            <OwnerRow label={ar ? 'صحة الخلفية' : 'Backend health'} value={props.fmtOwner((props.extHealth as any)?.state)} />
          </div>
          <div className="panel-heading">
            <h2>{ar ? 'سجل التمريرات' : 'Pass log'}</h2>
            <span>{props.learnVisits.length}</span>
          </div>
          <div className="copilot-insight-list">
            {props.learnVisits.length ? (
              props.learnVisits.map((visit, index) => (
                <div key={`${visit.route}-${index}`} className="analysis-card">
                  <strong>{visit.route}</strong>
                  <span>{visit.status}</span>
                </div>
              ))
            ) : (
              <div className="analysis-card">
                <strong>{ar ? 'لا تمريرات بعد' : 'No passes yet'}</strong>
                <span>NO DATA YET</span>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {mode === 'brain' ? (
        <section className="panel-section">
          <div className="panel-heading">
            <h2>{ar ? 'خريطة التطبيق' : 'Application map'}</h2>
            <span>{ar ? 'من الرسم البياني' : 'From graph'}</span>
          </div>
          <div className="copilot-insight-list">
            <OwnerRow label={ar ? 'الحالة' : 'State'} value={props.fmtOwner(map?.state)} />
            <OwnerRow label={ar ? 'الصفحات المرصودة' : 'Observed pages'} value={props.fmtOwner(map?.pages_observed)} />
            <OwnerRow label={ar ? 'المسارات المعروفة' : 'Routes known'} value={props.fmtOwner(map?.routes_known)} />
            <OwnerRow label={ar ? 'العقد' : 'Graph nodes'} value={props.fmtOwner(map?.graph_nodes)} />
            <OwnerRow label={ar ? 'الروابط' : 'Graph edges'} value={props.fmtOwner(map?.graph_edges)} />
            <OwnerRow label={ar ? 'الجلسات' : 'Sessions'} value={props.fmtOwner((map?.sessions || []).length)} />
          </div>
          <div className="panel-heading">
            <h2>{ar ? 'المناطق المرصودة' : 'Observed areas'}</h2>
            <span>{(map?.areas || []).length}</span>
          </div>
          <div className="copilot-insight-list">
            {(map?.areas || []).length ? (
              (map.areas as Array<{ entity_id: string; label_ar: string; label_en: string }>).map((area) => (
                <div key={area.entity_id} className="analysis-card">
                  <strong>{ar ? area.label_ar : area.label_en}</strong>
                  <span>{`Status: VERIFIED / Scope: ${props.appScope} / id: ${area.entity_id}`}</span>
                </div>
              ))
            ) : (
              <div className="analysis-card">
                <strong>{ar ? 'لا مناطق بعد' : 'No areas yet'}</strong>
                <span>UNAVAILABLE / NOT LEARNED</span>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {mode === 'knowledge' ? (
        <>
          <section className="panel-section">
            <div className="panel-heading">
              <h2>AUTO KNOWLEDGE</h2>
              <span>{props.fmtOwner(map?.auto_knowledge_sources)}</span>
            </div>
            <p className="copilot-intro">
              {ar ? 'معرفة موثقة مولدة من أدلة مرصودة فقط.' : 'Grounded knowledge generated from observed evidence only.'}
            </p>
            <div className="copilot-insight-list">
              <OwnerRow label="Auto sources" value={props.fmtOwner(map?.auto_knowledge_sources)} />
            </div>
          </section>
          <section className="panel-section">
            <div className="panel-heading">
              <h2>CUSTOMER KNOWLEDGE</h2>
              <span>{props.fmtOwner(map?.customer_knowledge_sources)}</span>
            </div>
            <p className="copilot-intro">
              {ar ? 'معرفة المالك إن وجدت، وإلا عرض للقراءة فقط.' : 'Owner-added knowledge if present, otherwise read-only.'}
            </p>
            <div className="copilot-insight-list">
              <OwnerRow label="Customer sources" value={props.fmtOwner(map?.customer_knowledge_sources)} />
            </div>
          </section>
        </>
      ) : null}

      {mode === 'test' ? (
        <section className="panel-section">
          <div className="panel-heading">
            <h2>{ar ? 'اختبار موجه' : 'Guided test'}</h2>
            <span>5C / 5D / 5E</span>
          </div>
          <textarea
            className="copilot-textarea"
            rows={3}
            value={props.testQuestion}
            onChange={(e) => props.setTestQuestion(e.target.value)}
            placeholder={ar ? 'اكتب سؤال المؤسس...' : 'Enter founder question...'}
          />
          <div className="auto-actions">
            <button className="primary-button" type="button" onClick={props.onTestResolve} disabled={props.ownerLoading}>
              5C RESOLVE
            </button>
            <button className="secondary-button" type="button" onClick={props.onTestHighlight}>
              5D HIGHLIGHT
            </button>
            <button className="secondary-button" type="button" onClick={props.onTestVerify} disabled={props.ownerLoading}>
              5E VERIFY
            </button>
          </div>
          <div className="copilot-insight-list">
            <OwnerRow label={ar ? 'الصفحة الحالية' : 'Current Page'} value={props.fmtOwner(props.ownerPage?.path)} />
            <OwnerRow label={ar ? 'النطاق' : 'Access Scope'} value={props.fmtOwner(props.ownerProfile?.access_scope)} />
            <OwnerRow label="Grounding" value={props.fmtOwner(props.testResult ? String((props.testResult as any)?.grounded) : '')} />
            <OwnerRow label={ar ? 'الإجابة' : 'Answer'} value={props.fmtOwner((props.testResult as any)?.answer)} />
            <OwnerRow label="Target identity" value={props.fmtOwner((props.testResult as any)?.guide?.target_identity || (props.testResult as any)?.target?.identity)} />
            <OwnerRow label="Target safe label" value={props.fmtOwner((props.testResult as any)?.target?.safe_label)} />
            <OwnerRow label="Expected route" value={props.fmtOwner((props.testResult as any)?.guide?.expected_route || (props.testResult as any)?.verification?.expected_route)} />
            <OwnerRow label="Structural id" value={props.fmtOwner(props.testStructuralId)} />
            <OwnerRow label="5D highlight" value={props.testHighlightOk === null ? 'UNAVAILABLE / NOT LEARNED' : props.testHighlightOk ? 'HIGHLIGHTED (click manually)' : 'NOT HIGHLIGHTED'} />
            <OwnerRow label="5E verdict" value={props.fmtOwner((props.testVerify as any)?.status ? `${(props.testVerify as any).status} / ${(props.testVerify as any).recovery}` : '')} />
          </div>
        </section>
      ) : null}

      {mode === 'assist' ? (
        <section className="panel-section">
          <div className="panel-heading">
            <h2>{ar ? 'المساعد' : 'Assistant'}</h2>
            <span>{ar ? 'بدون تشخيص' : 'No diagnostics'}</span>
          </div>
          <div className="conversation" aria-live="polite">
            {props.assistLog.length ? (
              props.assistLog.map((message, index) => (
                <div key={index} className={message.role === 'user' ? 'message-row user-row' : 'message-row assistant-row'}>
                  <div className={message.role === 'user' ? 'message-card user-message' : 'message-card assistant-message'}>
                    <p>{message.text}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="copilot-intro">{ar ? 'اسأل عن التطبيق، وستصلك إجابة موثقة.' : 'Ask about the application for a grounded answer.'}</p>
            )}
          </div>
          <div className="composer widget-input">
            <input value={props.assistInput} onChange={(e) => props.setAssistInput(e.target.value)} placeholder={ar ? 'اكتب سؤالك...' : 'Ask...'} disabled={props.assistSending} />
            <button className="send-button" type="button" onClick={props.onAssistSend} disabled={props.assistSending || !props.assistInput.trim()}>
              {props.assistSending ? (ar ? '...' : '...') : ar ? 'إرسال' : 'Send'}
            </button>
          </div>
        </section>
      ) : null}

      {mode === 'settings' ? (
        <section className="panel-section">
          <div className="panel-heading">
            <h2>{ar ? 'المظهر' : 'Appearance'}</h2>
            <span>v1</span>
          </div>
          <div className="settings-grid">
            <label>
              Management key (PUT only)
              <input className="search-input" type="password" value={props.mgmtKey} onChange={(e) => props.setMgmtKey(e.target.value)} autoComplete="off" />
            </label>
          </div>
          <div className="auto-actions">
            <button className="secondary-button" type="button" onClick={props.onDetectDesign} disabled={props.ownerLoading}>
              {ar ? 'كشف ستايل الموقع' : 'Detect Website'}
            </button>
            <button className="primary-button" type="button" onClick={props.onTakeSiteColors} disabled={props.ownerLoading}>
              {ar ? 'خذ ألوان الموقع وطبّقها' : 'Take Site Colors'}
            </button>
            <button className="secondary-button" type="button" onClick={props.onAutoMatch}>
              {ar ? 'مطابقة تلقائية' : 'Auto Match'}
            </button>
            <button className="primary-button" type="button" onClick={props.onSaveAppearance} disabled={props.ownerLoading}>
              {ar ? 'حفظ المظهر' : 'Save Appearance'}
            </button>
          </div>
          <div className="copilot-insight-list">
            <OwnerRow label="Design profile" value={props.designProfile ? 'DETECTED' : 'UNAVAILABLE / NOT LEARNED'} />
            <OwnerRow label="Appearance" value={props.fmtOwner(props.ownerAppearance ? 'CONFIGURED' : '')} />
            <OwnerRow label="Stage 6" value="GUIDE ONLY / real_actions=false / actions=false" />
          </div>
        </section>
      ) : null}
    </>
  );
}

function App({ adapter = UnifiedSiteAwareExtensionAdapter }: AppProps) {
  const ownerAdapter = adapter;
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
  const [pendingDesignAction, setPendingDesignAction] = useState<PendingDesignAction | null>(null);
  const [designHistory, setDesignHistory] = useState<DesignHistoryEntry[]>([]);
  const [styleInput, setStyleInput] = useState(defaultStyleInput);
  const [styleAnalysis, setStyleAnalysis] = useState('');
  const [styleStatus, setStyleStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [styleReasoning, setStyleReasoning] = useState<string[]>([]);
  const [launcherAssetError, setLauncherAssetError] = useState('');
  const [referenceProfile, setReferenceProfile] = useState<ReferenceImageProfile | null>(null);
  const [referenceStatus, setReferenceStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [referenceError, setReferenceError] = useState('');

  // ---- REAL OWNER PRODUCT state (Unified adapter runtime, no mocks) ----
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [ownerError, setOwnerError] = useState('');
  const [ownerCaps, setOwnerCaps] = useState<Record<string, any> | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<Record<string, any> | null>(null);
  const [ownerReadiness, setOwnerReadiness] = useState<Record<string, any> | null>(null);
  const [ownerPage, setOwnerPage] = useState<Record<string, any> | null>(null);
  const [ownerMap, setOwnerMap] = useState<Record<string, any> | null>(null);
  const [ownerAppearance, setOwnerAppearance] = useState<Record<string, any> | null>(null);
  const [learnSession, setLearnSession] = useState<Record<string, any> | null>(null);
  const [learnCoverage, setLearnCoverage] = useState<Record<string, any> | null>(null);
  const [learnReliability, setLearnReliability] = useState<Record<string, any> | null>(null);
  const [extHealth, setExtHealth] = useState<Record<string, any> | null>(null);
  const [liveWidget, setLiveWidget] = useState<Record<string, any> | null>(null);
  const [appName, setAppName] = useState('Rousheta');
  const [appUrl, setAppUrl] = useState('https://rousheta.net');
  const [appOrigin, setAppOrigin] = useState('https://rousheta.net');
  const [appScope, setAppScope] = useState('AUTHENTICATED');
  const [appLang, setAppLang] = useState('AUTO');
  const [appBudget, setAppBudget] = useState(25);
  const [appAdded, setAppAdded] = useState(false);
  const [testQuestion, setTestQuestion] = useState('');
  const [testResult, setTestResult] = useState<Record<string, any> | null>(null);
  const [testStructuralId, setTestStructuralId] = useState('');
  const [testHighlightOk, setTestHighlightOk] = useState<boolean | null>(null);
  const [testVerify, setTestVerify] = useState<Record<string, any> | null>(null);
  const [assistInput, setAssistInput] = useState('');
  const [assistLog, setAssistLog] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [designProfile, setDesignProfile] = useState<Record<string, any> | null>(null);
  const [mgmtKey, setMgmtKey] = useState('');
  const [learnVisits, setLearnVisits] = useState<Array<{ route: string; status: string }>>([]);
  const [assistSending, setAssistSending] = useState(false);

  function ownerFail(error: unknown) {
    let message = error instanceof Error ? error.message : 'UNAVAILABLE:UNKNOWN';
    // Normalize generic network failures into an actionable backend state.
    // Developer detail stays in console; UI stays concise and distinguishable.
    if (/failed to fetch|fetch failed|networkerror|network error|load failed/i.test(message)) {
      message = 'UNAVAILABLE:BACKEND_UNREACHABLE:http://127.0.0.1:8000';
    }
    if (typeof console !== 'undefined' && typeof console.warn === 'function') {
      try { console.warn('[siteaware-owner]', error); } catch { /* noop */ }
    }
    setOwnerError(message);
  }

  function fmtOwner(value: unknown): string {
    if (value === null || value === undefined || value === '') return 'UNAVAILABLE / NOT LEARNED';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  async function refreshOwnerContext() {
    setOwnerLoading(true);
    setOwnerError('');
    try {
      // Ensure a normal Extension runtime session exists before checking readiness.
      await (ownerAdapter as any).ensureRuntimeSession().catch(() => {});
      const [caps, profile, readiness, page, map, appearance] = await Promise.all([
        ownerAdapter.getCapabilities().catch((e) => { throw e; }),
        ownerAdapter.getSiteProfile().catch(() => null),
        ownerAdapter.getReadiness().catch(() => null),
        ownerAdapter.getCurrentPage().catch(() => null),
        ownerAdapter.getBrainMap().catch(() => null),
        ownerAdapter.getAppearance('local').catch(() => null),
      ]);
      setOwnerCaps(caps as any);
      setOwnerProfile(profile as any);
      setOwnerReadiness(readiness as any);
      setOwnerPage(page as any);
      setOwnerMap(map as any);
      setOwnerAppearance(appearance as any);
    } catch (error) {
      ownerFail(error);
    } finally {
      setOwnerLoading(false);
    }
  }

  async function refreshLearnTruth(sessionId: string) {
    // Canonical D6/D7 truth (best-effort; never breaks the learn loop).
    // Missing data renders UNAVAILABLE, never 0.
    try {
      const cov = await (ownerAdapter as any).getCoverage?.(sessionId).catch(() => null);
      if (cov?.coverage) setLearnCoverage(cov.coverage as any);
    } catch { /* truth fetch must not break learning */ }
    try {
      const rel = await (ownerAdapter as any).getReliability?.(sessionId).catch(() => null);
      if (rel) setLearnReliability(rel as any);
    } catch { /* noop */ }
    try {
      const health = await (ownerAdapter as any).getExtensionHealth?.().catch(() => null);
      if (health) setExtHealth(health as any);
    } catch { /* noop */ }
  }

  async function handleStartLearn() {
    setOwnerLoading(true);
    setOwnerError('');
    setLearnVisits([]);
    try {
      // Readiness safety net: ensure a normal Extension runtime session exists
      // before starting learning. This is SiteAware runtime auth only; it does
      // not read or persist application credentials/cookies.
      const ok = await (ownerAdapter as any).ensureRuntimeSession();
      if (!ok) throw new Error('UNAVAILABLE:NO_SESSION_TOKEN');
      // START PAGE RULE (single source of truth: resolveLearnSeed):
      // seed from the CURRENT authenticated live page; fall back to the
      // profile route only when there is genuinely no live approved page.
      const page = await ownerAdapter.getCurrentPage().catch(() => null);
      const fallbackRoute = (ownerProfile as any)?.start_route || '';
      const rule = resolveLearnSeed({
        activeUrl: (page as any)?.url || '',
        approvedOrigins: ['https://rousheta.net'],
        fallbackRoute,
      });
      if (!rule.seed) throw new Error('UNAVAILABLE:NO_SEED_ROUTE');
      const seed = rule.seed;
      const origin = rule.origin || (ownerProfile as any)?.origin || 'https://rousheta.net';
      // Single press: automatic bounded traversal driven by backend frontier.
      // Progress streams via onProgress; pause/stop act through backend state.
      const result = await ownerAdapter.runAutoLearn({
        startRoute: seed,
        origin,
        maxUniquePages: appBudget,
        maxDepth: 3,
        maxPasses: 40,
        passTimeoutMs: 60000,
        onProgress: (ev: any) => {
          setLearnSession(ev.session as any);
          // Deltas only (see runAutoLearn): append chronologically.
          if (Array.isArray(ev.visited) && ev.visited.length) {
            setLearnVisits((previous: Array<{ route: string; status: string }>) => [
              ...previous,
              ...ev.visited.map((v: any) => ({ route: v.route, status: v.status })),
            ].slice(-30));
          }
        },
      });
      setLearnSession(result.session as any);
      // Authoritative full visit list replaces the streamed deltas.
      setLearnVisits(
        result.visited.map((v) => ({ route: v.route, status: v.status })).slice(-30),
      );
      await refreshLearnTruth((result.session as any)?.session_id || '').catch(() => null);
      await refreshOwnerContext().catch(() => null);
    } catch (error) {
      ownerFail(error);
    } finally {
      setOwnerLoading(false);
    }
  }

  async function handleLearnAction(action: 'pause' | 'resume' | 'stop') {
    const sessionId = (learnSession as any)?.session_id;
    if (!sessionId) {
      setOwnerError('UNAVAILABLE:NO_LEARNING_SESSION');
      return;
    }
    setOwnerLoading(true);
    setOwnerError('');
    try {
      if (action === 'pause') setLearnSession((await ownerAdapter.pauseLearning(sessionId)) as any);
      if (action === 'resume') setLearnSession((await ownerAdapter.resumeLearning(sessionId)) as any);
      if (action === 'stop') setLearnSession((await ownerAdapter.stopLearning(sessionId)) as any);
      await refreshLearnTruth(sessionId).catch(() => null);
    } catch (error) {
      ownerFail(error);
    } finally {
      setOwnerLoading(false);
    }
  }

  async function handleLearnPassOnce() {
    setOwnerLoading(true);
    setOwnerError('');
    try {
      const sessionId = (learnSession as any)?.session_id;
      if (!sessionId) throw new Error('UNAVAILABLE:NO_LEARNING_SESSION');
      const session = await ownerAdapter.getLearningProgress(sessionId).catch(() => learnSession);
      const nextRoute = (session as any)?.current_item || (ownerProfile as any)?.start_route || '/ar/clinic/dashboard';
      const origin = (ownerProfile as any)?.origin || 'https://rousheta.net';
      const pass = await ownerAdapter.requestLearnPass({ origin, routes: [nextRoute], maxPages: 1 });
      for (const visit of pass.visited || []) {
        if (visit.observation) {
          await ownerAdapter.ingestObservation(sessionId, visit.observation, visit.route).catch(() => null);
        }
      }
      setLearnSession((await ownerAdapter.getLearningProgress(sessionId).catch(() => session)) as any);
      await refreshLearnTruth(sessionId).catch(() => null);
      await refreshOwnerContext().catch(() => null);
    } catch (error) {
      ownerFail(error);
    } finally {
      setOwnerLoading(false);
    }
  }

  async function handleDetectDesign() {
    setOwnerLoading(true);
    setOwnerError('');
    try {
      const profile = await ownerAdapter.getDesignProfile();
      setDesignProfile(profile as any);
    } catch (error) {
      ownerFail(error);
    } finally {
      setOwnerLoading(false);
    }
  }

  function handleAutoMatchApply() {
    setOwnerError('');
    try {
      if (!designProfile) throw new Error('UNAVAILABLE:NO_DESIGN_PROFILE');
      const appearance = ownerAdapter.autoMatch(designProfile);
      setOwnerAppearance(appearance);
      setConfig((previous) => ({
        ...previous,
        appearance: {
          ...previous.appearance,
          primaryColor: (appearance.primary_color as string) ?? previous.appearance.primaryColor,
          widgetWidth: (appearance.panel_width_px as number) ?? previous.appearance.widgetWidth,
          widgetHeight: (appearance.panel_height_px as number) ?? previous.appearance.widgetHeight,
        },
      }));
    } catch (error) {
      ownerFail(error);
    }
  }

  async function handleTakeSiteColors() {
    setOwnerLoading(true);
    setOwnerError('');
    try {
      const profile = designProfile ?? await ownerAdapter.getDesignProfile();
      if (!profile) throw new Error('UNAVAILABLE:NO_DESIGN_PROFILE');
      const appearance = ownerAdapter.autoMatch(profile);
      const primaryColor = (appearance.primary_color as string) ?? config.appearance.primaryColor;
      const radiusPx = Number(appearance.radius_px ?? 18);
      const nextRadius: StudioConfig['appearance']['radius'] = radiusPx >= 24 ? 'xl' : radiusPx >= 16 ? 'lg' : radiusPx >= 10 ? 'md' : 'sm';
      const nextMode = appearance.theme === 'dark' ? 'dark' : 'light';

      pushDesignHistory(locale === 'ar' ? 'خذ ألوان الموقع' : 'Take site colors');
      setDesignProfile(profile as any);
      setOwnerAppearance(appearance);
      setPendingDesignAction(null);
      setActiveAutoTheme(null);
      setThemeMode(nextMode);
      setConfig((previous) => ({
        ...previous,
        theme: nextMode === 'dark' ? 'siteaware-default' : 'neutral-light',
        themeOrigin: 'auto-brand',
        chatShell: nextMode === 'dark' ? 'premium' : 'minimal',
        launcher: 'circle-icon',
        header: nextMode === 'dark' ? 'header-status' : 'header-minimal',
        assistantMessage: nextMode === 'dark' ? 'glass' : 'source-first',
        inputBar: nextMode === 'dark' ? 'glass-composer' : 'pill-input',
        sendButton: 'send-circle',
        appearance: {
          ...previous.appearance,
          primaryColor,
          radius: nextRadius,
          widgetWidth: (appearance.panel_width_px as number) ?? previous.appearance.widgetWidth,
          widgetHeight: (appearance.panel_height_px as number) ?? previous.appearance.widgetHeight,
          density: (appearance.density as StudioConfig['appearance']['density']) ?? previous.appearance.density,
          launcherPosition: 'bottom-right',
          launcherSize: 'md',
        },
      }));
      setSelectedCategory('theme');
      setWidgetOpen(true);
      setDesignSummary(
        locale === 'ar'
          ? `أخذت ألوان الموقع وطبقتها على الذكاء. اللون الأساسي: ${primaryColor}`
          : `Site colors were applied to the assistant. Primary color: ${primaryColor}`,
      );
    } catch (error) {
      ownerFail(error);
    } finally {
      setOwnerLoading(false);
    }
  }

  async function handleSaveAppearance() {
    setOwnerLoading(true);
    setOwnerError('');
    try {
      const saved = await ownerAdapter.saveAppearance(
        {
          theme: 'light',
          primary_color: config.appearance.primaryColor,
          radius_px: { sm: 10, md: 14, lg: 20, xl: 26 }[config.appearance.radius] ?? 12,
          panel_width_px: config.appearance.widgetWidth,
          panel_height_px: config.appearance.widgetHeight,
          direction: locale === 'ar' ? 'rtl' : 'ltr',
          locale,
        },
        'local',
        mgmtKey,
      );
      setOwnerAppearance(saved as any);
    } catch (error) {
      ownerFail(error);
    } finally {
      setOwnerLoading(false);
    }
  }

  // ---- LIVE-SITE widget (real tab; existing content-script contract) ----
  function liveWidgetFail(stage: string, error: unknown) {
    const message = error instanceof Error ? error.message : 'UNAVAILABLE:UNKNOWN';
    setLiveWidget({ status: 'error', stage, detail: message, tabUrl: '' });
  }

  async function handleApplyLiveWidget() {
    setOwnerError('');
    try {
      const result = await (ownerAdapter as any).renderLiveWidget?.(
        config as any,
        { locale, direction: locale === 'ar' ? 'rtl' : 'ltr', open: widgetOpen },
      );
      if (!result?.ok) throw new Error('UNAVAILABLE:WIDGET_APPLY_REJECTED');
      setLiveWidget({ status: 'applied', tabUrl: result.tabUrl, detail: result.logoDropped ? 'APPLIED · custom logo dropped (size)' : 'APPLIED', open: widgetOpen });
    } catch (error) {
      liveWidgetFail('apply', error);
      ownerFail(error);
    }
  }

  async function handleUpdateLiveWidget() {
    setOwnerError('');
    try {
      const patch = (ownerAdapter as any).buildLiveWidgetConfig?.(
        config as any,
        { locale, direction: locale === 'ar' ? 'rtl' : 'ltr', open: widgetOpen },
      ) ?? {};
      const result = await (ownerAdapter as any).updateLiveWidget?.(patch);
      if (!result?.ok) throw new Error('UNAVAILABLE:WIDGET_UPDATE_REJECTED');
      setLiveWidget({ status: 'updated', tabUrl: result.tabUrl, detail: 'UPDATED', open: widgetOpen });
    } catch (error) {
      liveWidgetFail('update', error);
      ownerFail(error);
    }
  }

  async function handleLiveWidgetOpen(open: boolean) {
    setOwnerError('');
    try {
      const result = await (ownerAdapter as any).setLiveWidgetOpen?.(open);
      if (!result?.ok) throw new Error('UNAVAILABLE:WIDGET_OPEN_REJECTED');
      setWidgetOpen(open);
      setLiveWidget({ status: open ? 'open' : 'closed', tabUrl: result.tabUrl, detail: open ? 'OPEN ON LIVE SITE' : 'CLOSED ON LIVE SITE', open });
    } catch (error) {
      liveWidgetFail(open ? 'open' : 'close', error);
      ownerFail(error);
    }
  }

  async function handleRemoveLiveWidget() {
    setOwnerError('');
    try {
      const result = await (ownerAdapter as any).removeLiveWidget?.();
      setLiveWidget({ status: result?.ok ? 'removed' : 'remove-unconfirmed', tabUrl: result?.tabUrl || '', detail: result?.ok ? 'REMOVED' : 'REMOVE UNCONFIRMED (tab may lack receiver)', open: false });
    } catch (error) {
      liveWidgetFail('remove', error);
      ownerFail(error);
    }
  }

  async function handleTestResolve() {
    setOwnerLoading(true);
    setOwnerError('');
    setTestVerify(null);
    setTestHighlightOk(null);
    try {
      if (!testQuestion.trim()) throw new Error('UNAVAILABLE:EMPTY_QUESTION');
      const result = await ownerAdapter.askAssist(testQuestion.trim(), locale);
      setTestResult(result as any);
      const identity = (result as any)?.guide?.target_identity || (result as any)?.target?.identity || '';
      const labelHint = (result as any)?.target?.safe_label || '';
      if (identity) {
        const structuralId = await ownerAdapter.resolveStructuralId(identity, labelHint).catch(() => '');
        setTestStructuralId(structuralId);
      } else {
        setTestStructuralId('');
      }
    } catch (error) {
      ownerFail(error);
    } finally {
      setOwnerLoading(false);
    }
  }

  async function handleTestHighlight() {
    setOwnerError('');
    try {
      if (!testStructuralId) throw new Error('UNAVAILABLE:NO_RESOLVED_TARGET');
      const ok = await ownerAdapter.highlightTarget(testStructuralId);
      setTestHighlightOk(ok);
    } catch (error) {
      ownerFail(error);
    }
  }

  async function handleTestVerify() {
    setOwnerLoading(true);
    setOwnerError('');
    try {
      const expected = (testResult as any)?.guide?.expected_route || (testResult as any)?.verification?.expected_route || '';
      if (!expected) throw new Error('UNAVAILABLE:NO_EXPECTED_ROUTE');
      const observation = await ownerAdapter.observeActiveTab().catch(() => null);
      const observedTemplate = (observation as any)?.route_template || (observation as any)?.url || ownerPage?.path || '';
      const observedUrl = (observation as any)?.url || ownerPage?.url || '';
      const verdict = await ownerAdapter.verifyArrival({
        expected_route: expected,
        observed_route_template: observedTemplate,
        observed_url: observedUrl,
        session_id: (learnSession as any)?.session_id || undefined,
      });
      setTestVerify(verdict as any);
    } catch (error) {
      ownerFail(error);
    } finally {
      setOwnerLoading(false);
    }
  }

  async function handleAssistSend() {
    if (!assistInput.trim() || assistSending) return;
    const question = assistInput.trim();
    setAssistInput('');
    setAssistSending(true);
    setAssistLog((previous) => [...previous, { role: 'user', text: question }]);
    try {
      const result = await ownerAdapter.askAssist(question, locale);
      setAssistLog((previous) => [...previous, { role: 'assistant', text: (result as any)?.answer || 'UNAVAILABLE / NOT LEARNED' }]);
      const identity = (result as any)?.guide?.target_identity;
      const labelHint = (result as any)?.target?.safe_label || '';
      if (identity) {
        const structuralId = await ownerAdapter.resolveStructuralId(identity, labelHint).catch(() => '');
        if (structuralId) await ownerAdapter.highlightTarget(structuralId).catch(() => null);
      }
    } catch {
      setAssistLog((previous) => [...previous, { role: 'assistant', text: 'UNAVAILABLE / NOT LEARNED' }]);
    } finally {
      setAssistSending(false);
    }
  }

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
    // Extension sidepanel context: the legacy relative /api/health URL would
    // resolve against chrome-extension:// and 404 noisily every poll. The
    // Unified Extension Adapter owns local backend health; skip this web-mode
    // poll here. Web Studio behavior below is unchanged.
    if (typeof window !== 'undefined' && window.location.protocol === 'chrome-extension:') {
      return;
    }
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
  const launcherAsset = config.launcherAsset;
  const currentLauncherPreview = launcherAsset ? (
    <img
      src={launcherAsset.dataUrl}
      alt={launcherAsset.name}
      className="launcher-asset-image"
      style={{
        objectFit: launcherAsset.fit,
        padding: `${launcherAsset.padding}px`,
        borderRadius: launcherAsset.shape === 'circle' ? '999px' : launcherAsset.shape === 'rounded' ? '18px' : '8px',
        background:
          launcherAsset.background === 'custom'
            ? launcherAsset.backgroundColor
            : launcherAsset.background === 'auto'
              ? 'color-mix(in srgb, var(--primary) 12%, white)'
              : 'transparent',
        border: launcherAsset.border ? '1px solid color-mix(in srgb, var(--primary) 34%, var(--border))' : '0',
        boxShadow: launcherAsset.shadow ? '0 14px 30px rgb(15 23 42 / 18%)' : 'none',
      }}
    />
  ) : currentIconPreview;
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
  const latestHistory = designHistory[0];
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

  function pushDesignHistory(label: string) {
    setDesignHistory((previous) => [
      {
        id: Date.now(),
        label,
        config: structuredClone(config),
        themeMode,
        widgetOpen,
      },
      ...previous.slice(0, 11),
    ]);
  }

  function undoDesignChange() {
    const [last, ...rest] = designHistory;
    if (!last) {
      return;
    }
    setConfig(last.config);
    setThemeMode(last.themeMode);
    setWidgetOpen(last.widgetOpen);
    setActiveAutoTheme(null);
    setPendingDesignAction(null);
    setDesignSummary(locale === 'ar' ? `تم الرجوع عن: ${last.label}` : `Undid: ${last.label}`);
    setDesignReasoning([]);
    setDesignHistory(rest);
  }

  function updateConfig<K extends keyof StudioConfig>(key: K, value: StudioConfig[K]) {
    pushDesignHistory(locale === 'ar' ? 'تعديل يدوي' : 'Manual edit');
    setPendingDesignAction(null);
    setConfig((previous) => ({ ...previous, [key]: value }));
  }

  function updateAppearance<K extends keyof StudioConfig['appearance']>(key: K, value: StudioConfig['appearance'][K]) {
    pushDesignHistory(locale === 'ar' ? 'تعديل مظهر يدوي' : 'Manual appearance edit');
    setPendingDesignAction(null);
    setConfig((previous) => ({
      ...previous,
      appearance: {
        ...previous.appearance,
        [key]: value,
      },
    }));
  }

  async function handleLauncherAssetUpload(file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      const asset = await readSafeLauncherAsset(file);
      pushDesignHistory(locale === 'ar' ? 'رفع شعار اللانشر' : 'Launcher logo upload');
      setLauncherAssetError('');
      setPendingDesignAction(null);
      setConfig((previous) => ({
        ...previous,
        launcher: 'circle-icon',
        launcherAsset: {
          ...asset,
          kind: 'uploaded',
          fit: 'contain',
          shape: 'circle',
          background: 'transparent',
          backgroundColor: previous.appearance.primaryColor,
          padding: 6,
          border: true,
          shadow: true,
        },
        appearance: {
          ...previous.appearance,
          launcherSize: previous.appearance.launcherSize === 'sm' ? 'md' : previous.appearance.launcherSize,
        },
      }));
      setWidgetOpen(true);
    } catch (error) {
      setLauncherAssetError(error instanceof Error ? error.message : 'Could not load this launcher image.');
    }
  }

  function updateLauncherAsset(patch: Partial<NonNullable<StudioConfig['launcherAsset']>>) {
    if (!config.launcherAsset) {
      return;
    }
    pushDesignHistory(locale === 'ar' ? 'تعديل صورة اللانشر' : 'Launcher image edit');
    setConfig((previous) => {
      if (!previous.launcherAsset) {
        return previous;
      }
      return {
        ...previous,
        launcherAsset: {
          ...previous.launcherAsset,
          ...patch,
        },
      };
    });
  }

  function removeLauncherAsset() {
    if (!config.launcherAsset) {
      return;
    }
    pushDesignHistory(locale === 'ar' ? 'حذف شعار اللانشر' : 'Remove launcher logo');
    setLauncherAssetError('');
    setConfig((previous) => {
      const { launcherAsset: _launcherAsset, ...rest } = previous;
      return rest;
    });
  }

  async function handleReferenceImageUpload(file: File | undefined) {
    if (!file) {
      return;
    }

    setReferenceStatus('loading');
    setReferenceError('');
    try {
      const profile = await analyzeReferenceImage(file);
      setReferenceProfile(profile);
      setReferenceStatus('idle');
      setDesignSummary(
        locale === 'ar'
          ? `تم تحليل الصورة المرجعية: ${profile.summary}`
          : `Reference image analyzed: ${profile.summary}`,
      );
    } catch (error) {
      setReferenceStatus('error');
      setReferenceError(error instanceof Error ? error.message : 'Could not analyze this reference image.');
    }
  }

  function applyReferenceRecommendation() {
    if (!referenceProfile) {
      return;
    }

    const patch: DesignPatch = {
      theme: referenceProfile.mode === 'dark' ? 'premium-black' : 'neutral-light',
      chatShell: referenceProfile.mode === 'dark' ? 'premium' : 'minimal',
      assistantMessage: 'source-first',
      userMessage: 'outline',
      sendButton: 'send-circle',
      themeMode: referenceProfile.mode,
      widgetOpen: true,
      appearance: {
        primaryColor: referenceProfile.primaryColor,
        radius: referenceProfile.radius,
        density: referenceProfile.density,
        shadowStrength: referenceProfile.shadowStrength,
      },
    };
    const normalizedPatch = normalizeDesignPatch(patch);
    setPendingDesignAction({
      summary:
        locale === 'ar'
          ? 'اقتراح مستوحى من الصورة المرجعية، وليس نسخة مطابقة.'
          : 'A recommendation inspired by the reference image, not a pixel-perfect clone.',
      reasoning: [
        referenceProfile.summary,
        locale === 'ar'
          ? `تم اختيار اللون ${referenceProfile.primaryColor} من الصورة.`
          : `Selected ${referenceProfile.primaryColor} from the reference palette.`,
      ],
      patch: normalizedPatch,
      changes: describeDesignPatch(normalizedPatch, config, themeMode, locale),
    });
    setMode('design');
  }

  function applyPreset(presetId: string) {
    const preset = presetDefinitions.find((entry) => entry.id === presetId);
    if (!preset) {
      return;
    }
    pushDesignHistory(locale === 'ar' ? `قالب ${preset.label}` : `Preset ${preset.label}`);
    setPendingDesignAction(null);
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

  function applyDesignPatch(patch: DesignPatch, label = locale === 'ar' ? 'تعديل الذكاء' : 'AI design edit') {
    const normalized = normalizeDesignPatch(patch);
    const { appearance, themeMode: nextThemeMode, widgetOpen: nextWidgetOpen, focusCategory, ...rest } = normalized;

    if (Object.keys(normalized).length) {
      pushDesignHistory(label);
    }

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

  function previewPendingDesignAction() {
    if (!pendingDesignAction) {
      return;
    }
    applyDesignPatch(pendingDesignAction.patch, locale === 'ar' ? 'معاينة اقتراح الذكاء' : 'AI design preview');
    setDesignSummary(
      locale === 'ar'
        ? `${pendingDesignAction.summary} تم تطبيق المعاينة مؤقتًا، ويمكنك الرجوع بزر Undo.`
        : `${pendingDesignAction.summary} Preview applied; you can undo it.`,
    );
  }

  function applyPendingDesignAction() {
    if (!pendingDesignAction) {
      return;
    }
    applyDesignPatch(pendingDesignAction.patch, locale === 'ar' ? 'تطبيق اقتراح الذكاء' : 'Applied AI recommendation');
    setDesignSummary(
      locale === 'ar'
        ? `${pendingDesignAction.summary} تم تثبيت الاقتراح على التصميم.`
        : `${pendingDesignAction.summary} Recommendation applied to the design.`,
    );
    setPendingDesignAction(null);
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
    pushDesignHistory(locale === 'ar' ? 'مطابقة ستايل الموقع' : 'Website style match');
    setPendingDesignAction(null);
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
    pushDesignHistory(locale === 'ar' ? 'تحليل ستايل الموقع' : 'Site style analysis');
    setPendingDesignAction(null);
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

      const normalizedPatch = normalizeDesignPatch(data.patch ?? {});
      const changes = describeDesignPatch(normalizedPatch, config, themeMode, locale);
      setPendingDesignAction({
        summary: data.summary || localSummary,
        reasoning: Array.isArray(data.reasoning) ? data.reasoning.slice(0, 4) : analysis.contrastNotes.slice(0, 3),
        patch: normalizedPatch,
        changes,
      });
      setActiveAutoTheme(recommendation);
      setStyleAnalysis(
        data.summary
          ? `${localSummary} ${data.summary} ${locale === 'ar' ? 'راجِع الاقتراح في مصمم الذكاء قبل تثبيته.' : 'Review the recommendation in AI Designer before applying it.'}`
          : localSummary,
      );
      setStyleReasoning(Array.isArray(data.reasoning) ? data.reasoning.slice(0, 4) : analysis.contrastNotes.slice(0, 3));
      setDesignSummary(data.summary || localSummary);
      setDesignReasoning(Array.isArray(data.reasoning) ? data.reasoning.slice(0, 4) : []);
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
    setPendingDesignAction(null);

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

      const normalizedPatch = normalizeDesignPatch(data.patch ?? {});
      const changes = describeDesignPatch(normalizedPatch, config, themeMode, locale);
      setPendingDesignAction({
        summary: data.summary ??
          (locale === 'ar'
            ? 'جهزت اقتراح تصميم منظم.'
            : 'Prepared a structured design recommendation.'),
        reasoning: Array.isArray(data.reasoning) ? data.reasoning.slice(0, 4) : [],
        patch: normalizedPatch,
        changes,
      });
      setDesignSummary(
        data.summary ??
          (locale === 'ar'
            ? 'جهز الذكاء اقتراحًا للتصميم الحالي.'
            : 'The AI designer prepared a recommendation for the current widget.'),
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
  const isExtensionCtx = typeof window !== 'undefined' && (window as any).location?.protocol === 'chrome-extension:';
  // Extension truth: relative /api/health never runs here (guarded poll), so
  // derive provider status from the local backend via owner context instead of
  // collapsing every failure into a generic "unavailable".
  const extAiLabel: string | null = !isExtensionCtx
    ? null
    : /BACKEND_UNREACHABLE|BACKEND_UNAVAILABLE/.test(ownerError || '')
      ? (locale === 'ar' ? 'الذكاء: الخلفية غير متاحة' : 'AI BACKEND UNAVAILABLE')
      : ownerCaps
        ? (locale === 'ar' ? 'الذكاء: الخلفية متصلة · المزود حسب إعداد الخادم' : 'AI BACKEND CONNECTED · provider per server config')
        : (locale === 'ar' ? 'الذكاء: غير معروف بعد' : 'AI STATUS UNKNOWN YET');
  const apiStatusLabel = extAiLabel
    ?? (apiHealth?.mode === 'ready'
      ? locale === 'ar'
        ? 'Gemini متصل'
        : 'Gemini connected'
      : apiHealth?.mode === 'missing_key'
        ? locale === 'ar'
          ? 'Gemini غير متصل · أضف المفتاح'
          : 'Gemini disconnected · add API key'
        : locale === 'ar'
          ? 'Gemini غير متاح'
          : 'Gemini unavailable');

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
          {(['build', 'design', 'preview', 'test', 'auto-match', 'overview', 'application', 'learn', 'brain', 'knowledge', 'assist', 'settings'] as const).map((item) => (
            <button
              key={item}
              className={classNames('mode-pill', mode === item && 'active')}
              onClick={() => setMode(item)}
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
                  : item === 'auto-match'
                    ? locale === 'ar'
                      ? 'ضبط أوتوماتيكي'
                      : 'AUTO MATCH'
                    : item === 'overview'
                      ? locale === 'ar'
                        ? 'نظرة عامة'
                        : 'Overview'
                      : item === 'application'
                        ? locale === 'ar'
                          ? 'الApplication'
                          : 'Application'
                        : item === 'learn'
                          ? locale === 'ar'
                            ? 'تعلم'
                            : 'Learn'
                          : item === 'brain'
                            ? locale === 'ar'
                              ? 'دماغ'
                              : 'Brain'
                            : item === 'knowledge'
                              ? locale === 'ar'
                                ? 'معرفة'
                                : 'Knowledge'
                              : item === 'assist'
                                ? locale === 'ar'
                                  ? 'مساعد'
                                  : 'Assist'
                                : item === 'settings'
                                  ? locale === 'ar'
                                    ? 'إعدادات'
                                    : 'Settings'
                                  : ''}
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
          {['overview', 'application', 'learn', 'brain', 'knowledge', 'test', 'assist', 'settings'].includes(mode) ? (
            <OwnerPanel
              mode={mode}
              locale={locale}
              ownerLoading={ownerLoading}
              ownerError={ownerError}
              ownerCaps={ownerCaps}
              ownerProfile={ownerProfile}
              ownerReadiness={ownerReadiness}
              ownerPage={ownerPage}
              ownerMap={ownerMap}
              ownerAppearance={ownerAppearance}
              learnSession={learnSession}
              learnCoverage={learnCoverage}
              learnReliability={learnReliability}
              extHealth={extHealth}
              appName={appName}
              setAppName={setAppName}
              appUrl={appUrl}
              setAppUrl={setAppUrl}
              appOrigin={appOrigin}
              setAppOrigin={setAppOrigin}
              appScope={appScope}
              setAppScope={setAppScope}
              appLang={appLang}
              setAppLang={setAppLang}
              appBudget={appBudget}
              setAppBudget={setAppBudget}
              appAdded={appAdded}
              setAppAdded={setAppAdded}
              designProfile={designProfile}
              mgmtKey={mgmtKey}
              setMgmtKey={setMgmtKey}
              testQuestion={testQuestion}
              setTestQuestion={setTestQuestion}
              testResult={testResult}
              testStructuralId={testStructuralId}
              testHighlightOk={testHighlightOk}
              testVerify={testVerify}
              assistInput={assistInput}
              setAssistInput={setAssistInput}
              assistLog={assistLog}
              learnVisits={learnVisits}
              assistSending={assistSending}
              fmtOwner={fmtOwner}
              onRefresh={refreshOwnerContext}
              onStartLearn={handleStartLearn}
              onLearnAction={handleLearnAction}
              onLearnPass={handleLearnPassOnce}
              onDetectDesign={handleDetectDesign}
              onAutoMatch={handleAutoMatchApply}
              onTakeSiteColors={handleTakeSiteColors}
              onSaveAppearance={handleSaveAppearance}
              onTestResolve={handleTestResolve}
              onTestHighlight={handleTestHighlight}
              onTestVerify={handleTestVerify}
              onAssistSend={handleAssistSend}
            />
          ) : mode === 'auto-match' ? (
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
                    ? 'اكتب طلبك بلغة عادية. الذكاء يقترح إعدادات منظمة أولًا، ثم تختار معاينة أو تطبيق.'
                    : 'Describe the design in plain language. The copilot prepares a structured recommendation before you preview or apply it.'}
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
                        ? 'جاري تجهيز الاقتراح...'
                        : 'Preparing...'
                      : locale === 'ar'
                        ? 'اقترح بالذكاء'
                        : 'Generate Recommendation'}
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

              <section className="panel-section asset-studio-section">
                <div className="panel-heading">
                  <h2>{locale === 'ar' ? 'شعار اللانشر' : 'Launcher Logo'}</h2>
                  <span>{locale === 'ar' ? 'يظهر فورًا على يمين الموقع' : 'Instantly appears on the live launcher'}</span>
                </div>
                <label className="upload-drop">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
                    onChange={(event) => {
                      void handleLauncherAssetUpload(event.target.files?.[0]);
                      event.currentTarget.value = '';
                    }}
                  />
                  <strong>{locale === 'ar' ? 'ارفع شعار أو صورة' : 'Upload logo or image'}</strong>
                  <span>{locale === 'ar' ? 'PNG / JPG / WebP / SVG آمن، أقل من 1MB' : 'PNG / JPG / WebP / safe SVG, under 1 MB'}</span>
                </label>
                {launcherAssetError ? <p className="form-error">{launcherAssetError}</p> : null}
                {launcherAsset ? (
                  <div className="asset-control-card">
                    <div className="asset-preview-large">{currentLauncherPreview}</div>
                    <div className="asset-control-fields">
                      <strong>{launcherAsset.name}</strong>
                      <label>
                        {locale === 'ar' ? 'احتواء الصورة' : 'Image fit'}
                        <select value={launcherAsset.fit} onChange={(event) => updateLauncherAsset({ fit: event.target.value as NonNullable<StudioConfig['launcherAsset']>['fit'] })}>
                          <option value="contain">contain</option>
                          <option value="cover">cover</option>
                        </select>
                      </label>
                      <label>
                        {locale === 'ar' ? 'الشكل' : 'Shape'}
                        <select value={launcherAsset.shape} onChange={(event) => updateLauncherAsset({ shape: event.target.value as NonNullable<StudioConfig['launcherAsset']>['shape'] })}>
                          <option value="circle">{locale === 'ar' ? 'دائري' : 'Circle'}</option>
                          <option value="rounded">{locale === 'ar' ? 'مستدير' : 'Rounded'}</option>
                          <option value="square">{locale === 'ar' ? 'مربع' : 'Square'}</option>
                        </select>
                      </label>
                      <label>
                        {locale === 'ar' ? 'الخلفية' : 'Background'}
                        <select value={launcherAsset.background} onChange={(event) => updateLauncherAsset({ background: event.target.value as NonNullable<StudioConfig['launcherAsset']>['background'] })}>
                          <option value="transparent">{locale === 'ar' ? 'شفافة' : 'Transparent'}</option>
                          <option value="auto">{locale === 'ar' ? 'تلقائية' : 'Automatic'}</option>
                          <option value="custom">{locale === 'ar' ? 'لون خاص' : 'Custom color'}</option>
                        </select>
                      </label>
                      <label>
                        {locale === 'ar' ? 'لون الخلفية' : 'Background color'}
                        <input type="color" value={launcherAsset.backgroundColor} onChange={(event) => updateLauncherAsset({ backgroundColor: event.target.value })} />
                      </label>
                      <label>
                        {locale === 'ar' ? 'الحشوة' : 'Padding'}
                        <input type="range" min="0" max="14" value={launcherAsset.padding} onChange={(event) => updateLauncherAsset({ padding: Number(event.target.value) })} />
                      </label>
                      <div className="inline-toggle-row">
                        <label><input type="checkbox" checked={launcherAsset.border} onChange={(event) => updateLauncherAsset({ border: event.target.checked })} /> {locale === 'ar' ? 'حد' : 'Border'}</label>
                        <label><input type="checkbox" checked={launcherAsset.shadow} onChange={(event) => updateLauncherAsset({ shadow: event.target.checked })} /> {locale === 'ar' ? 'ظل' : 'Shadow'}</label>
                      </div>
                      <button className="secondary-button" type="button" onClick={removeLauncherAsset}>
                        {locale === 'ar' ? 'إزالة الصورة' : 'Remove image'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>

              <section className="panel-section reference-studio-section">
                <div className="panel-heading">
                  <h2>{locale === 'ar' ? 'صورة مرجعية' : 'Reference Image'}</h2>
                  <span>{locale === 'ar' ? 'إلهام تصميم آمن' : 'Safe style inspiration'}</span>
                </div>
                <label className="upload-drop">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg"
                    onChange={(event) => {
                      void handleReferenceImageUpload(event.target.files?.[0]);
                      event.currentTarget.value = '';
                    }}
                  />
                  <strong>{locale === 'ar' ? 'ارفع صورة واجهة أو لقطة شاشة' : 'Upload UI screenshot or reference'}</strong>
                  <span>{locale === 'ar' ? 'نستخرج إشارات عامة، وليس نسخ مطابق' : 'Extracts general signals, not a pixel-perfect copy'}</span>
                </label>
                {referenceStatus === 'loading' ? <p className="style-intake-note">{locale === 'ar' ? 'جاري تحليل الصورة...' : 'Analyzing image...'}</p> : null}
                {referenceError ? <p className="form-error">{referenceError}</p> : null}
                {referenceProfile ? (
                  <div className="reference-profile-card">
                    <img src={referenceProfile.dataUrl} alt={referenceProfile.name} />
                    <div>
                      <strong>{locale === 'ar' ? 'Detected reference style' : 'Detected reference style'}</strong>
                      <p>{referenceProfile.summary}</p>
                      <div className="palette-row">
                        {referenceProfile.palette.map((color) => (
                          <span key={color} title={color} style={{ background: color }} />
                        ))}
                      </div>
                      <div className="change-list">
                        <span>{referenceProfile.mode}</span>
                        <span>{referenceProfile.primaryColor}</span>
                        <span>{referenceProfile.radius}</span>
                      </div>
                      <button className="primary-button" type="button" onClick={applyReferenceRecommendation}>
                        {locale === 'ar' ? 'جهّز اقتراح مستوحى منها' : 'Prepare inspired recommendation'}
                      </button>
                    </div>
                  </div>
                ) : null}
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
                        ? 'Gemini يجهز اقتراحًا منظمًا'
                        : 'Gemini is preparing a structured recommendation'
                      : locale === 'ar'
                        ? 'اقتراح التصميم'
                        : 'Design recommendation'}
                  </strong>
                  <p>
                    {designSummary ||
                      (locale === 'ar'
                        ? 'سيظهر هنا ما يقترحه الذكاء قبل تطبيقه على الأيقونة والمحادثة والثيم.'
                        : 'The copilot will explain the proposed launcher, chat shell, and theme changes before applying them.')}
                  </p>
                </div>
                {pendingDesignAction ? (
                  <div className="design-action-card">
                    <div className="panel-heading">
                      <h2>{locale === 'ar' ? 'التغييرات المقترحة' : 'Proposed changes'}</h2>
                      <span>{locale === 'ar' ? 'قابل للرجوع' : 'Reversible'}</span>
                    </div>
                    <div className="change-list">
                      {pendingDesignAction.changes.length ? (
                        pendingDesignAction.changes.map((change) => <span key={change}>{change}</span>)
                      ) : (
                        <span>{locale === 'ar' ? 'الاقتراح لا يحتوي تغييرات صالحة جديدة.' : 'No new valid changes were found in this recommendation.'}</span>
                      )}
                    </div>
                    <div className="auto-actions">
                      <button className="secondary-button" onClick={previewPendingDesignAction} type="button" disabled={!pendingDesignAction.changes.length}>
                        {locale === 'ar' ? 'معاينة' : 'Preview'}
                      </button>
                      <button className="primary-button" onClick={applyPendingDesignAction} type="button" disabled={!pendingDesignAction.changes.length}>
                        {locale === 'ar' ? 'تطبيق' : 'Apply'}
                      </button>
                      <button className="secondary-button" onClick={() => setPendingDesignAction(null)} type="button">
                        {locale === 'ar' ? 'تعديل الطلب' : 'Keep editing'}
                      </button>
                    </div>
                  </div>
                ) : null}
                <div className="design-history-bar">
                  <button className="secondary-button" onClick={undoDesignChange} type="button" disabled={!designHistory.length}>
                    {locale === 'ar' ? 'تراجع' : 'Undo'}
                  </button>
                  <span>
                    {latestHistory
                      ? locale === 'ar'
                        ? `آخر تغيير: ${latestHistory.label}`
                        : `Last change: ${latestHistory.label}`
                      : locale === 'ar'
                        ? 'لا يوجد تاريخ تغييرات بعد'
                        : 'No design history yet'}
                  </span>
                </div>
                <div className="copilot-insight-list">
                  {(pendingDesignAction?.reasoning.length ? pendingDesignAction.reasoning : designReasoning).length ? (
                    (pendingDesignAction?.reasoning.length ? pendingDesignAction.reasoning : designReasoning).map((reason) => (
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
                        style={{ ['--template-accent' as string]: preset.config.appearance.primaryColor ?? presetTheme?.tokens.primary }}
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
              <h2>{locale === 'ar' ? 'معاينة الاستوديو' : 'Studio preview'}</h2>
              <span>{locale === 'ar' ? 'محاكاة داخل اللوحة' : 'Simulated in-panel'}</span>
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
              <button className="primary-button" onClick={handleTakeSiteColors} type="button" disabled={ownerLoading}>
                {locale === 'ar' ? 'خذ ألوان الموقع' : 'Take Site Colors'}
              </button>
              <button className={classNames('toggle-launcher', widgetOpen && 'active')} onClick={() => setWidgetOpen((previous) => !previous)}>
                {widgetOpen ? (locale === 'ar' ? 'الويدجت مفتوح (معاينة)' : 'Widget open (preview)') : locale === 'ar' ? 'الويدجت مغلق (معاينة)' : 'Widget closed (preview)'}
              </button>
            </div>
          </div>

          <div className="preview-toolbar panel">
            <div className="panel-heading">
              <h2>{locale === 'ar' ? 'الموقع الحي' : 'Live site'}</h2>
              <span>{locale === 'ar' ? 'التبويب النشط الحقيقي' : 'Real active tab'}</span>
            </div>
            <p className="copilot-intro">
              {locale === 'ar'
                ? 'يطبق التصميم الحالي على الويدجت الحقيقي في التبويب النشط (http/https فقط). المعاينة أعلاه محاكاة ولا تمس الموقع.'
                : 'Applies the current design to the real widget on the active tab (http/https only). The preview above is simulated and never touches the site.'}
            </p>
            <div className="toolbar-row">
              <div className="auto-actions">
                <button className="primary-button" type="button" onClick={handleApplyLiveWidget}>
                  {locale === 'ar' ? 'طبق على الموقع الحي' : 'Apply to live site'}
                </button>
                <button className="secondary-button" type="button" onClick={handleUpdateLiveWidget}>
                  {locale === 'ar' ? 'حدث الثيم الحي' : 'Update live theme'}
                </button>
                <button className="secondary-button" type="button" onClick={() => handleLiveWidgetOpen(true)}>
                  {locale === 'ar' ? 'افتح على الموقع الحي' : 'Open on live site'}
                </button>
                <button className="secondary-button" type="button" onClick={() => handleLiveWidgetOpen(false)}>
                  {locale === 'ar' ? 'أغلق على الموقع الحي' : 'Close on live site'}
                </button>
                <button className="secondary-button" type="button" onClick={handleRemoveLiveWidget}>
                  {locale === 'ar' ? 'أزل من الموقع الحي' : 'Remove from live site'}
                </button>
              </div>
            </div>
            <div className="copilot-insight-list">
              <div className="analysis-card">
                <strong>{locale === 'ar' ? 'حالة الموقع الحي' : 'Live-site status'}</strong>
                <span>{liveWidget?.status ? `${liveWidget.status}${liveWidget?.detail ? ` · ${liveWidget.detail}` : ''}` : 'NOT APPLIED YET'}</span>
              </div>
              {liveWidget?.tabUrl ? (
                <div className="analysis-card">
                  <strong>{locale === 'ar' ? 'التبويب' : 'Tab'}</strong>
                  <span>{liveWidget.tabUrl}</span>
                </div>
              ) : null}
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
              <div className={classNames('launcher-preview', launcherAsset && 'has-launcher-asset')}>{currentLauncherPreview}</div>
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
