import { FormEvent, KeyboardEvent, useMemo, useReducer, useState, type ReactNode, type CSSProperties } from 'react';
import {
  applyThemePatch,
  getDefaultWidgetTheme,
  suggestThemeFromDesignProfile,
  validateProviderThemePatch,
  type WidgetTheme,
} from '../../design-engine/themeFoundation';
import { createMockStudioAIProvider } from '../ai/mockProvider';
import { resolveSafeIcon, validateIconIntent } from '../design/iconCatalog';
import { sampleDesignProfiles, type SampleProfileId } from '../design/sampleProfiles';
import { createInitialStudioV2State, studioV2Reducer } from '../state/studioState';
import type { StudioLocale, StudioMode, StudioMessage } from '../types';
import '../styles/studioV2.css';

const modes: Array<{ id: StudioMode; ar: string; en: string }> = [
  { id: 'assist', ar: 'مساعدة', en: 'Assist' },
  { id: 'design', ar: 'تصميم', en: 'Design' },
  { id: 'learn', ar: 'تعلّم', en: 'Learn' },
  { id: 'brain', ar: 'العقل', en: 'Brain' },
];

const quickPrompts = {
  ar: ['خلي المساعد نفس ألوان الموقع', 'خلي زر المساعد دائري أكثر', 'اعمل التصميم مناسب لصيدلية', 'خلّي الهيدر أهدأ'],
  en: ['Match the site colors', 'Make the launcher rounder', 'Make it suitable for a pharmacy', 'Make the header calmer'],
};

function t(locale: StudioLocale, ar: string, en: string) {
  return locale === 'ar' ? ar : en;
}

export function StudioV2PreviewApp() {
  const [state, dispatch] = useReducer(studioV2Reducer, undefined, () => createInitialStudioV2State('ar'));
  const [composer, setComposer] = useState('');
  const provider = useMemo(() => createMockStudioAIProvider(), []);
  const comparisonTheme = state.proposed?.proposedTheme ?? state.currentTheme;
  const currentIcon = resolveSafeIcon({ kind: 'icon', intent: 'assistant', style: 'rounded-outline' });

  async function submitPrompt(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    dispatch({ type: 'SET_LOADING', loading: true });
    setComposer('');

    const intent = await provider.classifyIntent({ category: 'CHAT', prompt: trimmed, locale: state.locale, mode: state.mode });
    if (intent.category === 'ICON_INTENT') {
      const icon = validateIconIntent(intent.icon);
      if (!icon.ok) {
        dispatch({ type: 'SET_ERROR', error: icon.error });
      } else {
        const resolved = resolveSafeIcon(icon.value);
        dispatch({
          type: 'PROPOSE_PATCH',
          prompt: trimmed,
          patch: { launcher: { borderRadius: 999, shadow: 'soft' } },
          summary: t(state.locale, `تم حل الأيقونة محليًا: ${resolved.label}`, `Icon resolved locally: ${resolved.label}`),
        });
      }
      return;
    }

    if (state.mode === 'design' || intent.category === 'DESIGN_PATCH') {
      const result = await validateProviderThemePatch(
        {
          id: provider.id,
          label: provider.label,
          suggestThemePatch: () =>
            provider.design({
              category: 'DESIGN_PATCH',
              prompt: trimmed,
              locale: state.locale,
              designProfile: state.designProfile,
              currentTheme: state.currentTheme,
            }),
        },
        { prompt: trimmed, designProfile: state.designProfile, currentTheme: state.currentTheme },
      );
      if (!result.ok) {
        dispatch({ type: 'SET_ERROR', error: result.errors.join(' ') });
        return;
      }
      dispatch({
        type: 'PROPOSE_PATCH',
        prompt: trimmed,
        patch: result.value,
        summary: t(state.locale, 'تم إنشاء مقترح تصميم آمن بانتظار موافقة المالك.', 'Safe design proposal created. Waiting for owner approval.'),
      });
      return;
    }

    const reply = await provider.chat({ category: 'CHAT', prompt: trimmed, locale: state.locale, mode: state.mode });
    dispatch({
      type: 'PROPOSE_PATCH',
      prompt: trimmed,
      patch: {},
      summary: reply.message,
    });
  }

  function useSample(id: SampleProfileId) {
    dispatch({ type: 'USE_SAMPLE_PROFILE', id });
  }

  return (
    <main
      className="sv2-root"
      dir={state.dir}
      data-theme={state.appearanceMode}
      data-mode={state.mode}
      style={themeStyle(comparisonTheme)}
    >
      <StudioShell
        topBar={
          <StudioTopBar
            locale={state.locale}
            mode={state.mode}
            providerLabel={state.providerLabel}
            providerStatus={state.providerStatus}
            onLocale={(locale) => dispatch({ type: 'SET_LOCALE', locale })}
            onAppearance={(mode) => dispatch({ type: 'SET_APPEARANCE_MODE', mode })}
          />
        }
        side={
          <DesignWorkspace
            locale={state.locale}
            currentTheme={state.currentTheme}
            proposedTheme={comparisonTheme}
            hasProposal={Boolean(state.proposed)}
            onApply={() => dispatch({ type: 'APPLY_PROPOSAL' })}
            onUndo={() => dispatch({ type: 'UNDO' })}
            onReset={() => dispatch({ type: 'RESET' })}
            onProfile={useSample}
            iconLabel={currentIcon.label}
            iconGlyph={currentIcon.glyph}
          />
        }
        feed={
          <>
            <ModeSwitcher locale={state.locale} mode={state.mode} onMode={(mode) => dispatch({ type: 'SET_MODE', mode })} />
            <ConversationFeed locale={state.locale} messages={state.messages} mode={state.mode} loading={state.loading} error={state.error} />
          </>
        }
        composer={
          <StudioComposer
            locale={state.locale}
            mode={state.mode}
            value={composer}
            loading={state.loading}
            onChange={setComposer}
            onSubmit={submitPrompt}
          />
        }
        quickActions={<QuickActions locale={state.locale} onPrompt={submitPrompt} />}
      />
    </main>
  );
}

function StudioShell(props: { topBar: ReactNode; side: ReactNode; feed: ReactNode; composer: ReactNode; quickActions: ReactNode }) {
  return (
    <section className="sv2-shell" aria-label="SiteAware Studio V2 preview">
      {props.topBar}
      <div className="sv2-workspace">
        <section className="sv2-feed-panel" aria-label="Conversation workspace">
          {props.feed}
        </section>
        <aside className="sv2-design-panel" aria-label="Design workspace">
          {props.side}
        </aside>
      </div>
      <div className="sv2-bottom">
        {props.quickActions}
        {props.composer}
      </div>
    </section>
  );
}

function StudioTopBar(props: {
  locale: StudioLocale;
  mode: StudioMode;
  providerLabel: string;
  providerStatus: string;
  onLocale: (locale: StudioLocale) => void;
  onAppearance: (mode: 'light' | 'dark' | 'system') => void;
}) {
  return (
    <header className="sv2-topbar">
      <div className="sv2-brand">
        <span className="sv2-mark" aria-hidden="true">SA</span>
        <div>
          <strong>SiteAware</strong>
          <span>{props.mode.toUpperCase()}</span>
        </div>
      </div>
      <div className="sv2-top-actions">
        <ProviderStatus label={props.providerLabel} status={props.providerStatus} />
        <button type="button" onClick={() => props.onLocale(props.locale === 'ar' ? 'en' : 'ar')}>
          {props.locale === 'ar' ? 'EN' : 'AR'}
        </button>
        <button type="button" onClick={() => props.onAppearance('system')} aria-label="Use system appearance">◐</button>
      </div>
    </header>
  );
}

function ProviderStatus(props: { label: string; status: string }) {
  return (
    <span className="sv2-provider" title="Provider status">
      <span aria-hidden="true" />
      {props.label}
    </span>
  );
}

function ModeSwitcher(props: { locale: StudioLocale; mode: StudioMode; onMode: (mode: StudioMode) => void }) {
  return (
    <nav className="sv2-modes" aria-label="Studio mode">
      {modes.map((mode) => (
        <button key={mode.id} type="button" aria-pressed={props.mode === mode.id} onClick={() => props.onMode(mode.id)}>
          {t(props.locale, mode.ar, mode.en)}
        </button>
      ))}
    </nav>
  );
}

function ConversationFeed(props: { locale: StudioLocale; mode: StudioMode; messages: StudioMessage[]; loading: boolean; error: string }) {
  const isPlaceholder = props.mode === 'learn' || props.mode === 'brain';
  return (
    <div className="sv2-feed">
      {isPlaceholder ? (
        <EmptyState
          title={props.mode === 'learn' ? t(props.locale, 'Learn جاهز لاحقًا', 'Learn is reserved') : t(props.locale, 'Brain بدون بيانات وهمية', 'Brain without fake data')}
          text={t(props.locale, 'هذا مكان عرض حالة Discovery مستقبلًا بدون إنشاء بيانات مزيفة.', 'Future Discovery state will appear here without fake data.')}
        />
      ) : (
        props.messages.map((message) => <MessageBubble key={message.id} message={message} />)
      )}
      {props.loading && <LoadingState />}
      {props.error && <ErrorState message={props.error} />}
    </div>
  );
}

function MessageBubble(props: { message: StudioMessage }) {
  if (props.message.kind !== 'message') {
    return (
      <article className={`sv2-card sv2-card-${props.message.kind}`}>
        <strong>{props.message.title}</strong>
        <p>{props.message.text}</p>
      </article>
    );
  }
  return (
    <article className={`sv2-message ${props.message.role}`}>
      <p>{props.message.text}</p>
    </article>
  );
}

function StudioComposer(props: {
  locale: StudioLocale;
  mode: StudioMode;
  value: string;
  loading: boolean;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
}) {
  function submit(event: FormEvent) {
    event.preventDefault();
    props.onSubmit(props.value);
  }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      props.onSubmit(props.value);
    }
  }
  const placeholder =
    props.mode === 'design'
      ? t(props.locale, 'صف التصميم الذي تريده...', 'Describe the design you want...')
      : t(props.locale, 'اسأل SiteAware...', 'Ask SiteAware...');
  return (
    <form className="sv2-composer" onSubmit={submit}>
      <button type="button" aria-label="Context tools">+</button>
      <textarea
        value={props.value}
        placeholder={placeholder}
        onChange={(event) => props.onChange(event.target.value)}
        onKeyDown={keyDown}
        rows={1}
        disabled={props.loading}
      />
      <button type="submit" disabled={props.loading || !props.value.trim()} aria-label="Send">↑</button>
    </form>
  );
}

function QuickActions(props: { locale: StudioLocale; onPrompt: (prompt: string) => void }) {
  return (
    <div className="sv2-chips" aria-label="Quick design suggestions">
      {quickPrompts[props.locale].map((prompt) => (
        <button key={prompt} type="button" onClick={() => props.onPrompt(prompt)}>
          {prompt}
        </button>
      ))}
    </div>
  );
}

function DesignWorkspace(props: {
  locale: StudioLocale;
  currentTheme: WidgetTheme;
  proposedTheme: WidgetTheme;
  hasProposal: boolean;
  iconLabel: string;
  iconGlyph: string;
  onApply: () => void;
  onUndo: () => void;
  onReset: () => void;
  onProfile: (id: SampleProfileId) => void;
}) {
  return (
    <div className="sv2-design">
      <div className="sv2-section-title">
        <span>{t(props.locale, 'مساحة التصميم', 'Design workspace')}</span>
        <strong>{props.hasProposal ? t(props.locale, 'مقترح', 'Proposed') : t(props.locale, 'حالي', 'Current')}</strong>
      </div>
      <ThemePreview title={t(props.locale, 'Current', 'Current')} theme={props.currentTheme} iconGlyph={props.iconGlyph} />
      <ThemePreview title={t(props.locale, 'Proposed', 'Proposed')} theme={props.proposedTheme} iconGlyph={props.iconGlyph} proposed={props.hasProposal} />
      <ThemeControls locale={props.locale} onApply={props.onApply} onUndo={props.onUndo} onReset={props.onReset} applyDisabled={!props.hasProposal} />
      <div className="sv2-profile-grid" aria-label="Sample design profiles">
        {Object.keys(sampleDesignProfiles).map((id) => (
          <button key={id} type="button" onClick={() => props.onProfile(id as SampleProfileId)}>
            {id}
          </button>
        ))}
      </div>
      <p className="sv2-muted">{t(props.locale, `الأيقونة المحلية: ${props.iconLabel}`, `Local icon: ${props.iconLabel}`)}</p>
    </div>
  );
}

function ThemePreview(props: { title: string; theme: WidgetTheme; iconGlyph: string; proposed?: boolean }) {
  return (
    <article className="sv2-theme-preview" data-proposed={props.proposed ? 'true' : 'false'} style={themeStyle(props.theme)}>
      <header>
        <span>{props.title}</span>
        <b>{props.theme.direction.toUpperCase()}</b>
      </header>
      <div className="sv2-mini-widget">
        <div className="sv2-mini-header">
          <span className="sv2-mini-icon">{props.iconGlyph}</span>
          <div><strong>SiteAware</strong><small>context layer</small></div>
        </div>
        <p>Design changes preview safely before approval.</p>
        <button type="button">Preview</button>
      </div>
    </article>
  );
}

function ThemeControls(props: { locale: StudioLocale; applyDisabled: boolean; onApply: () => void; onUndo: () => void; onReset: () => void }) {
  return (
    <div className="sv2-controls">
      <button type="button" onClick={props.onApply} disabled={props.applyDisabled}>{t(props.locale, 'تطبيق', 'Apply')}</button>
      <button type="button" onClick={props.onUndo}>{t(props.locale, 'تراجع', 'Undo')}</button>
      <button type="button" onClick={props.onReset}>{t(props.locale, 'إعادة', 'Reset')}</button>
    </div>
  );
}

function EmptyState(props: { title: string; text: string }) {
  return <section className="sv2-empty"><strong>{props.title}</strong><p>{props.text}</p></section>;
}

function LoadingState() {
  return <div className="sv2-loading" role="status">Thinking...</div>;
}

function ErrorState(props: { message: string }) {
  return <div className="sv2-error" role="alert">{props.message}</div>;
}

function themeStyle(theme: WidgetTheme) {
  return {
    '--sv2-primary': theme.launcher.backgroundColor,
    '--sv2-bg': theme.panel.backgroundColor,
    '--sv2-surface': theme.panel.surfaceColor,
    '--sv2-text': theme.panel.textColor,
    '--sv2-muted': theme.panel.mutedTextColor,
    '--sv2-border': theme.panel.borderColor,
    '--sv2-radius': `${theme.panel.borderRadius}px`,
    '--sv2-message-radius': `${theme.messages.borderRadius}px`,
    '--sv2-scale': String(theme.spacing.scale),
  } as CSSProperties;
}
