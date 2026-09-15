import {
  applyThemePatch,
  getDefaultWidgetTheme,
  suggestThemeFromDesignProfile,
  validateThemePatch,
  type ThemePatch,
  type WidgetTheme,
} from '../../design-engine/themeFoundation';
import { sampleDesignProfiles } from '../design/sampleProfiles';
import type { DesignProposal, StudioAppearanceMode, StudioLocale, StudioMode, StudioV2State } from '../types';

export type StudioAction =
  | { type: 'SET_MODE'; mode: StudioMode }
  | { type: 'SET_LOCALE'; locale: StudioLocale }
  | { type: 'SET_APPEARANCE_MODE'; mode: StudioAppearanceMode }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'PROPOSE_PATCH'; prompt: string; patch: unknown; summary: string }
  | { type: 'APPLY_PROPOSAL' }
  | { type: 'UNDO' }
  | { type: 'RESET' }
  | { type: 'USE_SAMPLE_PROFILE'; id: keyof typeof sampleDesignProfiles };

function now() {
  return new Date().toISOString();
}

export function createInitialStudioV2State(locale: StudioLocale = 'ar'): StudioV2State {
  const designProfile = sampleDesignProfiles.medical;
  const currentTheme = suggestThemeFromDesignProfile(designProfile);
  return {
    mode: 'design',
    locale,
    dir: locale === 'ar' ? 'rtl' : 'ltr',
    appearanceMode: 'light',
    providerStatus: 'mock',
    providerLabel: 'Local mock',
    designProfile,
    currentTheme,
    proposed: null,
    history: [],
    loading: false,
    error: '',
    messages: [
      {
        id: 'welcome',
        role: 'assistant',
        kind: 'message',
        text:
          locale === 'ar'
            ? 'أهلاً. هذه معاينة Studio V2 الآمنة: أي تغيير تصميم يظهر كمقترح قبل التطبيق.'
            : 'Welcome. This safe Studio V2 preview keeps design changes proposed until approved.',
        createdAt: now(),
      },
    ],
  };
}

export function createProposal(currentTheme: WidgetTheme, prompt: string, patch: ThemePatch, summary: string): DesignProposal {
  return {
    id: `proposal-${Date.now()}`,
    prompt,
    patch,
    proposedTheme: applyThemePatch(currentTheme, patch),
    summary,
    createdAt: now(),
  };
}

export function studioV2Reducer(state: StudioV2State, action: StudioAction): StudioV2State {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'SET_LOCALE':
      return { ...state, locale: action.locale, dir: action.locale === 'ar' ? 'rtl' : 'ltr' };
    case 'SET_APPEARANCE_MODE':
      return { ...state, appearanceMode: action.mode };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false };
    case 'PROPOSE_PATCH': {
      const validation = validateThemePatch(action.patch);
      if (!validation.ok) return { ...state, error: validation.errors.join(' '), loading: false };
      const proposed = createProposal(state.currentTheme, action.prompt, validation.value, action.summary);
      return {
        ...state,
        proposed,
        loading: false,
        error: '',
        messages: [
          ...state.messages,
          { id: `${proposed.id}-card`, role: 'assistant', kind: 'proposal', title: 'Design proposal', text: proposed.summary, createdAt: now() },
        ],
      };
    }
    case 'APPLY_PROPOSAL':
      if (!state.proposed) return state;
      return {
        ...state,
        history: [state.currentTheme, ...state.history].slice(0, 10),
        currentTheme: state.proposed.proposedTheme,
        proposed: null,
        error: '',
      };
    case 'UNDO': {
      const [previous, ...rest] = state.history;
      if (!previous) return state;
      return { ...state, currentTheme: previous, history: rest, proposed: null, error: '' };
    }
    case 'RESET':
      return { ...state, currentTheme: getDefaultWidgetTheme(), proposed: null, history: [state.currentTheme, ...state.history].slice(0, 10), error: '' };
    case 'USE_SAMPLE_PROFILE': {
      const designProfile = sampleDesignProfiles[action.id];
      return { ...state, designProfile, currentTheme: suggestThemeFromDesignProfile(designProfile), proposed: null, error: '' };
    }
  }
}
