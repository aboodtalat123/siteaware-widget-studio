if (!globalThis.__SITEAWARE_WIDGET_STUDIO_LOADED__) {
  globalThis.__SITEAWARE_WIDGET_STUDIO_LOADED__ = true;

  const HOST_ID = 'siteaware-preview-root';
  const ROOT_CLASS = 'siteaware-live-preview';

  const catalogPromise = import(chrome.runtime.getURL('shared/widget-catalog.js'));

  const state = {
    host: null,
    shadow: null,
    config: null,
    messages: [],
    inputValue: '',
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
    const radiusPx = { sm: 10, md: 14, lg: 20, xl: 26 }[a.radius] || 20;
    const launcherSize = { sm: 46, md: 58, lg: 70 }[a.launcherSize] || 58;
    const shadowOpacity = Math.round(a.shadowStrength * 34) / 100;
    const dir = config.direction === 'ltr' ? 'ltr' : 'rtl';
    const locale = config.locale === 'en' ? 'en' : 'ar';

    const messagesMarkup = state.messages.map((message) => `
      <div class="message-row ${message.role}">
        <div class="bubble ${message.role === 'assistant' ? config.assistantMessage : config.userMessage}">
          <span class="meta">${message.role === 'assistant' ? 'SiteAware' : text(locale, 'أنت', 'You')}</span>
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
          border: 1px solid color-mix(in srgb, ${a.primaryColor} 28%, ${a.borderColor});
          border-radius: ${config.launcher === 'vertical-edge-tab' ? '18px' : '999px'};
          display: ${config.previewOpen ? 'none' : 'grid'};
          place-items: center;
          gap: 6px;
          background: ${launcherBackground(config.launcher, a)};
          color: ${a.textColor};
          box-shadow: 0 16px 42px rgb(15 23 42 / ${shadowOpacity});
          cursor: pointer;
          padding: 0;
          min-width: ${config.launcher === 'pill-label' ? '126px' : `${launcherSize}px`};
        }
        .launcher.vertical-edge-tab {
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
          backdrop-filter: ${config.chatShell === 'liquid-glass' ? 'blur(26px) saturate(1.18)' : 'none'};
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
          box-shadow: 0 10px 30px color-mix(in srgb, ${a.primaryColor} 26%, transparent);
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
          background: ${config.chatShell === 'chatgpt-minimal' ? a.surfaceColor : 'transparent'};
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
                <strong>${text(locale, 'مساعد SiteAware', 'SiteAware Assistant')}</strong>
                <span>${text(locale, 'معاينة تصميم مباشرة', 'Live design preview')}</span>
              </div>
            </div>
            <button class="icon-btn" type="button" data-action="close">×</button>
          </header>
          <main class="messages" aria-live="polite">${messagesMarkup}</main>
          <form class="composer">
            <input value="${escapeHtml(state.inputValue)}" placeholder="${text(locale, 'اكتب سؤال معاينة...', 'Ask a preview question...')}" />
            <button class="send" type="submit">${config.sendButton === 'text' ? text(locale, 'إرسال', 'Send') : '➜'}</button>
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
    shadow.querySelector('form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const question = state.inputValue.trim();
      if (!question) return;
      state.messages.push({ role: 'user', text: question });
      state.inputValue = '';
      state.messages.push({
        role: 'assistant',
        text: text(locale, 'هذه إجابة معاينة للتصميم. في مرحلة لاحقة يتم ربط مساعد SiteAware الحقيقي.', 'This is a design-preview reply. The real SiteAware assistant connects in a later milestone.'),
      });
      renderWidget({ previewOpen: true });
    });
  }

  function launcherBackground(launcher, a) {
    if (launcher === 'glass-launcher') return `color-mix(in srgb, ${a.surfaceColor} 72%, transparent)`;
    if (launcher === 'floating-orb') return `radial-gradient(circle at 30% 20%, #fff, ${a.primaryColor})`;
    if (launcher === 'minimal-outline') return a.surfaceColor;
    return `linear-gradient(135deg, ${a.surfaceColor}, color-mix(in srgb, ${a.primaryColor} 12%, ${a.surfaceColor}))`;
  }

  function shellBackground(shell, a) {
    if (shell === 'liquid-glass') return `linear-gradient(145deg, color-mix(in srgb, ${a.surfaceColor} 72%, transparent), color-mix(in srgb, ${a.backgroundColor} 62%, transparent))`;
    if (shell === 'gemini-glow') return `radial-gradient(circle at 18% 0%, color-mix(in srgb, ${a.primaryColor} 34%, transparent), transparent 38%), ${a.backgroundColor}`;
    if (shell === 'claude-editorial') return `linear-gradient(180deg, ${a.surfaceColor}, color-mix(in srgb, ${a.surfaceColor} 90%, #f4efe8))`;
    return a.backgroundColor;
  }

  function headerBackground(shell, a) {
    if (shell === 'copilot-dock') return `linear-gradient(135deg, ${a.primaryColor}, color-mix(in srgb, ${a.primaryColor} 72%, #111827))`;
    if (shell === 'chatgpt-minimal') return a.surfaceColor;
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

  function normalizeColor(value) {
    const text = String(value || '').trim();
    if (!text || /transparent|rgba\(0,\s*0,\s*0,\s*0\)/i.test(text)) return '';
    return text;
  }

  function scanPageStyle() {
    const root = document.documentElement;
    const body = document.body || root;
    const sampleSelectors = [
      'header', 'nav', 'main', 'section', 'article', 'aside', 'footer',
      'button', 'a', 'input', 'select', 'textarea', '[role="button"]',
      '.card', '[class*="card"]', '[class*="panel"]', '[class*="nav"]',
    ];
    const samples = [root, body, ...document.querySelectorAll(sampleSelectors.join(','))]
      .filter((element) => element instanceof HTMLElement)
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      })
      .slice(0, 90);

    const colors = new Map();
    const fonts = new Map();
    const radii = [];
    const shadows = [];
    const direction = root.dir || body.dir || getComputedStyle(body).direction || 'ltr';
    const bodyStyle = getComputedStyle(body);

    for (const element of samples) {
      const style = getComputedStyle(element);
      [
        style.color,
        style.backgroundColor,
        style.borderTopColor,
        style.borderRightColor,
        style.borderBottomColor,
        style.borderLeftColor,
      ].map(normalizeColor).filter(Boolean).forEach((color) => {
        colors.set(color, (colors.get(color) || 0) + 1);
      });
      if (style.fontFamily) fonts.set(style.fontFamily, (fonts.get(style.fontFamily) || 0) + 1);
      const radius = Number.parseFloat(style.borderRadius || '0');
      if (Number.isFinite(radius) && radius > 0) radii.push(radius);
      if (style.boxShadow && style.boxShadow !== 'none' && shadows.length < 4) shadows.push(style.boxShadow);
    }

    const rankedColors = [...colors.entries()].sort((a, b) => b[1] - a[1]).map(([color]) => color);
    const rankedFonts = [...fonts.entries()].sort((a, b) => b[1] - a[1]).map(([font]) => font);
    const background = normalizeColor(bodyStyle.backgroundColor) || normalizeColor(getComputedStyle(root).backgroundColor) || '#ffffff';
    const averageRadius = radii.length ? Math.round(radii.reduce((sum, value) => sum + value, 0) / radii.length) : 12;

    return {
      source: {
        hostname: location.hostname,
        origin: location.origin,
      },
      direction: direction === 'rtl' ? 'rtl' : 'ltr',
      themeMode: isDarkColor(background) ? 'dark' : 'light',
      background,
      surface: rankedColors.find((color) => color !== background) || '#ffffff',
      text: rankedColors[0] || '#111827',
      mutedText: rankedColors[2] || '#667085',
      border: rankedColors[3] || '#d8dee9',
      primary: rankedColors.find((color) => !isGrayish(color) && !isTooLightOrDark(color)) || '#2563eb',
      brandColors: rankedColors.filter((color) => !isGrayish(color)).slice(0, 5),
      fontFamilies: rankedFonts.slice(0, 4),
      radius: averageRadius,
      shadows,
      evidenceCounts: {
        sampledElements: samples.length,
        colors: rankedColors.length,
        fonts: rankedFonts.length,
        radii: radii.length,
      },
    };
  }

  function parseRgb(value) {
    const match = String(value).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!match) return null;
    return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
  }

  function luminance(value) {
    const rgb = parseRgb(value);
    if (!rgb) return 1;
    return (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  }

  function isDarkColor(value) {
    return luminance(value) < 0.46;
  }

  function isGrayish(value) {
    const rgb = parseRgb(value);
    if (!rgb) return false;
    return Math.max(rgb.r, rgb.g, rgb.b) - Math.min(rgb.r, rgb.g, rgb.b) < 24;
  }

  function isTooLightOrDark(value) {
    const luma = luminance(value);
    return luma < 0.06 || luma > 0.94;
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
      try {
        const profile = scanPageStyle();
        sendResponse?.({ ok: true, profile });
      } catch (error) {
        sendResponse?.({ ok: false, error: error.message });
      }
      return true;
    }
    return undefined;
  });
}
