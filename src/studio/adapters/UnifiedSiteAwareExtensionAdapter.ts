/**
 * UnifiedSiteAwareExtensionAdapter — REAL thin client over the SiteAware
 * local-integration contracts (GUIDE ONLY, Stage 6 OFF).
 *
 * Backend authority (see siteaware-local-integration):
 * - app/integration/routes.py — learning-sessions, observations, query, verify,
 *   appearance, site-profile, application-map, capabilities
 * - docs/integration/extension-runtime-contract.md — message protocol + HTTP table
 * - docs/architecture/siteaware-unified-client-contract.md — ownership boundaries
 *
 * Browser ownership: tabs, safe DOM observation, navigation, highlight.
 * This adapter never invents values: unavailable backend/session/tab
 * surfaces as thrown Error('UNAVAILABLE:...') so React shows UNAVAILABLE.
 */

const BACKEND_BASE = 'http://127.0.0.1:8000';
const TOKEN_STORAGE_KEY = 'siteaware.runtime.session';
const LEGACY_TOKEN_STORAGE_KEY = 'siteaware.local.dev.session';
const APPROVED_ORIGINS = ['https://rousheta.net'];

declare const chrome: any;

// ---------- transport primitives ----------

function originOf(url: string): string {
  try {
    const parsed = new URL(url);
    return /^https?:$/.test(parsed.protocol) ? parsed.origin : '';
  } catch {
    return '';
  }
}

async function getSessionToken(): Promise<string> {
  try {
    const stored = await chrome.storage.session.get(TOKEN_STORAGE_KEY);
    if (stored?.[TOKEN_STORAGE_KEY]) return stored[TOKEN_STORAGE_KEY];
    const legacy = await chrome.storage.session.get(LEGACY_TOKEN_STORAGE_KEY);
    return legacy?.[LEGACY_TOKEN_STORAGE_KEY] || '';
  } catch {
    return '';
  }
}

async function getActiveTab(): Promise<{ id: number | null; url: string }> {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return { id: tabs?.[0]?.id ?? null, url: tabs?.[0]?.url || '' };
  } catch {
    return { id: null, url: '' };
  }
}

function approvedSiteOrigin(tabUrl: string): string {
  const origin = originOf(tabUrl);
  if (!APPROVED_ORIGINS.includes(origin)) {
    throw new Error('UNAVAILABLE:SITE_NOT_APPROVED');
  }
  return origin;
}

async function backend<T>(
  path: string,
  opts: { method?: string; body?: unknown; auth?: boolean; managementKey?: string; siteId?: string; originOverride?: string } = {},
): Promise<T> {
  const { method = 'GET', body = null, auth = true, managementKey = '', siteId = '', originOverride = '' } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getSessionToken();
    if (!token) throw new Error('UNAVAILABLE:NO_SESSION_TOKEN');

    // A learning run binds to its verified seed origin once, so that
    // focusing the panel (or any tab switch) mid-run cannot silently
    // re-target the origin header and stall ingestion. The override must
    // still be an approved origin; the token requirement is unchanged.
    if (originOverride) {
      if (!APPROVED_ORIGINS.includes(originOverride)) {
        throw new Error('UNAVAILABLE:SITE_NOT_APPROVED');
      }
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-SiteAware-Site-Origin'] = originOverride;
    } else {
      const tab = await getActiveTab();
      headers['Authorization'] = `Bearer ${token}`;
      headers['X-SiteAware-Site-Origin'] = approvedSiteOrigin(tab.url);
    }
  }

  if (managementKey) {
    headers['X-Management-Key'] = managementKey;
  }

  let url = `${BACKEND_BASE}${path}`;
  if (siteId) {
    const sep = url.includes('?') ? '&' : '?';
    url += `${sep}site_id=${encodeURIComponent(siteId)}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body: body == null ? null : JSON.stringify(body),
  });

  if (response.status === 401 && auth) {
    await chrome.storage.session.remove(TOKEN_STORAGE_KEY);
    const text = await response.text().catch(() => '');
    throw new Error(`UNAVAILABLE:SESSION_401:${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => String(response.status));
    throw new Error(`UNAVAILABLE:BACKEND_${response.status}:${text.slice(0, 200)}`);
  }

  return (await response.json()) as T;
}

// ---------- public contract types (shaped by real backend) ----------

export type Capabilities = {
  contract_version: string;
  mode: string;
  stage6: boolean;
  capabilities: { design: boolean; learn: boolean; assist: boolean; highlight: boolean; verify: boolean; actions: boolean };
};

export type SiteProfile = {
  site_id: string;
  origin: string;
  allowed_host: string;
  start_route: string;
  login_route: string;
  locale: string;
  direction: string;
  access_scope: string;
};

export type LearningSessionDict = {
  session_id: string;
  site_id: string;
  scope_id: string;
  run_id: string;
  state: string;
  pages_observed: number;
  aliases_resolved: number;
  frontier_depth: number;
  current_item: string;
  nodes_added: number;
  edges_added: number;
  observations_ingested: number;
  rejected_routes: number;
  interactions_explored: number;
};

export type ApplicationMap = {
  site_id: string;
  scope_id: string;
  state: string;
  appearance_configured: boolean;
  pages_observed: number;
  routes_known: number;
  graph_nodes: number;
  graph_edges: number;
  auto_knowledge_sources: number;
  customer_knowledge_sources: number;
  areas: Array<{ entity_id: string; label_ar: string; label_en: string }>;
  sessions: Array<{ session_id: string; state: string; pages_observed: number }>;
};

export type QueryResult = {
  answer: string;
  grounded: boolean;
  target?: { identity: string; safe_label: string } | null;
  path?: string[];
  path_status?: string;
  verification?: { expected_route: string };
  guide?: { mode: string; target_identity: string; expected_route: string } | null;
  current_page?: { route_template: string; observed: boolean };
};

export type VerifyResult = {
  status: string;
  reason: string;
  message_ar: string;
  recovery: string;
};

// ---------- deterministic Auto Match (no AI, no network) ----------

function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function normalizeCssColor(value: unknown): string | null {
  if (isHexColor(value)) return value;
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (!match) return null;
  const parts = match.slice(1, 4).map((part) => Math.min(255, Math.max(0, Number(part))));
  if (parts.some((part) => !Number.isFinite(part))) return null;
  return `#${parts.map((part) => Math.round(part).toString(16).padStart(2, '0')).join('')}`;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? Math.round(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const SA_UUID_RE = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;

/** Template a raw value by replacing entity UUIDs with a stable :id placeholder. */
function saTemplateUuid(value: string): string {
  return String(value || '').replace(SA_UUID_RE, ':id');
}

/** Clip/sanitize a label for structural observation records. */
function saClip(value: unknown, limit: number): string {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

/**
 * buildAppearanceFromProfile — REAL deterministic transformation:
 * sanitized SiteDesignProfile -> AppearanceConfig v1 flat keys.
 * Works fully offline. Rejects secret-like/remote/markup values by
 * only accepting #hex colors, short font names, bounded numbers.
 */
export function buildAppearanceFromProfile(profile: Record<string, any>): Record<string, any> {
  const pick = (list: unknown): string | null => {
    if (!Array.isArray(list)) return null;
    for (const entry of list) {
      const normalized = normalizeCssColor(entry);
      if (normalized) return normalized;
    }
    return null;
  };
  const token = (name: string): string | null => normalizeCssColor(profile?.palette?.[name]?.value);
  const primary = token('primary') ?? normalizeCssColor(profile?.primary) ?? pick(profile?.dominant_colors) ?? '#6d28d9';
  const radius = profile?.shape?.radius ?? profile?.radius_px;
  const appearance: Record<string, any> = {
    theme: profile?.mode === 'dark' ? 'dark' : 'light',
    primary_color: primary,
    radius_px: clampInt(radius, 0, 32, 12),
    density: 'comfortable',
    launcher_position: 'bottom-right',
    launcher_shape: 'round',
    direction: profile?.direction === 'ltr' ? 'ltr' : 'rtl',
    font_scale: 1.0,
    panel_width_px: 380,
    panel_height_px: 560,
    locale: typeof profile?.locale === 'string' ? String(profile.locale).slice(0, 8) : 'ar',
  };
  const surface = token('surface') ?? normalizeCssColor(profile?.surface) ?? pick(profile?.surface_colors);
  if (surface) appearance['surface'] = surface;
  const background = token('background') ?? normalizeCssColor(profile?.background);
  if (background) appearance['background'] = background;
  const text = token('foreground') ?? normalizeCssColor(profile?.text) ?? pick(profile?.text_colors);
  if (text) appearance['text'] = text;
  const muted = token('muted') ?? normalizeCssColor(profile?.mutedText);
  if (muted) appearance['muted_text'] = muted;
  const border = token('border') ?? normalizeCssColor(profile?.border) ?? pick(profile?.border_colors);
  if (border) appearance['border'] = border;
  const profileFonts = profile?.typography?.fontFamily ? [profile.typography.fontFamily] : profile?.font_families;
  const fonts = Array.isArray(profileFonts)
    ? profileFonts.filter((f: unknown) => typeof f === 'string' && /^[A-Za-z0-9 ,"'\-]{1,80}$/.test(f)).slice(0, 4)
    : [];
  if (fonts.length) appearance['font'] = fonts[0];
  return appearance;
}

/**
 * resolveLearnSeed — start-page rule for START LEARN (pure, testable):
 * use the ACTIVE authenticated page pathname when it belongs to an
 * approved origin; otherwise fall back to the profile start route only
 * when there is genuinely no live approved page. Never silently prefer
 * a hardcoded route over a live approved page.
 */
export function resolveLearnSeed(args: {
  activeUrl: string;
  approvedOrigins: string[];
  fallbackRoute?: string;
}): { origin: string; seed: string } {
  let origin = '';
  let path = '';
  try {
    const parsed = new URL(args.activeUrl);
    if (/^https?:$/.test(parsed.protocol)) {
      origin = parsed.origin;
      path = parsed.pathname || '';
    }
  } catch {
    origin = '';
    path = '';
  }
  if (origin && args.approvedOrigins.includes(origin) && path) {
    return { origin, seed: path };
  }
  return { origin: '', seed: args.fallbackRoute || '' };
}

// ---------- unified adapter ----------

export const UnifiedSiteAwareExtensionAdapter = {
  BACKEND_BASE,
  APPROVED_ORIGINS,

  // ---- capabilities / readiness (public loopback) ----
  async getCapabilities(): Promise<Capabilities> {
    let res: Response;
    try {
      res = await fetch(`${BACKEND_BASE}/api/extension/capabilities`);
    } catch {
      throw new Error(`UNAVAILABLE:BACKEND_UNREACHABLE:${BACKEND_BASE}`);
    }
    if (!res.ok) throw new Error(`UNAVAILABLE:BACKEND_${res.status}`);
    return (await res.json()) as Capabilities;
  },

  /**
   * getExtensionHealth — ONE canonical extension backend health path.
   * Never throws generic "Failed to fetch": always returns a diagnostic
   * state the sidepanel can render actionably. Auth/session/tab problems
   * are reported as distinct states, never collapsed into backend-down.
   */
  async getExtensionHealth(): Promise<{
    state: 'BACKEND_CONNECTED' | 'BACKEND_UNAVAILABLE' | 'BACKEND_VERSION_MISMATCH' | 'APPLICATION_NOT_CONNECTED' | 'AUTH_CONTEXT_NOT_READY';
    backendBase: string;
    detail: string;
    capabilities?: Capabilities;
  }> {
    const backendBase = BACKEND_BASE;
    let caps: Capabilities;
    try {
      caps = await this.getCapabilities();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('BACKEND_UNREACHABLE') || msg.includes('Failed to fetch') || msg.includes('fetch')) {
        return { state: 'BACKEND_UNAVAILABLE', backendBase, detail: `Backend unavailable at ${backendBase}` };
      }
      return { state: 'BACKEND_UNAVAILABLE', backendBase, detail: msg || 'Backend unavailable' };
    }
    if (!caps || (caps as any).contract_version !== 'siteaware-client-v1') {
      return { state: 'BACKEND_VERSION_MISMATCH', backendBase, detail: `Backend contract mismatch at ${backendBase}`, capabilities: caps };
    }
    // Auth/tab context evaluated locally; missing pieces are NOT backend-down.
    try {
      const readiness = await this.getReadiness().catch(() => null);
      if (!readiness) {
        return { state: 'AUTH_CONTEXT_NOT_READY', backendBase, detail: 'Application tab/session not ready', capabilities: caps };
      }
      if (!readiness.inScope) {
        return { state: 'APPLICATION_NOT_CONNECTED', backendBase, detail: 'Application origin mismatch', capabilities: caps };
      }
      if (!readiness.hasSessionToken) {
        return { state: 'AUTH_CONTEXT_NOT_READY', backendBase, detail: 'No runtime session — verify the current page or press START LEARN', capabilities: caps };
      }
    } catch (e) {
      return { state: 'AUTH_CONTEXT_NOT_READY', backendBase, detail: e instanceof Error ? e.message : 'Tab context not ready', capabilities: caps };
    }
    return { state: 'BACKEND_CONNECTED', backendBase, detail: `Backend connected at ${backendBase}`, capabilities: caps };
  },

  async getDevStatus(): Promise<Record<string, any>> {
    let res: Response;
    try {
      res = await fetch(`${BACKEND_BASE}/dev/status`);
    } catch {
      throw new Error(`UNAVAILABLE:BACKEND_UNREACHABLE:${BACKEND_BASE}`);
    }
    if (!res.ok) throw new Error(`UNAVAILABLE:BACKEND_${res.status}`);
    return (await res.json()) as Record<string, any>;
  },

  async getSiteProfile(): Promise<SiteProfile> {
    let res: Response;
    try {
      res = await fetch(`${BACKEND_BASE}/api/local/v1/site-profile`);
    } catch {
      throw new Error(`UNAVAILABLE:BACKEND_UNREACHABLE:${BACKEND_BASE}`);
    }
    if (!res.ok) throw new Error(`UNAVAILABLE:BACKEND_${res.status}`);
    const data = (await res.json()) as { profile: SiteProfile };
    return data.profile;
  },

  /** APPLICATION readiness: tab + session + origin binding, evaluated locally. */
  async getReadiness(): Promise<{
    tabUrl: string;
    siteOrigin: string;
    inScope: boolean;
    hasSessionToken: boolean;
    state: 'READY' | 'LOGIN_REQUIRED' | 'OUT_OF_SCOPE' | 'NO_SESSION';
  }> {
    const tab = await getActiveTab();
    const siteOrigin = originOf(tab.url);
    const token = await getSessionToken();
    const inScope = APPROVED_ORIGINS.includes(siteOrigin);
    if (!inScope) return { tabUrl: tab.url, siteOrigin, inScope: false, hasSessionToken: Boolean(token), state: 'OUT_OF_SCOPE' };
    if (!token) return { tabUrl: tab.url, siteOrigin, inScope, hasSessionToken: false, state: 'NO_SESSION' };
    return { tabUrl: tab.url, siteOrigin, inScope, hasSessionToken: true, state: 'READY' };
  },

  /** Ensure a normal Extension runtime session exists; bootstrap if missing.
   *  - Checks chrome.storage.session first
   *  - If missing, inspects active tab origin, fails closed if not approved
   *  - Calls backend POST /api/extension/v1/runtime-session
   *  - Stores minimal SiteAware runtime token in chrome.storage.session only
   *  - Never logs/prints the token; returns true on success */
  async ensureRuntimeSession(): Promise<boolean> {
    const stored = await getSessionToken();
    if (stored) return true;

    const tab = await getActiveTab();
    if (!tab.url) return false;

    const origin = approvedSiteOrigin(tab.url);

    const res = await fetch(`${BACKEND_BASE}/api/extension/v1/runtime-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SiteAware-Site-Origin': origin,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => String(res.status));
      throw new Error(
        `UNAVAILABLE:RUNTIME_SESSION_${res.status}:${text.slice(0, 200)}`
      );
    }

    const data = await res.json() as Record<string, any>;
    const token = String(data?.access_token || '');

    if (!token) {
      throw new Error('UNAVAILABLE:NO_TOKEN_RETURNED');
    }

    await chrome.storage.session.set({
      [TOKEN_STORAGE_KEY]: token,
    });
    try {
      await chrome.storage.session.remove(LEGACY_TOKEN_STORAGE_KEY);
    } catch { /* legacy cleanup is best-effort */ }

    return true;
  },

  /** Backward-compatible alias for old tests/tools; not used by START LEARN. */
  async ensureLocalDevSession(): Promise<boolean> {
    return this.ensureRuntimeSession();
  },

  /** Current page: active tab URL + path (structural only, no content). */
  async getCurrentPage(): Promise<{ url: string; origin: string; path: string }> {
    const tab = await getActiveTab();
    let path = '';
    try {
      path = new URL(tab.url).pathname || '/';
    } catch {
      path = '';
    }
    return { url: tab.url, origin: originOf(tab.url), path };
  },

  // ---- appearance (DESIGN) ----
  async getAppearance(siteId = 'local'): Promise<Record<string, any>> {
    let res: Response;
    try {
      res = await fetch(`${BACKEND_BASE}/api/local/v1/appearance?site_id=${encodeURIComponent(siteId)}`);
    } catch {
      throw new Error(`UNAVAILABLE:BACKEND_UNREACHABLE:${BACKEND_BASE}`);
    }
    if (!res.ok) throw new Error(`UNAVAILABLE:BACKEND_${res.status}`);
    const data = (await res.json()) as { appearance: Record<string, any> };
    return data.appearance;
  },

  async saveAppearance(config: Record<string, any>, siteId = 'local', managementKey = ''): Promise<Record<string, any>> {
    return backend<{ appearance: Record<string, any> }>(`/api/local/v1/appearance`, {
      method: 'PUT',
      body: config,
      auth: false,
      managementKey,
      siteId,
    }).then((d) => (d as any).appearance ?? d);
  },

  /** DESIGN observation: sanitized SiteDesignProfile from the active tab. */
  async getDesignProfile(): Promise<Record<string, any> | null> {
    const tab = await getActiveTab();
    if (tab.id == null) throw new Error('UNAVAILABLE:NO_ACTIVE_TAB');
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content-script.js'] }).catch(() => {});
    } catch {
      /* injection best-effort */
    }
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: 'SITEAWARE_SCAN_PAGE' }, (resp: any) => {
        if (chrome.runtime?.lastError) {
          reject(new Error(`UNAVAILABLE:${chrome.runtime.lastError.message || 'NO_CONTENT_SCRIPT'}`));
          return;
        }
        if (resp?.ok && resp?.profile) resolve(resp.profile as Record<string, any>);
        else reject(new Error('UNAVAILABLE:SCAN_FAILED'));
      });
    });
  },

  /** AUTO MATCH: deterministic profile -> appearance (offline, real). */
  autoMatch(profile: Record<string, any>): Record<string, any> {
    return buildAppearanceFromProfile(profile);
  },

  /**
   * runAutoLearn — automatic bounded traversal driven by the backend frontier.
   * Adapted from the proven old extension/sidepanel.js startLearning() loop:
   * seed from the CURRENT live page -> observe -> ingest -> next_route ->
   * SITEAWARE_LEARN_PASS -> observe -> ingest(navigated_route) -> repeat.
   * Bounds: attempted-set dedup, maxPasses guard, backend session state
   * (pause/stop/complete ends the loop), optional shouldContinue hook.
   * The run binds once to the verified seed origin for every backend
   * call, so watching the panel mid-run cannot stall ingestion.
   * No clicks, no forms, no mutations: route navigation only via the
   * service-worker pass, observations only via the sanitized observer.
   * Safe structural state exploration runs via exploreDisclosuresPage after
   * each pass: Core D3 authorization + live re-match + safe click +
   * re-observe + interaction-transitions (fingerprint/diff/classify).
   * Full autonomous StateExplorer orchestration stays Core-side; Stage 6
   * actions remain disabled.
   */
  async runAutoLearn(opts: {
    sessionId?: string;
    startRoute?: string;
    origin?: string;
    maxUniquePages?: number;
    maxDepth?: number;
    maxPasses?: number;
    passTimeoutMs?: number;
    onProgress?: (ev: { session: LearningSessionDict; visited: Array<{ route: string; status: string }>; next: string }) => void;
    shouldContinue?: () => boolean;
  } = {}): Promise<{ session: LearningSessionDict; visited: Array<{ route: string; status: string }> }> {
    const maxPasses = Math.min(Math.max(opts.maxPasses ?? 40, 1), 40);
    const passTimeoutMs = Math.min(Math.max(opts.passTimeoutMs ?? 60000, 5000), 60000);
    const visited: Array<{ route: string; status: string }> = [];

    // Resolve origin + seed from the CURRENT live page unless explicitly given.
    let origin = opts.origin || '';
    let seed = opts.startRoute || '';
    if (!origin || !seed) {
      const page = await this.getCurrentPage();
      const pageOrigin = page.origin || '';
      if (!APPROVED_ORIGINS.includes(pageOrigin)) {
        throw new Error('UNAVAILABLE:SITE_NOT_APPROVED');
      }
      origin = origin || pageOrigin;
      if (!seed) {
        seed = page.path || '';
      }
    }
    if (!origin || !APPROVED_ORIGINS.includes(origin)) {
      throw new Error('UNAVAILABLE:SITE_NOT_APPROVED');
    }
    if (!seed) {
      throw new Error('UNAVAILABLE:NO_SEED_ROUTE');
    }

    // Start (or attach to) a learning session seeded from the live page.
    let session: LearningSessionDict;
    if (opts.sessionId) {
      session = await this.getLearningProgress(opts.sessionId);
    } else {
      session = await this.startLearning({
        start_route: seed,
        max_unique_pages: opts.maxUniquePages ?? 25,
        max_depth: opts.maxDepth ?? 3,
      });
    }
    const sessionId = session.session_id;
    if (!sessionId) throw new Error('UNAVAILABLE:NO_LEARNING_SESSION');

    const withTimeout = <T>(p: Promise<T>, ms: number, label: string): Promise<T> =>
      new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`UNAVAILABLE:${label}_TIMEOUT`)), ms);
        p.then(
          (v) => { clearTimeout(timer); resolve(v); },
          (e) => { clearTimeout(timer); reject(e); },
        );
      });

    // Observe the CURRENT live page first (authenticated seed).
    // Granular observe errors propagate untouched so the UI shows the
    // real reason (e.g. ACTIVE_TAB_OUT_OF_SCOPE) instead of a flat code.
    const firstObservation = await this.observeActiveTab();
    // From here on, every backend call in this run carries the verified
    // seed origin explicitly, so focusing the panel (or any tab switch)
    // mid-run can no longer re-target the origin header and stall us.
    let ingested = await this.ingestObservation(sessionId, firstObservation, '', origin);
    if ((ingested as any)?.session) session = (ingested as any).session as LearningSessionDict;
    let next: string = String((ingested as any)?.next_route || (session as any)?.current_item || '');

    // //////////////////////////////////////////////////////////
    // EXPLORE SAFE NAVIGATION DISCLOSURES (bounded, autonomous)
    // After ingesting the seed observation, autonomously expand the
    // safe expandable sidebar groups on this page. Each expansion
    // reveals hidden child navigation items, which are ingested into
    // the existing backend frontier so traversal can visit them.
    // The loop is bounded per page and tracks (page, disclosure,
    // expanded-state) to prevent open/close churn.
    const disclosureResult = await this.exploreDisclosuresPage(firstObservation, sessionId, origin);
    void disclosureResult;
    // Newly revealed routes are ingested into the backend below;
    // the next requestLearnPass will pick them up from the frontier.
    // //////////////////////////////////////////////////////////

    opts.onProgress?.({ session, visited: [], next });
    if (!next) {
      session = await this.getLearningProgress(sessionId, origin).catch(() => session);
      return { session, visited };
    }

    // Bounded traversal driven by the backend frontier. A pass that
    // yields no ingestible observation ends the run honestly: `next`
    // cannot advance without backend frontier movement, so retrying the
    // identical route would only churn. Visit statuses stay in the UI log.
    // Progress callbacks carry only visits NEW since the previous
    // callback, so the UI appends without ever double-counting.
    const attempted = new Set<string>();
    let guard = 0;
    let advancedEver = false;
    let firstIngestError: unknown = null;
    let reported = 0;
    while (next && guard < maxPasses) {
      if (opts.shouldContinue && !opts.shouldContinue()) break;
      const live = await this.getLearningProgress(sessionId, origin).catch(() => null);
      if (live) {
        session = live;
        if (live.state !== 'active') break;
      }
      if (attempted.has(next)) break;
      attempted.add(next);
      guard += 1;

      let pass: { status: string; visited: Array<{ route: string; status: string; observation?: any }> };
      try {
        pass = await withTimeout(
          this.requestLearnPass({ origin, routes: [next], maxPages: 1 }),
          passTimeoutMs,
          'LEARN_PASS',
        );
      } catch (e) {
        throw e instanceof Error ? e : new Error('UNAVAILABLE:LEARN_PASS_FAILED');
      }

      let advanced = false;
      for (const item of pass.visited || []) {
        if (opts.shouldContinue && !opts.shouldContinue()) break;
        visited.push({ route: item.route, status: item.status });
        if (item.observation) {
          const more = await this.ingestObservation(sessionId, item.observation, next, origin).catch((e) => {
            if (!firstIngestError) firstIngestError = e;
            return null;
          });
          if (more && (more as any).session) {
            session = (more as any).session as LearningSessionDict;
            const candidate = String((more as any).next_route || (session as any).current_item || '');
            // Alias/redirect honesty: the backend may return the same route
            // template it just observed; the attempted-set prevents loops.
            next = candidate;
            advanced = true;
            advancedEver = true;
          }
        }
      }
      const delta = visited.slice(reported);
      reported = visited.length;
      opts.onProgress?.({ session, visited: delta.slice(-10), next });
      if (!advanced) break;

      const check = await this.getLearningProgress(sessionId, origin).catch(() => null);
      if (check) {
        session = check;
        if (check.state !== 'active') break;
        if (!next) break;
      }
    }

    session = await this.getLearningProgress(sessionId, origin).catch(() => session);
    // Honest failure: if traversal never advanced past the seed because
    // ingestion kept failing, surface the first error instead of a
    // silent partial result.
    if (!advancedEver && visited.length > 0 && firstIngestError) {
      throw firstIngestError instanceof Error
        ? firstIngestError
        : new Error('UNAVAILABLE:INGEST_FAILED');
    }
    return { session, visited };
  },

  // ---- learn ----
  async startLearning(opts: { start_route?: string; max_unique_pages?: number; max_depth?: number } = {}): Promise<LearningSessionDict> {
    const data = await backend<{ session: LearningSessionDict }>(`/api/extension/v1/learning-sessions`, {
      method: 'POST',
      body: {
        start_route: opts.start_route ?? '',
        max_unique_pages: opts.max_unique_pages ?? 25,
        max_depth: opts.max_depth ?? 3,
      },
    });
    return data.session;
  },

  async getLearningProgress(sessionId: string, originOverride = ''): Promise<LearningSessionDict> {
    const data = await backend<{ session: LearningSessionDict }>(`/api/extension/v1/learning-sessions/${sessionId}`, { method: 'GET', originOverride });
    return data.session;
  },

  async pauseLearning(sessionId: string): Promise<LearningSessionDict> {
    const data = await backend<{ session: LearningSessionDict }>(`/api/extension/v1/learning-sessions/${sessionId}/pause`, { method: 'POST', body: {} });
    return data.session;
  },

  async resumeLearning(sessionId: string): Promise<LearningSessionDict> {
    const data = await backend<{ session: LearningSessionDict }>(`/api/extension/v1/learning-sessions/${sessionId}/resume`, { method: 'POST', body: {} });
    return data.session;
  },

  async stopLearning(sessionId: string): Promise<LearningSessionDict> {
    const data = await backend<{ session: LearningSessionDict }>(`/api/extension/v1/learning-sessions/${sessionId}/cancel`, { method: 'POST', body: {} });
    return data.session;
  },

  /** Phase 6: canonical D6 truthful coverage (never infer from session.state). */
  async getCoverage(sessionId: string, originOverride = ''): Promise<{
    coverage: { verdict: string; reasons: string[]; pending: number; observed: number; states: number; summary: string };
    legacy_state: string;
    frontier_parity: Record<string, number>;
  }> {
    const data = await backend<{
      coverage: { verdict: string; reasons: string[]; pending: number; observed: number; states: number; summary: string };
      legacy_state: string;
      frontier_parity: Record<string, number>;
    }>(`/api/extension/v1/learning-sessions/${sessionId}/coverage`, { method: 'GET', originOverride });
    return { coverage: data.coverage, legacy_state: data.legacy_state, frontier_parity: data.frontier_parity };
  },

  /** Phase 7: D7 checkpoint + termination reason (bounded). */
  async getReliability(sessionId: string, originOverride = ''): Promise<{
    termination_reason: string; checkpoint: Record<string, unknown>; budgets: Record<string, number>; bounded: boolean;
  }> {
    return backend(`/api/extension/v1/learning-sessions/${sessionId}/reliability`, { method: 'GET', originOverride });
  },

  /**
   * Phase 4: metadata-only passive network evidence (never bodies/secrets).
   * OPTIONAL manual seam: the extension cannot observe page network traffic
   * without the invasive `webRequest` permission (deliberately absent from
   * the manifest), so there is no automatic caller in the learn loop. Call
   * only with caller-observed metadata (method/host/status-class); the
   * backend refuses any sensitive fields.
   */
  async noteNetworkMetadata(sessionId: string, events: Array<Record<string, unknown>>, originOverride = ''): Promise<{
    events_accepted: number; events_submitted: number; sensitive_stored: number;
  }> {
    return backend(`/api/extension/v1/learning-sessions/${sessionId}/network-metadata`, {
      method: 'POST', body: { events: events.slice(0, 200) }, originOverride,
    });
  },

  /** Phase 5: fallback-only visual gate (screenshots OFF, vision never invoked). */
  async getVisualFallback(sessionId: string, descriptors: Array<Record<string, unknown>>, originOverride = ''): Promise<{
    results: Array<Record<string, unknown>>; fallback_required: number; vision_invoked: boolean; screenshots: string;
  }> {
    return backend(`/api/extension/v1/learning-sessions/${sessionId}/visual-fallback`, {
      method: 'POST', body: { descriptors: descriptors.slice(0, 100) }, originOverride,
    });
  },

  /**
   * Phase 5B: AI-assisted discovery proposal seam.
   * Gemini runs only on the secure backend and only proposes structural
   * candidates from sanitized evidence. This method never authorizes or
   * executes a click; Core D3 must still approve the candidate and the
   * content script must still perform a fresh live DOM re-match.
   */
  async getAiDiscoveryCandidates(
    sessionId: string,
    descriptors: Array<Record<string, unknown>>,
    observation: Record<string, any>,
    originOverride = '',
    discoveryStuck = false,
  ): Promise<{
    candidates: Array<Record<string, unknown>>;
    status: string;
    trigger_reason?: string;
    deterministic_candidates?: Array<Record<string, unknown>>;
  }> {
    return backend(`/api/extension/v1/learning-sessions/${sessionId}/ai-discovery`, {
      method: 'POST',
      body: {
        descriptors: descriptors.slice(0, 200),
        observation,
        discovery_stuck: discoveryStuck,
        force_visual: false,
      },
      originOverride,
    });
  },

  /** Request a same-browser learning pass (service worker owns navigation). */
  async requestLearnPass(args: { origin: string; routes: string[]; maxPages?: number }): Promise<{ status: string; visited: Array<{ route: string; status: string; observation?: any }> }> {
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(
          { type: 'SITEAWARE_LEARN_PASS', origin: args.origin, routes: args.routes.slice(0, 30), maxPages: args.maxPages ?? 25 },
          (resp: any) => {
            if (chrome.runtime?.lastError) {
              reject(new Error(`UNAVAILABLE:${chrome.runtime.lastError.message || 'WORKER_UNREACHABLE'}`));
              return;
            }
            resolve(resp);
          },
        );
      } catch (e) {
        reject(new Error(`UNAVAILABLE:${e instanceof Error ? e.message : 'WORKER_SEND_FAILED'}`));
      }
    });
  },

  async ingestObservation(sessionId: string, observation: Record<string, any>, navigatedRoute = '', originOverride = ''): Promise<Record<string, any>> {
    return backend<Record<string, any>>(`/api/extension/v1/observations`, {
      method: 'POST',
      body: { session_id: sessionId, observation, navigated_route: navigatedRoute || undefined },
      originOverride,
    });
  },

  /**
   * identifySafeDisclosures — CANDIDATE PRE-FILTER ONLY, never a safety
   * verdict. Finds controls with the aria-expanded attribute (structural
   * signal of an expandable/collapsible navigation group) to bound the
   * authorize batch. Buttons without it are ignored. NOTHING returned here
   * is clickable until Core D3 returns a SAFE_STRUCTURAL approval.
   */
  identifySafeDisclosures(observation: Record<string, any>): Array<{ index: number; label: string; ariaExpanded: boolean }> {
    const result: Array<{ index: number; label: string; ariaExpanded: boolean }> = [];
    const controls = observation.controls || [];
    for (const control of controls) {
      if (control.ariaExpanded !== undefined) {
        result.push({
          index: control.index,
          label: control.label,
          ariaExpanded: control.ariaExpanded,
        });
      }
    }
    // Prefer collapsed (aria-expanded=false) first; expanded second.
    result.sort((a, b) => (a.ariaExpanded === false ? -1 : 1));
    return result;
  },

  /**
   * descriptorUid — ephemeral per-observation interaction handle for one
   * control record. Prefers the observer-minted element_uid, else the
   * deterministic ctl-{index} fallback. Valid ONLY within the observe →
   * authorize → re-match → execute transaction of a single round.
   */
  descriptorUid(record: Record<string, any>, index: number): string {
    const raw = record && typeof record.element_uid === 'string' ? record.element_uid : '';
    return (raw || `ctl-${index}`).slice(0, 64);
  },

  /**
   * triStateExpanded — normalize an aria-expanded signal to true/false/null.
   * Unknown/missing stays null (never coerced to false).
   */
  triStateExpanded(value: unknown): boolean | null {
    if (value === true) return true;
    if (value === false) return false;
    return null;
  },

  /**
   * buildDisclosureDescriptors — map pre-filtered candidates to the EXACT
   * Core D3 descriptor contract (14 fields, no extras: the backend 422s
   * unknown fields and requires element_uid). Malformed candidates (no
   * numeric index) are EXCLUDED, never clicked. This builds evidence for
   * Core; it makes NO safety decision.
   */
  buildDisclosureDescriptors(
    candidates: Array<{ index: number; label: string; ariaExpanded: boolean }>,
    recordByIndex: Map<number, Record<string, any>>
  ): Array<Record<string, any>> {
    const out: Array<Record<string, any>> = [];
    for (const c of candidates) {
      if (!c || typeof c.index !== 'number') continue;
      const rec = recordByIndex.get(c.index) || {};
      const rawExp = rec.aria_expanded !== undefined ? rec.aria_expanded : rec.ariaExpanded;
      out.push({
        element_uid: this.descriptorUid(rec, c.index),
        tag: String(rec.tag || ''),
        role: String(rec.role || ''),
        name: String(rec.name || ''),
        aria_expanded: this.triStateExpanded(rawExp === undefined ? null : rawExp),
        aria_controls: String(rec.aria_controls || ''),
        aria_haspopup: String(rec.aria_haspopup || ''),
        aria_describedby: String(rec.aria_describedby || ''),
        type: String(rec.type || ''),
        disabled: Boolean(rec.disabled),
        in_form: Boolean(rec.in_form),
        controls_exists: Boolean(rec.controls_exists),
        describedby_is_tooltip: Boolean(rec.describedby_is_tooltip),
        inside_tablist: Boolean(rec.inside_tablist),
      });
    }
    return out;
  },

  /**
   * computeLinkDelta — compare links from two observations and return
   * newly visible links that were not present before.
   */
  computeLinkDelta(previous: Record<string, any>, current: Record<string, any>): Array<{ label: string; href: string }> {
    const prevHrefs = new Set((previous.links || []).map((l: any) => l.href));
    const currentLinks = current.links || [];
    return currentLinks.filter((l: any) => !prevHrefs.has(l.href));
  },

  /**
   * clickDisclosure — request actuation of ONE Core-approved disclosure.
   * The content script resolves the target by live evidence search
   * (role + name + expanded + tag, exactly one match) and abstains on any
   * staleness or ambiguity. The messaged index is round-correlation context
   * ONLY and is never used for targeting (no positional fallback). This
   * function makes NO safety decision — it only actuates after Core approval.
   */
  clickDisclosure(index: number, expect?: { element_uid?: string; role?: string; name?: string; aria_expanded?: boolean | null; tag?: string; semantic_identity?: string }): Promise<boolean> {
    if (!chrome?.runtime?.sendMessage) return Promise.resolve(false);
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'SITEAWARE_CLICK_DISCLOSURE', index, expect: expect || null },
        (resp: any) => resolve(Boolean(resp?.clicked)),
      );
    });
  },

  /**
   * exploreDisclosuresPage — bounded autonomous exploration of navigation
   * disclosure candidates on the CURRENT observed page.
   *
   * Authority chain per round: candidate pre-filter → Core D3 descriptors →
   * authorizeInteractions → execute ONLY Core-approved element_uids after a
   * live fail-closed re-match → wait → mandatory re-observe → link/route
   * delta → ingest revealed links into the existing backend frontier →
   * record the interaction result → repeat until no candidate remains,
   * no candidate remains, Core abstains/errors, a per-page bound is hit, or
   * consecutive no-delta steps occur.
   *
   * Core D3 is the SOLE safety authority. Abstention, error, malformed
   * descriptors, or empty approvals mean NO CLICK — there is no local
   * fallback verdict anywhere on this path.
   *
   * Loop protection: tracks (page-route :: control-index :: expanded-state)
   * so the same disclosure is never re-clicked while in the same meaningful
   * page state (prevents open → close → open → close churn).
   */
  async exploreDisclosuresPage(
    observation: Record<string, any>,
    sessionId: string,
    originOverride: string
  ): Promise<{ explored: Array<{ controlIndex: number; label: string }>; newRoutes: Array<string>; newLinks: Array<string>; results: Array<{ element_uid: string; controlIndex: number; approved: boolean; kind: string | null; executed: boolean; reobserved: boolean; newLinks: number; counted: boolean; transition: string | null }> }> {
    const explored: Array<{ controlIndex: number; label: string }> = [];
    const newRoutes: string[] = [];
    const newLinks: string[] = [];
    const results: Array<{ element_uid: string; controlIndex: number; approved: boolean; kind: string | null; executed: boolean; reobserved: boolean; newLinks: number; counted: boolean; transition: string | null }> = [];
    const exploredKeys = new Set<string>();
    const pageRoute = String(observation.route_template || observation.canonical_path || observation.url || '');
    const maxDisclosuresPerPage = 20;
    const maxNoDeltaStreak = 2;
    let noDeltaStreak = 0;
    let currentObs = observation;
    // D5 fallback policy (evidence-only): remember the last authorized
    // descriptor set so a page with zero executed rounds can still record
    // a layout/visual-fallback assessment. Screenshots stay OFF, vision is
    // never invoked server-side, and D3 verdicts are never influenced.
    let lastDescriptors: Array<Record<string, any>> = [];
    let authorizeRounds = 0;

    for (let step = 0; step < maxDisclosuresPerPage; step++) {
      // Candidate pre-filter ONLY (never a safety verdict): controls with an
      // explicit aria-expanded attribute, collapsed first.
      const disclosures = this.identifySafeDisclosures(currentObs);
      const recordByIndex = new Map<number, Record<string, any>>();
      for (const rec of (currentObs.controls || []) as any[]) {
        if (rec && typeof rec.index === 'number') recordByIndex.set(rec.index, rec);
      }
      const fresh = disclosures.filter((d) => !exploredKeys.has(`${pageRoute}::${d.index}::${String(d.ariaExpanded)}`));
      if (fresh.length === 0) break; // no candidate remains in a fresh state

      // Core D3 is the SOLE safety authority. Build descriptors and authorize
      // BEFORE any click. Abstention / error / malformed / empty approvals →
      // NO CLICK. There is deliberately no local fallback verdict here.
      const descriptors = this.buildDisclosureDescriptors(fresh, recordByIndex);
      if (descriptors.length === 0) break; // malformed only → nothing authorizable
      lastDescriptors = descriptors;
      authorizeRounds += 1;
      let approvals: Array<Record<string, any>>;
      try {
        const verdict = await this.authorizeInteractions(descriptors);
        approvals = (verdict && Array.isArray((verdict as any).approvals) ? (verdict as any).approvals : []) as Array<Record<string, any>>;
      } catch {
        break; // Core unavailable or errored → DO NOT EXECUTE, stop honestly
      }
      const approvedByUid = new Map<string, Record<string, any>>();
      for (const a of approvals) {
        const uid = String(a?.element_uid || '');
        if (uid && !approvedByUid.has(uid)) approvedByUid.set(uid, a as Record<string, any>);
      }
      let approvedUids = new Set(approvedByUid.keys());
      let target = fresh.find((d) => approvedUids.has(this.descriptorUid(recordByIndex.get(d.index) || {}, d.index)));
      if (!target) {
        // Deterministic D3 found no executable disclosure. Ask backend AI
        // discovery for proposals only, then send the matching original
        // descriptors back through Core D3. AI candidates are never clicked
        // directly and cannot bypass live DOM re-match.
        try {
          const ai = await this.getAiDiscoveryCandidates(sessionId, descriptors, currentObs, originOverride, true);
          const aiUids = new Set(
            (ai.candidates || [])
              .map((c) => String(c?.element_uid || c?.evidence_id || c?.target_uid || c?.uid || ''))
              .filter(Boolean),
          );
          const aiDescriptors = descriptors.filter((d) => aiUids.has(String(d.element_uid || '')));
          if (aiDescriptors.length > 0) {
            const aiVerdict = await this.authorizeInteractions(aiDescriptors);
            approvals = (aiVerdict && Array.isArray((aiVerdict as any).approvals) ? (aiVerdict as any).approvals : []) as Array<Record<string, any>>;
            approvedByUid.clear();
            for (const a of approvals) {
              const uid = String(a?.element_uid || '');
              if (uid && !approvedByUid.has(uid)) approvedByUid.set(uid, a as Record<string, any>);
            }
            approvedUids = new Set(approvedByUid.keys());
            target = fresh.find((d) => approvedUids.has(this.descriptorUid(recordByIndex.get(d.index) || {}, d.index)));
          }
        } catch {
          // Backend unavailable/provider unavailable/AI no-candidate all fail
          // closed. The existing visual-fallback assessment below still records
          // deterministic evidence without invoking screenshots.
        }
      }
      if (!target) break; // every candidate abstained → nothing eligible, no fallback clicks

      const targetRec = recordByIndex.get(target.index) || {};
      const targetUid = this.descriptorUid(targetRec, target.index);
      const targetApproval = approvedByUid.get(targetUid) || {};
      const targetKind = typeof targetApproval.kind === 'string' ? targetApproval.kind : null;
      const key = `${pageRoute}::${target.index}::${String(target.ariaExpanded)}`;
      exploredKeys.add(key);
      // Interaction result record: filled as the round progresses so every
      // attempted execution — including re-observation failure — is explicit.
      const result = {
        element_uid: targetUid,
        controlIndex: target.index,
        approved: true,
        kind: targetKind,
        executed: false,
        reobserved: false,
        newLinks: 0,
        counted: false,
        transition: null as string | null,
      };
      results.push(result);
      const clicked = await this.clickDisclosure(target.index, {
        element_uid: targetUid,
        role: String(targetRec.role || ''),
        name: String(targetRec.name || ''),
        aria_expanded: this.triStateExpanded(targetRec.aria_expanded !== undefined ? targetRec.aria_expanded : targetRec.ariaExpanded ?? null),
        tag: String(targetRec.tag || ''),
        // Phase 1: Stage-3 continuity seam (informational only; live
        // re-match stays role+name+expanded+tag exact-1, fail-closed).
        semantic_identity: typeof targetApproval.semantic_identity === 'string' ? targetApproval.semantic_identity : undefined,
      });
      if (!clicked) continue;

      result.executed = true;
      explored.push({ controlIndex: target.index, label: target.label });

      // Wait for the UI to stabilize.
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Re-observe the page. MANDATORY after actuation: a failed fresh
      // observation ends the round with the failure recorded, never silent.
      let after: Record<string, any>;
      try {
        after = await this.observeActiveTab();
      } catch {
        break;
      }
      result.reobserved = true;

      // Compute the newly visible link delta.
      const delta = this.computeLinkDelta(currentObs, after);
      result.newLinks = delta.length;
      if (delta.length === 0) {
        noDeltaStreak += 1;
        if (noDeltaStreak >= maxNoDeltaStreak) break;
        currentObs = after;
        continue;
      }
      noDeltaStreak = 0;

      // Ingest each newly visible link into the existing backend frontier.
      for (const link of delta) {
        newLinks.push(link.label);
        try {
          const linkObs = {
            url: saTemplateUuid(String(after.url || '')),
            title: saClip(after.title || '', 120),
            language: saClip(after.language || '', 12),
            direction: after.direction === 'ltr' ? 'ltr' : 'rtl',
            canonical_path: saTemplateUuid(String(after.canonical_path || after.url || '')),
            route_template: saTemplateUuid(String(after.canonical_path || after.url || '')),
            origin: after.origin,
            links: [link],
            controls: [],
            captured_at: new Date().toISOString(),
            access_scope: 'authenticated',
          };
          await this.ingestObservation(sessionId, linkObs, link.href, originOverride);
        } catch {
          // Best-effort: continue with other new links even if one fails.
        }
        // Normalize the revealed route for frontier/traversal evidence.
        try {
          const parsed = new URL(link.href, after.origin || 'https://rousheta.net');
          newRoutes.push(saTemplateUuid(parsed.origin + parsed.pathname));
        } catch {
          newRoutes.push(saTemplateUuid(link.href));
        }
      }
      // Record the executed disclosure so the backend counts it in
      // interactions_explored — ONLY after approved + executed + fresh
      // observation + non-empty delta. Best-effort: never breaks the loop.
      try {
        await this.noteInteraction(sessionId);
        result.counted = true;
      } catch {
        /* counting must not break discovery */
      }
      // Core D3 state transition for this executed round (best-effort):
      // BEFORE/AFTER observations run the existing diff + fingerprint +
      // transition machinery; the verdict is recorded, never trusted blindly.
      try {
        const transition = await backend<{ transition?: string }>(`/api/extension/v1/interaction-transitions`, {
          method: 'POST',
          body: { session_id: sessionId, before: currentObs, after },
          originOverride,
        });
        if (transition && typeof transition.transition === 'string') {
          result.transition = transition.transition;
        }
      } catch {
        /* transition diagnostics must not break discovery */
      }
      currentObs = after;
    }

    // D5 automatic fallback assessment: deterministic evidence was
    // insufficient on this page (authorized rounds ran, nothing executed).
    // Best-effort observability only — must never break discovery.
    const executedCount = results.filter((r) => r.executed).length;
    if (authorizeRounds > 0 && executedCount === 0 && lastDescriptors.length > 0) {
      try {
        await this.getVisualFallback(sessionId, lastDescriptors.slice(0, 20), originOverride);
      } catch {
        /* fallback assessment must not break discovery */
      }
    }

    return { explored, newRoutes, newLinks, results };
  },

  /**
   * D3 authorization seam (Core classifier is the authority).
   * Submits structural descriptors; returns Core-approved SAFE_STRUCTURAL
   * intents plus explicit abstentions. Approvals authorize ONLY the approved
   * structural primitive, executed after a live descriptor re-match; anything
   * abstained, errored, or unapproved is never actuated, with no local fallback.
   */
  async authorizeInteractions(descriptors: Array<Record<string, any>>): Promise<{
    approvals: Array<{ element_uid: string; kind: string; reason: string; restore_intent: string | null; semantic_identity?: string }>;
    abstentions: Array<{ element_uid: string; classification: string; reason: string; semantic_identity?: string }>;
  }> {
    return backend<{
      approvals: Array<{ element_uid: string; kind: string; reason: string; restore_intent: string | null; semantic_identity?: string }>;
      abstentions: Array<{ element_uid: string; classification: string; reason: string; semantic_identity?: string }>;
    }>(`/api/extension/v1/interactions/authorize`, {
      method: 'POST',
      body: { descriptors },
    });
  },

  /** Record one Core-authorized, safely executed UI interaction. */
  async noteInteraction(sessionId: string): Promise<LearningSessionDict> {
    const data = await backend<{ session: LearningSessionDict }>(
      `/api/extension/v1/learning-sessions/${sessionId}/interactions`,
      { method: 'POST', body: {} },
    );
    return data.session;
  },

  // ---- brain / knowledge ----
  async getBrainMap(): Promise<ApplicationMap> {
    return backend<ApplicationMap>(`/api/extension/v1/application-map`, { method: 'GET' });
  },

  // ---- assist / 5C / 5D / 5E ----
  /**
   * observeActiveTab — sanitized failure taxonomy (never credentials):
   * - NO_ACTIVE_TAB: no tab handle at all
   * - ACTIVE_TAB_OUT_OF_SCOPE: tab URL is known and not the approved pilot
   * - CONTENT_SCRIPT_NOT_AVAILABLE: observer not injected on the tab
   *   (manifest content_scripts + programmatic fallback both missed)
   * - MESSAGE_PORT_CLOSED: tab navigated away mid-handshake
   * - NO_OBSERVATION_RETURNED: listener answered without an observation
   */
  async observeActiveTab(): Promise<Record<string, any>> {
    const tab = await getActiveTab();
    if (tab.id == null) throw new Error('UNAVAILABLE:NO_ACTIVE_TAB');
    if (tab.url && !APPROVED_ORIGINS.includes(originOf(tab.url))) {
      throw new Error('UNAVAILABLE:OBSERVE_FAILED:ACTIVE_TAB_OUT_OF_SCOPE');
    }
    // Programmatic injection is a fallback only: the manifest declares
    // content_scripts for the approved origin, so the observer is
    // normally already present before the panel ever asks.
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content-script.js'] }).catch(() => {});
    } catch {
      /* best effort; classified below if messaging still fails */
    }
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: 'SITEAWARE_OBSERVE' }, (resp: any) => {
        if (chrome.runtime?.lastError) {
          const raw = String(chrome.runtime.lastError.message || '');
          if (/could not establish connection|receiving end does not exist/i.test(raw)) {
            reject(new Error('UNAVAILABLE:OBSERVE_FAILED:CONTENT_SCRIPT_NOT_AVAILABLE'));
            return;
          }
          if (/message port closed|port closed|message channel closed/i.test(raw)) {
            reject(new Error('UNAVAILABLE:OBSERVE_FAILED:MESSAGE_PORT_CLOSED'));
            return;
          }
          reject(new Error(`UNAVAILABLE:OBSERVE_FAILED:${raw.slice(0, 120) || 'MESSAGE_FAILED'}`));
          return;
        }
        if (resp?.status === 'OBSERVED' && resp?.observation) resolve(resp.observation);
        else reject(new Error('UNAVAILABLE:OBSERVE_FAILED:NO_OBSERVATION_RETURNED'));
      });
    });
  },

  toCurrentPage(observation: Record<string, any>): Record<string, any> {
    return {
      url: observation.url,
      title: observation.title || '',
      language: observation.language || 'ar',
      direction: observation.direction || 'rtl',
      headings: [],
      links: (observation.links || []).slice(0, 30).map((link: any) => ({ name: link.label || '', href: link.href })),
      semantic_controls: (observation.controls || []).slice(0, 30).map((control: any) => ({ role: control.role, name: control.label || '' })),
    };
  },

  /** 5C resolve + grounded answer (backend authority). */
  async askAssist(question: string, locale = 'ar'): Promise<QueryResult> {
    const observation = await this.observeActiveTab().catch(() => null);
    return backend<QueryResult>(`/api/extension/v1/query`, {
      method: 'POST',
      body: { question, locale, current_page: observation ? this.toCurrentPage(observation) : null },
    });
  },

  /** 5D highlight: live structural re-resolution in the tab (outline only). */
  async highlightTarget(structuralId: string): Promise<boolean> {
    const tab = await getActiveTab();
    if (tab.id == null) throw new Error('UNAVAILABLE:NO_ACTIVE_TAB');
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: 'SITEAWARE_HIGHLIGHT', structural_id: structuralId }, (resp: any) => {
        if (chrome.runtime?.lastError) {
          reject(new Error(`UNAVAILABLE:${chrome.runtime.lastError.message || 'HIGHLIGHT_FAILED'}`));
          return;
        }
        resolve(Boolean(resp?.highlighted));
      });
    });
  },

  async clearHighlight(): Promise<void> {
    const tab = await getActiveTab();
    if (tab.id == null) return;
    await new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { type: 'SITEAWARE_CLEAR_HIGHLIGHT' }, () => resolve(null));
    });
  },

  /**
   * Resolve a backend target_identity to a live ctl-N/lnk-N id via fresh
   * observation. The optional labelHint carries the backend's own
   * safe_label (often the Arabic UI label, e.g. appointments) so
   * resolution works when the live page language differs from the
   * identity string. Identity is tried first, then the hint; no match
   * returns '' (fail closed, never a guessed element).
   */
  async resolveStructuralId(targetIdentity: string, labelHint = ''): Promise<string> {
    const observation = await this.observeActiveTab().catch(() => null);
    if (!observation) return '';
    const wanted = [String(targetIdentity || '').toLowerCase(),
      String(labelHint || '').toLowerCase()].filter(Boolean);
    if (!wanted.length) return '';
    const match = (label: string): boolean => {
      const low = String(label || '').toLowerCase();
      if (!low) return false;
      return wanted.some((w) => low === w || w.includes(low) || low.includes(w));
    };
    for (const [index, control] of ((observation.controls || []) as any[]).entries()) {
      if (match(control.label)) return `ctl-${index}`;
    }
    for (const [index, link] of ((observation.links || []) as any[]).entries()) {
      if (match(link.label)) return `lnk-${index}`;
    }
    return '';
  },

  /** 5E verify: evidence-based post-navigation check (backend authority). */
  async verifyArrival(args: { expected_route: string; observed_route_template: string; observed_url: string; session_id?: string }): Promise<VerifyResult> {
    return backend<VerifyResult>(`/api/extension/v1/verify`, {
      method: 'POST',
      body: {
        expected_route: args.expected_route,
        observed_route_template: args.observed_route_template,
        observed_url: args.observed_url,
        session_id: args.session_id || undefined,
      },
    });
  },

  // ------------------------------------------------------------------
  // LIVE-SITE widget (real tab injection; existing content-script contract).
  //
  // The content script already handles SITEAWARE_RENDER_WIDGET (config ->
  // renderWidget -> {ok:true}) and SITEAWARE_REMOVE_WIDGET (-> {ok:true}).
  // These methods are the first sidepanel callers: validated config ->
  // eligible tab -> ensure content-script -> send message -> verdict.
  // Display-only overlay: no observation, no actuation, no data capture.
  // Fail-closed: ineligible tab or missing receiver throws UNAVAILABLE.
  // ------------------------------------------------------------------

  /**
   * buildLiveWidgetConfig — allowlisted Studio -> live-widget config map.
   * Pure (no chrome): only known widget-catalog keys survive; appearance
   * numerics are clamped to the content-script contract; oversized
   * launcher data-URLs are dropped (message-size safety) with a flag.
   * The content script re-sanitizes via sanitizeWidgetConfig regardless.
   */
  buildLiveWidgetConfig(studioConfig: Record<string, any>, opts: { locale?: string; direction?: string; open?: boolean } = {}): Record<string, any> {
    const src = studioConfig && typeof studioConfig === 'object' ? studioConfig : {};
    const appearance = (src.appearance && typeof src.appearance === 'object' ? src.appearance : {}) as Record<string, any>;
    const clampNum = (v: unknown, lo: number, hi: number, fallback: number): number => {
      const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback;
      return Math.min(hi, Math.max(lo, Math.round(n * 100) / 100));
    };
    const str = (v: unknown, fallback: string): string => (typeof v === 'string' && v ? v : fallback);
    let launcherAsset: Record<string, any> | undefined;
    let logoDropped = false;
    const rawAsset = (src as any).launcherAsset;
    if (rawAsset && typeof rawAsset === 'object') {
      const dataUrl = typeof rawAsset.dataUrl === 'string' ? rawAsset.dataUrl : '';
      if (dataUrl && dataUrl.length > 100000) {
        logoDropped = true;
      } else {
        launcherAsset = { ...rawAsset };
      }
    }
    const cfg: Record<string, any> = {
      assistantIcon: str((src as any).assistantIcon, 'spark-02'),
      launcher: str((src as any).launcher, 'circle-icon'),
      chatShell: str((src as any).chatShell, 'side-panel'),
      header: str((src as any).header, 'header-docked'),
      assistantMessage: str((src as any).assistantMessage, 'modern-saas'),
      userMessage: str((src as any).userMessage, 'bubble-rounded'),
      inputBar: str((src as any).inputBar, 'floating-input'),
      sendButton: str((src as any).sendButton, 'send-circle'),
      sourceCitation: str((src as any).sourceCitation, 'source-chips'),
      takeMeThere: str((src as any).takeMeThere, 'cta-primary'),
      theme: str((src as any).theme, 'neutral-light'),
      locale: opts.locale === 'en' ? 'en' : 'ar',
      direction: opts.direction === 'ltr' ? 'ltr' : 'rtl',
      assistantName: str((src as any).assistantName, 'SiteAware').slice(0, 48),
      previewOpen: Boolean(opts.open),
      appearance: {
        primaryColor: str(appearance.primaryColor, '#111111'),
        radius: ['sm', 'md', 'lg', 'xl'].includes(appearance.radius) ? appearance.radius : 'md',
        widgetWidth: clampNum(appearance.widgetWidth, 320, 520, 420),
        widgetHeight: clampNum(appearance.widgetHeight, 440, 760, 720),
        density: ['compact', 'comfortable', 'spacious'].includes(appearance.density) ? appearance.density : 'comfortable',
        shadowStrength: clampNum(appearance.shadowStrength, 0.45, 1.2, 0.72),
        fontScale: clampNum(appearance.fontScale, 0.9, 1.12, 1),
        launcherSize: ['sm', 'md', 'lg'].includes(appearance.launcherSize) ? appearance.launcherSize : 'md',
        launcherPosition: ['bottom-right', 'bottom-left', 'left-edge', 'right-edge'].includes(appearance.launcherPosition)
          ? appearance.launcherPosition
          : 'bottom-right',
      },
    };
    if (launcherAsset) cfg.launcherAsset = launcherAsset;
    if (logoDropped) cfg.logoDroppedForSize = true;
    return cfg;
  },

  /** Eligible live tab: active http(s) page (chrome:// etc. fail closed). */
  async getLiveWidgetTab(): Promise<{ id: number; url: string; origin: string }> {
    const tab = await getActiveTab();
    if (tab.id == null || !tab.url) throw new Error('UNAVAILABLE:NO_ELIGIBLE_TAB');
    const origin = originOf(tab.url);
    if (!origin || !/^https:\/\/|^http:\/\//.test(tab.url)) throw new Error('UNAVAILABLE:NO_ELIGIBLE_TAB');
    return { id: tab.id, url: tab.url, origin };
  },

  async ensureLiveWidgetReceiver(tabId: number): Promise<void> {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['content-script.js'] });
    } catch {
      /* manifest auto-inject may already cover this tab; send will prove it */
    }
  },

  /** Render (or re-render) the real SiteAware widget on the live tab. */
  async renderLiveWidget(studioConfig: Record<string, any>, opts: { locale?: string; direction?: string; open?: boolean } = {}): Promise<{ ok: boolean; tabUrl: string; logoDropped: boolean }> {
    const tab = await this.getLiveWidgetTab();
    await this.ensureLiveWidgetReceiver(tab.id);
    const config = this.buildLiveWidgetConfig(studioConfig, opts);
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: 'SITEAWARE_RENDER_WIDGET', config }, (resp: any) => {
        if (chrome.runtime?.lastError) {
          reject(new Error(`UNAVAILABLE:${chrome.runtime.lastError.message || 'WIDGET_RECEIVER_MISSING'}`));
          return;
        }
        if (!resp?.ok) {
          reject(new Error(`UNAVAILABLE:WIDGET_RENDER_REJECTED:${String(resp?.error || 'unknown').slice(0, 120)}`));
          return;
        }
        resolve({ ok: true, tabUrl: tab.url, logoDropped: Boolean((config as any).logoDroppedForSize) });
      });
    });
  },

  /** Live theme/config update: same render path with a partial patch. */
  async updateLiveWidget(patch: Record<string, any>): Promise<{ ok: boolean; tabUrl: string }> {
    const tab = await this.getLiveWidgetTab();
    await this.ensureLiveWidgetReceiver(tab.id);
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: 'SITEAWARE_RENDER_WIDGET', config: patch && typeof patch === 'object' ? patch : {} }, (resp: any) => {
        if (chrome.runtime?.lastError) {
          reject(new Error(`UNAVAILABLE:${chrome.runtime.lastError.message || 'WIDGET_RECEIVER_MISSING'}`));
          return;
        }
        if (!resp?.ok) {
          reject(new Error(`UNAVAILABLE:WIDGET_UPDATE_REJECTED:${String(resp?.error || 'unknown').slice(0, 120)}`));
          return;
        }
        resolve({ ok: true, tabUrl: tab.url });
      });
    });
  },

  /** Live open/close: the widget toggles via previewOpen re-render. */
  async setLiveWidgetOpen(open: boolean): Promise<{ ok: boolean; tabUrl: string }> {
    const tab = await this.getLiveWidgetTab();
    await this.ensureLiveWidgetReceiver(tab.id);
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tab.id, { type: 'SITEAWARE_RENDER_WIDGET', config: { previewOpen: Boolean(open) } }, (resp: any) => {
        if (chrome.runtime?.lastError) {
          reject(new Error(`UNAVAILABLE:${chrome.runtime.lastError.message || 'WIDGET_RECEIVER_MISSING'}`));
          return;
        }
        if (!resp?.ok) {
          reject(new Error(`UNAVAILABLE:WIDGET_OPEN_REJECTED:${String(resp?.error || 'unknown').slice(0, 120)}`));
          return;
        }
        resolve({ ok: true, tabUrl: tab.url });
      });
    });
  },

  /** Remove the live widget from the tab (best-effort disconnect). */
  async removeLiveWidget(): Promise<{ ok: boolean; tabUrl: string }> {
    const tab = await this.getLiveWidgetTab();
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tab.id, { type: 'SITEAWARE_REMOVE_WIDGET' }, (resp: any) => {
        if (chrome.runtime?.lastError) {
          resolve({ ok: false, tabUrl: tab.url });
          return;
        }
        resolve({ ok: Boolean(resp?.ok), tabUrl: tab.url });
      });
    });
  },
};

export type UnifiedAdapter = typeof UnifiedSiteAwareExtensionAdapter;
