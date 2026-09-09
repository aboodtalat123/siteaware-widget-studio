// ============================================================================
// SiteAware live widget content script.
//
// Injects ONE shadow-DOM root into the host page. Host CSS cannot leak in and
// SiteAware CSS cannot leak out. The renderer is driven entirely by the shared
// WidgetConfig + catalog (widget-catalog.js) and an AssistantProvider
// (assistant-provider.js); it never talks to Gemini directly.
// ============================================================================

if (!globalThis.__SITEAWARE_WIDGET_STUDIO_LOADED__) {
  globalThis.__SITEAWARE_WIDGET_STUDIO_LOADED__ = true;

  const HOST_ID = 'siteaware-preview-root';
  const ROOT_CLASS = 'siteaware-live-preview';

  const catalogPromise = import(chrome.runtime.getURL('shared/widget-catalog.js'));
  const analyzerPromise = import(chrome.runtime.getURL('shared/site-design-analyzer.js'));
  const providerPromise = import(chrome.runtime.getURL('shared/assistant-provider.js'));

  const state = {
    host: null,
    shadow: null,
    config: null,
    messages: [],
    inputValue: '',
    sending: false,
    lastError: '',
    routeKey: location.href,
    observer: null,
    routeTimer: null,
  };

  const cssEscape = (value) => String(value ?? '').replace(/["\\]/g, '\\$&');

  function text(locale, ar, en) {
    return locale === 'ar' ? ar : en;
  }

  function ensureHost() {
    if (state.host?.isConnected && state.shadow) {
      return state.shadow;
    }
    const host = document.getElementById(HOST_ID) || document.createElement('div');
    host.id = HOST_ID;
    host.style.position = 'fixed';
    host.style.inset = 'auto';
    host.style.zIndex = '2147483647';
    host.style.pointerEvents = 'none';
    if (!host.isConnected) {
      document.documentElement.appendChild(host);
    }
    state.host = host;
    state.shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    return state.shadow;
  }

  function removeWidget() {
    if (state.observer) {
      state.observer.disconnect();
      state.observer = null;
    }
    state.host?.remove();
    state.host = null;
    state.shadow = null;
  }

  function catalogLookup(catalog, category, id) {
    const list = catalog[category];
    return Array.isArray(list) ? list.find((item) => item.id === id) : undefined;
  }

  function familyOf(catalog, category, id, fallback) {
    return catalogLookup(catalog, category, id)?.family || fallback;
  }

  function iconMarkup(config, catalog) {
    const icon = catalogLookup(catalog, 'icons', config.assistantIcon);
    if (icon?.svg) {
      return `<span class="official-mark">${icon.svg}</span>`;
    }
    return `<span>${escapeHtml(icon?.glyph || 'SA')}</span>`;
  }

  function seedMessages(config) {
    if (state.messages.length) return;
    const locale = config.locale || 'ar';
    state.messages = [
      {
        role: 'assistant',
        text: text(locale, 'أهلًا، أنا معاينة تصميم SiteAware. غيّر الأيقونة أو شكل المحادثة من اللوحة وسيظهر التغيير هنا فورًا.', 'Hi, this is the SiteAware design preview. Change the icon or chat style in the panel and it updates here instantly.'),
        sources: [text(locale, 'معاينة تصميم', 'Design preview')],
      },
      {
        role: 'user',
        text: text(locale, 'جرّب الشكل على هذا الموقع', 'Try this style on this site'),
      },
      {
        role: 'assistant',
        text: text(locale, 'هذه المحادثة للمعاينة البصرية فقط. تحليل الموقع يستخدم ألوانًا وخطوطًا وحوافًا آمنة بدون محتوى الصفحة.', 'This chat is visual preview only. Site analysis uses safe colors, fonts, and radii without page content.'),
        sources: [text(locale, 'خصوصية آمنة', 'Privacy-safe')],
      },
    ];
  }

  function hostPosition(config) {
    const sizeGap = config.appearance.launcherSize === 'lg' ? 26 : 20;
    const position = config.appearance.launcherPosition;
    const host = state.host;
    if (!host) return;
    host.style.left = 'auto';
    host.style.right = 'auto';
    host.style.top = 'auto';
    host.style.bottom = 'auto';
    if (position === 'bottom-left') {
      host.style.left = `${sizeGap}px`;
      host.style.bottom = `${sizeGap}px`;
    } else if (position === 'left-edge') {
      host.style.left = `${sizeGap}px`;
      host.style.top = '50%';
      host.style.transform = 'translateY(-50%)';
    } else if (position === 'right-edge') {
      host.style.right = `${sizeGap}px`;
      host.style.top = '50%';
      host.style.transform = 'translateY(-50%)';
    } else {
      host.style.right = `${sizeGap}px`;
      host.style.bottom = `${sizeGap}px`;
    }
    if (position !== 'left-edge' && position !== 'right-edge') {
      host.style.transform = '';
    }
  }

  function radiusFor(a) {
    return { sm: 10, md: 14, lg: 20, xl: 26 }[a.radius] || 20;
  }

  function launcherSizeFor(a) {
    return { sm: 46, md: 58, lg: 70 }[a.launcherSize] || 58;
  }

  function densityFor(a) {
    if (a.density === 'compact') return { gap: 10, pad: 10, line: 1.5 };
    if (a.density === 'spacious') return { gap: 16, pad: 20, line: 1.75 };
    return { gap: 12, pad: 16, line: 1.65 };
  }

  function renderWidget(inputConfig = {}) {
    return (async () => {
      const { sanitizeWidgetConfig, catalog } = await catalogPromise;
      const config = sanitizeWidgetConfig({ ...(state.config || {}), ...inputConfig });
      state.config = config;
      seedMessages(config);
      const shadow = ensureHost();
      hostPosition(config);

      const a = config.appearance;
      const glyphMarkup = iconMarkup(config, catalog);
      const name = config.assistantName || 'SiteAware';
      const radiusPx = radiusFor(a);
      const launcherSize = launcherSizeFor(a);
      const shadowOpacity = Math.round(a.shadowStrength * 34) / 100;
      const dir = config.direction === 'ltr' ? 'ltr' : 'rtl';
      const locale = config.locale === 'en' ? 'en' : 'ar';
      const density = densityFor(a);
      const scale = String(a.fontScale || 1);

      const launcherFamily = familyOf(catalog, 'launchers', config.launcher, 'circle');
      const shellFamily = familyOf(catalog, 'chatShells', config.chatShell, 'minimal');
      const headerFamily = familyOf(catalog, 'headers', config.header, 'official');
      const assistantFamily = familyOf(catalog, 'messageStyles', config.assistantMessage, 'card');
      const userFamily = familyOf(catalog, 'userMessages', config.userMessage, 'solid');
      const inputFamily = familyOf(catalog, 'inputBars', config.inputBar, 'pill');
      const sendFamily = familyOf(catalog, 'sendButtons', config.sendButton, 'circle');
      const sourceFamily = familyOf(catalog, 'sourceCitations', config.sourceCitation, 'inline');
      const ctaFamily = familyOf(catalog, 'takeMeThere', config.takeMeThere, 'link');

      const messagesMarkup = state.messages.map((message) => renderMessage(message, config, catalog, {
        assistantFamily,
        userFamily,
        sourceFamily,
        ctaFamily,
        name,
        locale,
      })).join('');

      const subtitle = text(locale, 'مساعد معاينة رسمي', 'Official preview assistant');
      const statusLabel = text(locale, 'متصل الآن', 'Online now');
      const minimizeTitle = text(locale, 'تصغير', 'Minimize');
      const closeTitle = text(locale, 'إغلاق', 'Close');

      shadow.innerHTML = `
        <style>
          :host { all: initial; }
          *, *::before, *::after { box-sizing: border-box; }
          .${ROOT_CLASS} {
            --sa-radius: ${radiusPx}px;
            --sa-scale: ${scale};
            pointer-events: auto;
            color: ${a.textColor};
            font-family: "Segoe UI", "Noto Sans Arabic", system-ui, sans-serif;
            direction: ${dir};
          }
          button, input { font: inherit; }

          .launcher {
            width: ${launcherSize}px;
            height: ${launcherSize}px;
            border: 1px solid color-mix(in srgb, ${a.primaryColor} 24%, ${a.borderColor});
            border-radius: ${launcherFamily === 'edge' ? '18px' : '999px'};
            display: ${config.previewOpen ? 'none' : 'grid'};
            place-items: center;
            gap: 6px;
            background: ${launcherBackground(launcherFamily, a)};
            color: #fff;
            box-shadow: 0 14px 36px rgb(15 23 42 / ${shadowOpacity});
            cursor: pointer;
            padding: 0;
            min-width: ${launcherFamily === 'floating-label' || launcherFamily === 'pill' ? '150px' : `${launcherSize}px`};
            font-weight: 700;
          }
          .launcher.edge {
            width: 46px;
            height: 128px;
            writing-mode: vertical-rl;
            border-radius: 16px;
          }
          .launcher .official-mark,
          .launcher > span:not(.official-mark) {
            width: 28px;
            height: 28px;
            display: grid;
            place-items: center;
          }
          .launcher .official-mark svg { width: 100%; height: 100%; display: block; }
          .launcher strong { font-size: 13px; font-weight: 700; color: inherit; }

          .dock {
            display: ${config.previewOpen ? 'grid' : 'none'};
            grid-template-rows: auto 1fr auto;
            width: min(${a.widgetWidth}px, calc(100vw - 28px));
            height: min(${a.widgetHeight}px, calc(100vh - 28px));
            overflow: hidden;
            border: 1px solid ${a.borderColor};
            border-radius: ${shellFamily === 'floating' ? 'var(--sa-radius)' : `${radiusPx}px`};
            background: ${shellBackground(shellFamily, a)};
            color: ${a.textColor};
            box-shadow: 0 22px 72px rgb(15 23 42 / ${shadowOpacity});
            backdrop-filter: ${['glass', 'liquid'].includes(shellFamily) ? 'blur(26px) saturate(1.18)' : 'none'};
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            min-height: 74px;
            padding: 14px 16px;
            border-bottom: 1px solid ${a.borderColor};
            background: ${headerBackground(shellFamily, headerFamily, a)};
          }
          .brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
          .mark {
            width: 40px;
            height: 40px;
            border-radius: ${Math.max(12, radiusPx - 4)}px;
            display: grid;
            place-items: center;
            background: ${a.primaryColor};
            color: #fff;
            box-shadow: 0 10px 26px color-mix(in srgb, ${a.primaryColor} 22%, transparent);
            overflow: hidden;
          }
          .mark .official-mark, .mark > span { width: 24px; height: 24px; display: grid; place-items: center; font-weight: 800; }
          .mark .official-mark svg { width: 100%; height: 100%; display: block; }
          .copy { min-width: 0; }
          .copy strong, .copy span { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .copy strong { font-size: calc(14px * var(--sa-scale)); line-height: 1.2; }
          .copy span { margin-top: 3px; color: ${a.mutedTextColor}; font-size: calc(11px * var(--sa-scale)); }
          .copy .status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #22c55e; margin-inline-end: 5px; }
          .header-actions { display: flex; gap: 6px; }
          .icon-btn {
            width: 34px;
            height: 34px;
            border-radius: 999px;
            border: 1px solid ${a.borderColor};
            background: color-mix(in srgb, ${a.surfaceColor} 72%, transparent);
            color: ${a.textColor};
            cursor: pointer;
            font-size: 15px;
            line-height: 1;
          }
          .messages {
            align-content: start;
            display: grid;
            gap: ${density.gap}px;
            overflow: auto;
            padding: ${density.pad}px;
            background: transparent;
          }
          .message-row { display: flex; }
          .message-row.user { justify-content: flex-end; }
          .message-row.assistant { justify-content: flex-start; }
          .bubble {
            max-width: 84%;
            padding: 11px 12px;
            border: 1px solid ${a.borderColor};
            border-radius: ${Math.max(12, radiusPx)}px;
            background: ${a.surfaceColor};
          }
          .bubble.flat-text { border-color: transparent; background: transparent; padding-inline: 0; }
          .bubble.glass {
            background: color-mix(in srgb, ${a.surfaceColor} 70%, transparent);
            backdrop-filter: blur(18px);
          }
          .bubble.compact { padding: 8px 10px; border-radius: ${Math.max(10, radiusPx - 6)}px; }
          .bubble.solid, .message-row.user .bubble.solid {
            background: ${a.primaryColor};
            border-color: ${a.primaryColor};
            color: ${safeInk(a.primaryColor)};
          }
          .bubble.outline { background: transparent; border: 1px solid ${a.primaryColor}; color: ${a.textColor}; }
          .meta {
            display: block;
            margin-bottom: 5px;
            color: currentColor;
            opacity: .62;
            font-size: calc(10px * var(--sa-scale));
            font-weight: 700;
          }
          p {
            margin: 0;
            color: currentColor;
            font-size: calc(13px * var(--sa-scale));
            line-height: ${density.line};
            white-space: pre-wrap;
          }
          .sources { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
          .sources .src-chip {
            font-size: calc(10px * var(--sa-scale));
            line-height: 1.2;
            padding: 3px 8px;
            border-radius: 999px;
            border: 1px solid ${a.borderColor};
            background: color-mix(in srgb, ${a.surfaceColor} 60%, transparent);
            color: ${a.mutedTextColor};
          }
          .cta {
            display: inline-block;
            margin-top: 8px;
            font-size: calc(11px * var(--sa-scale));
            font-weight: 700;
            color: ${a.primaryColor};
            background: transparent;
            border: 0;
            padding: 0;
            cursor: pointer;
            text-decoration: underline;
          }
          .cta.button {
            text-decoration: none;
            padding: 6px 12px;
            border-radius: 999px;
            background: ${a.primaryColor};
            color: ${safeInk(a.primaryColor)};
          }
          .composer {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 8px;
            padding: 12px;
            border-top: 1px solid ${a.borderColor};
            background: ${composerBackground(inputFamily, a)};
          }
          input {
            min-width: 0;
            width: 100%;
            border: ${inputFamily === 'underline' ? '0' : `1px solid ${a.borderColor}`};
            border-bottom: ${inputFamily === 'underline' ? `2px solid ${a.primaryColor}` : `1px solid ${a.borderColor}`};
            border-radius: ${inputFamily === 'card' || inputFamily === 'floating' ? `${Math.max(12, radiusPx)}px` : '999px'};
            background: ${inputFamily === 'glass' ? 'color-mix(in srgb, white 54%, transparent)' : inputFamily === 'underline' ? 'transparent' : a.surfaceColor};
            color: ${a.textColor};
            outline: none;
            padding: 12px 13px;
            font-size: calc(13px * var(--sa-scale));
          }
          input:focus {
            border-color: ${a.primaryColor};
            box-shadow: 0 0 0 3px color-mix(in srgb, ${a.primaryColor} 18%, transparent);
          }
          .send {
            min-width: ${sendFamily === 'text' ? '74px' : '44px'};
            height: 44px;
            border: 0;
            border-radius: ${sendFamily === 'square' ? `${Math.max(12, radiusPx - 5)}px` : '999px'};
            background: ${sendFamily === 'square' ? 'transparent' : a.primaryColor};
            color: ${sendFamily === 'square' ? a.primaryColor : safeInk(a.primaryColor)};
            border: ${sendFamily === 'square' ? `1px solid ${a.primaryColor}` : '0'};
            cursor: pointer;
            font-weight: 800;
            font-size: 15px;
          }
          .send:disabled { cursor: default; opacity: .48; }
          .typing {
            display: ${state.sending ? 'inline-flex' : 'none'};
            align-items: center;
            gap: 4px;
            width: max-content;
            margin-inline-start: 16px;
            margin-bottom: 10px;
            padding: 8px 10px;
            border-radius: 999px;
            background: ${a.surfaceColor};
            color: ${a.mutedTextColor};
            border: 1px solid ${a.borderColor};
            font-size: 11px;
          }
          .typing i {
            width: 5px; height: 5px; border-radius: 50%;
            background: currentColor;
            animation: pulse 900ms infinite ease-in-out;
          }
          .typing i:nth-child(2) { animation-delay: 140ms; }
          .typing i:nth-child(3) { animation-delay: 280ms; }
          .error {
            display: ${state.lastError ? 'block' : 'none'};
            margin: 0 16px 10px;
            color: #b42318;
            font-size: 11px;
          }
          @keyframes pulse { 0%, 100% { opacity: .28; transform: translateY(0); } 50% { opacity: 1; transform: translateY(-2px); } }
        </style>
        <div class="${ROOT_CLASS} shell-${cssEscape(config.chatShell)}" dir="${dir}">
          <button class="launcher ${launcherFamily}" type="button" data-action="open">
            ${glyphMarkup}
            ${launcherFamily === 'floating-label' || launcherFamily === 'pill' ? `<strong>${escapeHtml(name)}</strong>` : ''}
          </button>
          <section class="dock" aria-label="SiteAware design preview">
            <header class="header">
              <div class="brand">
                <div class="mark">${glyphMarkup}</div>
                <div class="copy">
                  <strong>${escapeHtml(name)}</strong>
                  <span>${headerFamily === 'status' || headerFamily === 'avatar' ? `<span class="status-dot"></span>${escapeHtml(statusLabel)}` : escapeHtml(subtitle)}</span>
                </div>
              </div>
              <div class="header-actions">
                <button class="icon-btn" type="button" data-action="minimize" title="${minimizeTitle}">–</button>
                <button class="icon-btn" type="button" data-action="close" title="${closeTitle}">×</button>
              </div>
            </header>
            <main class="messages" aria-live="polite">${messagesMarkup}</main>
            <div class="typing"><i></i><i></i><i></i><span>${text(locale, 'يكتب...', 'Thinking...')}</span></div>
            <p class="error">${escapeHtml(state.lastError)}</p>
            <form class="composer">
              <input value="${escapeHtml(state.inputValue)}" placeholder="${text(locale, 'اكتب سؤال معاينة...', 'Ask a preview question...')}" />
              <button class="send" type="submit" ${state.sending ? 'disabled' : ''}>${sendLabel(sendFamily, locale)}</button>
            </form>
          </section>
        </div>
      `;

      const input = shadow.querySelector('input');
      input?.addEventListener('input', (event) => {
        state.inputValue = event.target.value;
      });
      shadow.querySelector('[data-action="open"]')?.addEventListener('click', () => renderWidget({ previewOpen: true }));
      shadow.querySelector('[data-action="close"]')?.addEventListener('click', () => renderWidget({ previewOpen: false }));
      shadow.querySelector('[data-action="minimize"]')?.addEventListener('click', () => renderWidget({ previewOpen: false }));
      shadow.querySelector('form')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        await handleSend(config);
      });
    })();
  }

  function renderMessage(message, config, catalog, opts) {
    const locale = opts.locale;
    const isAssistant = message.role === 'assistant';
    const bubbleClass = isAssistant
      ? opts.assistantFamily === 'flat' ? 'flat-text' : opts.assistantFamily === 'glass' ? 'glass' : opts.assistantFamily === 'compact' ? 'compact' : ''
      : opts.userFamily === 'glass' ? 'glass' : opts.userFamily === 'outline' ? 'outline' : 'solid';

    const meta = isAssistant ? escapeHtml(opts.name) : text(locale, 'أنت', 'You');
    const sources = isAssistant && Array.isArray(message.sources) && message.sources.length
      ? `<div class="sources">${message.sources.map((s) => `<span class="src-chip">${escapeHtml(s)}</span>`).join('')}</div>`
      : '';
    const cta = isAssistant && message.action
      ? `<button class="cta ${opts.ctaFamily === 'button' ? 'button' : ''}" type="button">${escapeHtml(message.action)}</button>`
      : '';

    return `
      <div class="message-row ${isAssistant ? 'assistant' : 'user'}">
        <div class="bubble ${bubbleClass}">
          <span class="meta">${meta}</span>
          <p>${escapeHtml(message.text)}</p>
          ${sources}
          ${cta}
        </div>
      </div>
    `;
  }

  function launcherBackground(family, a) {
    if (family === 'glass') return `color-mix(in srgb, ${a.surfaceColor} 76%, transparent)`;
    if (family === 'liquid') return `linear-gradient(145deg, color-mix(in srgb, ${a.surfaceColor} 82%, transparent), color-mix(in srgb, ${a.primaryColor} 26%, transparent))`;
    if (family === 'orb') return `radial-gradient(circle at 30% 20%, #fff, ${a.primaryColor})`;
    if (family === 'outline' || family === 'circle') return a.surfaceColor;
    if (family === 'premium') return `linear-gradient(135deg, ${a.primaryColor}, color-mix(in srgb, ${a.primaryColor} 55%, #111827))`;
    return `linear-gradient(135deg, ${a.primaryColor}, color-mix(in srgb, ${a.primaryColor} 72%, ${a.surfaceColor}))`;
  }

  function shellBackground(family, a) {
    if (family === 'liquid') return `linear-gradient(145deg, color-mix(in srgb, ${a.surfaceColor} 78%, transparent), color-mix(in srgb, ${a.backgroundColor} 68%, transparent))`;
    if (family === 'glass') return `linear-gradient(145deg, color-mix(in srgb, ${a.surfaceColor} 76%, transparent), color-mix(in srgb, ${a.backgroundColor} 72%, transparent))`;
    if (family === 'dark' || family === 'premium') return `radial-gradient(circle at 18% 0%, color-mix(in srgb, ${a.primaryColor} 24%, transparent), transparent 38%), ${a.backgroundColor}`;
    if (family === 'floating') return `color-mix(in srgb, ${a.surfaceColor} 86%, ${a.backgroundColor})`;
    return a.backgroundColor;
  }

  function headerBackground(shellFamily, headerFamily, a) {
    if (shellFamily === 'copilot') return `linear-gradient(135deg, ${a.primaryColor}, color-mix(in srgb, ${a.primaryColor} 72%, #111827))`;
    if (shellFamily === 'minimal') return a.surfaceColor;
    return `color-mix(in srgb, ${a.surfaceColor} 88%, ${a.primaryColor} 6%)`;
  }

  function composerBackground(inputFamily, a) {
    if (inputFamily === 'glass') return `color-mix(in srgb, ${a.surfaceColor} 68%, transparent)`;
    return a.backgroundColor;
  }

  function sendLabel(family, locale) {
    return family === 'text' ? text(locale, 'إرسال', 'Send') : '➜';
  }

  function safeInk(background) {
    // Choose white or near-black ink for greatest contrast on a given color.
    const parsed = parseRgb(background);
    if (!parsed) return '#111827';
    const lum = 0.2126 * parsed.r + 0.7152 * parsed.g + 0.0722 * parsed.b;
    return lum < 150 ? '#ffffff' : '#111827';
  }

  function parseRgb(value) {
    const hex = String(value || '').replace(/^#/, '');
    if (/^[0-9a-f]{6}$/i.test(hex)) {
      return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
    }
    const match = String(value || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    return match ? { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) } : null;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function handleSend(config) {
    const question = state.inputValue.trim();
    if (!question) return;
    state.messages.push({ role: 'user', text: question });
    state.inputValue = '';
    state.sending = true;
    state.lastError = '';
    renderWidget({ previewOpen: true });
    try {
      const { providerFactory } = await providerPromise;
      const provider = providerFactory('preview');
      const result = await provider.send({
        message: question,
        conversation: state.messages.slice(-8),
        config,
        context: { hostname: location.hostname },
      });
      state.messages.push({
        role: 'assistant',
        text: result.ok && result.reply
          ? result.reply
          : text(config.locale, 'أنا جاهز لمعاينة التصميم والإجابة العامة بدون قراءة بيانات الصفحة الخاصة.', 'I can preview the design and answer general questions without reading private page data.'),
        sources: [text(config.locale, 'معاينة AI', 'Preview AI')],
      });
    } catch (error) {
      state.lastError = text(config.locale, 'تعذر الاتصال بالمساعد الآن. أبقيت المحادثة كمعاينة تصميم.', 'Assistant connection failed. The conversation remains in design preview mode.');
      state.messages.push({
        role: 'assistant',
        text: text(config.locale, 'الاتصال بالذكاء غير متاح الآن، لكن تغييرات التصميم ستبقى مباشرة على الصفحة.', 'AI is unavailable right now, but design changes still update live on the page.'),
      });
    } finally {
      state.sending = false;
      renderWidget({ previewOpen: true });
    }
  }

  function watchRouteChanges() {
    if (state.observer) return;
    const notify = () => {
      window.clearTimeout(state.routeTimer);
      state.routeTimer = window.setTimeout(() => {
        if (state.routeKey !== location.href) {
          state.routeKey = location.href;
          chrome.runtime.sendMessage({ type: 'SITEAWARE_ROUTE_CHANGED', url: location.href });
        }
        if (!state.host?.isConnected && state.config) {
          void renderWidget(state.config);
        }
      }, 350);
    };
    for (const event of ['popstate', 'hashchange']) {
      window.addEventListener(event, notify, true);
    }
    state.observer = new MutationObserver(notify);
    state.observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'SITEAWARE_RENDER_WIDGET') {
      renderWidget(message.config || {}).then(() => sendResponse?.({ ok: true })).catch((error) => sendResponse?.({ ok: false, error: error.message }));
      watchRouteChanges();
      return true;
    }
    if (message?.type === 'SITEAWARE_REMOVE_WIDGET') {
      removeWidget();
      sendResponse?.({ ok: true });
      return true;
    }
    if (message?.type === 'SITEAWARE_SCAN_PAGE') {
      analyzerPromise.then(({ scanSiteDesignV2 }) => scanSiteDesignV2(document))
        .then((profile) => {
          sendResponse?.({ ok: true, profile });
        })
        .catch((error) => sendResponse?.({ ok: false, error: error.message }));
      return true;
    }
    return undefined;
  });
}