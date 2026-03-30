import {
  FogUIProvider,
  FogUIRenderer,
  type FogUIResponse,
  type FogUIActionErrorPayload,
  type FogUIActionPayload,
  type StreamEvent,
  useFogUI,
} from '@fogui/react';
import { useMemo, useState } from 'react';
import { demoAdapter, demoAdapterConformance } from '../fogui.adapter';

const DEFAULT_ENDPOINT = import.meta.env.VITE_API_URL ?? 'http://localhost:5001';

const DEFAULT_TRANSFORM_PROMPT = 'Create a compact weekly KPI summary using cards and a short list.';
const DEFAULT_STREAM_PROMPT = 'Build a small operations dashboard with a card and one table.';

const COMPAT_PAYLOAD = {
  thinking: [{ status: 'complete', message: 'Generating KPI overview' }],
  content: [
    { type: 'text', value: 'Compatibility payload rendered through FogUI canonical response.' },
    {
      type: 'component',
      componentType: 'Card',
      props: {
        title: 'Compatibility Check',
        description: 'A2UI-like payload converted into FogUI canonical output.',
      },
      children: [
        {
          type: 'component',
          componentType: 'List',
          props: {
            items: ['translation', 'validation', 'render'],
          },
        },
      ],
    },
  ],
};

interface CompatResponse {
  success: boolean;
  result?: FogUIResponse;
  translationErrors?: unknown[];
  validationErrors?: unknown[];
}

type DemoResponseSource = 'compat' | 'stream' | 'transform';

interface CompatDiagnostics {
  translationErrors: unknown[];
  validationErrors: unknown[];
}

interface ResponseSummary {
  source: DemoResponseSource;
  contractVersion: string | null;
  blockCount: number;
  thinkingCount: number;
}

interface DemoContentProps {
  endpoint: string;
  apiKey?: string;
}

function createResponseSummary(source: DemoResponseSource, result: FogUIResponse): ResponseSummary {
  return {
    source,
    contractVersion: result.metadata?.contractVersion ?? null,
    blockCount: result.content.length,
    thinkingCount: result.thinking.length,
  };
}

const DemoContent = ({ endpoint, apiKey }: DemoContentProps) => {
  const { transform, transformStream, isLoading, error, clearError } = useFogUI();

  const [transformPrompt, setTransformPrompt] = useState(DEFAULT_TRANSFORM_PROMPT);
  const [streamPrompt, setStreamPrompt] = useState(DEFAULT_STREAM_PROMPT);
  const [response, setResponse] = useState<FogUIResponse | null>(null);
  const [responseSummary, setResponseSummary] = useState<ResponseSummary | null>(null);
  const [usageSummary, setUsageSummary] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [compatInfo, setCompatInfo] = useState<string | null>(null);
  const [compatDiagnostics, setCompatDiagnostics] = useState<CompatDiagnostics | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);

  const appendEventLog = (scope: string, line: string) => {
    setEventLog((current) => [`${new Date().toISOString()}  ${scope}: ${line}`, ...current].slice(0, 20));
  };

  const resetRunState = () => {
    clearError();
    setManualError(null);
    setUsageSummary(null);
    setCompatInfo(null);
    setCompatDiagnostics(null);
    setResponse(null);
    setResponseSummary(null);
  };

  const applyResponse = (source: DemoResponseSource, nextResponse: FogUIResponse) => {
    setResponse(nextResponse);
    setResponseSummary(createResponseSummary(source, nextResponse));
  };

  const runTransform = async () => {
    resetRunState();
    appendEventLog('transform', 'request started');
    const result = await transform(transformPrompt, {
      intent: 'kpi_summary',
      preferredComponents: ['Card', 'List', 'Table'],
      instructions: 'Keep output concise and production-friendly.',
    });

    if (!result.success || !result.result) {
      const failureMessage = result.success ? 'request failed' : `request failed: ${result.error}`;
      appendEventLog('transform', failureMessage);
      return;
    }

    applyResponse('transform', result.result);
    appendEventLog('transform', 'canonical response rendered');
    if (result.usage) {
      setUsageSummary(
        `model=${result.usage.model} | tokens=${result.usage.transformTokens} | time=${result.usage.processingTimeMs}ms`
      );
      appendEventLog('transform', 'usage received');
    }
  };

  const runStream = async () => {
    resetRunState();
    appendEventLog('stream', 'request started');

    const stream = transformStream(streamPrompt, {
      intent: 'ops_dashboard',
      preferredComponents: ['Card', 'Table'],
      instructions: 'Prefer compact structure with clear labels.',
    });

    for await (const event of stream) {
      handleStreamEvent(event);
    }
  };

  const handleStreamEvent = (event: StreamEvent) => {
    if (event.type === 'result') {
      applyResponse('stream', event.data);
      appendEventLog('stream', 'result received');
      return;
    }

    if (event.type === 'usage') {
      setUsageSummary(`stream usage=${JSON.stringify(event.data)}`);
      appendEventLog('stream', 'usage received');
      return;
    }

    if (event.type === 'error') {
      appendEventLog('stream', `error: ${event.data.error}`);
      return;
    }

    if (event.type === 'done') {
      appendEventLog('stream', 'done');
    }
  };

  const runCompatibility = async () => {
    resetRunState();
    appendEventLog('compat', 'request started');

    try {
      const res = await fetch(`${endpoint}/fogui/compat/a2ui/inbound`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(COMPAT_PAYLOAD),
      });

      const body = (await res.json()) as CompatResponse & { error?: string };
      if (!res.ok) {
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const diagnostics: CompatDiagnostics = {
        translationErrors: Array.isArray(body.translationErrors) ? body.translationErrors : [],
        validationErrors: Array.isArray(body.validationErrors) ? body.validationErrors : [],
      };
      const translationErrorCount = diagnostics.translationErrors.length;
      const validationErrorCount = diagnostics.validationErrors.length;

      setCompatDiagnostics(diagnostics);
      setCompatInfo(
        `success=${body.success} | translationErrors=${translationErrorCount} | validationErrors=${validationErrorCount}`
      );
      appendEventLog('compat', `translationErrors=${translationErrorCount} validationErrors=${validationErrorCount}`);

      if (body.result) {
        applyResponse('compat', body.result);
        appendEventLog('compat', 'canonical response rendered');
      }
    } catch (compatError) {
      const message = compatError instanceof Error ? compatError.message : 'Unknown compatibility error';
      setManualError(message);
      appendEventLog('compat', `error: ${message}`);
    }
  };

  const handleRendererAction = (action: string, data?: unknown) => {
    const suffix = data ? ` ${JSON.stringify(data)}` : '';
    appendEventLog('action', `dispatch ${action}${suffix}`);
  };

  const handleRendererActionStart = (payload: FogUIActionPayload) => {
    appendEventLog('action', `start ${payload.action} from ${payload.sourceComponent}`);
  };

  const handleRendererActionComplete = (payload: FogUIActionPayload) => {
    appendEventLog('action', `complete ${payload.action} from ${payload.sourceComponent}`);
  };

  const handleRendererActionError = (payload: FogUIActionErrorPayload) => {
    const errorMessage = payload.error instanceof Error ? payload.error.message : JSON.stringify(payload.error);
    appendEventLog('action', `error ${payload.action}: ${errorMessage}`);
  };

  const activeError = error || manualError;

  return (
    <div className="demo-grid">
      <section className="panel">
        <h2>1. Transform</h2>
        <p className="muted">Happy-path transform request to `/fogui/transform`.</p>
        <textarea
          value={transformPrompt}
          onChange={(event) => setTransformPrompt(event.target.value)}
          rows={4}
        />
        <button type="button" onClick={runTransform} disabled={isLoading}>
          {isLoading ? 'Running...' : 'Run Transform'}
        </button>
      </section>

      <section className="panel">
        <h2>2. Stream</h2>
        <p className="muted">Streaming request to `/fogui/transform/stream`. The event log also captures action lifecycle callbacks from rendered components.</p>
        <textarea value={streamPrompt} onChange={(event) => setStreamPrompt(event.target.value)} rows={4} />
        <button type="button" onClick={runStream} disabled={isLoading}>
          {isLoading ? 'Streaming...' : 'Run Stream'}
        </button>
        <p className="muted section-label">Event Log</p>
        <pre data-testid="event-log" className="event-log">{eventLog.length > 0 ? eventLog.join('\n') : 'No demo events yet.'}</pre>
      </section>

      <section className="panel">
        <h2>3. A2UI Compatibility</h2>
        <p className="muted">Deterministic translation request to `/fogui/compat/a2ui/inbound`.</p>
        <button type="button" onClick={runCompatibility} disabled={isLoading}>
          Run Compatibility Translation
        </button>
        <pre>{JSON.stringify(COMPAT_PAYLOAD, null, 2)}</pre>
      </section>

      <section className="panel output-panel">
        <h2>Render Output</h2>
        <p className="muted" data-testid="adapter-conformance">
          adapter={demoAdapterConformance.ok ? 'ready' : 'invalid'} | requiredMappings={demoAdapterConformance.requiredComponents.length}
        </p>
        <p className="muted">backend translates and validates; React only renders canonical responses.</p>
        {usageSummary ? <p className="muted">{usageSummary}</p> : null}
        {responseSummary ? (
          <p className="muted" data-testid="response-summary">
            source={responseSummary.source} | contract={responseSummary.contractVersion ?? 'missing'} | blocks={responseSummary.blockCount} | thinking={responseSummary.thinkingCount}
          </p>
        ) : null}
        {compatInfo ? <p className="muted">{compatInfo}</p> : null}
        {compatDiagnostics ? (
          <details data-testid="compat-diagnostics" className="details-panel">
            <summary>Compatibility diagnostics</summary>
            <pre>{JSON.stringify(compatDiagnostics, null, 2)}</pre>
          </details>
        ) : null}
        {activeError ? <p className="error">{activeError}</p> : null}
        {response ? (
          <FogUIRenderer
            response={response}
            onAction={handleRendererAction}
            onActionStart={handleRendererActionStart}
            onActionComplete={handleRendererActionComplete}
            onActionError={handleRendererActionError}
          />
        ) : <p className="muted">No rendered response yet.</p>}
      </section>
    </div>
  );
};

export const FogUIDemo = () => {
  const [endpoint, setEndpoint] = useState(DEFAULT_ENDPOINT);
  const [apiKey, setApiKey] = useState('');

  const normalizedApiKey = useMemo(() => apiKey.trim(), [apiKey]);

  return (
    <main className="shell">
      <header className="panel">
        <h1>FogUI Minimal Integration Demo</h1>
        <p className="muted">
          Verifies transform, stream, and A2UI compatibility flows against the reference server using canonical FogUI responses.
        </p>
        <label>
          <span>API Endpoint</span>
          <input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} />
        </label>
        <label>
          <span>API Key (optional)</span>
          <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="fog_live_xxx" />
        </label>
        <p className="muted">This demo uses a local adapter with explicit conformance instead of a bundled UI-kit adapter.</p>
      </header>

      <FogUIProvider
        endpoint={endpoint}
        apiKey={normalizedApiKey || undefined}
        adapter={demoAdapter}
        contractVersion={{ expected: 'fogui/1.0' }}
      >
        <DemoContent endpoint={endpoint} apiKey={normalizedApiKey || undefined} />
      </FogUIProvider>
    </main>
  );
};
