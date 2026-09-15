import type { DesignProfile, ThemePatch, WidgetTheme } from '../design-engine/themeFoundation';

export type StudioMode = 'assist' | 'design' | 'learn' | 'brain';
export type StudioLocale = 'ar' | 'en';
export type StudioAppearanceMode = 'light' | 'dark' | 'system';
export type ProviderStatus = 'connected' | 'mock' | 'unavailable' | 'loading';
export type TaskCategory = 'CHAT' | 'DESIGN_PATCH' | 'THEME_EXPLANATION' | 'ICON_INTENT' | 'SUMMARIZATION';

export type StudioMessage =
  | {
      id: string;
      role: 'assistant' | 'user';
      kind: 'message';
      text: string;
      createdAt: string;
    }
  | {
      id: string;
      role: 'assistant';
      kind: 'tool' | 'proposal' | 'error';
      title: string;
      text: string;
      createdAt: string;
    };

export type IconIntent =
  | 'assistant'
  | 'sparkles'
  | 'pharmacy'
  | 'medical'
  | 'education'
  | 'finance'
  | 'support'
  | 'shopping'
  | 'calendar'
  | 'search'
  | 'navigation'
  | 'knowledge';

export type IconStyle = 'rounded-outline' | 'solid-soft' | 'line' | 'badge';

export type IconIntentRequest = {
  kind: 'icon';
  intent: IconIntent;
  style: IconStyle;
};

export type StudioAIChatRequest = {
  category: TaskCategory;
  prompt: string;
  locale: StudioLocale;
  mode: StudioMode;
};

export type StudioAIDesignRequest = {
  category: 'DESIGN_PATCH';
  prompt: string;
  locale: StudioLocale;
  designProfile: DesignProfile;
  currentTheme: WidgetTheme;
};

export type StudioAIProvider = {
  id: string;
  label: string;
  status: ProviderStatus;
  chat(request: StudioAIChatRequest): Promise<{ message: string }>;
  design(request: StudioAIDesignRequest): Promise<unknown>;
  classifyIntent(request: StudioAIChatRequest): Promise<{ category: TaskCategory; icon?: unknown }>;
};

export type DesignProposal = {
  id: string;
  prompt: string;
  patch: ThemePatch;
  proposedTheme: WidgetTheme;
  summary: string;
  createdAt: string;
};

export type StudioV2State = {
  mode: StudioMode;
  locale: StudioLocale;
  dir: 'rtl' | 'ltr';
  appearanceMode: StudioAppearanceMode;
  providerStatus: ProviderStatus;
  providerLabel: string;
  designProfile: DesignProfile;
  currentTheme: WidgetTheme;
  proposed: DesignProposal | null;
  history: WidgetTheme[];
  messages: StudioMessage[];
  loading: boolean;
  error: string;
};
