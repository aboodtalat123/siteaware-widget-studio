if (!globalThis.__SITEAWARE_WIDGET_STUDIO_LOADED__) {
  globalThis.__SITEAWARE_WIDGET_STUDIO_LOADED__ = true;

  const HOST_ID = 'siteaware-preview-root';
  const ROOT_CLASS = 'siteaware-preview-widget';
  const DEFAULT_TOKENS = {
    background: '#0f172a',
    surface: '#111827',
    surfaceSecondary: '#172033',
    text: '#f8fbff',
    mutedText: '#a9b5cc',
    primary: '#7cc8ff',
    primaryText: '#06111e',
    secondary: '#7cc8ff',
    accent: '#7cc8ff',
    border: 'rgba(255, 255, 255, 0.08)',
    assistantBubble: 'rgba(255, 255, 255, 0.06)',
    assistantText: '#f8fbff',
    userBubble: 'rgba(124, 200, 255, 0.18)',
    userText: '#06111e',
    link: '#7cc8ff',
    focusRing: '#7cc8ff',
    success: '#75e6b3',
    warning: '#f7c76d',
    danger: '#f28d9e',
    overlay: 'rgba(2, 4, 11, 0.48)',
    spotlightRing: '#7cc8ff',
    spotlightGlow: '#8fd4ff',
    tooltipBackground: '#172033',
    tooltipText: '#f8fbff',
    shadow: '0 28px 64px rgba(0,0,0,0.42)',
  };

  const enginePromise = import(chrome.runtime.getURL('shared/theme-engine.js'));
  const conversationPromise = import(chrome.runtime.getURL('shared/mock-conversation.js'));

  const state = {
    host: null,
    shadow: null,
    theme: { tokens: DEFAULT_TOKENS },
    snapshot: null,
    locale: 'en',
    rtl: false,
    minimized: false,
    messages: [],
    suggestions: [],
    mode: 'welcome',
    inputValue: '',
    targetElement: null,
    targetMetadata: null,
    picker: {
      active: false,
      overlay: null,
      ring: null,
      label: null,
      hovered: null,
      listener: null,
      previousCursor: '',
    },
    spotlight: {
      overlay: null,
      ring: null,
      label: null,
      element: null,
      reposition: null,
    },
  };

  const nowId = (() => {
    let index = 0;
    return (prefix) => `${prefix}-${Date.now().toString(36)}-${(index += 1).toString(36)}`;
  })();

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function currentThemeTokens() {
    return state.theme?.tokens || DEFAULT_TOKENS;
  }

  function ensureHost() {
    if (state.host?.isConnected && state.shadow) {
      return state.shadow;
    }

    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement('div');
      host.id = HOST_ID;
      host.style.position = 'fixed';
      host.style.right = '20px';
      host.style.bottom = '20px';
      host.style.zIndex = '2147483647';
      host.style.pointerEvents = 'none';
      document.documentElement.appendChild(host);
    }

    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    state.host = host;
    state.shadow = shadow;
    return shadow;
  }

  function removeWidget() {
    clearPicker();
    clearSpotlight();
    if (state.host) {
      state.host.remove();
    }
    state.host = null;
    state.shadow = null;
  }

  function normalizeMessage(message) {
    return {
      id: nowId('message'),
      role: message.role,
      text: message.text,
      sources: message.sources || [],
      action: message.action || '',
      status: message.status || 'done',
    };
  }

  async function loadModules() {
    const [engine, conversation] = await Promise.all([enginePromise, conversationPromise]);
    return { engine, conversation };
  }

  function setInitialConversation(locale, conversation) {
    const welcome = conversation.createWelcomeState(locale);
    state.locale = locale;
    state.rtl = Boolean(welcome.rtl);
    state.mode = 'welcome';
    state.suggestions = welcome.suggestedQuestions || [];
    state.messages = [normalizeMessage({ role: 'assistant', text: welcome.message })];
  }

  async function prepareConversation(question) {
    const { conversation } = await loadModules();
    const locale = conversation.detectLocale(question || document.documentElement.lang || (document.documentElement.dir === 'rtl' ? 'ar' : 'en'));
    if (!state.messages.length || !question) {
      setInitialConversation(locale, conversation);
      return;
    }

    const response = conversation.resolveConversation(question, {
      snapshot: state.snapshot,
      target: state.targetMetadata,
    });
    state.locale = locale;
    state.rtl = Boolean(response.rtl);
    state.mode = response.mode;
    state.suggestions = response.suggestions || [];
    state.messages.push(normalizeMessage({ role: 'assistant', text: response.answer, sources: response.sources || [], action: response.targetBehavior || '' }));
  }

  function conversationSourcesHtml(message) {
    if (!message.sources?.length) {
      return '';
    }

    return `
      <div class="source-block">
        <div class="source-label">Sources</div>
        <div class="source-pills">
          ${message.sources.map((source, index) => `<span class="source-pill">${index + 1}. ${escapeHtml(source)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  function renderWidget(config = {}) {
    const shadow = ensureHost();
    if (typeof config.open === 'boolean') {
      state.minimized = !config.open;
    } else if (typeof config.minimized === 'boolean') {
      state.minimized = config.minimized;
    }

    const tokens = config.theme?.tokens || config.tokens || currentThemeTokens();
    const title = config.title || 'SiteAware Preview';
    const fontFamily = config.fontFamily || config.theme?.fontFamily || '"Space Grotesk", system-ui, sans-serif';
    const isMinimized = Boolean(state.minimized);

    if (config.theme) {
      state.theme = config.theme;
    } else if (config.tokens) {
      state.theme = { tokens: config.tokens };
    }

    if (config.snapshot) {
      state.snapshot = config.snapshot;
    }

    if (config.resetConversation || (!state.messages.length && !config.preserveConversation)) {
      const baseLocale = config.locale || state.locale || (document.documentElement.dir === 'rtl' ? 'ar' : 'en');
      void loadModules().then(({ conversation }) => {
        if (!state.messages.length) {
          setInitialConversation(baseLocale, conversation);
          renderWidget({ minimized: state.minimized, preserveConversation: true });
        }
      });
    }

    const headerMeta = state.mode && state.mode !== 'welcome' ? state.mode : (state.rtl ? 'rtl' : 'ready');
    const messagesMarkup = state.messages
      .map((message) => `
        <div class="message-row ${message.role}-row">
          ${message.role === 'assistant' ? '<div class="message-avatar">AI</div>' : ''}
          <div class="message-card ${message.role}-message">
            <div class="message-meta">
              <span>${message.role === 'assistant' ? 'SiteAware' : 'You'}</span>
              ${message.status === 'typing' ? '<span class="status-dot">typing</span>' : ''}
            </div>
            <p>${escapeHtml(message.text)}</p>
            ${conversationSourcesHtml(message)}
            ${message.action ? '<div class="action-row"><button class="cta-button" data-action="spotlight">Take me there</button></div>' : ''}
          </div>
          ${message.role === 'user' ? '<div class="message-avatar user-avatar">You</div>' : ''}
        </div>
      `)
      .join('');

    const suggestionsMarkup = state.suggestions?.length
      ? `
        <div class="suggestions">
          ${state.suggestions.map((question) => `<button type="button" class="suggestion-chip" data-question="${escapeHtml(question)}">${escapeHtml(question)}</button>`).join('')}
        </div>
      `
      : '';

    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
        }

        .${ROOT_CLASS} {
          pointer-events: auto;
          width: min(380px, calc(100vw - 28px));
          max-height: min(84vh, 760px);
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid ${tokens.border};
          background: ${tokens.surface};
          color: ${tokens.text};
          box-shadow: ${tokens.shadow};
          font-family: ${fontFamily};
          direction: ${state.rtl ? 'rtl' : 'ltr'};
        }

        .shell {
          display: grid;
          grid-template-rows: auto 1fr auto auto;
          height: ${isMinimized ? 'auto' : 'min(82vh, 720px)'};
        }

        .shell.minimized {
          grid-template-rows: auto;
          width: 320px;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          background: linear-gradient(135deg, ${tokens.surfaceSecondary}, ${tokens.surface});
          border-bottom: 1px solid ${tokens.border};
        }

        .title-wrap {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .title-mark {
          width: 36px;
          height: 36px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: ${tokens.primary};
          color: ${tokens.primaryText};
          font-weight: 700;
          flex: 0 0 auto;
        }

        .title-copy strong,
        .title-copy span {
          display: block;
        }

        .title-copy strong {
          font-size: 14px;
          line-height: 1.2;
        }

        .title-copy span {
          font-size: 11px;
          color: ${tokens.mutedText || tokens.text};
          margin-top: 2px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .pill,
        .icon-button,
        .primary-button,
        .ghost-button,
        .suggestion-chip,
        .cta-button {
          border: 0;
          border-radius: 999px;
          font: inherit;
          cursor: pointer;
        }

        .pill,
        .icon-button {
          display: inline-grid;
          place-items: center;
          width: 34px;
          height: 34px;
          background: rgba(255, 255, 255, 0.06);
          color: ${tokens.text};
        }

        .body {
          display: grid;
          gap: 14px;
          padding: 14px 16px 16px;
          background:
            radial-gradient(circle at top right, rgba(124, 200, 255, 0.08), transparent 40%),
            ${tokens.surface};
        }

        .messages {
          display: grid;
          gap: 12px;
          max-height: 44vh;
          overflow: auto;
          padding-right: 2px;
        }

        .message-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }

        .assistant-row {
          justify-content: flex-start;
        }

        .user-row {
          justify-content: flex-end;
        }

        .message-avatar {
          width: 28px;
          height: 28px;
          border-radius: 10px;
          background: ${tokens.surfaceSecondary};
          color: ${tokens.text};
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          font-size: 10px;
          font-weight: 700;
          border: 1px solid ${tokens.border};
        }

        .user-avatar {
          background: ${tokens.primary};
          color: ${tokens.primaryText};
          border-color: transparent;
        }

        .message-card {
          max-width: 82%;
          border-radius: 18px;
          padding: 12px 13px;
          border: 1px solid ${tokens.border};
          background: ${tokens.assistantBubble};
        }

        .user-message {
          background: ${tokens.userBubble};
          color: ${tokens.userText || tokens.primaryText};
        }

        .message-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          color: ${tokens.mutedText || tokens.text};
          font-size: 11px;
          margin-bottom: 6px;
        }

        .message-card p {
          margin: 0;
          line-height: 1.6;
          font-size: 13px;
          color: inherit;
          white-space: pre-wrap;
        }

        .source-block {
          margin-top: 10px;
        }

        .source-label {
          font-size: 11px;
          color: ${tokens.mutedText || tokens.text};
          margin-bottom: 6px;
        }

        .source-pills,
        .suggestions,
        .action-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .source-pill,
        .suggestion-chip {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          padding: 0 10px;
          background: rgba(255, 255, 255, 0.07);
          color: ${tokens.text};
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 11px;
        }

        .suggestion-chip {
          background: rgba(124, 200, 255, 0.1);
          border-color: rgba(124, 200, 255, 0.18);
        }

        .composer {
          display: grid;
          gap: 10px;
        }

        .composer-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
        }

        .composer input {
          width: 100%;
          min-width: 0;
          border-radius: 16px;
          border: 1px solid ${tokens.border};
          background: ${tokens.surfaceSecondary};
          color: ${tokens.text};
          padding: 12px 13px;
          outline: none;
        }

        .composer input::placeholder {
          color: ${tokens.mutedText || tokens.text};
        }

        .composer input:focus {
          border-color: ${tokens.focusRing || tokens.primary};
          box-shadow: 0 0 0 3px color-mix(in srgb, ${tokens.primary} 24%, transparent);
        }

        .cta-button {
          min-height: 34px;
          padding: 0 14px;
          color: ${tokens.primaryText};
          background: ${tokens.primary};
        }

        .primary-button {
          min-height: 34px;
          padding: 0 14px;
          color: ${tokens.primaryText};
          background: ${tokens.primary};
        }

        .ghost-button {
          min-height: 34px;
          padding: 0 12px;
          background: rgba(255, 255, 255, 0.06);
          color: ${tokens.text};
          border: 1px solid ${tokens.border};
        }

        .footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 0 16px 16px;
          color: ${tokens.mutedText || tokens.text};
          font-size: 11px;
        }

        .status-pill {
          border-radius: 999px;
          padding: 6px 10px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid ${tokens.border};
          color: ${tokens.text};
        }

        .collapsed {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
        }

        .collapsed-copy strong {
          display: block;
          margin-bottom: 2px;
          font-size: 14px;
        }

        .collapsed-copy span {
          display: block;
          color: ${tokens.mutedText || tokens.text};
          font-size: 11px;
        }
      </style>
      <div class="${ROOT_CLASS}">
        ${
          isMinimized
            ? `
        <div class="shell minimized">
                <div class="collapsed">
                  <div class="collapsed-copy">
                    <strong>${escapeHtml(title)}</strong>
                    <span>${escapeHtml(headerMeta)}</span>
                  </div>
                  <div class="header-actions">
                    <button class="pill" data-action="open" aria-label="Open widget">+</button>
                    <button class="pill" data-action="remove" aria-label="Remove widget">×</button>
                  </div>
                </div>
              </div>
            `
            : `
              <div class="shell" dir="${state.rtl ? 'rtl' : 'ltr'}">
                <div class="header">
                  <div class="title-wrap">
                    <div class="title-mark">S</div>
                    <div class="title-copy">
                      <strong>${escapeHtml(title)}</strong>
                      <span>${escapeHtml(headerMeta)}</span>
                    </div>
                  </div>
                  <div class="header-actions">
                    <button class="icon-button" data-action="minimize" aria-label="Minimize widget">−</button>
                    <button class="icon-button" data-action="remove" aria-label="Remove widget">×</button>
                  </div>
                </div>

                <div class="body">
                  <div class="messages" aria-live="polite">
                    ${messagesMarkup}
                  </div>
                  ${suggestionsMarkup}
                  <div class="composer">
                    <div class="composer-row">
                      <input id="siteaware-input" value="${escapeHtml(state.inputValue)}" placeholder="${state.rtl ? 'اكتب سؤالك...' : 'Ask a question about this site...'}" />
                      <button class="primary-button" data-action="send">Send</button>
                    </div>
                  </div>
                </div>

                <div class="footer">
                  <span>${escapeHtml(state.snapshot?.source?.hostname || location.hostname || 'local page')}</span>
                  <span class="status-pill">${escapeHtml(state.mode)}</span>
                </div>
              </div>
            `
        }
      </div>
    `;

    const input = shadow.getElementById('siteaware-input');
    if (input) {
      input.value = state.inputValue;
      input.addEventListener('input', (event) => {
        state.inputValue = event.target.value;
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          void sendCurrentQuestion();
        }
      });
    }

    shadow.querySelectorAll('[data-action="send"]').forEach((button) => {
      button.addEventListener('click', () => void sendCurrentQuestion());
    });
    shadow.querySelectorAll('[data-action="minimize"]').forEach((button) => {
      button.addEventListener('click', () => {
        state.minimized = true;
        renderWidget({ ...config, minimized: true });
      });
    });
    shadow.querySelectorAll('[data-action="open"]').forEach((button) => {
      button.addEventListener('click', () => {
        state.minimized = false;
        renderWidget({ ...config, minimized: false, open: true });
      });
    });
    shadow.querySelectorAll('[data-action="remove"]').forEach((button) => {
      button.addEventListener('click', () => removeWidget());
    });
    shadow.querySelectorAll('[data-action="spotlight"]').forEach((button) => {
      button.addEventListener('click', () => {
        if (state.targetElement) {
          spotlightElement(state.targetElement);
        }
      });
    });
    shadow.querySelectorAll('.suggestion-chip').forEach((button) => {
      button.addEventListener('click', () => {
        const question = button.getAttribute('data-question') || '';
        if (question) {
          state.inputValue = question;
          void askQuestion(question);
        }
      });
    });
  }

  function clearPicker() {
    const picker = state.picker;
    if (picker.hovered) {
      picker.hovered.style.outline = '';
      picker.hovered.style.outlineOffset = '';
      picker.hovered = null;
    }
    if (picker.listener) {
      document.removeEventListener('pointermove', picker.listener, true);
      document.removeEventListener('pointerdown', picker.listener, true);
      document.removeEventListener('keydown', picker.listener, true);
      picker.listener = null;
    }
    if (picker.overlay) {
      picker.overlay.remove();
      picker.overlay = null;
    }
    if (picker.ring) {
      picker.ring.remove();
      picker.ring = null;
    }
    if (picker.label) {
      picker.label.remove();
      picker.label = null;
    }
    picker.active = false;
    document.body.style.cursor = picker.previousCursor || '';
    document.documentElement.classList.remove('siteaware-target-picking');
  }

  function updateHighlightBox(box, label, element) {
    const rect = element.getBoundingClientRect();
    const top = Math.max(rect.top - 10, 8);
    const left = Math.max(rect.left - 10, 8);
    box.style.top = `${top}px`;
    box.style.left = `${left}px`;
    box.style.width = `${Math.max(rect.width + 20, 18)}px`;
    box.style.height = `${Math.max(rect.height + 20, 18)}px`;

    if (label) {
      const labelY = top - 34 < 8 ? top + rect.height + 16 : top - 34;
      label.style.top = `${labelY}px`;
      label.style.left = `${left}px`;
      label.textContent = element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 80) || element.tagName.toLowerCase();
    }
  }

  function spotStyle() {
    const tokens = currentThemeTokens();
    return {
      ring: tokens.spotlightRing || tokens.primary || '#7cc8ff',
      glow: tokens.spotlightGlow || tokens.primary || '#7cc8ff',
      overlay: tokens.overlay || 'rgba(2, 4, 11, 0.48)',
      tooltipBg: tokens.tooltipBackground || tokens.surfaceSecondary || '#172033',
      tooltipText: tokens.tooltipText || tokens.text || '#f8fbff',
    };
  }

  function clearSpotlight() {
    if (state.spotlight.reposition) {
      window.removeEventListener('scroll', state.spotlight.reposition, true);
      window.removeEventListener('resize', state.spotlight.reposition, true);
      state.spotlight.reposition = null;
    }
    if (state.spotlight.overlay) {
      state.spotlight.overlay.remove();
      state.spotlight.overlay = null;
    }
    if (state.spotlight.ring) {
      state.spotlight.ring.remove();
      state.spotlight.ring = null;
    }
    if (state.spotlight.label) {
      state.spotlight.label.remove();
      state.spotlight.label = null;
    }
    state.spotlight.element = null;
  }

  function spotlightElement(element) {
    clearSpotlight();
    if (!(element instanceof HTMLElement)) {
      return;
    }

    const styles = spotStyle();
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.zIndex = '2147483646';
    overlay.style.pointerEvents = 'none';
    overlay.style.background = styles.overlay;

    const ring = document.createElement('div');
    ring.style.position = 'fixed';
    ring.style.border = `2px solid ${styles.ring}`;
    ring.style.borderRadius = '18px';
    ring.style.boxShadow = `0 0 0 9999px ${styles.overlay}, 0 0 0 8px color-mix(in srgb, ${styles.glow} 30%, transparent)`;
    ring.style.pointerEvents = 'none';
    ring.style.zIndex = '2147483647';

    const label = document.createElement('div');
    label.style.position = 'fixed';
    label.style.maxWidth = '260px';
    label.style.padding = '8px 10px';
    label.style.borderRadius = '12px';
    label.style.background = styles.tooltipBg;
    label.style.color = styles.tooltipText;
    label.style.border = `1px solid ${styles.ring}`;
    label.style.font = '12px/1.4 system-ui, sans-serif';
    label.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.24)';
    label.style.zIndex = '2147483647';
    label.style.pointerEvents = 'none';

    const update = () => updateHighlightBox(ring, label, element);
    update();

    document.documentElement.appendChild(overlay);
    document.documentElement.appendChild(ring);
    document.documentElement.appendChild(label);

    state.spotlight.overlay = overlay;
    state.spotlight.ring = ring;
    state.spotlight.label = label;
    state.spotlight.element = element;
    state.spotlight.reposition = update;

    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update, true);
    setTimeout(() => {
      if (state.spotlight.ring === ring) {
        ring.style.transition = 'opacity 220ms ease, transform 220ms ease';
        ring.style.transform = 'scale(1.01)';
      }
    }, 0);
  }

  function startTargetPicker() {
    clearPicker();
    clearSpotlight();

    const picker = state.picker;
    picker.active = true;
    picker.previousCursor = document.body.style.cursor || '';
    document.body.style.cursor = 'crosshair';
    document.documentElement.classList.add('siteaware-target-picking');

    picker.overlay = document.createElement('div');
    picker.overlay.style.position = 'fixed';
    picker.overlay.style.inset = '0';
    picker.overlay.style.zIndex = '2147483645';
    picker.overlay.style.pointerEvents = 'none';
    document.documentElement.appendChild(picker.overlay);

    picker.ring = document.createElement('div');
    picker.ring.style.position = 'fixed';
    picker.ring.style.border = `2px solid ${currentThemeTokens().primary}`;
    picker.ring.style.borderRadius = '14px';
    picker.ring.style.boxShadow = '0 0 0 3px rgba(124, 200, 255, 0.18)';
    picker.ring.style.pointerEvents = 'none';
    picker.ring.style.zIndex = '2147483646';
    picker.ring.style.display = 'none';
    document.documentElement.appendChild(picker.ring);

    picker.label = document.createElement('div');
    picker.label.style.position = 'fixed';
    picker.label.style.padding = '8px 10px';
    picker.label.style.borderRadius = '12px';
    picker.label.style.background = currentThemeTokens().tooltipBackground || '#172033';
    picker.label.style.color = currentThemeTokens().tooltipText || '#f8fbff';
    picker.label.style.border = `1px solid ${currentThemeTokens().primary}`;
    picker.label.style.font = '12px/1.4 system-ui, sans-serif';
    picker.label.style.zIndex = '2147483646';
    picker.label.style.pointerEvents = 'none';
    picker.label.style.display = 'none';
    document.documentElement.appendChild(picker.label);

    const updatePicker = (element) => {
      if (!element) {
        picker.ring.style.display = 'none';
        picker.label.style.display = 'none';
        return;
      }
      const rect = element.getBoundingClientRect();
      picker.ring.style.display = 'block';
      picker.ring.style.top = `${Math.max(rect.top - 8, 6)}px`;
      picker.ring.style.left = `${Math.max(rect.left - 8, 6)}px`;
      picker.ring.style.width = `${Math.max(rect.width + 16, 12)}px`;
      picker.ring.style.height = `${Math.max(rect.height + 16, 12)}px`;
      picker.label.style.display = 'block';
      picker.label.style.left = `${Math.max(rect.left, 8)}px`;
      picker.label.style.top = `${Math.max(rect.top - 34, 8)}px`;
      picker.label.textContent = element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 72) || element.tagName.toLowerCase();
    };

    picker.listener = (event) => {
      if (event.type === 'keydown') {
        if (event.key === 'Escape') {
          clearPicker();
          chrome.runtime.sendMessage({ type: 'SITEAWARE_TARGET_PICKER_CANCELLED' });
        }
        return;
      }

      const element = document.elementFromPoint(event.clientX, event.clientY);
      if (!(element instanceof HTMLElement) || element.closest(`#${HOST_ID}`)) {
        return;
      }

      if (event.type === 'pointermove') {
        if (picker.hovered && picker.hovered !== element) {
          picker.hovered.style.outline = '';
          picker.hovered.style.outlineOffset = '';
        }
        picker.hovered = element;
        element.style.outline = `2px solid ${currentThemeTokens().primary}`;
        element.style.outlineOffset = '2px';
        updatePicker(element);
        return;
      }

      if (event.type === 'pointerdown') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        const rect = element.getBoundingClientRect();
        const metadata = {
          tag: element.tagName.toLowerCase(),
          role: element.getAttribute('role') || undefined,
          name: element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 96) || undefined,
          id: element.id || undefined,
          testId: element.getAttribute('data-testid') || undefined,
          href: element instanceof HTMLAnchorElement ? element.href : undefined,
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          colors: {
            background: getComputedStyle(element).backgroundColor,
            color: getComputedStyle(element).color,
            border: getComputedStyle(element).borderColor,
          },
        };
        state.targetElement = element;
        state.targetMetadata = metadata;
        chrome.runtime.sendMessage({ type: 'SITEAWARE_TARGET_SELECTED', metadata });
        spotlightElement(element);
        clearPicker();
        renderWidget({ minimized: state.minimized, preserveConversation: true });
        return;
      }
    };

    document.addEventListener('pointermove', picker.listener, true);
    document.addEventListener('pointerdown', picker.listener, true);
    document.addEventListener('keydown', picker.listener, true);
  }

  function collectAssistantMessage(question, response) {
    const next = {
      role: 'assistant',
      text: response.answer,
      sources: response.sources || [],
      action: response.targetBehavior && response.targetBehavior !== 'none' ? response.targetBehavior : '',
    };
    state.messages.push(normalizeMessage(next));
    state.suggestions = response.suggestions || [];
    state.mode = response.mode || state.mode;
    state.rtl = Boolean(response.rtl || state.rtl);
  }

  async function askQuestion(question) {
    const trimmed = String(question || '').trim();
    if (!trimmed) {
      return;
    }

    if (!state.messages.length) {
      const { conversation } = await loadModules();
      setInitialConversation(conversation.detectLocale(trimmed), conversation);
    }

    state.messages.push(normalizeMessage({ role: 'user', text: trimmed }));
    state.inputValue = '';
    renderWidget({ minimized: state.minimized, preserveConversation: true });

    const { conversation } = await loadModules();
    const response = conversation.resolveConversation(trimmed, {
      snapshot: state.snapshot,
      target: state.targetMetadata,
    });
    collectAssistantMessage(trimmed, response);
    renderWidget({ minimized: state.minimized, preserveConversation: true });
  }

  async function sendCurrentQuestion() {
    await askQuestion(state.inputValue);
  }

  async function scanPage() {
    const engine = await enginePromise;
    const snapshot = engine.scanPageStyle(document);
    const recommendations = engine.generateRecommendations(snapshot);
    state.snapshot = snapshot;
    chrome.runtime.sendMessage({
      type: 'SITEAWARE_SCAN_RESULT',
      snapshot,
      recommendations,
    });
    return { snapshot, recommendations };
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'SITEAWARE_RENDER_WIDGET') {
      if (message.config?.open) {
        state.minimized = false;
      }
      if (message.config?.minimized) {
        state.minimized = true;
      }
      if (message.config?.theme) {
        state.theme = message.config.theme;
      }
      if (message.config?.snapshot) {
        state.snapshot = message.config.snapshot;
      }
      if (message.config?.locale) {
        state.locale = message.config.locale;
      }
      if (message.config?.resetConversation) {
        state.messages = [];
      }
      renderWidget(message.config || {});
      sendResponse?.({ ok: true });
      return true;
    }

    if (message?.type === 'SITEAWARE_REMOVE_WIDGET') {
      removeWidget();
      sendResponse?.({ ok: true });
      return true;
    }

    if (message?.type === 'SITEAWARE_SCAN_PAGE') {
      scanPage()
        .then(({ snapshot, recommendations }) => sendResponse?.({ ok: true, snapshot, recommendations }))
        .catch((error) => sendResponse?.({ ok: false, error: error.message }));
      return true;
    }

    if (message?.type === 'SITEAWARE_AUTO_MATCH') {
      loadModules()
        .then(async ({ engine }) => {
          const snapshot = engine.scanPageStyle(document);
          const recommendations = engine.generateRecommendations(snapshot);
          const selected = recommendations.find((item) => item.id === message.strategy) || recommendations[0];
          state.snapshot = snapshot;
          state.theme = selected;
          renderWidget({ theme: selected, open: true, preserveConversation: true, snapshot });
          sendResponse?.({ ok: true, snapshot, recommendations, selected });
        })
        .catch((error) => sendResponse?.({ ok: false, error: error.message }));
      return true;
    }

    if (message?.type === 'SITEAWARE_START_TARGET_PICKER') {
      startTargetPicker();
      sendResponse?.({ ok: true });
      return true;
    }

    if (message?.type === 'SITEAWARE_CLEAR_TARGET') {
      state.targetElement = null;
      state.targetMetadata = null;
      clearPicker();
      clearSpotlight();
      sendResponse?.({ ok: true });
      return true;
    }

    if (message?.type === 'SITEAWARE_RENDER_DEMO') {
      renderWidget(message.config || {});
      sendResponse?.({ ok: true });
      return true;
    }

    return undefined;
  });

  if (!state.messages.length) {
    void loadModules().then(({ conversation }) => {
      if (!state.messages.length) {
        setInitialConversation(document.documentElement.lang || (document.documentElement.dir === 'rtl' ? 'ar' : 'en'), conversation);
      }
    });
  }
}
