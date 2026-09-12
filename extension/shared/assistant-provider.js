// ============================================================================
// AssistantProvider abstraction.
//
// The widget renderer never talks to Gemini (or any future intelligence
// provider) directly. It depends only on this interface:
//
//   provider.send({ message, conversation, config, context }) => Promise<Reply>
//
// Today the only implementation is PreviewAssistantProvider, which routes a
// generic preview question through the Studio backend (which holds the Gemini
// key server-side). Later this file gains SiteAwareCoreAssistantProvider for
// the real SiteAware Core (Graph + Knowledge + Current Page + 5C/5D/5E)
// without the widget UI needing to change at all.
// ============================================================================

// A normalized reply. `ok` false means the provider could not answer, but the
// renderer should still keep working (show an error/fallback line).
//
// No page text, DOM, form values, cookies, storage, or secrets may be added
// to `context`. It is restricted to safe design metadata:
//   - locale
//   - a site name/vibe label (hostname only)
//   - the current widget config (component ids + colors)
//   - the recent conversation that the user already typed in the widget
export function createProviderReply({ ok, reply = '', message = '' }) {
  return { ok: Boolean(ok), reply: String(reply), message: String(message) };
}

// ---------------------------------------------------------------------------
// PreviewAssistantProvider — current milestone implementation.
//
// Widget -> runtime message -> Service Worker -> backend /api/chat -> Gemini
// ---------------------------------------------------------------------------
export class PreviewAssistantProvider {
  constructor({ backendUrl = 'https://siteaware-widget-studio.onrender.com' } = {}) {
    this.backendUrl = backendUrl;
    this.name = 'PreviewAssistantProvider';
    this.isPreview = true;
  }

  async send({ message = '', conversation = [], config = {}, context = {} } = {}) {
    const question = String(message ?? '').trim();
    if (!question) {
      return createProviderReply({ ok: false, message: 'Empty message.' });
    }

    const safeConversation = (Array.isArray(conversation) ? conversation : [])
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        role: item.role === 'assistant' ? 'assistant' : 'user',
        text: typeof item.text === 'string' ? item.text : '',
      }))
      .filter((item) => item.text)
      .slice(-8);

    // Component ids + locale only. No appearance colors needed for a generic
    // preview reply, but they are harmless; we omit them anyway for minimality.
    const safeConfig = {
      assistantIcon: config.assistantIcon,
      launcher: config.launcher,
      chatShell: config.chatShell,
      locale: config.locale,
    };

    const payload = {
      locale: config.locale === 'ar' ? 'ar' : 'en',
      site: {
        name: typeof context.hostname === 'string' ? context.hostname : '',
        vibe: 'design preview',
      },
      config: safeConfig,
      conversation: safeConversation,
      composer: question,
    };

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SITEAWARE_PREVIEW_CHAT',
        payload,
      });
      if (response?.ok) {
        return createProviderReply({ ok: true, reply: response.reply || '', message: response.message || '' });
      }
      return createProviderReply({ ok: false, reply: '', message: response?.message || 'Preview assistant unavailable.' });
    } catch (error) {
      return createProviderReply({ ok: false, reply: '', message: error instanceof Error ? error.message : 'Preview assistant failed.' });
    }
  }
}

// ---------------------------------------------------------------------------
// Future: SiteAwareCoreAssistantProvider.
//
// Placeholder documenting the future provider surface. It is intentionally NOT
// wired up yet — DESIGN is the only implemented mode. When Core ships, this
// provider replaces PreviewAssistantProvider in the renderer's wiring with no
// renderer changes.
// ---------------------------------------------------------------------------
export function createSiteAwareCoreAssistantProvider() {
  throw new Error('SiteAwareCoreAssistantProvider is not available in the DESIGN milestone.');
}

export function providerFactory(kind = 'preview', options = {}) {
  if (kind === 'preview') {
    return new PreviewAssistantProvider(options);
  }
  return createSiteAwareCoreAssistantProvider();
}