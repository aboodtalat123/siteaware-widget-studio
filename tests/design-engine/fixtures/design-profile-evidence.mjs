export const pharmacyEvidence = {
  colors: {
    foreground: [{ value: '#102a2f', count: 12, confidence: 0.9 }],
    background: [{ value: '#f7fbfb', count: 6, confidence: 0.8 }],
    surface: [{ value: '#ffffff', count: 10, confidence: 0.9 }],
    accent: [{ value: '#0f9f8f', count: 7, confidence: 0.92 }],
    border: [{ value: 'rgba(16, 42, 47, 0.14)', count: 5, confidence: 0.8 }],
  },
  typography: {
    fontFamilies: [{ value: 'Inter, system-ui, sans-serif', count: 8, confidence: 0.9 }],
    fontSizes: [{ value: 16, count: 10 }],
    fontWeights: [{ value: 500, count: 8 }],
  },
  shape: { borderRadii: [{ value: 16, count: 7 }] },
  spacing: { values: [{ value: 16, count: 9 }] },
  controls: { button: { background: [{ value: '#0f9f8f', count: 4 }], radius: [{ value: 18, count: 4 }] } },
  identity: { direction: { value: 'rtl', confidence: 1 }, modePreference: { value: 'light', confidence: 0.8 }, iconStyleHints: [{ value: 'medical', count: 2 }] },
};

export const universityEvidence = {
  colors: {
    foreground: [{ value: '#101828', count: 9 }],
    background: [{ value: '#f6f8fd', count: 8 }],
    surface: [{ value: '#ffffff', count: 11 }],
    accent: [{ value: '#1d4ed8', count: 7 }, { value: '#f59e0b', count: 3 }],
    border: [{ value: 'rgba(29, 78, 216, 0.16)', count: 5 }],
  },
  typography: {
    fontFamilies: [{ value: 'Inter, system-ui, sans-serif', count: 9 }],
    fontSizes: [{ value: 15, count: 10 }],
    fontWeights: [{ value: 600, count: 6 }],
  },
  shape: { borderRadii: [{ value: 14, count: 8 }] },
  spacing: { values: [{ value: 14, count: 8 }] },
  identity: { direction: { value: 'rtl' }, modePreference: { value: 'light' }, iconStyleHints: [{ value: 'education', count: 3 }] },
};

export const saasEvidence = {
  colors: {
    foreground: [{ value: '#f4f7ff', count: 10 }],
    background: [{ value: '#07101e', count: 8 }],
    surface: [{ value: '#111d31', count: 9 }],
    accent: [{ value: '#7c8cff', count: 4 }, { value: '#7ef0c4', count: 4 }],
    border: [{ value: 'rgba(130, 190, 255, 0.16)', count: 5 }],
  },
  typography: {
    fontFamilies: [{ value: 'Inter, system-ui, sans-serif', count: 8 }],
    fontSizes: [{ value: 18, count: 7 }],
    fontWeights: [{ value: 600, count: 7 }],
  },
  shape: { borderRadii: [{ value: 24, count: 5 }] },
  spacing: { values: [{ value: 20, count: 8 }] },
  identity: { direction: { value: 'ltr' }, modePreference: { value: 'dark' }, iconStyleHints: [{ value: 'business', count: 2 }] },
};
