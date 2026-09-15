import type { IconIntent, IconIntentRequest, IconStyle } from '../types';

type SafeIcon = {
  id: string;
  intent: IconIntent;
  style: IconStyle;
  label: string;
  glyph: string;
};

export const safeIconCatalog: SafeIcon[] = [
  { id: 'sa-assistant-outline', intent: 'assistant', style: 'rounded-outline', label: 'Assistant', glyph: 'SA' },
  { id: 'sa-sparkles-line', intent: 'sparkles', style: 'line', label: 'Sparkles', glyph: '*' },
  { id: 'sa-pharmacy-outline', intent: 'pharmacy', style: 'rounded-outline', label: 'Pharmacy', glyph: '+' },
  { id: 'sa-medical-soft', intent: 'medical', style: 'solid-soft', label: 'Medical', glyph: '+' },
  { id: 'sa-education-badge', intent: 'education', style: 'badge', label: 'Education', glyph: 'ED' },
  { id: 'sa-finance-line', intent: 'finance', style: 'line', label: 'Finance', glyph: '$' },
  { id: 'sa-support-outline', intent: 'support', style: 'rounded-outline', label: 'Support', glyph: '?' },
  { id: 'sa-shopping-soft', intent: 'shopping', style: 'solid-soft', label: 'Shopping', glyph: 'B' },
  { id: 'sa-calendar-line', intent: 'calendar', style: 'line', label: 'Calendar', glyph: '31' },
  { id: 'sa-search-line', intent: 'search', style: 'line', label: 'Search', glyph: 'O' },
  { id: 'sa-navigation-outline', intent: 'navigation', style: 'rounded-outline', label: 'Navigation', glyph: '>' },
  { id: 'sa-knowledge-badge', intent: 'knowledge', style: 'badge', label: 'Knowledge', glyph: 'K' },
];

const allowedIntents = new Set(safeIconCatalog.map((icon) => icon.intent));
const allowedStyles = new Set(safeIconCatalog.map((icon) => icon.style));

export function validateIconIntent(input: unknown): { ok: true; value: IconIntentRequest } | { ok: false; error: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, error: 'Icon intent must be an object.' };
  }
  const record = input as Record<string, unknown>;
  if (record.kind !== 'icon') return { ok: false, error: 'Icon intent kind must be icon.' };
  if (typeof record.intent !== 'string' || !allowedIntents.has(record.intent as IconIntent)) {
    return { ok: false, error: 'Icon intent is not allowlisted.' };
  }
  if (typeof record.style !== 'string' || !allowedStyles.has(record.style as IconStyle)) {
    return { ok: false, error: 'Icon style is not allowlisted.' };
  }
  return { ok: true, value: { kind: 'icon', intent: record.intent as IconIntent, style: record.style as IconStyle } };
}

export function resolveSafeIcon(input: IconIntentRequest): SafeIcon {
  return (
    safeIconCatalog.find((icon) => icon.intent === input.intent && icon.style === input.style) ??
    safeIconCatalog.find((icon) => icon.intent === input.intent) ??
    safeIconCatalog[0]!
  );
}
