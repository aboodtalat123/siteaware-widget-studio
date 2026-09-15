const PROVIDERS = new Set(['gemini', 'openai_compatible', 'mock']);
const TASKS = new Set(['CHAT', 'DESIGN_PATCH', 'THEME_EXPLANATION', 'ICON_INTENT', 'SUMMARIZATION']);

export function readProviderRouterConfig(env = process.env) {
  const primary = normalizeProvider(env.SITEAWARE_AI_PROVIDER || 'gemini');
  const fallback = env.SITEAWARE_AI_FALLBACK_PROVIDER ? normalizeProvider(env.SITEAWARE_AI_FALLBACK_PROVIDER) : '';
  return {
    primary,
    fallback: fallback && fallback !== primary ? fallback : '',
    gemini: {
      model: env.GEMINI_MODEL || 'gemini-3.7-flash',
      hasKey: Boolean(env.GEMINI_API_KEY),
    },
    openaiCompatible: {
      baseUrl: env.AI_BASE_URL || '',
      model: env.AI_MODEL || '',
      hasKey: Boolean(env.AI_API_KEY),
    },
  };
}

export function redactProviderConfig(config) {
  return {
    primary: config.primary,
    fallback: config.fallback || '',
    gemini: { model: config.gemini.model, hasKey: config.gemini.hasKey },
    openaiCompatible: {
      baseUrlConfigured: Boolean(config.openaiCompatible.baseUrl),
      model: config.openaiCompatible.model,
      hasKey: config.openaiCompatible.hasKey,
    },
  };
}

export async function routeStudioAIRequest(request, adapters, config = readProviderRouterConfig()) {
  if (!request || typeof request !== 'object') {
    return { ok: false, status: 400, provider: config.primary, message: 'Studio AI request must be an object.' };
  }
  if (!TASKS.has(request.category)) {
    return { ok: false, status: 400, provider: config.primary, message: 'Unsupported Studio AI task category.' };
  }

  const ordered = [config.primary, config.fallback].filter(Boolean);
  let lastFailure = null;

  for (const provider of ordered) {
    const adapter = adapters[provider];
    if (!adapter) {
      lastFailure = { ok: false, status: 503, provider, message: 'Provider adapter is not configured.' };
      continue;
    }
    const result = await adapter(request);
    if (result?.ok) return { ...result, provider };
    lastFailure = {
      ok: false,
      status: result?.status || 502,
      provider,
      message: result?.message || 'Provider request failed.',
    };
    if (result?.privacyLocked === true) break;
  }

  return lastFailure ?? { ok: false, status: 503, provider: config.primary, message: 'No provider available.' };
}

function normalizeProvider(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!PROVIDERS.has(normalized)) {
    throw new Error('Unsupported SITEAWARE_AI_PROVIDER.');
  }
  return normalized;
}
