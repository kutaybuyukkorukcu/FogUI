import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FogUIDemo } from '../components/FogUIDemo';

const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

const createJsonResponse = (data: unknown, ok = true, status = ok ? 200 : 500) => Promise.resolve({
  ok,
  status,
  json: () => Promise.resolve(data),
} as unknown as Response);

const createStreamingResponse = (lines: string[], ok = true, hasBody = true) => Promise.resolve({
  ok,
  status: ok ? 200 : 500,
  body: hasBody
    ? {
        getReader: () => {
          const encoder = new TextEncoder();
          let index = 0;
          return {
            read: () => {
              if (index >= lines.length) {
                return Promise.resolve({ done: true, value: undefined });
              }

              const value = encoder.encode(lines[index]);
              index += 1;
              return Promise.resolve({ done: false, value });
            },
          };
        },
      }
    : undefined,
} as unknown as Response);

const transformResult = {
  success: true,
  result: {
    thinking: [{ status: 'complete', message: 'ready' }],
    content: [
      {
        type: 'component',
        componentType: 'Card',
        props: {
          title: 'Weekly KPI',
          description: 'Stable service baseline',
        },
        children: [
          {
            type: 'component',
            componentType: 'Button',
            props: {
              label: 'Open details',
            },
          },
          {
            type: 'component',
            componentType: 'List',
            props: {
              items: ['Revenue +18%', 'Latency -12%'],
            },
          },
        ],
      },
    ],
    metadata: {
      contractVersion: 'fogui/1.0',
    },
  },
  usage: {
    model: 'test-model',
    transformTokens: 12,
    processingTimeMs: 42,
  },
};

describe('FogUIDemo', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('runs transform flow and logs action lifecycle from rendered output', async () => {
    fetchMock.mockReturnValueOnce(createJsonResponse(transformResult));

    render(<FogUIDemo />);

    fireEvent.click(screen.getByRole('button', { name: 'Run Transform' }));

    expect(await screen.findByText('Weekly KPI')).toBeInTheDocument();
    expect(screen.getByTestId('adapter-conformance')).toHaveTextContent('adapter=ready');
    expect(screen.getByTestId('response-summary')).toHaveTextContent('source=transform');
    expect(screen.getByTestId('response-summary')).toHaveTextContent('contract=fogui/1.0');

    fireEvent.click(screen.getByRole('button', { name: 'Open details' }));

    await waitFor(() => {
      expect(screen.getByTestId('event-log')).toHaveTextContent('action: start button_click from Button');
      expect(screen.getByTestId('event-log')).toHaveTextContent('action: dispatch button_click');
      expect(screen.getByTestId('event-log')).toHaveTextContent('action: complete button_click from Button');
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5001/fogui/transform',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('runs stream flow and records stream events', async () => {
    fetchMock.mockReturnValueOnce(createStreamingResponse([
      'event: result\n',
      `data: ${JSON.stringify(transformResult.result)}\n\n`,
      'event: usage\n',
      'data: {"transformTokens":18}\n\n',
      'event: done\n',
      'data: [DONE]\n\n',
    ]));

    render(<FogUIDemo />);

    fireEvent.click(screen.getByRole('button', { name: 'Run Stream' }));

    await waitFor(() => {
      expect(screen.getByTestId('event-log')).toHaveTextContent('stream: result received');
      expect(screen.getByTestId('event-log')).toHaveTextContent('stream: usage received');
      expect(screen.getByTestId('event-log')).toHaveTextContent('stream: done');
    });

    expect(screen.getByTestId('response-summary')).toHaveTextContent('source=stream');
  });

  it('runs compatibility flow and displays diagnostics', async () => {
    fetchMock.mockReturnValueOnce(createJsonResponse({
      success: true,
      result: transformResult.result,
      translationErrors: [{ code: 'unsupported_node' }],
      validationErrors: [{ code: 'missing_prop' }],
    }));

    render(<FogUIDemo />);

    fireEvent.click(screen.getByRole('button', { name: 'Run Compatibility Translation' }));

  expect(await screen.findByText('success=true | translationErrors=1 | validationErrors=1')).toBeInTheDocument();
    expect(screen.getByTestId('compat-diagnostics')).toHaveTextContent('unsupported_node');
    expect(screen.getByTestId('compat-diagnostics')).toHaveTextContent('missing_prop');
    expect(screen.getByTestId('response-summary')).toHaveTextContent('source=compat');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5001/fogui/compat/a2ui/inbound',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});