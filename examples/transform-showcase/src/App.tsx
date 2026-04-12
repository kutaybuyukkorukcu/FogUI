import {
  FogUIProvider,
  FogUIRenderer,
  type FogUIActionErrorPayload,
  type FogUIActionPayload,
  type FogUIResponse,
  useFogUI,
} from '@fogui/react';
import { startTransition, useState } from 'react';
import { defaultA2UiSampleId, a2UiSamples, type A2UiSample } from './a2uiSamples';
import { showcaseAdapter, showcaseAdapterConformance } from './demoAdapter';
import { defaultScenarioId, transformScenarios, type TransformScenario } from './scenarios';

const DEFAULT_ENDPOINT = import.meta.env.VITE_API_URL ?? 'http://localhost:5001';

type ShowcaseTab = 'transform' | 'a2ui';
type RunStatus = 'idle' | 'running' | 'success' | 'error';

interface ScenarioRun {
  readonly status: RunStatus;
  readonly prompt: string;
  readonly response?: FogUIResponse;
  readonly usage?: {
    readonly model?: string | null;
    readonly transformTokens?: number | null;
    readonly processingTimeMs?: number | null;
    readonly estimatedCost?: unknown;
  };
  readonly error?: string;
  readonly componentTypes?: readonly string[];
  readonly finishedAt?: string;
}

interface A2UiDiagnostic {
  readonly path?: string;
  readonly code?: string;
  readonly category?: string;
  readonly message?: string;
  readonly details?: unknown;
}

interface A2UiCompatibilityResponse {
  readonly success: boolean;
  readonly requestId: string;
  readonly result?: FogUIResponse;
  readonly translationErrors: readonly A2UiDiagnostic[];
  readonly validationErrors: readonly A2UiDiagnostic[];
}

interface A2UiRun {
  readonly status: RunStatus;
  readonly payload: string;
  readonly response?: FogUIResponse;
  readonly requestId?: string;
  readonly translationErrors?: readonly A2UiDiagnostic[];
  readonly validationErrors?: readonly A2UiDiagnostic[];
  readonly rawResponse?: unknown;
  readonly error?: string;
  readonly componentTypes?: readonly string[];
  readonly finishedAt?: string;
}

interface HeroMetric {
  readonly label: string;
  readonly value: string | number;
}

function findScenarioById(id: string): TransformScenario {
  return transformScenarios.find((scenario) => scenario.id === id) ?? transformScenarios[0];
}

function findA2UiSampleById(id: string): A2UiSample {
  return a2UiSamples.find((sample) => sample.id === id) ?? a2UiSamples[0];
}

function formatTimestamp(value?: string): string {
  if (!value) {
    return 'not run';
  }

  return new Date(value).toLocaleTimeString();
}

function collectComponentTypes(response: FogUIResponse): string[] {
  const componentTypes = new Set<string>();

  const visitBlocks = (blocks: ReadonlyArray<unknown>) => {
    for (const block of blocks) {
      if (!block || typeof block !== 'object') {
        continue;
      }

      const candidate = block as {
        type?: unknown;
        componentType?: unknown;
        children?: unknown;
      };

      if (candidate.type === 'component' && typeof candidate.componentType === 'string') {
        componentTypes.add(candidate.componentType);
      }

      if (Array.isArray(candidate.children)) {
        visitBlocks(candidate.children);
      }
    }
  };

  visitBlocks(response.content);
  return Array.from(componentTypes);
}

function createInitialPromptMap(): Record<string, string> {
  return Object.fromEntries(transformScenarios.map((scenario) => [scenario.id, scenario.prompt]));
}

function createInitialRunMap(): Record<string, ScenarioRun> {
  return Object.fromEntries(
    transformScenarios.map((scenario) => [
      scenario.id,
      {
        status: 'idle' as const,
        prompt: scenario.prompt,
      },
    ]),
  );
}

function toPrettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function createInitialA2UiPayloadMap(): Record<string, string> {
  return Object.fromEntries(a2UiSamples.map((sample) => [sample.id, toPrettyJson(sample.payload)]));
}

function createInitialA2UiRunMap(): Record<string, A2UiRun> {
  return Object.fromEntries(
    a2UiSamples.map((sample) => [
      sample.id,
      {
        status: 'idle' as const,
        payload: toPrettyJson(sample.payload),
      },
    ]),
  );
}

function joinRoute(endpoint: string, route: string): string {
  return `${endpoint.replace(/\/+$/, '')}${route}`;
}

function normalizeDiagnostics(value: unknown): A2UiDiagnostic[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      return {
        message: typeof entry === 'string' ? entry : JSON.stringify(entry),
      };
    }

    const record = entry as Record<string, unknown>;
    return {
      path: typeof record.path === 'string' ? record.path : undefined,
      code: typeof record.code === 'string' ? record.code : undefined,
      category: typeof record.category === 'string' ? record.category : undefined,
      message: typeof record.message === 'string' ? record.message : undefined,
      details: record.details,
    };
  });
}

function normalizeCompatibilityResponse(value: unknown): A2UiCompatibilityResponse | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  return {
    success: Boolean(record.success),
    requestId: typeof record.requestId === 'string' ? record.requestId : '',
    result: record.result && typeof record.result === 'object' ? (record.result as FogUIResponse) : undefined,
    translationErrors: normalizeDiagnostics(record.translationErrors),
    validationErrors: normalizeDiagnostics(record.validationErrors),
  };
}

function summarizeCompatibilityErrors(response: A2UiCompatibilityResponse): string | undefined {
  if (response.success) {
    return undefined;
  }

  const segments: string[] = [];
  if (response.translationErrors.length > 0) {
    segments.push(`${response.translationErrors.length} translation error${response.translationErrors.length === 1 ? '' : 's'}`);
  }
  if (response.validationErrors.length > 0) {
    segments.push(`${response.validationErrors.length} validation error${response.validationErrors.length === 1 ? '' : 's'}`);
  }

  return segments.length > 0
    ? `Compatibility run completed with ${segments.join(' and ')}.`
    : 'Compatibility run failed.';
}

function formatActionLogEntry(action: string, data?: unknown): string {
  if (data === undefined) {
    return action;
  }

  return `${action} ${JSON.stringify(data)}`;
}

function createA2UiErrorRun(payload: string, message: string): A2UiRun {
  return {
    payload,
    status: 'error',
    error: message,
    finishedAt: new Date().toISOString(),
  };
}

function createCompletedA2UiRun(
  payload: string,
  rawResponse: unknown,
  compatibilityResponse: A2UiCompatibilityResponse,
): A2UiRun {
  return {
    payload,
    response: compatibilityResponse.result,
    requestId: compatibilityResponse.requestId,
    translationErrors: compatibilityResponse.translationErrors,
    validationErrors: compatibilityResponse.validationErrors,
    rawResponse,
    componentTypes: compatibilityResponse.result ? collectComponentTypes(compatibilityResponse.result) : [],
    finishedAt: new Date().toISOString(),
    status: compatibilityResponse.success ? 'success' : 'error',
    error: summarizeCompatibilityErrors(compatibilityResponse),
  };
}

function parseA2UiPayload(payload: string): { readonly value?: Record<string, unknown>; readonly error?: string } {
  let parsedPayload: unknown;

  try {
    parsedPayload = JSON.parse(payload);
  } catch {
    return {
      error: 'Payload is not valid JSON.',
    };
  }

  if (!parsedPayload || typeof parsedPayload !== 'object' || Array.isArray(parsedPayload)) {
    return {
      error: 'Payload must be a JSON object at the top level.',
    };
  }

  return {
    value: parsedPayload as Record<string, unknown>,
  };
}

function createCompatibilityHeaders(
  requestIdHeader: string,
  sampleId: string,
  mode: 'selected' | 'all',
): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const normalizedRequestId = requestIdHeader.trim();
  if (!normalizedRequestId) {
    return headers;
  }

  headers['X-FogUI-Request-Id'] = mode === 'all' ? `${normalizedRequestId}-${sampleId}` : normalizedRequestId;
  return headers;
}

async function requestA2UiCompatibility(
  endpoint: string,
  payload: Record<string, unknown>,
  headers: Record<string, string>,
): Promise<{ readonly rawResponse: unknown; readonly compatibilityResponse: A2UiCompatibilityResponse }> {
  const response = await fetch(joinRoute(endpoint, '/fogui/compat/a2ui/inbound'), {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const rawResponse = await response.json().catch(() => null);
  if (!response.ok) {
    const errorRecord = rawResponse && typeof rawResponse === 'object'
      ? (rawResponse as Record<string, unknown>)
      : null;
    throw new Error(typeof errorRecord?.error === 'string' ? errorRecord.error : `HTTP ${response.status}`);
  }

  const compatibilityResponse = normalizeCompatibilityResponse(rawResponse);
  if (!compatibilityResponse) {
    throw new Error('Compatibility response parsing failed.');
  }

  return {
    rawResponse,
    compatibilityResponse,
  };
}

interface ShowcaseHeroProps {
  readonly activeTab: ShowcaseTab;
  readonly onTabChange: (tab: ShowcaseTab) => void;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly metrics: readonly HeroMetric[];
}

const ShowcaseHero = ({ activeTab, onTabChange, eyebrow, title, description, metrics }: ShowcaseHeroProps) => (
  <section className="hero-panel">
    <div>
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="hero-copy">{description}</p>
      <div className="showcase-mode-switch" role="tablist" aria-label="Showcase mode">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'transform'}
          className={activeTab === 'transform' ? 'showcase-mode-button is-active' : 'showcase-mode-button'}
          onClick={() => onTabChange('transform')}
        >
          Transform
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'a2ui'}
          className={activeTab === 'a2ui' ? 'showcase-mode-button is-active' : 'showcase-mode-button'}
          onClick={() => onTabChange('a2ui')}
        >
          A2UI inbound
        </button>
      </div>
    </div>
    <div className="hero-stats">
      {metrics.map((metric) => (
        <article key={metric.label}>
          <span>{metric.label}</span>
          <strong>{metric.value}</strong>
        </article>
      ))}
    </div>
  </section>
);

interface ShowcaseContentProps {
  readonly endpoint: string;
  readonly onEndpointChange: (value: string) => void;
  readonly activeTab: ShowcaseTab;
  readonly onTabChange: (tab: ShowcaseTab) => void;
}

const TransformShowcaseContent = ({
  endpoint,
  onEndpointChange,
  activeTab,
  onTabChange,
}: ShowcaseContentProps) => {
  const { transform, isLoading, error, clearError } = useFogUI();
  const [selectedScenarioId, setSelectedScenarioId] = useState(defaultScenarioId);
  const [selectedResultId, setSelectedResultId] = useState(defaultScenarioId);
  const [promptByScenarioId, setPromptByScenarioId] = useState<Record<string, string>>(createInitialPromptMap);
  const [scenarioRuns, setScenarioRuns] = useState<Record<string, ScenarioRun>>(createInitialRunMap);
  const [runMode, setRunMode] = useState<'idle' | 'selected' | 'all'>('idle');
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [actionLog, setActionLog] = useState<string[]>([]);

  const selectedScenario = findScenarioById(selectedScenarioId);
  const selectedRun = scenarioRuns[selectedResultId];
  const totalCompleted = Object.values(scenarioRuns).filter((run) => run.status === 'success' || run.status === 'error').length;
  const totalSuccessful = Object.values(scenarioRuns).filter((run) => run.status === 'success').length;
  const totalFailed = Object.values(scenarioRuns).filter((run) => run.status === 'error').length;
  const displayedResponse = selectedRun?.response;

  const appendActionLog = (entry: string) => {
    setActionLog((current) => [`${new Date().toLocaleTimeString()}  ${entry}`, ...current].slice(0, 16));
  };

  const setScenarioStatus = (scenarioId: string, update: ScenarioRun) => {
    startTransition(() => {
      setScenarioRuns((current) => ({
        ...current,
        [scenarioId]: update,
      }));
    });
  };

  const runScenario = async (scenario: TransformScenario): Promise<void> => {
    const prompt = promptByScenarioId[scenario.id] ?? scenario.prompt;
    clearError();
    setActiveScenarioId(scenario.id);
    setScenarioStatus(scenario.id, {
      ...(scenarioRuns[scenario.id] ?? { prompt }),
      prompt,
      status: 'running',
      error: undefined,
      finishedAt: undefined,
      componentTypes: undefined,
    });

    const result = await transform(prompt, {
      intent: scenario.intent,
      preferredComponents: [...scenario.preferredComponents],
      instructions: scenario.instructions,
    });

    const response = result.result;
    const componentTypes = response ? collectComponentTypes(response) : [];
    const nextRun: ScenarioRun = {
      prompt,
      response,
      usage: result.usage,
      componentTypes,
      finishedAt: new Date().toISOString(),
      status: result.success ? 'success' : 'error',
      error: result.success ? undefined : result.error ?? 'Transform request failed',
    };

    setScenarioStatus(scenario.id, nextRun);
    setSelectedResultId(scenario.id);
    setActiveScenarioId(null);
  };

  const runSelectedScenario = async () => {
    setRunMode('selected');
    await runScenario(selectedScenario);
    setRunMode('idle');
  };

  const runAllScenarios = async () => {
    setRunMode('all');
    clearError();

    for (const scenario of transformScenarios) {
      await runScenario(scenario);
    }

    setRunMode('idle');
    setActiveScenarioId(null);
  };

  const resetRuns = () => {
    clearError();
    setActionLog([]);
    setActiveScenarioId(null);
    setRunMode('idle');
    setScenarioRuns(createInitialRunMap());
    setSelectedResultId(selectedScenarioId);
  };

  const handleRendererAction = (action: string, data?: unknown) => {
    appendActionLog(formatActionLogEntry(action, data));
  };

  const handleRendererActionStart = (payload: FogUIActionPayload) => {
    appendActionLog(`start ${payload.action} from ${payload.sourceComponent}`);
  };

  const handleRendererActionComplete = (payload: FogUIActionPayload) => {
    appendActionLog(`complete ${payload.action} from ${payload.sourceComponent}`);
  };

  const handleRendererActionError = (payload: FogUIActionErrorPayload) => {
    const message = payload.error instanceof Error ? payload.error.message : JSON.stringify(payload.error);
    appendActionLog(`error ${payload.action}: ${message}`);
  };

  return (
    <>
      <ShowcaseHero
        activeTab={activeTab}
        onTabChange={onTabChange}
        eyebrow="Backend-first manual validation"
        title="FogUI Transform Showcase"
        description="Drive canned prompts through POST /fogui/transform, compare component-family outcomes, and render the canonical response locally through the showcase adapter."
        metrics={[
          { label: 'Scenarios', value: transformScenarios.length },
          { label: 'Completed', value: totalCompleted },
          { label: 'Successful', value: totalSuccessful },
          { label: 'Failed', value: totalFailed },
        ]}
      />
      <section className="toolbar-panel">
        <label className="toolbar-field">
          <span>Backend endpoint</span>
          <input value={endpoint} onChange={(event) => onEndpointChange(event.target.value)} />
        </label>
        <div className="toolbar-actions">
          <button type="button" className="primary-action" disabled={isLoading} onClick={runSelectedScenario}>
            {runMode === 'selected' ? 'Running selected...' : 'Run selected scenario'}
          </button>
          <button type="button" className="secondary-action" disabled={isLoading} onClick={runAllScenarios}>
            {runMode === 'all' ? 'Running all...' : 'Run all scenarios'}
          </button>
          <button type="button" className="ghost-action" disabled={isLoading} onClick={resetRuns}>
            Reset results
          </button>
        </div>
      </section>

      <section className="content-grid">
        <aside className="scenario-panel glass-panel">
          <div className="panel-heading">
            <h2>Scenario Catalog</h2>
            <p>Each card is a pre-entered user query that nudges one canonical component family.</p>
          </div>
          <div className="scenario-list">
            {transformScenarios.map((scenario) => {
              const run = scenarioRuns[scenario.id];
              const isSelected = scenario.id === selectedScenarioId;
              const isInspecting = scenario.id === selectedResultId;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  className={isSelected ? 'scenario-card is-selected' : 'scenario-card'}
                  onClick={() => {
                    setSelectedScenarioId(scenario.id);
                    setSelectedResultId(scenario.id);
                  }}
                >
                  <div className="scenario-card-topline">
                    <strong>{scenario.title}</strong>
                    <span className={`status-pill is-${run?.status ?? 'idle'}`}>{run?.status ?? 'idle'}</span>
                  </div>
                  <p>{scenario.summary}</p>
                  <div className="chip-row">
                    {scenario.focusComponents.map((component) => (
                      <span key={component} className="chip">{component}</span>
                    ))}
                  </div>
                  <div className="scenario-card-footer">
                    <span>{isInspecting ? 'Inspecting this result' : `Last run: ${formatTimestamp(run?.finishedAt)}`}</span>
                    {activeScenarioId === scenario.id ? <span className="live-indicator">in flight</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="request-panel glass-panel">
          <div className="panel-heading">
            <h2>Selected Prompt</h2>
            <p>Adjust the canned prompt if needed, but keep the preferred component hints stable for comparison.</p>
          </div>
          <div className="selected-scenario-meta">
            <div>
              <span className="meta-label">Scenario</span>
              <strong>{selectedScenario.title}</strong>
            </div>
            <div>
              <span className="meta-label">Intent</span>
              <strong>{selectedScenario.intent}</strong>
            </div>
          </div>
          <label className="prompt-field">
            <span>User query</span>
            <textarea
              rows={8}
              value={promptByScenarioId[selectedScenario.id] ?? selectedScenario.prompt}
              onChange={(event) => {
                const nextPrompt = event.target.value;
                setPromptByScenarioId((current) => ({
                  ...current,
                  [selectedScenario.id]: nextPrompt,
                }));
              }}
            />
          </label>
          <div className="request-context-card">
            <div>
              <span className="meta-label">Preferred Components</span>
              <div className="chip-row">
                {selectedScenario.preferredComponents.map((component) => (
                  <span key={component} className="chip is-dark">{component}</span>
                ))}
              </div>
            </div>
            <div>
              <span className="meta-label">Instructions</span>
              <p>{selectedScenario.instructions}</p>
            </div>
          </div>
          <div className="runtime-note">
            <span>Adapter</span>
            <strong>{showcaseAdapterConformance.ok ? 'ready' : 'invalid'}</strong>
            <span>Required mappings</span>
            <strong>{showcaseAdapterConformance.requiredComponents.length}</strong>
          </div>
        </section>

        <section className="preview-panel glass-panel">
          <div className="panel-heading">
            <h2>Render Preview</h2>
            <p>Canonical response from the backend rendered through the local showcase adapter.</p>
          </div>
          <div className="preview-summary">
            <article>
              <span>Status</span>
              <strong>{selectedRun?.status ?? 'idle'}</strong>
            </article>
            <article>
              <span>Model</span>
              <strong>{selectedRun?.usage?.model ?? 'n/a'}</strong>
            </article>
            <article>
              <span>Tokens</span>
              <strong>{selectedRun?.usage?.transformTokens ?? 0}</strong>
            </article>
            <article>
              <span>Latency</span>
              <strong>{selectedRun?.usage?.processingTimeMs ?? 0} ms</strong>
            </article>
          </div>
          <div className="preview-canvas">
            {displayedResponse ? (
              <FogUIRenderer
                response={displayedResponse}
                onAction={handleRendererAction}
                onActionStart={handleRendererActionStart}
                onActionComplete={handleRendererActionComplete}
                onActionError={handleRendererActionError}
              />
            ) : (
              <div className="empty-state">
                <strong>No response rendered yet.</strong>
                <p>Run a scenario to inspect what the backend returns for the selected prompt.</p>
              </div>
            )}
          </div>
          {selectedRun?.componentTypes?.length ? (
            <div className="detected-components">
              <span className="meta-label">Detected component types</span>
              <div className="chip-row">
                {selectedRun.componentTypes.map((component) => (
                  <span key={component} className="chip">{component}</span>
                ))}
              </div>
            </div>
          ) : null}
          {selectedRun?.error || error ? (
            <div className="error-banner">{selectedRun?.error ?? error}</div>
          ) : null}
        </section>

        <section className="results-panel glass-panel">
          <div className="panel-heading">
            <h2>Scenario Results</h2>
            <p>Use this table after a run-all pass to see which scenarios produced the intended component families.</p>
          </div>
          <div className="results-table-shell">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Status</th>
                  <th>Expected</th>
                  <th>Detected</th>
                  <th>Last run</th>
                </tr>
              </thead>
              <tbody>
                {transformScenarios.map((scenario) => {
                  const run = scenarioRuns[scenario.id];
                  return (
                    <tr key={scenario.id}>
                      <td>
                        <button
                          type="button"
                          className="inline-link"
                          onClick={() => {
                            setSelectedScenarioId(scenario.id);
                            setSelectedResultId(scenario.id);
                          }}
                        >
                          {scenario.title}
                        </button>
                      </td>
                      <td><span className={`status-pill is-${run?.status ?? 'idle'}`}>{run?.status ?? 'idle'}</span></td>
                      <td>{scenario.focusComponents.join(', ')}</td>
                      <td>{run?.componentTypes?.join(', ') || 'none'}</td>
                      <td>{formatTimestamp(run?.finishedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="inspect-panel glass-panel">
          <div className="panel-heading">
            <h2>Inspect Response</h2>
            <p>Raw canonical output for the currently selected result.</p>
          </div>
          <pre className="json-panel">
            {displayedResponse ? JSON.stringify(displayedResponse, null, 2) : 'No canonical response captured yet.'}
          </pre>
        </section>

        <section className="actions-panel glass-panel">
          <div className="panel-heading">
            <h2>Renderer Action Log</h2>
            <p>Interaction events emitted by rendered canonical components appear here.</p>
          </div>
          <pre className="log-panel">{actionLog.length > 0 ? actionLog.join('\n') : 'No renderer actions yet.'}</pre>
        </section>
      </section>
    </>
  );
};

const A2UiShowcaseContent = ({ endpoint, onEndpointChange, activeTab, onTabChange }: ShowcaseContentProps) => {
  const [selectedSampleId, setSelectedSampleId] = useState(defaultA2UiSampleId);
  const [selectedResultId, setSelectedResultId] = useState(defaultA2UiSampleId);
  const [requestIdHeader, setRequestIdHeader] = useState('');
  const [payloadBySampleId, setPayloadBySampleId] = useState<Record<string, string>>(createInitialA2UiPayloadMap);
  const [sampleRuns, setSampleRuns] = useState<Record<string, A2UiRun>>(createInitialA2UiRunMap);
  const [runMode, setRunMode] = useState<'idle' | 'selected' | 'all'>('idle');
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);

  const selectedSample = findA2UiSampleById(selectedSampleId);
  const selectedRun = sampleRuns[selectedResultId];
  const totalCompleted = Object.values(sampleRuns).filter((run) => run.status === 'success' || run.status === 'error').length;
  const totalSuccessful = Object.values(sampleRuns).filter((run) => run.status === 'success').length;
  const totalFailed = Object.values(sampleRuns).filter((run) => run.status === 'error').length;
  const displayedResponse = selectedRun?.response;
  const translationErrors = selectedRun?.translationErrors ?? [];
  const validationErrors = selectedRun?.validationErrors ?? [];

  const setSampleStatus = (sampleId: string, update: A2UiRun) => {
    startTransition(() => {
      setSampleRuns((current) => ({
        ...current,
        [sampleId]: update,
      }));
    });
  };

  const runSample = async (sample: A2UiSample, mode: 'selected' | 'all'): Promise<void> => {
    const payload = payloadBySampleId[sample.id] ?? toPrettyJson(sample.payload);
    setActiveSampleId(sample.id);
    setSampleStatus(sample.id, {
      ...(sampleRuns[sample.id] ?? { payload }),
      payload,
      status: 'running',
      response: undefined,
      requestId: undefined,
      translationErrors: undefined,
      validationErrors: undefined,
      rawResponse: undefined,
      error: undefined,
      finishedAt: undefined,
      componentTypes: undefined,
    });

    const parsedPayload = parseA2UiPayload(payload);
    if (!parsedPayload.value) {
      setSampleStatus(sample.id, createA2UiErrorRun(payload, parsedPayload.error ?? 'Payload parsing failed.'));
      setSelectedResultId(sample.id);
      setActiveSampleId(null);
      return;
    }

    try {
      const headers = createCompatibilityHeaders(requestIdHeader, sample.id, mode);
      const { rawResponse, compatibilityResponse } = await requestA2UiCompatibility(endpoint, parsedPayload.value, headers);
      setSampleStatus(sample.id, createCompletedA2UiRun(payload, rawResponse, compatibilityResponse));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Compatibility request failed';
      setSampleStatus(sample.id, createA2UiErrorRun(payload, message));
    } finally {
      setSelectedResultId(sample.id);
      setActiveSampleId(null);
    }
  };

  const runSelectedSample = async () => {
    setRunMode('selected');
    await runSample(selectedSample, 'selected');
    setRunMode('idle');
  };

  const runAllSamples = async () => {
    setRunMode('all');

    for (const sample of a2UiSamples) {
      await runSample(sample, 'all');
    }

    setRunMode('idle');
    setActiveSampleId(null);
  };

  const resetRuns = () => {
    setActiveSampleId(null);
    setRunMode('idle');
    setSampleRuns(createInitialA2UiRunMap());
    setSelectedResultId(selectedSampleId);
  };

  return (
    <>
      <ShowcaseHero
        activeTab={activeTab}
        onTabChange={onTabChange}
        eyebrow="Compatibility translation"
        title="FogUI A2UI Inbound Showcase"
        description="Send raw A2UI-like payloads to POST /fogui/compat/a2ui/inbound, inspect translation and validation diagnostics, and render the returned canonical FogUI response locally."
        metrics={[
          { label: 'Samples', value: a2UiSamples.length },
          { label: 'Completed', value: totalCompleted },
          { label: 'Successful', value: totalSuccessful },
          { label: 'Failed', value: totalFailed },
        ]}
      />

      <section className="toolbar-panel">
        <label className="toolbar-field">
          <span>Backend endpoint</span>
          <input value={endpoint} onChange={(event) => onEndpointChange(event.target.value)} />
        </label>
        <label className="toolbar-field is-compact">
          <span>Request ID header prefix</span>
          <input
            value={requestIdHeader}
            placeholder="Optional X-FogUI-Request-Id"
            onChange={(event) => setRequestIdHeader(event.target.value)}
          />
        </label>
        <div className="toolbar-actions">
          <button type="button" className="primary-action" onClick={runSelectedSample}>
            {runMode === 'selected' ? 'Running selected...' : 'Run selected sample'}
          </button>
          <button type="button" className="secondary-action" onClick={runAllSamples}>
            {runMode === 'all' ? 'Running all...' : 'Run all samples'}
          </button>
          <button type="button" className="ghost-action" onClick={resetRuns}>
            Reset results
          </button>
        </div>
      </section>

      <section className="content-grid">
        <aside className="scenario-panel glass-panel">
          <div className="panel-heading">
            <h2>Sample Catalog</h2>
            <p>Each sample is a concrete A2UI-like payload you can edit before sending through the compatibility controller.</p>
          </div>
          <div className="scenario-list">
            {a2UiSamples.map((sample) => {
              const run = sampleRuns[sample.id];
              const isSelected = sample.id === selectedSampleId;
              const isInspecting = sample.id === selectedResultId;
              return (
                <button
                  key={sample.id}
                  type="button"
                  className={isSelected ? 'scenario-card is-selected' : 'scenario-card'}
                  onClick={() => {
                    setSelectedSampleId(sample.id);
                    setSelectedResultId(sample.id);
                  }}
                >
                  <div className="scenario-card-topline">
                    <strong>{sample.title}</strong>
                    <span className={`status-pill is-${run?.status ?? 'idle'}`}>{run?.status ?? 'idle'}</span>
                  </div>
                  <p>{sample.summary}</p>
                  <div className="chip-row">
                    {sample.focusComponents.map((component) => (
                      <span key={component} className="chip">{component}</span>
                    ))}
                  </div>
                  <div className="scenario-card-footer">
                    <span>{isInspecting ? 'Inspecting this result' : `Last run: ${formatTimestamp(run?.finishedAt)}`}</span>
                    {activeSampleId === sample.id ? <span className="live-indicator">in flight</span> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="request-panel glass-panel">
          <div className="panel-heading">
            <h2>Selected Payload</h2>
            <p>Edit the JSON request body before sending it to the compatibility endpoint.</p>
          </div>
          <div className="selected-scenario-meta">
            <div>
              <span className="meta-label">Sample</span>
              <strong>{selectedSample.title}</strong>
            </div>
            <div>
              <span className="meta-label">Expected</span>
              <strong>{selectedSample.expected}</strong>
            </div>
          </div>
          <label className="prompt-field">
            <span>A2UI payload</span>
            <textarea
              rows={12}
              value={payloadBySampleId[selectedSample.id] ?? toPrettyJson(selectedSample.payload)}
              onChange={(event) => {
                const nextPayload = event.target.value;
                setPayloadBySampleId((current) => ({
                  ...current,
                  [selectedSample.id]: nextPayload,
                }));
              }}
            />
          </label>
          <div className="request-context-card">
            <div>
              <span className="meta-label">POST Route</span>
              <strong className="route-value">{joinRoute(endpoint, '/fogui/compat/a2ui/inbound')}</strong>
            </div>
            <div>
              <span className="meta-label">Focus</span>
              <div className="chip-row">
                {selectedSample.focusComponents.map((component) => (
                  <span key={component} className="chip is-dark">{component}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="runtime-note">
            <span>A2UI target</span>
            <strong>0.8</strong>
            <span>Adapter</span>
            <strong>{showcaseAdapterConformance.ok ? 'ready' : 'invalid'}</strong>
          </div>
        </section>

        <section className="preview-panel glass-panel">
          <div className="panel-heading">
            <h2>Render Preview</h2>
            <p>Canonical result returned by the compatibility endpoint and rendered through the local showcase adapter.</p>
          </div>
          <div className="preview-summary">
            <article>
              <span>Status</span>
              <strong>{selectedRun?.status ?? 'idle'}</strong>
            </article>
            <article>
              <span>Request ID</span>
              <strong>{selectedRun?.requestId ?? 'n/a'}</strong>
            </article>
            <article>
              <span>Translation Errors</span>
              <strong>{translationErrors.length}</strong>
            </article>
            <article>
              <span>Validation Errors</span>
              <strong>{validationErrors.length}</strong>
            </article>
          </div>
          <div className="preview-canvas">
            {displayedResponse ? (
              <FogUIRenderer response={displayedResponse} />
            ) : (
              <div className="empty-state">
                <strong>No response rendered yet.</strong>
                <p>Run a sample to inspect the compatibility endpoint output and its canonical rendering.</p>
              </div>
            )}
          </div>
          {selectedRun?.componentTypes?.length ? (
            <div className="detected-components">
              <span className="meta-label">Detected component types</span>
              <div className="chip-row">
                {selectedRun.componentTypes.map((component) => (
                  <span key={component} className="chip">{component}</span>
                ))}
              </div>
            </div>
          ) : null}
          {selectedRun?.error ? <div className="error-banner">{selectedRun.error}</div> : null}
        </section>

        <section className="results-panel glass-panel">
          <div className="panel-heading">
            <h2>Sample Results</h2>
            <p>Use this table to compare the compatibility outcome for each sample after individual or sequential runs.</p>
          </div>
          <div className="results-table-shell">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Sample</th>
                  <th>Status</th>
                  <th>Expected</th>
                  <th>Detected</th>
                  <th>Last run</th>
                </tr>
              </thead>
              <tbody>
                {a2UiSamples.map((sample) => {
                  const run = sampleRuns[sample.id];
                  return (
                    <tr key={sample.id}>
                      <td>
                        <button
                          type="button"
                          className="inline-link"
                          onClick={() => {
                            setSelectedSampleId(sample.id);
                            setSelectedResultId(sample.id);
                          }}
                        >
                          {sample.title}
                        </button>
                      </td>
                      <td><span className={`status-pill is-${run?.status ?? 'idle'}`}>{run?.status ?? 'idle'}</span></td>
                      <td>{sample.expected}</td>
                      <td>{run?.componentTypes?.join(', ') || 'none'}</td>
                      <td>{formatTimestamp(run?.finishedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="inspect-panel glass-panel">
          <div className="panel-heading">
            <h2>Inspect Response</h2>
            <p>Raw JSON envelope returned by the compatibility endpoint for the selected sample.</p>
          </div>
          <pre className="json-panel">
            {selectedRun?.rawResponse ? JSON.stringify(selectedRun.rawResponse, null, 2) : 'No compatibility response captured yet.'}
          </pre>
        </section>

        <section className="actions-panel glass-panel">
          <div className="panel-heading">
            <h2>Diagnostics</h2>
            <p>Compatibility translation diagnostics and canonical validation diagnostics for the selected result.</p>
          </div>
          <div className="diagnostics-grid">
            <article className="diagnostic-card">
              <div className="diagnostic-card-heading">
                <strong>Translation Errors</strong>
                <span>{translationErrors.length}</span>
              </div>
              {translationErrors.length > 0 ? (
                <div className="results-table-shell">
                  <table className="diagnostic-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Path</th>
                        <th>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {translationErrors.map((diagnostic, index) => (
                        <tr key={`${diagnostic.code ?? 'translation'}-${diagnostic.path ?? 'path'}-${index}`}>
                          <td className="diagnostic-code">{diagnostic.code ?? 'n/a'}</td>
                          <td>{diagnostic.path ?? 'n/a'}</td>
                          <td>{diagnostic.message ?? 'No message provided.'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="diagnostic-empty">No translation diagnostics captured yet.</p>
              )}
            </article>

            <article className="diagnostic-card">
              <div className="diagnostic-card-heading">
                <strong>Validation Errors</strong>
                <span>{validationErrors.length}</span>
              </div>
              {validationErrors.length > 0 ? (
                <div className="results-table-shell">
                  <table className="diagnostic-table">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Path</th>
                        <th>Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationErrors.map((diagnostic, index) => (
                        <tr key={`${diagnostic.code ?? 'validation'}-${diagnostic.path ?? 'path'}-${index}`}>
                          <td className="diagnostic-code">{diagnostic.code ?? 'n/a'}</td>
                          <td>{diagnostic.path ?? 'n/a'}</td>
                          <td>{diagnostic.message ?? 'No message provided.'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="diagnostic-empty">No canonical validation diagnostics captured yet.</p>
              )}
            </article>
          </div>
        </section>
      </section>
    </>
  );
};

function App() {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('transform');

  return (
    <FogUIProvider endpoint={endpoint} adapter={showcaseAdapter}>
      <main className="app-shell">
        {activeTab === 'transform' ? (
          <TransformShowcaseContent
            endpoint={endpoint}
            onEndpointChange={setEndpoint}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        ) : (
          <A2UiShowcaseContent
            endpoint={endpoint}
            onEndpointChange={setEndpoint}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
      </main>
    </FogUIProvider>
  );
}

export default App;