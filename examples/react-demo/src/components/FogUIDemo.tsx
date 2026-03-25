import {
  FogUIProvider,
  FogUIRenderer,
  type FogUIResponse,
  type StreamEvent,
  useFogUI,
} from '@fogui/react';
import { useMemo, useState } from 'react';
import { demoAdapter } from '../fogui.adapter';

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

interface DemoContentProps {
  endpoint: string;
  apiKey?: string;
}

const DemoContent = ({ endpoint, apiKey }: DemoContentProps) => {
  const { transform, transformStream, isLoading, error, clearError } = useFogUI();

  const [transformPrompt, setTransformPrompt] = useState(DEFAULT_TRANSFORM_PROMPT);
  const [streamPrompt, setStreamPrompt] = useState(DEFAULT_STREAM_PROMPT);
  const [response, setResponse] = useState<FogUIResponse | null>(null);
  const [usageSummary, setUsageSummary] = useState<string | null>(null);
  const [streamLog, setStreamLog] = useState<string[]>([]);
  const [compatInfo, setCompatInfo] = useState<string | null>(null);

  const appendStreamLog = (line: string) => {
    setStreamLog((current) => [`${new Date().toISOString()}  ${line}`, ...current].slice(0, 12));
  };

  const runTransform = async () => {
    clearError();
    setUsageSummary(null);
    setCompatInfo(null);
    const result = await transform(transformPrompt, {
      intent: 'kpi_summary',
      preferredComponents: ['Card', 'List', 'Table'],
      instructions: 'Keep output concise and production-friendly.',
    });

    if (!result.success || !result.result) {
      return;
    }

    setResponse(result.result);
    if (result.usage) {
      setUsageSummary(
        `model=${result.usage.model} | tokens=${result.usage.transformTokens} | time=${result.usage.processingTimeMs}ms`
      );
    }
  };

  const runStream = async () => {
    clearError();
    setUsageSummary(null);
    setCompatInfo(null);
    setStreamLog([]);

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
      setResponse(event.data);
      appendStreamLog('result received');
      return;
    }

    if (event.type === 'usage') {
      setUsageSummary(`stream usage=${JSON.stringify(event.data)}`);
      appendStreamLog('usage received');
      return;
    }

    if (event.type === 'error') {
      appendStreamLog(`error: ${event.data.error}`);
      return;
    }

    if (event.type === 'done') {
      appendStreamLog('done');
    }
  };

  const runCompatibility = async () => {
    clearError();
    setUsageSummary(null);
    setCompatInfo(null);

    const res = await fetch(`${endpoint}/fogui/compat/a2ui/inbound`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(COMPAT_PAYLOAD),
    });

    const body = (await res.json()) as CompatResponse;
    const translationErrors = Array.isArray(body.translationErrors) ? body.translationErrors.length : 0;
    const validationErrors = Array.isArray(body.validationErrors) ? body.validationErrors.length : 0;

    setCompatInfo(
      `success=${body.success} | translationErrors=${translationErrors} | validationErrors=${validationErrors}`
    );

    if (body.result) {
      setResponse(body.result);
    }
  };

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
        <p className="muted">Streaming request to `/fogui/transform/stream`.</p>
        <textarea value={streamPrompt} onChange={(event) => setStreamPrompt(event.target.value)} rows={4} />
        <button type="button" onClick={runStream} disabled={isLoading}>
          {isLoading ? 'Streaming...' : 'Run Stream'}
        </button>
        <pre>{streamLog.length > 0 ? streamLog.join('\n') : 'No stream events yet.'}</pre>
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
        {usageSummary ? <p className="muted">{usageSummary}</p> : null}
        {compatInfo ? <p className="muted">{compatInfo}</p> : null}
        {error ? <p className="error">{error}</p> : null}
        {response ? <FogUIRenderer response={response} /> : <p className="muted">No rendered response yet.</p>}
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
          Verifies transform, stream, and A2UI compatibility flows against the reference server.
        </p>
        <label>
          API Endpoint
          <input value={endpoint} onChange={(event) => setEndpoint(event.target.value)} />
        </label>
        <label>
          API Key (optional)
          <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="fog_live_xxx" />
        </label>
      </header>

      <FogUIProvider endpoint={endpoint} apiKey={normalizedApiKey || undefined} adapter={demoAdapter}>
        <DemoContent endpoint={endpoint} apiKey={normalizedApiKey || undefined} />
      </FogUIProvider>
    </main>
  );
};
