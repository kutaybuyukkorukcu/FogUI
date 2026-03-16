import {
  FogUIProvider,
  FogUIRenderer,
  applyFogUIPatches,
  useFogUI,
  type FogUIActionErrorPayload,
  type FogUIActionPayload,
  type FogUIPatchOperation,
  type FogUIResponse,
} from '@fogui/react';
import { useEffect, useMemo, useState } from 'react';
import React from 'react';
// Simple error boundary for demo
class DemoErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return <div style={{ color: 'red', padding: 16, background: '#1a1a1a', borderRadius: 8 }}>
        <strong>Render Error:</strong>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{String(this.state.error)}</pre>
      </div>;
    }
    return this.props.children;
  }
}
import { demoAdapter } from '../fogui.adapter';

type DemoMode = 'mock' | 'live';
type LogEntry = { kind: string; action?: string; data?: unknown; note?: string; timestamp: string };

interface StreamDebugEvent {
  readonly type: string;
  readonly at: string;
  readonly deltaMs: number;
  readonly detail?: unknown;
}

interface StreamDebugReport {
  readonly runId: string;
  readonly mode: DemoMode;
  readonly example: string;
  readonly promptLength: number;
  readonly endpoint: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly durationMs: number;
  readonly stats: {
    readonly chunks: number;
    readonly chunkChars: number;
    readonly avgChunkChars: number;
    readonly maxChunkChars: number;
    readonly patches: number;
    readonly patchOps: number;
    readonly errors: number;
    readonly hasResult: boolean;
    readonly hasDone: boolean;
    readonly hasUsage: boolean;
    readonly hasValidationError: boolean;
    readonly hasNetworkError: boolean;
  };
  readonly notes: string[];
  readonly usage?: unknown;
  readonly finalResultSummary?: {
    readonly contentCount: number;
    readonly blockTypes: string[];
  };
  readonly errors: unknown[];
  readonly events: StreamDebugEvent[];
}

const streamPrompts: Record<string, string> = {
  Dashboard: 'Create a compact revenue dashboard with KPI badges and one summary card.',
  DataTable: 'Create a user report table with columns Name, Role, Sessions and 5 sample rows.',
  FormFlow: 'Create an onboarding form with company name, team size, and submit button.',
  Navigation: 'Create a card with two lists: overview topics and prioritized tasks.',
};

const exampleResponses: Record<string, FogUIResponse> = {
  Dashboard: {
    thinking: [{ status: 'complete', message: 'Build compact dashboard cards' }],
    content: [
      {
        type: 'component',
        componentType: 'Stack',
        props: { direction: 'vertical', gap: 12 },
        children: [
          {
            type: 'component',
            componentType: 'Card',
            props: {
              title: 'Revenue Overview',
              description: 'Quarterly snapshot',
            },
            children: [
              {
                type: 'component',
                componentType: 'Badge',
                props: { label: 'Revenue is up 14% compared to last quarter.' },
              },
              {
                type: 'component',
                componentType: 'Grid',
                props: { columns: 3, gap: 8 },
                children: [
                  {
                    type: 'component',
                    componentType: 'Badge',
                    props: { label: 'MRR +8%' },
                  },
                  {
                    type: 'component',
                    componentType: 'Badge',
                    props: { label: 'Churn -1.2%' },
                  },
                  {
                    type: 'component',
                    componentType: 'Badge',
                    props: { label: 'NPS 61' },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  DataTable: {
    thinking: [{ status: 'complete', message: 'Render user report table' }],
    content: [
      {
        type: 'component',
        componentType: 'Card',
        props: {
          title: 'User Report',
          description: 'Top active users this week',
        },
        children: [
          {
            type: 'component',
            componentType: 'Table',
            props: {
              headers: ['Name', 'Role', 'Sessions'],
              rows: [
                ['Alice', 'Admin', 31],
                ['Ben', 'Editor', 24],
                ['Cem', 'Viewer', 16],
              ],
            },
          },
        ],
      },
    ],
  },
  FormFlow: {
    thinking: [{ status: 'active', message: 'Create onboarding form and CTA' }],
    content: [
      {
        type: 'component',
        componentType: 'Card',
        props: {
          title: 'Team Onboarding',
          description: 'Collect initial workspace details',
        },
        children: [
          {
            type: 'component',
            componentType: 'Form',
            props: { id: 'onboarding-form' },
            children: [
              {
                type: 'component',
                componentType: 'Stack',
                props: { direction: 'vertical', gap: 10 },
                children: [
                  {
                    type: 'component',
                    componentType: 'Input',
                    props: { placeholder: 'Company name', type: 'text' },
                  },
                  {
                    type: 'component',
                    componentType: 'Input',
                    props: { placeholder: 'Team size', type: 'number' },
                  },
                  {
                    type: 'component',
                    componentType: 'Button',
                    props: { label: 'Create Workspace', action: 'create_workspace' },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  Navigation: {
    thinking: [{ status: 'complete', message: 'Present navigation patterns' }],
    content: [
      {
        type: 'component',
        componentType: 'Card',
        props: {
          title: 'Navigation',
          description: 'Common sections and tasks',
        },
        children: [
          {
            type: 'component',
            componentType: 'List',
            props: {
              ordered: false,
              items: ['Executive summary', 'KPIs', 'Goals'],
            },
          },
          {
            type: 'component',
            componentType: 'List',
            props: {
              ordered: true,
              items: ['Review roadmap', 'Prioritize bugs', 'Ship patch release'],
            },
          },
        ],
      },
    ],
  },
};

interface FogUIDemoContentProps {
  readonly actionLog: LogEntry[];
  readonly onAction: (action: string, data?: unknown) => void;
  readonly onApplyPatch: (patches: FogUIPatchOperation[]) => void;
  readonly onStreamLog: (entry: { kind: string; action?: string; data?: unknown; note?: string }) => void;
  readonly mode: DemoMode;
  readonly setMode: (mode: DemoMode) => void;
  readonly endpoint: string;
}

function FogUIDemoContent({ actionLog, onAction, onApplyPatch, onStreamLog, mode, setMode, endpoint }: FogUIDemoContentProps) {
  const { transformStream, applyPatches, isLoading, error } = useFogUI();
  const [activeExample, setActiveExample] = useState<keyof typeof exampleResponses>('Dashboard');
  const [response, setResponse] = useState<FogUIResponse>(exampleResponses.Dashboard);
  const [prompt, setPrompt] = useState(streamPrompts.Dashboard);
  const [latestStreamDebug, setLatestStreamDebug] = useState<StreamDebugReport | null>(null);
  const [copyStatus, setCopyStatus] = useState<string>('');

  const exampleKeys = useMemo(() => Object.keys(exampleResponses) as Array<keyof typeof exampleResponses>, []);

  useEffect(() => {
    setResponse(exampleResponses[activeExample]);
    setPrompt(streamPrompts[activeExample]);
  }, [activeExample]);

  const buildExamplePatch = (): FogUIPatchOperation[] => {
    const patchedMetadata = {
      ...response.metadata,
      patchMode: true,
      lastPatchedAt: new Date().toISOString(),
    };

    if (activeExample === 'DataTable') {
      const rows = (response.content[0] as { children?: Array<{ props?: { rows?: unknown[] } }> })
        .children?.[0]?.props?.rows;
      const sessionValue = Array.isArray(rows) ? rows.length * 5 + 14 : 20;

      return [
        {
          op: 'append',
          path: '/content/0/children/0/props/rows',
          value: ['Nora', 'Analyst', sessionValue],
        },
        {
          op: 'replace',
          path: '/metadata',
          value: patchedMetadata,
        },
      ];
    }

    if (activeExample === 'Dashboard') {
      return [
        {
          op: 'append',
          path: '/content/0/children/0/children/1/children',
          value: {
            type: 'component',
            componentType: 'Badge',
            props: { label: `Live +${Math.floor(Math.random() * 4) + 1}%` },
          },
        },
        {
          op: 'replace',
          path: '/metadata',
          value: patchedMetadata,
        },
      ];
    }

    return [
      {
        op: 'append',
        path: '/content',
        value: {
          type: 'text',
          value: `Incremental update @ ${new Date().toLocaleTimeString()}`,
        },
      },
      {
        op: 'replace',
        path: '/metadata',
        value: patchedMetadata,
      },
    ];
  };

  const applyDemoPatch = () => {
    const patches = buildExamplePatch();

    setResponse((prev) => applyFogUIPatches(prev, patches));
    onApplyPatch(patches);
  };

  const runLiveStream = async () => {
    const startedAt = new Date();
    const runId = `${startedAt.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
    const debugEvents: StreamDebugEvent[] = [];
    const debugErrors: unknown[] = [];
    const notes: string[] = [];
    let chunkChars = 0;
    let maxChunkChars = 0;
    let chunks = 0;
    let patches = 0;
    let patchOps = 0;
    let errors = 0;
    let hasResult = false;
    let hasDone = false;
    let hasUsage = false;
    let usagePayload: unknown;
    let finalResultSummary: { contentCount: number; blockTypes: string[] } | undefined;

    const pushDebugEvent = (type: string, detail?: unknown) => {
      const now = new Date();
      debugEvents.push({
        type,
        at: now.toISOString(),
        deltaMs: now.getTime() - startedAt.getTime(),
        detail,
      });
    };

    setResponse({ thinking: [], content: [] });
    onStreamLog({ kind: 'stream:start', note: `run=${runId} example=${activeExample}` });
    pushDebugEvent('stream:start', { runId, example: activeExample, promptLength: prompt.length });

    try {
      const stream = transformStream(prompt, {
        intent: activeExample.toLowerCase(),
        stream: {
          includeChunks: false,
          preferPatches: true,
        },
      });

      for await (const event of stream) {
        pushDebugEvent(event.type);

        if (event.type === 'patch') {
          const patchData = event.data as FogUIPatchOperation[];
          patches += 1;
          patchOps += patchData.length;
          setResponse((prev) => applyPatches(prev, patchData));
          onStreamLog({ kind: 'stream:patch', note: `ops=${patchData.length}`, data: patchData });
        }

        if (event.type === 'result') {
          const resultData = event.data as FogUIResponse;
          hasResult = true;
          finalResultSummary = {
            contentCount: Array.isArray(resultData?.content) ? resultData.content.length : 0,
            blockTypes: Array.isArray(resultData?.content)
              ? resultData.content.map((block) => `${block.type}:${'componentType' in block ? String(block.componentType) : 'text'}`)
              : [],
          };
          const hasRenderableContent = Array.isArray(resultData?.content) && resultData.content.length > 0;
          if (hasRenderableContent) {
            setResponse(resultData);
            onStreamLog({ kind: 'stream:result', note: 'final canonical snapshot received' });
          } else {
            onStreamLog({
              kind: 'stream:result',
              note: 'final snapshot was empty; keeping patch-rendered state',
              data: resultData,
            });
          }
        }

        if (event.type === 'usage') {
          hasUsage = true;
          usagePayload = event.data;
          onStreamLog({ kind: 'stream:usage', data: event.data });
        }

        if (event.type === 'chunk') {
          const chunkText = String(event.data ?? '');
          chunks += 1;
          chunkChars += chunkText.length;
          maxChunkChars = Math.max(maxChunkChars, chunkText.length);
          onStreamLog({ kind: 'stream:chunk', note: `len=${chunkText.length} ${chunkText.slice(0, 60)}` });
        }

        if (event.type === 'error') {
          errors += 1;
          debugErrors.push(event.data);
          onStreamLog({ kind: 'stream:error', data: event.data });
        }

        if (event.type === 'done') {
          hasDone = true;
          onStreamLog({ kind: 'stream:done' });
        }
      }
    } catch (streamError) {
      errors += 1;
      debugErrors.push(streamError instanceof Error ? streamError.message : streamError);
      pushDebugEvent('stream:exception', streamError instanceof Error ? streamError.message : streamError);
      onStreamLog({
        kind: 'stream:error',
        data: streamError instanceof Error ? streamError.message : streamError,
      });
    } finally {
      if (hasDone && !hasResult) {
        notes.push('done received before result or result missing');
      }

      if (errors > 0 && hasDone) {
        notes.push('error and done both received in same run; likely transport interruption or backend stream close race');
      }

      const hasValidationError = debugErrors.some((item) =>
        String(typeof item === 'object' ? JSON.stringify(item) : item).toLowerCase().includes('validation')
      );
      const hasNetworkError = debugErrors.some((item) =>
        String(typeof item === 'object' ? JSON.stringify(item) : item).toLowerCase().includes('network')
      );

      if (hasNetworkError) {
        notes.push('network-level stream failure detected; check backend/proxy chunked response completion');
      }

      if (hasValidationError) {
        notes.push('client-side stream validation failed; inspect malformed/truncated chunk payload');
      }

      const endedAt = new Date();
      const durationMs = endedAt.getTime() - startedAt.getTime();
      const report: StreamDebugReport = {
        runId,
        mode,
        example: activeExample,
        promptLength: prompt.length,
        endpoint,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationMs,
        stats: {
          chunks,
          chunkChars,
          avgChunkChars: chunks > 0 ? Number((chunkChars / chunks).toFixed(2)) : 0,
          maxChunkChars,
          patches,
          patchOps,
          errors,
          hasResult,
          hasDone,
          hasUsage,
          hasValidationError,
          hasNetworkError,
        },
        notes,
        usage: usagePayload,
        finalResultSummary,
        errors: debugErrors,
        events: debugEvents,
      };

      setLatestStreamDebug(report);
    }
  };

  const copyLatestDebug = async () => {
    if (!latestStreamDebug) {
      setCopyStatus('No stream debug report yet.');
      return;
    }

    try {
      await navigator.clipboard.writeText(JSON.stringify(latestStreamDebug, null, 2));
      setCopyStatus('Copied stream debug report to clipboard.');
    } catch {
      setCopyStatus('Clipboard copy failed. Select and copy the JSON manually.');
    }
  };

  return (
    <div style={{
      maxWidth: '1080px',
      margin: '0 auto',
      padding: '28px 20px 36px',
      color: 'var(--text)',
    }}>
      <div style={{ marginBottom: '18px' }}>
        <h1 style={{ marginBottom: '6px', fontSize: 'clamp(2rem, 4vw, 3rem)' }}>FogUI React Demo</h1>
        <p style={{ marginTop: 0, color: 'var(--text-dim)', fontSize: '0.98rem' }}>
        Toggle between local mock patches and live backend stream patches.
        </p>
      </div>

      <div style={{
        border: '1px solid var(--panel-border)',
        background: 'var(--panel)',
        padding: '12px',
        borderRadius: '12px',
        marginBottom: '14px',
        display: 'grid',
        gap: '10px',
      }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setMode('mock')}
            style={{
              padding: '8px 12px',
              borderRadius: '999px',
              border: mode === 'mock' ? '1px solid #7cdcf4' : '1px solid rgba(124, 220, 244, 0.24)',
              background: mode === 'mock' ? 'rgba(81, 213, 243, 0.16)' : 'rgba(4, 20, 31, 0.58)',
              color: 'var(--text-strong)',
              cursor: 'pointer',
            }}
          >
            Mock Mode
          </button>
          <button
            type="button"
            onClick={() => setMode('live')}
            style={{
              padding: '8px 12px',
              borderRadius: '999px',
              border: mode === 'live' ? '1px solid #9df0c0' : '1px solid rgba(157, 240, 192, 0.28)',
              background: mode === 'live' ? 'rgba(157, 240, 192, 0.14)' : 'rgba(4, 20, 31, 0.58)',
              color: 'var(--text-strong)',
              cursor: 'pointer',
            }}
          >
            Live Stream Mode
          </button>
        </div>

        {mode === 'live' && (
          <>
            <label style={{ color: 'var(--text-dim)', fontSize: '0.9rem' }}>Prompt for streaming transform</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                borderRadius: '10px',
                border: '1px solid rgba(124, 220, 244, 0.35)',
                background: 'rgba(2, 17, 26, 0.7)',
                color: 'var(--text-strong)',
                padding: '10px',
                resize: 'vertical',
              }}
            />
            {error && <div style={{ color: '#ff9b9b', fontSize: '0.9rem' }}>{error}</div>}
          </>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
        {exampleKeys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveExample(key)}
            style={{
              padding: '9px 14px',
              border: activeExample === key ? '1px solid #7cdcf4' : '1px solid rgba(124, 220, 244, 0.24)',
              borderRadius: '999px',
              background: activeExample === key
                ? 'linear-gradient(135deg, rgba(81, 213, 243, 0.22), rgba(157, 240, 192, 0.15))'
                : 'rgba(4, 20, 31, 0.58)',
              color: activeExample === key ? 'var(--text-strong)' : 'var(--text)',
              fontWeight: 700,
              letterSpacing: '0.01em',
              cursor: 'pointer',
              backdropFilter: 'blur(4px)',
            }}
          >
            {key}
          </button>
        ))}
      </div>

      <div style={{
        border: '1px solid var(--panel-border)',
        background: 'var(--panel)',
        padding: '18px',
        borderRadius: '14px',
        boxShadow: '0 16px 28px rgba(0, 0, 0, 0.25)',
      }}>
        {Array.isArray(response.content) && response.content.length > 0 ? (
          <FogUIRenderer response={response} onAction={onAction} />
        ) : (
          <div style={{ color: 'var(--text-dim)', fontSize: '0.92rem' }}>
            No renderable content in current response. Check the Response JSON panel for content shape.
          </div>
        )}
      </div>

      <div style={{ marginTop: '14px' }}>
        {mode === 'mock' ? (
          <button
            type="button"
            onClick={applyDemoPatch}
            style={{
              padding: '10px 16px',
              border: '1px solid rgba(255, 209, 102, 0.45)',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(255, 209, 102, 0.18), rgba(255, 209, 102, 0.06))',
              color: 'var(--warning)',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Apply Mock Incremental Patch
          </button>
        ) : (
          <button
            type="button"
            onClick={runLiveStream}
            disabled={isLoading}
            style={{
              padding: '10px 16px',
              border: '1px solid rgba(157, 240, 192, 0.45)',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(157, 240, 192, 0.2), rgba(157, 240, 192, 0.08))',
              color: 'var(--accent-2)',
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
            }}
          >
            {isLoading ? 'Streaming...' : 'Run Live Stream Patch Demo'}
          </button>
        )}
      </div>

      <div style={{
        marginTop: '18px',
        display: 'grid',
        gap: '14px',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      }}>
        <section style={{
          border: '1px solid var(--panel-border)',
          background: 'var(--panel)',
          padding: '14px',
          borderRadius: '12px',
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Lifecycle Log</h3>
          {actionLog.length === 0 ? (
            <p style={{ margin: 0, color: 'var(--text-dim)' }}>Trigger an action or apply a patch to populate this list.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'grid', gap: '7px' }}>
              {actionLog.map((entry, index) => (
                <li key={`${entry.kind}-${entry.action ?? 'none'}-${index}`} style={{ color: 'var(--text)', lineHeight: 1.4 }}>
                  <code style={{ color: 'var(--accent-2)' }}>{entry.kind}</code>
                  {` ${entry.timestamp}`}
                  {entry.action ? ` action=${entry.action}` : ''}
                  {entry.note ? ` ${entry.note}` : ''}
                  {entry.data ? ` ${JSON.stringify(entry.data)}` : ''}
                </li>
              ))}
            </ul>
          )}

          <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={copyLatestDebug}
              style={{
                padding: '8px 12px',
                border: '1px solid rgba(124, 220, 244, 0.35)',
                borderRadius: '8px',
                background: 'rgba(4, 20, 31, 0.6)',
                color: 'var(--text-strong)',
                cursor: 'pointer',
              }}
            >
              Copy Latest Stream Debug JSON
            </button>
          </div>
          {copyStatus && <p style={{ margin: '8px 0 0', color: 'var(--text-dim)', fontSize: '0.85rem' }}>{copyStatus}</p>}

          {latestStreamDebug && (
            <pre style={{
              marginTop: '10px',
              marginBottom: 0,
              maxHeight: '260px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: '11px',
              color: 'var(--text)',
              lineHeight: 1.35,
              border: '1px solid rgba(124, 220, 244, 0.2)',
              borderRadius: '8px',
              padding: '8px',
              background: 'rgba(1, 10, 16, 0.4)',
            }}>
              {JSON.stringify(latestStreamDebug, null, 2)}
            </pre>
          )}
        </section>

        <section style={{
          border: '1px solid var(--panel-border)',
          background: 'var(--panel)',
          padding: '14px',
          borderRadius: '12px',
        }}>
          <h3 style={{ marginTop: 0, marginBottom: '10px' }}>Response JSON</h3>
          <pre style={{
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '12px',
            color: 'var(--text)',
            lineHeight: 1.45,
          }}>
            {JSON.stringify(response, null, 2)}
          </pre>
        </section>
      </div>
    </div>
  );
}

export function FogUIDemo() {
  const [actionLog, setActionLog] = useState<LogEntry[]>([]);
  const [mode, setMode] = useState<DemoMode>('mock');
  const [apiKey, setApiKey] = useState('fog_live_7cd49b8942e4181f0bee0980063d23cd');
  const [endpoint, setEndpoint] = useState('http://localhost:8080');

  const appendLog = (entry: { kind: string; action?: string; data?: unknown; note?: string }) => {
    const withTimestamp: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    };
    setActionLog((prev) => [withTimestamp, ...prev].slice(0, 120));
  };

  const handleAction = (action: string, data?: unknown) => {
    appendLog({ kind: 'legacy:onAction', action, data });
    console.log('Demo action:', action, data);
  };

  const handleActionStart = (payload: FogUIActionPayload) => {
    appendLog({
      kind: 'onActionStart',
      action: payload.action,
      data: payload.data,
      note: `source=${payload.sourceComponent}`,
    });
  };

  const handleActionComplete = (payload: FogUIActionPayload) => {
    appendLog({
      kind: 'onActionComplete',
      action: payload.action,
      note: `source=${payload.sourceComponent}`,
    });
  };

  const handleActionError = (payload: FogUIActionErrorPayload) => {
    appendLog({
      kind: 'onActionError',
      action: payload.action,
      note: `source=${payload.sourceComponent}`,
      data: payload.error instanceof Error ? payload.error.message : payload.error,
    });
  };

  const handlePatch = (patches: FogUIPatchOperation[]) => {
    appendLog({ kind: 'patch:applied', data: patches });
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '16px 20px 0' }}>
      <div style={{
        border: '1px solid var(--panel-border)',
        background: 'var(--panel)',
        borderRadius: '12px',
        padding: '12px',
        display: 'grid',
        gap: '8px',
      }}>
        <label style={{ color: 'var(--text-dim)', fontSize: '0.86rem' }}>FogUI API Key</label>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="fog_live_..."
          style={{
            width: '100%',
            borderRadius: '8px',
            border: '1px solid rgba(124, 220, 244, 0.35)',
            background: 'rgba(2, 17, 26, 0.7)',
            color: 'var(--text-strong)',
            padding: '8px 10px',
          }}
        />
        <label style={{ color: 'var(--text-dim)', fontSize: '0.86rem' }}>Endpoint</label>
        <input
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="http://localhost:8080"
          style={{
            width: '100%',
            borderRadius: '8px',
            border: '1px solid rgba(124, 220, 244, 0.35)',
            background: 'rgba(2, 17, 26, 0.7)',
            color: 'var(--text-strong)',
            padding: '8px 10px',
          }}
        />
      </div>

      <FogUIProvider
        apiKey={apiKey}
        endpoint={endpoint}
        adapter={demoAdapter}
        onAction={handleAction}
        onActionStart={handleActionStart}
        onActionComplete={handleActionComplete}
        onActionError={handleActionError}
      >
        <DemoErrorBoundary>
          <FogUIDemoContent
            actionLog={actionLog}
            onAction={handleAction}
            onApplyPatch={handlePatch}
            onStreamLog={appendLog}
            mode={mode}
            setMode={setMode}
            endpoint={endpoint}
          />
        </DemoErrorBoundary>
      </FogUIProvider>
    </div>
  );
}
