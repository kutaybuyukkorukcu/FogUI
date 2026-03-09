import { GenUIProvider, GenUIRenderer, useGenUI } from '../../lib/genui-sdk';

import type { GenerativeUIResponse } from '../../types';
import { useState } from 'react';

interface ActionLogItem {
  timestamp: string;
  message: string;
}

/**
 * TransformDemoContent - The inner component using useGenUI
 */
function TransformDemoContent({ 
  actionLog, 
  onClearLog 
}: { 
  actionLog: ActionLogItem[]; 
  onClearLog: () => void;
}) {
  const { transform, isLoading, error, clearError } = useGenUI();
  const [input, setInput] = useState('');
  const [result, setResult] = useState<GenerativeUIResponse | null>(null);
  const [usage, setUsage] = useState<{
    transformTokens: number;
    processingTimeMs: number;
  } | null>(null);

  const handleTransform = async () => {
    if (!input.trim()) return;

    const response = await transform(input, {
      // Optional: Add context hints
      // intent: 'data_analysis',
      // preferredComponents: ['table', 'chart'],
    });

    if (response.success && response.result) {
      setResult(response.result);
      setUsage(response.usage ? {
        transformTokens: response.usage.transformTokens,
        processingTimeMs: response.usage.processingTimeMs,
      } : null);
    }
  };

  const examples = [
    {
      label: 'Text',
      text: 'Explain what Generative UI is in 2-3 sentences.'
    },
    {
      label: 'Card',
      text: 'Show me a single card for "Revenue Limit" with a value of "$50,000" and an alert message "Approaching limit".'
    },
    {
      label: 'List',
      text: 'The top 5 programming languages in 2024 are: 1. Python, 2. JavaScript, 3. TypeScript, 4. Go, 5. Rust.'
    },
    {
      label: 'Table',
      text: 'Create a table of "Recent Transactions": 1. Stripe ($120.00, Completed), 2. AWS ($450.50, Pending), 3. GitHub ($7.00, Completed), 4. Vercel ($20.00, Completed).'
    },
    {
      label: 'Container (Grid)',
      text: 'Create a dashboard grid with 2 columns. Column 1: A card for "Active Users" (1,234). Column 2: A card for "New Signups" (56). Below them, a text summary "Growth is steady".'
    },
    {
      label: 'Chart',
      text: 'Visualise the monthly revenue for Q1: January ($12k), February ($15k), March ($18k).'
    },
    {
      label: 'Form',
      text: 'Create a feedback form with fields: Name (text), Email (email), Rating (number), and Comments (textarea).'
    },
    {
      label: 'Confirmation',
      text: 'Ask for confirmation to delete the project "Project X". It has 5 files and 2 members. This is a dangerous action.'
    },
    {
      label: 'Accordion',
      text: 'Create an FAQ accordion with 2 questions: "What is FogUI?" (Answer: A library...), "Is it free?" (Answer: Yes...).'
    },
    {
      label: 'Code Block',
      text: 'Show a React component code snippet for a simple Button component.'
    }
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">GenUI Transform Demo</h1>
        <p className="text-gray-600">
          Paste any LLM output below to see it transformed into structured UI components.
        </p>
      </div>

      {/* Example buttons */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="text-sm text-gray-500 mr-2">Try an example:</span>
        {examples.map((ex) => (
          <button
            key={ex.label}
            onClick={() => setInput(ex.text)}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="mb-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste LLM output here..."
          className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Transform button */}
      <button
        onClick={handleTransform}
        disabled={isLoading || !input.trim()}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Transforming...' : 'Transform to UI'}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
          <button onClick={clearError} className="text-sm text-red-500 underline mt-2">
            Dismiss
          </button>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Result</h2>
            {usage && (
              <span className="text-sm text-gray-500">
                {usage.transformTokens} tokens • {usage.processingTimeMs}ms
              </span>
            )}
          </div>
          <div className="border rounded-lg p-4 bg-white">
            <GenUIRenderer response={result} />
          </div>
        </div>
      )}

      {/* Action Log (New) */}
      {actionLog.length > 0 && (
        <div className="mt-8 bg-slate-900 rounded-lg p-4 font-mono text-sm text-green-400">
          <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
            <h3 className="font-bold text-white">Action Log (Simulating Backend)</h3>
            <button 
              onClick={onClearLog} 
              className="text-xs text-gray-400 hover:text-white"
            >
              Clear
            </button>
          </div>
          <div className="space-y-1 max-h-40 overflow-auto">
            {actionLog.map((log, i) => (
              <div key={i} className="break-all">
                <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code example */}
      <div className="mt-12 p-4 bg-gray-900 rounded-lg">
        <p className="text-gray-400 text-sm mb-2">Integration Example:</p>
        <pre className="text-green-400 text-sm overflow-auto">
{`import { useGenUI, GenUIRenderer, GenUIProvider } from '@genui/react';

function App() {
  // Global action handler (e.g. for forms)
  const handleAction = (action, data) => {
    console.log('Action:', action, data);
  };

  return (
    <GenUIProvider apiKey="..." onAction={handleAction}>
      <MyChat />
    </GenUIProvider>
  );
}`}
        </pre>
      </div>
    </div>
  );
}

/**
 * TransformDemo - Wrapper that provides the GenUI context
 */
export function TransformDemo() {
  const [actionLog, setActionLog] = useState<ActionLogItem[]>([]);

  const handleMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setActionLog(prev => [{ timestamp, message }, ...prev]);
  };

  return (
    <GenUIProvider 
      apiKey="fog_live_ba4359c228000683e279724b78e1f768"
      // apiKey="fog_live_fd99e52897802439471d967d0c276444"
      onAction={(action, data) => handleMessage(`${action}: ${data ? JSON.stringify(data) : 'void'}`)}
    >
      <TransformDemoContent 
        actionLog={actionLog} 
        onClearLog={() => setActionLog([])} 
      />
    </GenUIProvider>
  );
}
