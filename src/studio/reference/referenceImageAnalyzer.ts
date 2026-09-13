export type ReferenceImageProfile = {
  name: string;
  dataUrl: string;
  mimeType: string;
  palette: string[];
  primaryColor: string;
  mode: 'light' | 'dark';
  density: 'compact' | 'comfortable' | 'spacious';
  radius: 'sm' | 'md' | 'lg' | 'xl';
  shadowStrength: number;
  summary: string;
};

const maxUploadBytes = 1024 * 1024;
const supportedRasterTypes = new Set(['image/png', 'image/jpeg', 'image/webp']);

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not decode image.'));
    image.src = dataUrl;
  });
}

export async function readSafeLauncherAsset(file: File) {
  if (file.size > maxUploadBytes) {
    throw new Error('Image is too large. Use a logo under 1 MB.');
  }

  if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
    const text = await file.text();
    if (!/^\s*<svg[\s>]/i.test(text) || /<script|on\w+=|javascript:|<foreignObject/i.test(text)) {
      throw new Error('SVG contains unsupported or unsafe markup.');
    }

    return {
      name: file.name,
      dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`,
      mimeType: 'image/svg+xml',
    };
  }

  if (!supportedRasterTypes.has(file.type)) {
    throw new Error('Use PNG, JPG, WebP, or a safe SVG file.');
  }

  return {
    name: file.name,
    dataUrl: await readAsDataUrl(file),
    mimeType: file.type,
  };
}

export async function analyzeReferenceImage(file: File): Promise<ReferenceImageProfile> {
  const asset = await readSafeLauncherAsset(file);

  if (asset.mimeType === 'image/svg+xml') {
    return {
      ...asset,
      palette: ['#2563eb', '#ffffff', '#111827'],
      primaryColor: '#2563eb',
      mode: 'light',
      density: 'comfortable',
      radius: 'lg',
      shadowStrength: 0.72,
      summary: 'Safe SVG accepted. Palette extraction is unavailable for SVG, so SiteAware will use a calm professional recommendation.',
    };
  }

  const image = await loadImage(asset.dataUrl);
  const canvas = document.createElement('canvas');
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('Canvas analysis is unavailable in this browser.');
  }

  context.drawImage(image, 0, 0, size, size);
  const pixels = context.getImageData(0, 0, size, size).data;
  const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
  let total = 0;
  let luminanceTotal = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] ?? 0;
    if (alpha < 32) {
      continue;
    }
    const r = pixels[index] ?? 0;
    const g = pixels[index + 1] ?? 0;
    const b = pixels[index + 2] ?? 0;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    luminanceTotal += luminance;
    total += 1;

    if (luminance > 242 || luminance < 18) {
      continue;
    }

    const key = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`;
    const current = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    current.count += 1;
    current.r += r;
    current.g += g;
    current.b += b;
    buckets.set(key, current);
  }

  const palette = [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((bucket) => rgbToHex(Math.round(bucket.r / bucket.count), Math.round(bucket.g / bucket.count), Math.round(bucket.b / bucket.count)));
  const mode = total && luminanceTotal / total < 118 ? 'dark' : 'light';

  return {
    ...asset,
    palette: palette.length ? palette : ['#2563eb', '#ffffff', '#111827'],
    primaryColor: palette[0] ?? '#2563eb',
    mode,
    density: 'comfortable',
    radius: 'lg',
    shadowStrength: mode === 'dark' ? 0.92 : 0.68,
    summary: mode === 'dark'
      ? 'Detected a darker reference with stronger contrast and a premium surface feel.'
      : 'Detected a light reference with calm contrast and clean product surfaces.',
  };
}
