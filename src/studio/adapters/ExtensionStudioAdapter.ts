import type { StudioConfig, AppearanceConfig, DensityMode } from '../../studioData';

// chrome is a global provided by the extension runtime; declare it for TypeScript.
declare const chrome: any;

/** Business-payload types mirroring the Web Studio's internal shapes. */
type ConversationMessage = {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  sources?: string[];
  action?: string;
  status?: 'typing' | 'loading' | 'error';
};

type DesignPatch = Partial<Omit<StudioConfig, 'appearance'>> & {
  appearance?: Partial<StudioConfig['appearance']>;
  themeMode?: 'light' | 'dark';
  widgetOpen?: boolean;
  focusCategory?: string;
};

/**
 * StudioAdapter defines the contract the shared StudioApp uses to talk to
 * environment-specific plumbing (Web localStorage vs Extension chrome.storage).
 */
type StudioAdapter = {
  loadConfig: () => StudioConfig | Promise<StudioConfig>;
  storeConfig: (config: StudioConfig) => void | Promise<void>;
  loadLocale: () => 'en' | 'ar' | Promise<'en' | 'ar'>;
  storeLocale: (locale: 'en' | 'ar') => void | Promise<void>;
  loadThemeMode: () => 'light' | 'dark' | Promise<'light' | 'dark'>;
  storeThemeMode: (mode: 'light' | 'dark') => void | Promise<void>;
  onHealthCheck?: () => Promise<{
    ok: boolean;
    mode: 'ready' | 'missing_key' | 'error';
    provider: string;
    model: string;
    message: string;
  }>;
  onChatSend?: (
    payload: {
      locale: 'en' | 'ar';
      site: { name: string; vibe: string };
      config: StudioConfig;
      conversation: ConversationMessage[];
      composer: string;
    }
  ) => Promise<{ ok: boolean; reply: string; message: string }>;
  onDesignSend?: (
    payload: {
      locale: 'en' | 'ar';
      prompt: string;
      site: { name: string; vibe: string };
      config: StudioConfig;
      catalog: unknown;
      themeMode: 'light' | 'dark';
    }
  ) => Promise<{ ok: boolean; patch?: DesignPatch; summary?: string; reasoning?: string[] }>;
  detectSiteStyle?: () => Promise<{
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
    headingWeight: number;
    bodyWeight: number;
    buttonRadius: number;
    cardRadius: number;
    inputRadius: number;
    shape: { radius: number; cardRadius: number; buttonRadius: number; inputRadius: number };
    confidence: { overall: number; primary: number; surface: number; typography: number };
    evidence: { visibleElementsSampled: number; interactiveElementsSampled: number; cssVariablesUsed: number; colorCandidates: number };
  } | null>;
  applySiteStyle?: (profile: {
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
    headingWeight: number;
    bodyWeight: number;
    buttonRadius: number;
    cardRadius: number;
    inputRadius: number;
    mode: 'light' | 'dark';
  }) => Promise<void>;
  matchSiteWithAI?: (config: StudioConfig, catalog: Array<{ id: string; label: string }>) => Promise<{ ok: boolean; patch?: DesignPatch; summary?: string; reasoning?: string[] }>;
  askPreviewAssistant?: (message: string, config: StudioConfig) => Promise<{ ok: boolean; reply: string; message: string }>;
};

/** The premium official default config, matching the Web Studio's baseline. */
const defaultAppearance: AppearanceConfig = {
  radius: 'lg',
  widgetWidth: 420,
  widgetHeight: 640,
  density: 'comfortable',
  fontScale: 1,
  shadowStrength: 0.55,
  launcherSize: 'md',
  launcherPosition: 'bottom-right',
  primaryColor: '#7cc8ff',
};

const defaultWidgetConfig: StudioConfig = {
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
  themeOrigin: 'manual',
  appearance: defaultAppearance,
};

/** Storage keys shared with the Web Studio so a config is portable between contexts. */
const CONFIG_KEY = 'siteaware-widget-studio-config-v2';
const LOCALE_KEY = 'siteaware-widget-studio-locale-v1';
const THEME_MODE_KEY = 'siteaware-widget-studio-theme-mode-v1';

/**
 * ExtensionStudioAdapter - bridges the shared StudioApp with Extension APIs.
 * chrome.storage replaces localStorage; chrome.runtime messaging replaces
 * the Web dev-server proxy for live preview, site scanning, and AI design.
 */
export const ExtensionStudioAdapter: StudioAdapter = {
  async loadConfig() {
    try {
      const result = await chrome.storage.local.get([CONFIG_KEY]);
      const stored = result[CONFIG_KEY];
      if (stored && typeof stored === 'object') {
        return {
          ...defaultWidgetConfig,
          ...stored,
          appearance: {
            ...defaultWidgetConfig.appearance,
            ...(stored.appearance || {}),
          },
        } as StudioConfig;
      }
    } catch (error) {
      console.warn('[StudioAdapter] Failed to load config from storage:', error);
    }
    return { ...defaultWidgetConfig };
  },

  async storeConfig(config: StudioConfig) {
    try {
      await chrome.storage.local.set({ [CONFIG_KEY]: config });
    } catch (error) {
      console.error('[StudioAdapter] Failed to store config:', error);
    }
  },

  loadLocale(): 'en' | 'ar' {
    // Synchronous contract: read from a cached-in-memory mirror kept in sync by the app.
    return (globalThis as any).__SITEAWARE_LOCALE__ === 'ar' ? 'ar' : 'en';
  },

  async storeLocale(locale: 'en' | 'ar') {
    (globalThis as any).__SITEAWARE_LOCALE__ = locale;
    try {
      await chrome.storage.local.set({ [LOCALE_KEY]: locale });
    } catch (error) {
      console.error('[StudioAdapter] Failed to store locale:', error);
    }
  },

  loadThemeMode(): 'light' | 'dark' {
    return (globalThis as any).__SITEAWARE_THEME_MODE__ === 'dark' ? 'dark' : 'light';
  },

  async storeThemeMode(mode: 'light' | 'dark') {
    (globalThis as any).__SITEAWARE_THEME_MODE__ = mode;
    try {
      await chrome.storage.local.set({ [THEME_MODE_KEY]: mode });
    } catch (error) {
      console.error('[StudioAdapter] Failed to store theme mode:', error);
    }
  },

  async onHealthCheck() {
    try {
      const response = await fetch('/api/health');
      const data = (await response.json()) as {
        ok: boolean;
        mode: 'ready' | 'missing_key' | 'error';
        provider: string;
        model: string;
        message: string;
      };
      return {
        ok: data.ok === true,
        mode: data.mode || 'missing_key',
        provider: data.provider || 'gemini',
        model: data.model || 'gemini-3.7-flash',
        message: data.message || '',
      };
    } catch {
      return {
        ok: false,
        mode: 'error',
        provider: 'gemini',
        model: 'gemini-3.7-flash',
        message: 'Backend API is unavailable.',
      };
    }
  },

  async onChatSend(payload) {
    try {
      const bridge = (window as any).__SITEAWARE_WIDGET_STUDIO_BRIDGE__;
      if (bridge?.tunnel) {
        const response = await bridge.tunnel({ type: 'SITEAWARE_PREVIEW_CHAT', payload });
        return {
          ok: response?.ok === true,
          reply: response?.reply || '',
          message: response?.message || '',
        };
      }

      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id != null) {
        return new Promise((resolve) => {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { type: 'SITEAWARE_PREVIEW_CHAT', payload },
            (resp: any) => {
              resolve({
                ok: resp?.ok === true,
                reply: resp?.reply || '',
                message: resp?.message || '',
              });
            },
          );
        });
      }
    } catch (error) {
      console.warn('[StudioAdapter] onChatSend fallback failed:', error);
    }
    return { ok: false, reply: '', message: 'No content script bridge available' };
  },

  async onDesignSend(payload) {
    try {
      const bridge = (window as any).__SITEAWARE_WIDGET_STUDIO_BRIDGE__;
      if (bridge?.tunnel) {
        const response = await bridge.tunnel({ type: 'SITEAWARE_DESIGN', payload });
        return {
          ok: response?.ok === true,
          patch: response?.patch,
          summary: response?.summary || '',
        };
      }

      const backendUrl =
        (import.meta as any).env?.VITE_BACKEND_URL || 'https://siteaware-widget-studio.onrender.com';
      const response = await fetch(`${backendUrl}/api/design`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: payload.locale,
          prompt: payload.prompt,
          site: payload.site,
          config: payload.config,
          catalog: payload.catalog,
          themeMode: payload.themeMode,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        summary?: string;
        reasoning?: string[];
        patch?: DesignPatch;
      };
      return {
        ok: data.ok === true,
        patch: data.patch,
        summary: data.summary || '',
      };
    } catch (error) {
      console.warn('[StudioAdapter] onDesignSend failed:', error);
    }
    return { ok: false, summary: '' };
  },

  async detectSiteStyle() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'SITEAWARE_SCAN_PAGE' });
      if (response?.profile) {
        return response.profile;
      }
    } catch (error) {
      console.warn('[StudioAdapter] detectSiteStyle: no content script injected yet:', error);
    }
    return null;
  },

  async applySiteStyle(profile) {
    try {
      await chrome.runtime.sendMessage({ type: 'SITEAWARE_APPLY_STYLE', profile });
    } catch (error) {
      console.warn('[StudioAdapter] applySiteStyle: no content script injected yet:', error);
    }
  },

  async matchSiteWithAI(config, catalog) {
    try {
      const backendUrl =
        (import.meta as any).env?.VITE_BACKEND_URL || 'https://siteaware-widget-studio.onrender.com';
      const response = await fetch(`${backendUrl}/api/design`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: 'en',
          site: { name: 'current website', vibe: 'current website visual style' },
          config,
          catalog,
          themeMode: 'light',
          prompt:
            'Match this safe design profile only. Do not request page text. Choose from the allowed catalog.',
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        summary?: string;
        reasoning?: string[];
        patch?: DesignPatch;
      };
      return {
        ok: data.ok === true,
        patch: data.patch,
        summary: data.summary || '',
      };
    } catch (error) {
      console.warn('[StudioAdapter] matchSiteWithAI failed:', error);
    }
    return { ok: false, summary: '' };
  },

  async askPreviewAssistant(message, config) {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale: 'en',
          site: { name: 'current site', vibe: 'current website' },
          config,
          conversation: [],
          composer: message,
        }),
      });
      const data = (await response.json()) as {
        ok: boolean;
        reply: string;
        message: string;
      };
      return {
        ok: data.ok === true,
        reply: data.reply || '',
        message: data.message || '',
      };
    } catch (error) {
      console.warn('[StudioAdapter] askPreviewAssistant failed:', error);
    }
    return { ok: false, reply: '', message: '' };
  },
};