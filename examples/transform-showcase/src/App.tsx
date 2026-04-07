import {
  FogUIProvider,
  FogUIRenderer,
  type FogUIActionErrorPayload,
  type FogUIActionPayload,
  type FogUIResponse,
  useFogUI,
} from '@fogui/react';
import { startTransition, useState } from 'react';
import { showcaseAdapter, showcaseAdapterConformance } from './demoAdapter';
import { defaultScenarioId, transformScenarios, type TransformScenario } from './scenarios';

const DEFAULT_ENDPOINT = import.meta.env.VITE_API_URL ?? 'http://localhost:5001';

type RunStatus = 'idle' | 'running' | 'success' | 'error';

interface ScenarioRun {
  readonly status: RunStatus;
  readonly prompt: string;
  readonly response?: FogUIResponse;
  readonly usage?: {
    readonly model?: string;
    readonly transformTokens?: number;
    readonly processingTimeMs?: number;
    readonly estimatedCost?: unknown;
  };
  readonly error?: string;
  readonly componentTypes?: readonly string[];
  readonly finishedAt?: string;
}

function findScenarioById(id: string): TransformScenario {
  return transformScenarios.find((scenario) => scenario.id === id) ?? transformScenarios[0];
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

interface ShowcaseContentProps {
  readonly endpoint: string;
  readonly onEndpointChange: (value: string) => void;
}

const ShowcaseContent = ({ endpoint, onEndpointChange }: ShowcaseContentProps) => {
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
    appendActionLog(`${action}${data ? ` ${JSON.stringify(data)}` : ''}`);
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
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Backend-first manual validation</p>
          <h1>FogUI Transform Showcase</h1>
          <p className="hero-copy">
            This app only exercises the canonical transform path. Pick a canned query for each component family,
            send it to the backend, and inspect the rendered result plus the raw canonical response in one place.
          </p>
        </div>
        <div className="hero-stats">
          <article>
            <span>Scenarios</span>
            <strong>{transformScenarios.length}</strong>
          </article>
          <article>
            <span>Completed</span>
            <strong>{totalCompleted}</strong>
          </article>
          <article>
            <span>Successful</span>
            <strong>{totalSuccessful}</strong>
          </article>
          <article>
            <span>Failed</span>
            <strong>{totalFailed}</strong>
          </article>
        </div>
      </section>

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
    </main>
  );
};

function App() {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);

  return (
    <FogUIProvider endpoint={endpoint} adapter={showcaseAdapter}>
      <ShowcaseContent endpoint={endpoint} onEndpointChange={setEndpoint} />
    </FogUIProvider>
  );
}

export default App;