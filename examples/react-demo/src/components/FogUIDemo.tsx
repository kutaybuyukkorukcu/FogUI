import { FogUIProvider, FogUIRenderer } from '@fogui/react';
import type { FogUIResponse } from '@fogui/react';
import { useMemo, useState } from 'react';
import { demoAdapter } from '../fogui.adapter';

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
              { type: 'text', value: 'Revenue is up 14% compared to last quarter.' },
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
        componentType: 'Tabs',
        props: {},
        children: [
          {
            type: 'component',
            componentType: 'TabPane',
            props: { title: 'Overview' },
            children: [
              {
                type: 'component',
                componentType: 'List',
                props: {
                  ordered: false,
                  items: ['Executive summary', 'KPIs', 'Goals'],
                },
              },
            ],
          },
          {
            type: 'component',
            componentType: 'TabPane',
            props: { title: 'Tasks' },
            children: [
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
    ],
  },
};

interface FogUIDemoContentProps {
  readonly actionLog: Array<{ action: string; data?: unknown }>;
  readonly onAction: (action: string, data?: unknown) => void;
}

function FogUIDemoContent({ actionLog, onAction }: FogUIDemoContentProps) {
  const [activeExample, setActiveExample] = useState<keyof typeof exampleResponses>('Dashboard');

  const response = exampleResponses[activeExample];
  const exampleKeys = useMemo(() => Object.keys(exampleResponses), []);

  return (
    <div style={{ maxWidth: '940px', margin: '0 auto', padding: '24px', fontFamily: 'ui-sans-serif, system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '4px' }}>FogUI React Demo</h1>
      <p style={{ marginTop: 0, color: '#4a5568' }}>
        Static canonical payloads rendered through a local adapter.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {exampleKeys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveExample(key as keyof typeof exampleResponses)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d0d7de',
              borderRadius: '8px',
              background: activeExample === key ? '#0f172a' : '#ffffff',
              color: activeExample === key ? '#ffffff' : '#111827',
              cursor: 'pointer',
            }}
          >
            {key}
          </button>
        ))}
      </div>

      <div style={{ border: '1px solid #e5e7eb', padding: '16px', borderRadius: '10px' }}>
        <FogUIRenderer response={response} onAction={onAction} />
      </div>

      <div style={{ marginTop: '16px', display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
        <section style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0 }}>Action Log</h3>
          {actionLog.length === 0 ? (
            <p style={{ margin: 0, color: '#64748b' }}>Trigger a button action to populate this list.</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '18px' }}>
              {actionLog.map((entry, index) => (
                <li key={`${entry.action}-${index}`}>
                  <code>{entry.action}</code>
                  {entry.data ? ` ${JSON.stringify(entry.data)}` : ''}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0 }}>Response JSON</h3>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px' }}>
            {JSON.stringify(response, null, 2)}
          </pre>
        </section>
      </div>
    </div>
  );
}

export function FogUIDemo() {
  const [actionLog, setActionLog] = useState<Array<{ action: string; data?: unknown }>>([]);

  const handleAction = (action: string, data?: unknown) => {
    setActionLog((prev) => [{ action, data }, ...prev].slice(0, 10));
    console.log('Demo action:', action, data);
  };

  return (
    <FogUIProvider
      apiKey="demo-key"
      adapter={demoAdapter}
      onAction={handleAction}
    >
      <FogUIDemoContent actionLog={actionLog} onAction={handleAction} />
    </FogUIProvider>
  );
}
