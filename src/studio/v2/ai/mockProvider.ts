import {
  applyThemePatch,
  type ThemePatch,
  validateThemePatch,
} from '../../design-engine/themeFoundation';
import type { StudioAIDesignRequest, StudioAIProvider, StudioAIChatRequest, TaskCategory } from '../types';

function inferPatch(prompt: string): ThemePatch {
  const text = prompt.toLowerCase();
  const patch: ThemePatch = {};

  if (/rtl|arabic|عربي|يمين/.test(text)) patch.direction = 'rtl';
  if (/ltr|english|انجليزي|يسار/.test(text)) patch.direction = 'ltr';
  if (/round|دائري|أنعم|ناعم|softer/.test(text)) {
    patch.launcher = { borderRadius: 40, size: 60, shadow: 'soft' };
    patch.panel = { borderRadius: 28, shadow: 'soft' };
    patch.messages = { borderRadius: 20 };
    patch.input = { borderRadius: 24 };
  }
  if (/pharmacy|medical|صيدلية|طبي/.test(text)) {
    patch.launcher = { ...(patch.launcher ?? {}), backgroundColor: '#0f9f8f', textColor: '#ffffff' };
    patch.buttons = { primaryBackgroundColor: '#0f9f8f', primaryTextColor: '#ffffff', borderRadius: 16 };
    patch.guide = { accentColor: '#0f9f8f', ringColor: '#0f9f8f' };
  }
  if (/formal|رسمي|calm|أهدأ/.test(text)) {
    patch.panel = { ...(patch.panel ?? {}), shadow: 'soft' };
    patch.spacing = { density: 'comfortable', scale: 1 };
    patch.typography = { fontWeight: 500 };
  }
  if (/compact|مصغر|كثافة/.test(text)) {
    patch.spacing = { density: 'compact', scale: 0.9 };
    patch.launcher = { ...(patch.launcher ?? {}), size: 48 };
  }

  return Object.keys(patch).length > 0
    ? patch
    : {
        panel: { shadow: 'soft', borderRadius: 24 },
        spacing: { density: 'comfortable', scale: 1 },
      };
}

function classify(prompt: string): TaskCategory {
  const text = prompt.toLowerCase();
  if (/icon|أيقونة|رمز/.test(text)) return 'ICON_INTENT';
  if (/theme|design|color|لون|تصميم|دائري|رسمي|صيدلية/.test(text)) return 'DESIGN_PATCH';
  if (/summary|لخص/.test(text)) return 'SUMMARIZATION';
  return 'CHAT';
}

export function createMockStudioAIProvider(): StudioAIProvider {
  return {
    id: 'local-mock',
    label: 'Local mock',
    status: 'mock',
    async chat(request: StudioAIChatRequest) {
      const ar = request.locale === 'ar';
      return {
        message: ar
          ? 'هذه معاينة محلية آمنة. أقدر أقترح تغييرات تصميم، لكنها تظهر كمقترح قبل التطبيق.'
          : 'This is a safe local preview. I can propose design changes, but they stay proposed until approved.',
      };
    },
    async design(request: StudioAIDesignRequest) {
      const patch = inferPatch(request.prompt);
      const validation = validateThemePatch(patch);
      if (!validation.ok) {
        return {};
      }
      applyThemePatch(request.currentTheme, validation.value);
      return validation.value;
    },
    async classifyIntent(request: StudioAIChatRequest) {
      const category = classify(request.prompt);
      if (category === 'ICON_INTENT') {
        return { category, icon: { kind: 'icon', intent: 'pharmacy', style: 'rounded-outline' } };
      }
      return { category };
    },
  };
}
