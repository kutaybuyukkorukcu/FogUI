import { useState } from 'react';
import { useGenUI, GenUIRenderer } from '../../lib/genui-sdk';
import type { GenerativeUIResponse } from '../../types';

/**
 * TransformDemo - Demonstrates using the GenUI SDK to transform any text.
 * 
 * This shows how a developer would integrate GenUI with their own LLM:
 * 1. Call your LLM (OpenAI, Claude, etc.) with your own API key
 * 2. Pass the LLM output to GenUI's transform()
 * 3. Render the result with GenUIRenderer
 */
export function TransformDemo() {
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
      label: 'List',
      text: 'The top 5 programming languages in 2024 are: 1. Python - known for AI/ML, 2. JavaScript - web development, 3. TypeScript - type-safe JS, 4. Go - cloud infrastructure, 5. Rust - systems programming.'
    },
    {
      label: 'Comparison',
      text: 'React vs Vue comparison: React has 220k GitHub stars, uses JSX, backed by Meta. Vue has 45k stars, uses templates, backed by community. Both support TypeScript and have great ecosystems.'
    },
    {
      label: 'Metrics',
      text: 'Q4 2024 Results: Revenue $4.2M (up 23%), Active Users 45,000 (up 15%), Churn Rate 2.1% (down 0.5%), NPS Score 72 (up 8 points).'
    },
    {
      label: 'Weather',
      text: 'Weather in Tokyo: Currently 18°C with partly cloudy skies. Humidity at 65%. Wind from the east at 12 km/h. Forecast: High of 22°C, Low of 14°C.'
    },
    {
      label: 'Composable (Nested)',
      text: 'Create a dashboard layout with a Title "Employee Status". Inside, create a grid with 2 columns. Column 1: A card "Active Staff" with value "12". Column 2: A card "On Leave" with value "2". Below that, add a full-width callout warning "Holiday season approaching".'
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

      {/* Code example */}
      <div className="mt-12 p-4 bg-gray-900 rounded-lg">
        <p className="text-gray-400 text-sm mb-2">Integration Example:</p>
        <pre className="text-green-400 text-sm overflow-auto">
{`import { useGenUI, GenUIRenderer } from '@genui/react';

function MyChat() {
  const { transform } = useGenUI();

  // 1. Call YOUR LLM (with your own API key)
  const llmResponse = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: userMessage }]
  });

  // 2. Transform with GenUI
  const ui = await transform(llmResponse.choices[0].message.content);

  // 3. Render
  return <GenUIRenderer response={ui.result} />;
}`}
        </pre>
      </div>
    </div>
  );
}
