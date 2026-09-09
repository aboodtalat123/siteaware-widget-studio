if (!globalThis.__SITEAWARE_WIDGET_STUDIO_LOADED__) {
  globalThis.__SITEAWARE_WIDGET_STUDIO_LOADED__ = true;

  const HOST_ID = 'siteaware-preview-root';
  const ROOT_CLASS = 'siteaware-live-preview';

  const catalogPromise = import(chrome.runtime.getURL('shared/widget-catalog.js'));
  const analyzerPromise = import(chrome.runtime.getURL('shared/site-design-analyzer.js'));

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

  function launcherGlyph(config, catalog) {
    return catalog.icons.find((item) => item.id === config.assistantIcon)?.glyph || 'AI';
  }

  function seedMessages(config) {
    if (state.messages.length) return;
    const locale = config.locale || 'ar';
    state.messages = [
      {
        role: 'assistant',
        text: text(locale, 'أهلًا، أنا معاينة تصميم SiteAware. غيّر الأيقونة أو شكل المحادثة من اللوحة وسيظهر التغيير هنا فورًا.', 'Hi, this is the SiteAware design preview. Change the icon or chat style in the panel and it updates here instantly.'),
      },
      {
        role: 'user',
        text: text(locale, 'جرّب الشكل على هذا الموقع', 'Try this style on this site'),
      },
      {
        role: 'assistant',
        text: text(locale, 'هذه المحادثة للمعاينة البصرية فقط. تحليل الموقع يستخدم ألوانًا وخطوطًا وحوافًا آمنة بدون محتوى الصفحة.', 'This chat is visual preview only. Site analysis uses safe colors, fonts, and radii without page content.'),
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

  async function renderWidget(inputConfig = {}) {
    const { sanitizeWidgetConfig, catalog } = await catalogPromise;
    const config = sanitizeWidgetConfig({ ...(state.config || {}), ...inputConfig });
    state.config = config;
    seedMessages(config);
    const shadow = ensureHost();
    hostPosition(config);

    const a = config.appearance;
    const glyph = launcherGlyph(config, catalog);
    const name = config.assistantName || 'SiteAware';
    const radiusPx = { sm: 10, md: 14, lg: 20, xl: 26 }[a.radius] || 20;
    const launcherSize = { sm: 46, md: 58, lg: 70 }[a.launcherSize] || 58;
    const shadowOpacity = Math.round(a.shadowStrength * 34) / 100;
    const dir = config.direction === 'ltr' ? 'ltr' : 'rtl';
    const locale = config.locale === 'en' ? 'en' : 'ar';

    const messagesMarkup = state.messages.map((message) => `
      <div class="message-row ${message.role}">
        <div class="bubble ${message.role === 'assistant' ? config.assistantMessage : config.userMessage}">
          <span class="meta">${message.role === 'assistant' ? escapeHtml(name) : text(locale, 'أنت', 'You')}</span>
          <p>${escapeHtml(message.text)}</p>
        </div>
      </div>
    `).join('');

    shadow.innerHTML = `
      <style>
        :host { all: initial; }
        *, *::before, *::after { box-sizing: border-box; }
        .${ROOT_CLASS} {
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
          border-radius: ${['vertical-edge-tab', 'docked-tab'].includes(config.launcher) ? '18px' : '999px'};
          display: ${config.previewOpen ? 'none' : 'grid'};
          place-items: center;
          gap: 6px;
          background: ${launcherBackground(config.launcher, a)};
          color: ${a.textColor};
          box-shadow: 0 14px 36px rgb(15 23 42 / ${shadowOpacity});
          cursor: pointer;
          padding: 0;
          min-width: ${config.launcher === 'pill-label' ? '126px' : `${launcherSize}px`};
        }
        .launcher.vertical-edge-tab,
        .launcher.docked-tab {
          width: 44px;
          height: 132px;
          writing-mode: vertical-rl;
        }
        .launcher span:first-child {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: ${a.primaryColor};
          color: #fff;
          font-weight: 800;
        }
        .dock {
          display: ${config.previewOpen ? 'grid' : 'none'};
          grid-template-rows: auto 1fr auto;
          width: min(${a.widgetWidth}px, calc(100vw - 28px));
          height: min(${a.widgetHeight}px, calc(100vh - 28px));
          overflow: hidden;
          border: 1px solid ${a.borderColor};
          border-radius: ${radiusPx}px;
          background: ${shellBackground(config.chatShell, a)};
          color: ${a.textColor};
          box-shadow: 0 22px 72px rgb(15 23 42 / ${shadowOpacity});
          backdrop-filter: ${['liquid-glass', 'soft-glass-shell'].includes(config.chatShell) ? 'blur(26px) saturate(1.18)' : 'none'};
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 74px;
          padding: 14px 16px;
          border-bottom: 1px solid ${a.borderColor};
          background: ${headerBackground(config.chatShell, a)};
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .mark {
          width: 40px;
          height: 40px;
          border-radius: ${Math.max(12, radiusPx - 4)}px;
          display: grid;
          place-items: center;
          background: ${a.primaryColor};
          color: #fff;
          font-weight: 800;
          box-shadow: 0 10px 26px color-mix(in srgb, ${a.primaryColor} 22%, transparent);
        }
        .copy strong, .copy span { display: block; }
        .copy strong { font-size: 14px; line-height: 1.2; }
        .copy span { margin-top: 3px; color: ${a.mutedTextColor}; font-size: 11px; }
        .icon-btn {
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid ${a.borderColor};
          background: color-mix(in srgb, ${a.surfaceColor} 72%, transparent);
          color: ${a.textColor};
          cursor: pointer;
        }
        .messages {
          align-content: start;
          display: grid;
          gap: 12px;
          overflow: auto;
          padding: 16px;
          background: ${['chatgpt-minimal', 'minimal-saas', 'native-card'].includes(config.chatShell) ? a.surfaceColor : 'transparent'};
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
        .bubble.flat-text {
          border-color: transparent;
          background: transparent;
          padding-inline: 0;
        }
        .bubble.glass {
          background: color-mix(in srgb, ${a.surfaceColor} 70%, transparent);
          backdrop-filter: blur(18px);
        }
        .bubble.compact {
          padding: 8px 10px;
          border-radius: ${Math.max(10, radiusPx - 6)}px;
        }
        .bubble.solid,
        .message-row.user .bubble {
          background: ${a.primaryColor};
          border-color: ${a.primaryColor};
          color: #fff;
        }
        .meta {
          display: block;
          margin-bottom: 5px;
          color: currentColor;
          opacity: .62;
          font-size: 10px;
          font-weight: 700;
        }
        p {
          margin: 0;
          color: currentColor;
          font-size: 13px;
          line-height: 1.65;
          white-space: pre-wrap;
        }
        .composer {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
          padding: 12px;
          border-top: 1px solid ${a.borderColor};
          background: ${composerBackground(config.inputBar, a)};
        }
        input {
          min-width: 0;
          width: 100%;
          border: 1px solid ${a.borderColor};
          border-radius: ${config.inputBar === 'composer-card' ? `${Math.max(12, radiusPx)}px` : '999px'};
          background: ${config.inputBar === 'glass' ? 'color-mix(in srgb, white 54%, transparent)' : a.surfaceColor};
          color: ${a.textColor};
          outline: none;
          padding: 12px 13px;
        }
        input:focus {
          border-color: ${a.primaryColor};
          box-shadow: 0 0 0 3px color-mix(in srgb, ${a.primaryColor} 18%, transparent);
        }
        .send {
          min-width: ${config.sendButton === 'text' ? '72px' : '44px'};
          height: 44px;
          border: 0;
          border-radius: ${config.sendButton === 'square' ? `${Math.max(12, radiusPx - 5)}px` : '999px'};
          background: ${a.primaryColor};
          color: #fff;
          cursor: pointer;
          font-weight: 800;
        }
        .send:disabled {
          cursor: default;
          opacity: .48;
        }
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
          width: 5px;
          height: 5px;
          border-radius: 50%;
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
        <button class="launcher ${cssEscape(config.launcher)}" type="button" data-action="open">
          <span>${escapeHtml(glyph)}</span>
          ${config.launcher === 'pill-label' ? `<strong>${text(locale, 'اسأل SiteAware', 'Ask SiteAware')}</strong>` : ''}
        </button>
        <section class="dock" aria-label="SiteAware design preview">
          <header class="header">
            <div class="brand">
              <div class="mark">${escapeHtml(glyph)}</div>
              <div class="copy">
                <strong>${escapeHtml(name)}</strong>
                <span>${text(locale, 'مساعد معاينة رسمي', 'Official preview assistant')}</span>
              </div>
            </div>
            <button class="icon-btn" type="button" data-action="close">×</button>
          </header>
          <main class="messages" aria-live="polite">${messagesMarkup}</main>
          <div class="typing"><i></i><i></i><i></i><span>${text(locale, 'يكتب...', 'Thinking...')}</span></div>
          <p class="error">${escapeHtml(state.lastError)}</p>
          <form class="composer">
            <input value="${escapeHtml(state.inputValue)}" placeholder="${text(locale, 'اكتب سؤال معاينة...', 'Ask a preview question...')}" />
            <button class="send" type="submit" ${state.sending ? 'disabled' : ''}>${config.sendButton === 'text' ? text(locale, 'إرسال', 'Send') : '➜'}</button>
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
    shadow.querySelector('form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const question = state.inputValue.trim();
      if (!question) return;
      state.messages.push({ role: 'user', text: question });
      state.inputValue = '';
      state.sending = true;
      state.lastError = '';
      renderWidget({ previewOpen: true });
      try {
        const response = await requestPreviewReply(question, config);
        state.messages.push({
          role: 'assistant',
          text: response || text(locale, 'أنا جاهز لمعاينة التصميم والإجابة العامة بدون قراءة بيانات الصفحة الخاصة.', 'I can preview the design and answer general questions without reading private page data.'),
        });
      } catch (error) {
        state.lastError = text(locale, 'تعذر الاتصال بالمساعد الآن. أبقيت المحادثة كمعاينة تصميم.', 'Assistant connection failed. The conversation remains in design preview mode.');
        state.messages.push({
          role: 'assistant',
          text: text(locale, 'الاتصال بالذكاء غير متاح الآن، لكن تغييرات التصميم ستبقى مباشرة على الصفحة.', 'AI is unavailable right now, but design changes still update live on the page.'),
        });
      } finally {
        state.sending = false;
        renderWidget({ previewOpen: true });
      }
    });
  }

  function launcherBackground(launcher, a) {
    if (['glass-launcher', 'soft-glass', 'liquid-launcher'].includes(launcher)) return `color-mix(in srgb, ${a.surfaceColor} 76%, transparent)`;
    if (['floating-orb', 'ai-orb'].includes(launcher)) return `radial-gradient(circle at 30% 20%, #fff, ${a.primaryColor})`;
    if (['minimal-outline', 'minimal-floating'].includes(launcher)) return a.surfaceColor;
    return `linear-gradient(135deg, ${a.surfaceColor}, color-mix(in srgb, ${a.primaryColor} 12%, ${a.surfaceColor}))`;
  }

  function shellBackground(shell, a) {
    if (['liquid-glass', 'soft-glass-shell'].includes(shell)) return `linear-gradient(145deg, color-mix(in srgb, ${a.surfaceColor} 78%, transparent), color-mix(in srgb, ${a.backgroundColor} 68%, transparent))`;
    if (['gemini-glow', 'premium-dark'].includes(shell)) return `radial-gradient(circle at 18% 0%, color-mix(in srgb, ${a.primaryColor} 24%, transparent), transparent 38%), ${a.backgroundColor}`;
    if (shell === 'claude-editorial') return `linear-gradient(180deg, ${a.surfaceColor}, color-mix(in srgb, ${a.surfaceColor} 90%, #f4efe8))`;
    return a.backgroundColor;
  }

  function headerBackground(shell, a) {
    if (['copilot-dock', 'compact-copilot'].includes(shell)) return `linear-gradient(135deg, ${a.primaryColor}, color-mix(in srgb, ${a.primaryColor} 72%, #111827))`;
    if (['chatgpt-minimal', 'minimal-saas', 'native-card'].includes(shell)) return a.surfaceColor;
    return `color-mix(in srgb, ${a.surfaceColor} 84%, transparent)`;
  }

  function composerBackground(inputBar, a) {
    if (inputBar === 'glass') return `color-mix(in srgb, ${a.surfaceColor} 68%, transparent)`;
    return a.backgroundColor;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function requestPreviewReply(question, config) {
    const response = await chrome.runtime.sendMessage({
      type: 'SITEAWARE_PREVIEW_CHAT',
      payload: {
        locale: config.locale,
        site: { name: location.hostname, vibe: 'design preview' },
        config: {
          assistantIcon: config.assistantIcon,
          launcher: config.launcher,
          chatShell: config.chatShell,
        },
        conversation: state.messages.slice(-8),
        composer: question,
      },
    });
    if (!response?.ok) {
      throw new Error(response?.message || 'Preview assistant unavailable');
    }
    return response.reply;
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
