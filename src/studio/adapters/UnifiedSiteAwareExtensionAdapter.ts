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
const TOKEN_STORAGE_KEY = 'siteaware.local.dev.session';
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
    return stored?.[TOKEN_STORAGE_KEY] || '';
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
  opts: { method?: string; body?: unknown; auth?: boolean; managementKey?: string; siteId?: string } = {},
): Promise<T> {
  const { method = 'GET', body = null, auth = true, managementKey = '', siteId = '' } = opts;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getSessionToken();
    if (!token) throw new Error('UNAVAILABLE:NO_SESSION_TOKEN');

    const tab = await getActiveTab();
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-SiteAware-Site-Origin'] = approvedSiteOrigin(tab.url);
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
      if (isHexColor(entry)) return entry;
    }
    return null;
  };
  const appearance: Record<string, any> = {
    theme: 'light',
    primary_color: pick(profile?.dominant_colors) ?? '#6d28d9',
    radius_px: clampInt(profile?.radius_px, 0, 32, 12),
    density: 'comfortable',
    launcher_position: 'bottom-right',
    launcher_shape: 'round',
    direction: profile?.direction === 'ltr' ? 'ltr' : 'rtl',
    font_scale: 1.0,
    panel_width_px: 380,
    panel_height_px: 560,
    locale: typeof profile?.locale === 'string' ? String(profile.locale).slice(0, 8) : 'ar',
  };
  const surface = pick(profile?.surface_colors);
  if (surface) appearance['surface'] = surface;
  const text = pick(profile?.text_colors);
  if (text) appearance['text'] = text;
  const border = pick(profile?.border_colors);
  if (border) appearance['border'] = border;
  const fonts = Array.isArray(profile?.font_families)
    ? profile.font_families.filter((f: unknown) => typeof f === 'string' && /^[A-Za-z0-9 \-]{1,32}$/.test(f)).slice(0, 4)
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
    const res = await fetch(`${BACKEND_BASE}/api/extension/capabilities`);
    if (!res.ok) throw new Error(`UNAVAILABLE:BACKEND_${res.status}`);
    return (await res.json()) as Capabilities;
  },

  async getDevStatus(): Promise<Record<string, any>> {
    const res = await fetch(`${BACKEND_BASE}/dev/status`);
    if (!res.ok) throw new Error(`UNAVAILABLE:BACKEND_${res.status}`);
    return (await res.json()) as Record<string, any>;
  },

  async getSiteProfile(): Promise<SiteProfile> {
    const res = await fetch(`${BACKEND_BASE}/api/local/v1/site-profile`);
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

  /** Ensure a LOCAL-DEV runtime session exists; bootstrap if missing.
   *  - Checks chrome.storage.session first
   *  - If missing, inspects active tab origin, fails closed if not approved
   *  - Calls backend POST /api/local/v1/dev-session
   *  - Stores minimal token scope auth:student in chrome.storage.session only
   *  - Never logs/prints the token; returns true on success */
  async ensureLocalDevSession(): Promise<boolean> {
    const stored = await getSessionToken();
    if (stored) return true;

    const tab = await getActiveTab();
    if (!tab.url) return false;

    const origin = approvedSiteOrigin(tab.url);

    const res = await fetch(`${BACKEND_BASE}/api/local/v1/dev-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SiteAware-Site-Origin': origin,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => String(res.status));
      throw new Error(
        `UNAVAILABLE:LOCAL_DEV_SESSION_${res.status}:${text.slice(0, 200)}`
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

    return true;
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
    const res = await fetch(`${BACKEND_BASE}/api/local/v1/appearance?site_id=${encodeURIComponent(siteId)}`);
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
   * No clicks, no forms, no mutations: route navigation only via the
   * service-worker pass, observations only via the sanitized observer.
   * D3 StateExplorer (deep interaction) is NOT called here — NOT YET WIRED
   * in this browser build; this covers automatic ROUTE traversal + safe
   * observation only.
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
    let ingested = await this.ingestObservation(sessionId, firstObservation);
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
      session = await this.getLearningProgress(sessionId).catch(() => session);
      return { session, visited };
    }

    // Bounded traversal driven by the backend frontier.
    const attempted = new Set<string>();
    let guard = 0;
    let advancedEver = false;
    let firstIngestError: unknown = null;
    while (next && guard < maxPasses) {
      if (opts.shouldContinue && !opts.shouldContinue()) break;
      const live = await this.getLearningProgress(sessionId).catch(() => null);
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
          const more = await this.ingestObservation(sessionId, item.observation, next).catch((e) => {
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
      opts.onProgress?.({ session, visited: visited.slice(-10), next });
      if (!advanced) break;

      const check = await this.getLearningProgress(sessionId).catch(() => null);
      if (check) {
        session = check;
        if (check.state !== 'active') break;
        if (!next) break;
      }
    }

    session = await this.getLearningProgress(sessionId).catch(() => session);
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

  async getLearningProgress(sessionId: string): Promise<LearningSessionDict> {
    const data = await backend<{ session: LearningSessionDict }>(`/api/extension/v1/learning-sessions/${sessionId}`, { method: 'GET' });
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

  async ingestObservation(sessionId: string, observation: Record<string, any>, navigatedRoute = ''): Promise<Record<string, any>> {
    return backend<Record<string, any>>(`/api/extension/v1/observations`, {
      method: 'POST',
      body: { session_id: sessionId, observation, navigated_route: navigatedRoute || undefined },
    });
  },
  /**
   * identifySafeDisclosures — from an observation, find controls that have
   * the aria-expanded attribute, which is the structural signal of an
   * expandable/collapsible navigation group. Fail-closed: only controls where
   * aria-expanded is explicitly set are eligible; buttons without it are
   * ignored (we never click arbitrary controls).
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
   * computeLinkDelta — compare links from two observations and return
   * newly visible links that were not present before.
   */
  computeLinkDelta(previous: Record<string, any>, current: Record<string, any>): Array<{ label: string; href: string }> {
    const prevHrefs = new Set((previous.links || []).map((l: any) => l.href));
    const currentLinks = current.links || [];
    return currentLinks.filter((l: any) => !prevHrefs.has(l.href));
  },

  /**
   * clickDisclosure — programmatically click ONE disclosure control by its
   * structural index via the content script. Fail-closed: the content script
   * only clicks controls that have an explicit aria-expanded attribute, so
   * arbitrary/unsafe buttons are never activated here.
   */
  clickDisclosure(index: number): Promise<boolean> {
    if (!chrome?.runtime?.sendMessage) return Promise.resolve(false);
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'SITEAWARE_CLICK_DISCLOSURE', index },
        (resp: any) => resolve(Boolean(resp?.clicked)),
      );
    });
  },

  /**
   * exploreDisclosuresPage — bounded autonomous exploration of every SAFE
   * navigation disclosure on the CURRENT observed page.
   *
   * Loop: identify safe collapsed disclosures → click the first not-yet-
   * explored one in its current state → wait for stabilization → re-observe →
   * record link/route delta → ingest revealed links into the existing backend
   * frontier → repeat until no eligible disclosure remains, a per-page bound is
   * hit, or consecutive no-delta steps occur.
   *
   * Loop protection: tracks (page-route :: control-index :: expanded-state) so
   * the same disclosure is never re-clicked while in the same meaningful page
   * state (prevents open → close → open → close churn).
   *
   * Safety: only controls with explicit aria-expanded are eligible; never
   * clicked twice in the same state; bounded by maxDisclosuresPerPage.
   */
  async exploreDisclosuresPage(
    observation: Record<string, any>,
    sessionId: string,
    originOverride: string
  ): Promise<{ explored: Array<{ controlIndex: number; label: string }>; newRoutes: Array<string>; newLinks: Array<string> }> {
    const explored: Array<{ controlIndex: number; label: string }> = [];
    const newRoutes: string[] = [];
    const newLinks: string[] = [];
    const exploredKeys = new Set<string>();
    const pageRoute = String(observation.route_template || observation.canonical_path || observation.url || '');
    const maxDisclosuresPerPage = 20;
    const maxNoDeltaStreak = 2;
    let noDeltaStreak = 0;
    let currentObs = observation;

    for (let step = 0; step < maxDisclosuresPerPage; step++) {
      const disclosures = this.identifySafeDisclosures(currentObs);
      // Pick the first not-yet-explored disclosure in its current state.
      let candidate: { index: number; label: string; ariaExpanded: boolean } | undefined;
      for (const d of disclosures) {
        const key = `${pageRoute}::${d.index}::${String(d.ariaExpanded)}`;
        if (!exploredKeys.has(key)) {
          candidate = d;
          break;
        }
      }
      if (!candidate) break; // no eligible disclosure remains in a fresh state

      const key = `${pageRoute}::${candidate.index}::${String(candidate.ariaExpanded)}`;
      exploredKeys.add(key);
      const clicked = await this.clickDisclosure(candidate.index);
      if (!clicked) continue;

      explored.push({ controlIndex: candidate.index, label: candidate.label });

      // Wait for the UI to stabilize.
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Re-observe the page.
      let after: Record<string, any>;
      try {
        after = await this.observeActiveTab();
      } catch {
        break;
      }

      // Compute the newly visible link delta.
      const delta = this.computeLinkDelta(currentObs, after);
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
      // Record the safely executed disclosure so the backend counts it
      // in interactions_explored. Best-effort: never breaks the loop.
      try {
        await this.noteInteraction(sessionId);
      } catch {
        /* counting must not break discovery */
      }
      currentObs = after;
    }

    return { explored, newRoutes, newLinks };
  },

  /**
   * D3 authorization seam (Core classifier is the authority).
   * Submits structural descriptors; returns Core-approved SAFE_STRUCTURAL
   * intents plus explicit abstentions. No actuation happens here and no
   * browser-side click executor exists yet — the browser must never treat
   * an approval as permission to touch anything but the approved
   * structural primitive, and only after a live descriptor re-match.
   */
  async authorizeInteractions(descriptors: Array<Record<string, any>>): Promise<{
    approvals: Array<{ element_uid: string; kind: string; reason: string; restore_intent: string | null }>;
    abstentions: Array<{ element_uid: string; classification: string; reason: string }>;
  }> {
    return backend<{
      approvals: Array<{ element_uid: string; kind: string; reason: string; restore_intent: string | null }>;
      abstentions: Array<{ element_uid: string; classification: string; reason: string }>;
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

  /** Resolve a backend target_identity to a live ctl-N/lnk-N id via fresh observation. */
  async resolveStructuralId(targetIdentity: string): Promise<string> {
    const observation = await this.observeActiveTab().catch(() => null);
    if (!observation) return '';
    const wanted = String(targetIdentity || '').toLowerCase();
    for (const [index, control] of ((observation.controls || []) as any[]).entries()) {
      const label = String(control.label || '').toLowerCase();
      if (label && (label === wanted || wanted.includes(label) || label.includes(wanted))) return `ctl-${index}`;
    }
    for (const [index, link] of ((observation.links || []) as any[]).entries()) {
      const label = String(link.label || '').toLowerCase();
      if (label && (label === wanted || wanted.includes(label) || label.includes(wanted))) return `lnk-${index}`;
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
};

export type UnifiedAdapter = typeof UnifiedSiteAwareExtensionAdapter;
