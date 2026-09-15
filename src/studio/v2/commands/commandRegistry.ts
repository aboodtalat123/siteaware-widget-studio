import {
  applyThemePatch,
  getDefaultWidgetTheme,
  type ThemePatch,
  validateThemePatch,
  type WidgetTheme,
} from '../../design-engine/themeFoundation';
import type { IconIntentRequest, StudioAppearanceMode } from '../types';
import { resolveSafeIcon, validateIconIntent } from '../design/iconCatalog';

export type DesignCommandName =
  | 'PREVIEW_THEME_PATCH'
  | 'APPLY_THEME_PATCH'
  | 'RESET_THEME'
  | 'SET_LAUNCHER_STYLE'
  | 'SET_ICON_INTENT'
  | 'SET_DENSITY'
  | 'SET_APPEARANCE_MODE'
  | 'OPEN_DESIGN_WORKSPACE';

export type DesignCommand =
  | { type: 'PREVIEW_THEME_PATCH'; patch: unknown }
  | { type: 'APPLY_THEME_PATCH'; patch: unknown }
  | { type: 'RESET_THEME' }
  | { type: 'SET_LAUNCHER_STYLE'; radius?: number; size?: number }
  | { type: 'SET_ICON_INTENT'; icon: unknown }
  | { type: 'SET_DENSITY'; density: 'compact' | 'comfortable' | 'spacious' }
  | { type: 'SET_APPEARANCE_MODE'; mode: StudioAppearanceMode }
  | { type: 'OPEN_DESIGN_WORKSPACE' };

export type CommandContext = {
  currentTheme: WidgetTheme;
  proposedTheme?: WidgetTheme | null;
  appearanceMode: StudioAppearanceMode;
};

export type CommandResult =
  | { ok: true; theme: WidgetTheme; proposed?: WidgetTheme; appearanceMode: StudioAppearanceMode; note: string }
  | { ok: false; error: string };

const allowedCommands = new Set<DesignCommandName>([
  'PREVIEW_THEME_PATCH',
  'APPLY_THEME_PATCH',
  'RESET_THEME',
  'SET_LAUNCHER_STYLE',
  'SET_ICON_INTENT',
  'SET_DENSITY',
  'SET_APPEARANCE_MODE',
  'OPEN_DESIGN_WORKSPACE',
]);

export function isDesignCommandName(value: unknown): value is DesignCommandName {
  return typeof value === 'string' && allowedCommands.has(value as DesignCommandName);
}

export function executeDesignCommand(command: unknown, context: CommandContext): CommandResult {
  if (!command || typeof command !== 'object' || Array.isArray(command)) {
    return { ok: false, error: 'Design command must be an object.' };
  }
  const record = command as Record<string, unknown>;
  if (!isDesignCommandName(record.type)) {
    return { ok: false, error: 'Unknown design command rejected.' };
  }

  switch (record.type) {
    case 'PREVIEW_THEME_PATCH': {
      const patch = validateThemePatch(record.patch);
      if (!patch.ok) return { ok: false, error: patch.errors.join(' ') };
      return {
        ok: true,
        theme: context.currentTheme,
        proposed: applyThemePatch(context.currentTheme, patch.value),
        appearanceMode: context.appearanceMode,
        note: 'Preview updated only.',
      };
    }
    case 'APPLY_THEME_PATCH': {
      const patch = validateThemePatch(record.patch);
      if (!patch.ok) return { ok: false, error: patch.errors.join(' ') };
      return {
        ok: true,
        theme: applyThemePatch(context.currentTheme, patch.value),
        appearanceMode: context.appearanceMode,
        note: 'Theme patch applied to Studio preview state.',
      };
    }
    case 'RESET_THEME':
      return { ok: true, theme: getDefaultWidgetTheme(), appearanceMode: context.appearanceMode, note: 'Theme reset.' };
    case 'SET_LAUNCHER_STYLE': {
      const patch: ThemePatch = { launcher: {} };
      if (typeof record.radius === 'number') patch.launcher!.borderRadius = record.radius;
      if (typeof record.size === 'number') patch.launcher!.size = record.size;
      const validation = validateThemePatch(patch);
      if (!validation.ok) return { ok: false, error: validation.errors.join(' ') };
      return {
        ok: true,
        theme: applyThemePatch(context.currentTheme, validation.value),
        appearanceMode: context.appearanceMode,
        note: 'Launcher style applied.',
      };
    }
    case 'SET_ICON_INTENT': {
      const validation = validateIconIntent(record.icon);
      if (!validation.ok) return { ok: false, error: validation.error };
      const icon = resolveSafeIcon(validation.value as IconIntentRequest);
      return { ok: true, theme: context.currentTheme, appearanceMode: context.appearanceMode, note: `Icon resolved locally: ${icon.id}.` };
    }
    case 'SET_DENSITY': {
      const validation = validateThemePatch({ spacing: { density: record.density } });
      if (!validation.ok) return { ok: false, error: validation.errors.join(' ') };
      return {
        ok: true,
        theme: applyThemePatch(context.currentTheme, validation.value),
        appearanceMode: context.appearanceMode,
        note: 'Density applied.',
      };
    }
    case 'SET_APPEARANCE_MODE':
      if (record.mode !== 'light' && record.mode !== 'dark' && record.mode !== 'system') {
        return { ok: false, error: 'Unsupported appearance mode.' };
      }
      return { ok: true, theme: context.currentTheme, appearanceMode: record.mode, note: 'Appearance mode updated.' };
    case 'OPEN_DESIGN_WORKSPACE':
      return { ok: true, theme: context.currentTheme, appearanceMode: context.appearanceMode, note: 'Design workspace opened.' };
  }
}
