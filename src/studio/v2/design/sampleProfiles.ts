import type { DesignProfile } from '../../design-engine/themeFoundation';

export type SampleProfileId = 'medical' | 'university' | 'saas' | 'commerce';

export const sampleDesignProfiles: Record<SampleProfileId, DesignProfile> = {
  medical: {
    colors: {
      primary: '#0f9f8f',
      secondary: '#e8f7f5',
      accent: '#38bdf8',
      background: '#f7fbfb',
      surface: '#ffffff',
      textPrimary: '#102a2f',
      textSecondary: '#587176',
      border: 'rgba(16, 42, 47, 0.14)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFamily: 'Inter, system-ui, sans-serif',
      fontScale: 'md',
      fontWeights: [500, 600],
    },
    shape: { borderRadiusSmall: 10, borderRadiusMedium: 16, borderRadiusLarge: 24 },
    spacing: { density: 'comfortable', scale: 1 },
    effects: { shadow: 'soft', border: 'subtle' },
    identity: { iconStyle: 'medical', direction: 'rtl', modePreference: 'light' },
  },
  university: {
    colors: {
      primary: '#1d4ed8',
      secondary: '#eaf0ff',
      accent: '#f59e0b',
      background: '#f6f8fd',
      surface: '#ffffff',
      textPrimary: '#101828',
      textSecondary: '#667085',
      border: 'rgba(29, 78, 216, 0.16)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFamily: 'Inter, system-ui, sans-serif',
      fontScale: 'md',
      fontWeights: [500, 700],
    },
    shape: { borderRadiusSmall: 8, borderRadiusMedium: 14, borderRadiusLarge: 20 },
    spacing: { density: 'comfortable', scale: 1 },
    effects: { shadow: 'medium', border: 'subtle' },
    identity: { iconStyle: 'education', direction: 'rtl', modePreference: 'light' },
  },
  saas: {
    colors: {
      primary: '#7c8cff',
      secondary: '#17203a',
      accent: '#7ef0c4',
      background: '#07101e',
      surface: '#111d31',
      textPrimary: '#f4f7ff',
      textSecondary: '#aab7d4',
      border: 'rgba(130, 190, 255, 0.16)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFamily: 'Inter, system-ui, sans-serif',
      fontScale: 'md',
      fontWeights: [500, 600],
    },
    shape: { borderRadiusSmall: 10, borderRadiusMedium: 18, borderRadiusLarge: 28 },
    spacing: { density: 'comfortable', scale: 1.04 },
    effects: { shadow: 'strong', border: 'subtle' },
    identity: { iconStyle: 'business', direction: 'ltr', modePreference: 'dark' },
  },
  commerce: {
    colors: {
      primary: '#b45309',
      secondary: '#fff7ed',
      accent: '#16a34a',
      background: '#fffaf5',
      surface: '#ffffff',
      textPrimary: '#1f2937',
      textSecondary: '#6b7280',
      border: 'rgba(180, 83, 9, 0.16)',
    },
    typography: {
      fontFamily: 'Inter, system-ui, sans-serif',
      headingFamily: 'Inter, system-ui, sans-serif',
      fontScale: 'md',
      fontWeights: [500, 600],
    },
    shape: { borderRadiusSmall: 12, borderRadiusMedium: 18, borderRadiusLarge: 26 },
    spacing: { density: 'spacious', scale: 1.08 },
    effects: { shadow: 'soft', border: 'subtle' },
    identity: { iconStyle: 'business', direction: 'ltr', modePreference: 'light' },
  },
};
