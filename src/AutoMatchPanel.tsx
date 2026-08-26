import { useMemo, useState } from 'react';
import {
  analyzeWebsiteStyle,
  generateThemeRecommendations,
  sampleWebsiteSnapshots,
  themeTokensToCss,
  type GeneratedThemeRecommendation,
  type WebsiteStyleSnapshot,
} from './themeIntelligence';

type AutoMatchPanelProps = {
  onApplyTheme: (recommendation: GeneratedThemeRecommendation) => void;
  currentPrimaryColor: string;
};

const defaultSnapshot = sampleWebsiteSnapshots[0]!.snapshot;

function toJson(snapshot: WebsiteStyleSnapshot) {
  return JSON.stringify(snapshot, null, 2);
}

function splitLines(value: string) {
  return value
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function joinLines(values: string[]) {
  return values.join('\n');
}

function parseSnapshotText(text: string) {
  const parsed = JSON.parse(text) as Partial<WebsiteStyleSnapshot>;
  return parsed;
}

function ColorListField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <label className="auto-field auto-list-field">
      <span>{label}</span>
      <textarea rows={3} value={joinLines(value)} onChange={(event) => onChange(splitLines(event.target.value))} />
    </label>
  );
}

export default function AutoMatchPanel({ onApplyTheme, currentPrimaryColor }: AutoMatchPanelProps) {
  const [snapshot, setSnapshot] = useState<WebsiteStyleSnapshot>(defaultSnapshot);
  const [jsonText, setJsonText] = useState(toJson(defaultSnapshot));
  const [analysisText, setAnalysisText] = useState('');
  const [recommendations, setRecommendations] = useState<GeneratedThemeRecommendation[]>([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<GeneratedThemeRecommendation | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

  const analysis = useMemo(() => (recommendations[0] ? analyzeWebsiteStyle(snapshot) : null), [recommendations, snapshot]);

  function updateSnapshot(next: WebsiteStyleSnapshot) {
    setSnapshot(next);
    setJsonText(toJson(next));
    setJsonError(null);
  }

  function updateField<K extends keyof WebsiteStyleSnapshot>(key: K, value: WebsiteStyleSnapshot[K]) {
    updateSnapshot({ ...snapshot, [key]: value });
  }

  function updateSource<K extends keyof NonNullable<WebsiteStyleSnapshot['source']>>(key: K, value: string) {
    updateSnapshot({
      ...snapshot,
      source: {
        ...(snapshot.source ?? {}),
        [key]: value,
      },
    });
  }

  function analyze() {
    try {
      const parsed = parseSnapshotText(jsonText);
      const normalized = {
        ...snapshot,
        ...parsed,
      } as WebsiteStyleSnapshot;
      const summary = analyzeWebsiteStyle(normalized);
      const generated = generateThemeRecommendations(normalized);
      setSnapshot(summary.snapshot);
      setJsonText(toJson(summary.snapshot));
      setAnalysisText(summary.summary);
      setRecommendations(generated);
      setSelectedRecommendation(generated[0] ?? null);
      setJsonError(null);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Could not parse snapshot JSON.');
    }
  }

  function loadSample(sample: WebsiteStyleSnapshot) {
    updateSnapshot(sample);
    setRecommendations([]);
    setSelectedRecommendation(null);
    setAnalysisText('');
  }

  function importJson() {
    try {
      const parsed = parseSnapshotText(jsonText);
      updateSnapshot({
        ...defaultSnapshot,
        ...parsed,
      } as WebsiteStyleSnapshot);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : 'Could not parse snapshot JSON.');
    }
  }

  const activeContrast = selectedRecommendation?.contrastPairs ?? [];
  const activeTokens = selectedRecommendation ? themeTokensToCss(selectedRecommendation.tokens) : null;

  return (
    <div className="auto-match-panel">
      <div className="panel-section sticky auto-sticky">
        <div className="panel-heading">
          <h2>Auto Match</h2>
          <span>Website Style Snapshot</span>
        </div>
        <div className="auto-summary">
          <p>{analysisText || 'Edit a snapshot, load a sample website, and analyze the visual language.'}</p>
          <div className="auto-primary">
            <span>Current primary override</span>
            <strong>{currentPrimaryColor}</strong>
          </div>
        </div>
      </div>

      <section className="panel-section">
        <div className="panel-heading">
          <h2>Sample Websites</h2>
          <span>Bounded, deterministic snapshots</span>
        </div>
        <div className="sample-grid">
          {sampleWebsiteSnapshots.map((sample) => (
            <button key={sample.id} className="sample-card" onClick={() => loadSample(sample.snapshot)}>
              <strong>{sample.label}</strong>
              <span>{sample.note}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <div className="panel-heading">
          <h2>Manual Snapshot</h2>
          <span>Structured controls</span>
        </div>

        <div className="auto-form">
          <label className="auto-field">
            <span>Page mode</span>
            <select value={snapshot.pageMode} onChange={(event) => updateField('pageMode', event.target.value as WebsiteStyleSnapshot['pageMode'])}>
              <option value="light">light</option>
              <option value="dark">dark</option>
              <option value="mixed">mixed</option>
            </select>
          </label>
          <label className="auto-field">
            <span>Page background</span>
            <input value={snapshot.pageBackground} onChange={(event) => updateField('pageBackground', event.target.value)} />
          </label>
          <label className="auto-field">
            <span>Hostname</span>
            <input
              value={snapshot.source?.hostname ?? ''}
              onChange={(event) => updateSource('hostname', event.target.value)}
              placeholder="example.com"
            />
          </label>
          <label className="auto-field">
            <span>Title</span>
            <input value={snapshot.source?.title ?? ''} onChange={(event) => updateSource('title', event.target.value)} placeholder="Page title" />
          </label>
          <ColorListField label="Surface colors" value={snapshot.surfaceColors} onChange={(value) => updateField('surfaceColors', value)} />
          <ColorListField label="Text colors" value={snapshot.textColors} onChange={(value) => updateField('textColors', value)} />
          <ColorListField label="Muted text colors" value={snapshot.mutedTextColors} onChange={(value) => updateField('mutedTextColors', value)} />
          <ColorListField label="Border colors" value={snapshot.borderColors} onChange={(value) => updateField('borderColors', value)} />
          <ColorListField label="Brand colors" value={snapshot.brandColors} onChange={(value) => updateField('brandColors', value)} />
          <ColorListField label="Accent colors" value={snapshot.accentColors} onChange={(value) => updateField('accentColors', value)} />
          <ColorListField label="Link colors" value={snapshot.linkColors} onChange={(value) => updateField('linkColors', value)} />
          <ColorListField label="Button colors" value={snapshot.buttonColors} onChange={(value) => updateField('buttonColors', value)} />
          <label className="auto-field auto-list-field">
            <span>Font families</span>
            <textarea rows={3} value={joinLines(snapshot.fontFamilies)} onChange={(event) => updateField('fontFamilies', splitLines(event.target.value))} />
          </label>
          <label className="auto-field">
            <span>Heading weight</span>
            <input
              type="number"
              min={300}
              max={900}
              step={50}
              value={snapshot.headingWeight ?? 700}
              onChange={(event) => updateField('headingWeight', Number(event.target.value))}
            />
          </label>
          <label className="auto-field">
            <span>Body weight</span>
            <input
              type="number"
              min={300}
              max={900}
              step={50}
              value={snapshot.bodyWeight ?? 400}
              onChange={(event) => updateField('bodyWeight', Number(event.target.value))}
            />
          </label>
          <label className="auto-field">
            <span>Button radius</span>
            <input
              type="number"
              min={0}
              max={40}
              value={snapshot.buttonRadius ?? 16}
              onChange={(event) => updateField('buttonRadius', Number(event.target.value))}
            />
          </label>
          <label className="auto-field">
            <span>Card radius</span>
            <input
              type="number"
              min={0}
              max={48}
              value={snapshot.cardRadius ?? 20}
              onChange={(event) => updateField('cardRadius', Number(event.target.value))}
            />
          </label>
          <label className="auto-field">
            <span>Input radius</span>
            <input
              type="number"
              min={0}
              max={40}
              value={snapshot.inputRadius ?? 16}
              onChange={(event) => updateField('inputRadius', Number(event.target.value))}
            />
          </label>
        </div>
      </section>

      <section className="panel-section">
        <div className="panel-heading">
          <h2>Raw JSON</h2>
          <span>Import textarea</span>
        </div>
        <textarea className="auto-json" rows={14} value={jsonText} onChange={(event) => setJsonText(event.target.value)} />
        {jsonError ? <div className="auto-error">{jsonError}</div> : null}
        <div className="auto-actions">
          <button className="secondary-button" onClick={importJson}>
            Import JSON
          </button>
          <button className="primary-button" onClick={analyze}>
            Analyze Website Style
          </button>
        </div>
      </section>

      {analysis ? (
        <section className="panel-section">
          <div className="panel-heading">
            <h2>Detected Style</h2>
            <span>Deterministic notes</span>
          </div>
          <div className="analysis-grid">
            <div className="analysis-card">
              <strong>Page mode</strong>
              <span>{analysis.inferredPageMode}</span>
            </div>
            <div className="analysis-card">
              <strong>Primary</strong>
              <span>{analysis.inferredPrimary}</span>
            </div>
            <div className="analysis-card">
              <strong>Accent</strong>
              <span>{analysis.inferredAccent}</span>
            </div>
            <div className="analysis-card">
              <strong>Background</strong>
              <span>{analysis.inferredBackground}</span>
            </div>
            <div className="analysis-card">
              <strong>Surface</strong>
              <span>{analysis.inferredSurface}</span>
            </div>
            <div className="analysis-card">
              <strong>Text</strong>
              <span>{analysis.inferredText}</span>
            </div>
            <div className="analysis-card">
              <strong>Font</strong>
              <span>{analysis.inferredFont}</span>
            </div>
            <div className="analysis-card">
              <strong>Radius</strong>
              <span>{analysis.inferredRadius}</span>
            </div>
          </div>
          <ul className="analysis-notes">
            {analysis.contrastNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {recommendations.length ? (
        <section className="panel-section">
          <div className="panel-heading">
            <h2>Recommendations</h2>
            <span>3 strategies</span>
          </div>
          <div className="recommendation-list">
            {recommendations.map((recommendation) => {
              const selected = selectedRecommendation?.id === recommendation.id;
              const tokens = themeTokensToCss(recommendation.tokens);
              return (
                <button
                  key={recommendation.id}
                  className={selected ? 'recommendation-card active' : 'recommendation-card'}
                  onClick={() => setSelectedRecommendation(recommendation)}
                >
                  <div className="recommendation-top">
                    <div>
                      <strong>{recommendation.label}</strong>
                      <span>{recommendation.note}</span>
                    </div>
                    <span className="recommendation-origin">{recommendation.origin}</span>
                  </div>
                  <div className="swatch-row">
                    <span style={{ background: tokens.primary }} />
                    <span style={{ background: tokens.surface }} />
                    <span style={{ background: tokens.surfaceSecondary }} />
                    <span style={{ background: tokens.accent }} />
                    <span style={{ background: tokens.text }} />
                  </div>
                  <div className="mini-preview">
                    <span className="mini-preview-avatar" style={{ background: tokens.primary }} />
                    <span className="mini-preview-line" style={{ background: tokens.surfaceSecondary }} />
                    <span className="mini-preview-chip" style={{ background: tokens.userBubble }} />
                  </div>
                  <div className="explanation-list">
                    {recommendation.explanation.slice(0, 2).map((reason) => (
                      <span key={reason}>{reason}</span>
                    ))}
                  </div>
                  <div className="contrast-mini">
                    {recommendation.contrastPairs.slice(0, 3).map((pair) => (
                      <span key={pair.label} className={pair.status === 'PASS' ? 'contrast-pass' : 'contrast-warn'}>
                        {pair.label}: {pair.ratio.toFixed(2)}
                      </span>
                    ))}
                  </div>
                  <div className="recommendation-actions">
                    <button
                      className="primary-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onApplyTheme(recommendation);
                      }}
                    >
                      Apply Theme
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {selectedRecommendation ? (
        <section className="panel-section">
          <div className="panel-heading">
            <h2>Contrast Inspector</h2>
            <span>{selectedRecommendation.label}</span>
          </div>
          <div className="contrast-grid">
            {selectedRecommendation.contrastPairs.map((pair) => (
              <div key={pair.label} className="contrast-row">
                <div>
                  <strong>{pair.label}</strong>
                  <span>{pair.foreground} on {pair.background}</span>
                </div>
                <div className={pair.status === 'PASS' ? 'contrast-pass' : 'contrast-warn'}>
                  {pair.ratio.toFixed(2)}:1 {pair.status}
                </div>
              </div>
            ))}
          </div>
          <div className="spotlight-card">
            <div className="panel-heading">
              <h2>Spotlight Tokens</h2>
              <span>Future Take Me There</span>
            </div>
            <div className="spotlight-grid">
              <div><strong>Overlay</strong><span>{selectedRecommendation.spotlight.overlayColor}</span></div>
              <div><strong>Opacity</strong><span>{selectedRecommendation.spotlight.overlayOpacity}</span></div>
              <div><strong>Ring</strong><span>{selectedRecommendation.spotlight.ringColor}</span></div>
              <div><strong>Ring width</strong><span>{selectedRecommendation.spotlight.ringWidth}</span></div>
              <div><strong>Glow</strong><span>{selectedRecommendation.spotlight.glowColor}</span></div>
              <div><strong>Tooltip</strong><span>{selectedRecommendation.spotlight.tooltipBackground}</span></div>
            </div>
          </div>
          {activeTokens ? (
            <div className="theme-token-grid">
              <div><span>Background</span><strong style={{ background: activeTokens.background }}> </strong></div>
              <div><span>Surface</span><strong style={{ background: activeTokens.surface }}> </strong></div>
              <div><span>Primary</span><strong style={{ background: activeTokens.primary }}> </strong></div>
              <div><span>Accent</span><strong style={{ background: activeTokens.accent }}> </strong></div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
