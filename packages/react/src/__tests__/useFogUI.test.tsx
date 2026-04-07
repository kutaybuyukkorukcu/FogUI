import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFogUI } from '../useFogUI';
import { FogUIProvider } from '../providers/FogUIProvider';
import React from 'react';
import { fogUIResponseSchema } from '../types/schema.zod';

// Mock fetch
const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

beforeEach(() => {
  fetchMock.mockReset();
});

const createFetchResponse = (data: any, ok = true) => {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
    body: {
      getReader: () => {
        const encoder = new TextEncoder();
        let done = false;
        return {
          read: () => {
            if (done) return Promise.resolve({ done: true, value: undefined });
            done = true;
            const streamData = `event: result\ndata: ${JSON.stringify(data.result)}\n\nevent: done\ndata: [DONE]\n\n`;
            return Promise.resolve({ done: false, value: encoder.encode(streamData) });
          }
        };
      }
    }
  } as unknown as Response);
};

const createStreamingResponse = (lines: string[], ok = true, hasBody = true) => {
  return Promise.resolve({
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
};

const withContractVersion = <T extends Record<string, unknown>>(result: T): T & { metadata: Record<string, unknown> } => ({
  ...result,
  metadata: {
    contractVersion: 'fogui/1.0',
    ...((result.metadata as Record<string, unknown> | undefined) ?? {}),
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FogUIProvider apiKey="test-key">{children}</FogUIProvider>
);

const noKeyWrapper = ({ children }: { children: React.ReactNode }) => (
  <FogUIProvider>{children}</FogUIProvider>
);

const strictContractWrapper = ({ children }: { children: React.ReactNode }) => (
  <FogUIProvider apiKey="test-key" contractVersion={{ strict: true }}>{children}</FogUIProvider>
);

describe('useFogUI', () => {

  it('should successfully transform content and return a valid result', async () => {
    const mockResponse = {
      success: true,
      result: withContractVersion({
        thinking: [],
        content: [{ type: 'text', value: 'Hello' }]
      })
    };
    const validatedResponse = fogUIResponseSchema.parse(mockResponse.result);
    fetchMock.mockReturnValue(createFetchResponse({ ...mockResponse, result: validatedResponse }));
    
    const { result } = renderHook(() => useFogUI(), { wrapper });
    
    await waitFor(async () => {
      const transformResult = await result.current.transform('some content');
      expect(transformResult.success).toBe(true);
      expect(transformResult.result).toEqual(validatedResponse);
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle API errors during transformation', async () => {
    fetchMock.mockReturnValue(createFetchResponse({ error: 'API Error' }, false));

    const { result } = renderHook(() => useFogUI(), { wrapper });

    await waitFor(async () => {
      const transformResult = await result.current.transform('some content');
      expect(transformResult.success).toBe(false);
      if (!transformResult.success) {
        expect(transformResult.error).toContain('API Error');
      }
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should include context when transform options are provided', async () => {
    const mockResponse = {
      success: true,
      result: withContractVersion({
        thinking: [],
        content: [{ type: 'text', value: 'With context' }],
      }),
    };

    fetchMock.mockReturnValue(createFetchResponse(mockResponse));
    const { result } = renderHook(() => useFogUI(), { wrapper });

    await waitFor(async () => {
      await result.current.transform('prompt', {
        intent: 'demo',
        preferredComponents: ['Card', 'Badge'],
        instructions: 'be concise',
      });
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsedBody = JSON.parse(String(requestInit.body));

    expect(parsedBody.context).toEqual({
      intent: 'demo',
      preferredComponents: ['Card', 'Badge'],
      instructions: 'be concise',
    });
  });

  it('should accept successful backend envelopes that include null error metadata', async () => {
    const mockResponse = {
      success: true,
      result: withContractVersion({
        thinking: [],
        content: [
          {
            type: 'component',
            value: null,
            componentType: 'Card',
            props: {
              title: 'Launch Readiness Summary',
              description: 'All systems are prepared for launch.',
            },
            children: null,
          },
          {
            type: 'text',
            value: 'Operator Note: Ensure all safety protocols are followed.',
            componentType: null,
            props: null,
            children: null,
          },
        ],
      }),
      error: null,
      errorCode: null,
      errorDetails: null,
      usage: {
        model: 'gpt-4.1-nano',
        transformTokens: 31,
        estimatedCost: 0.0000186,
        processingTimeMs: 2263,
      },
      sessionId: null,
      requestId: 'fogui-aebb939d-4fe8-41ff-8839-12da43e29080',
    };

    fetchMock.mockReturnValue(createFetchResponse(mockResponse));
    const { result } = renderHook(() => useFogUI(), { wrapper });

    await waitFor(async () => {
      const transformResult = await result.current.transform('launch readiness');
      expect(transformResult.success).toBe(true);
      if (transformResult.success) {
        expect(transformResult.result.content).toHaveLength(2);
      }
    });

    expect(result.current.error).toBe(null);
  });

  it('should omit Authorization header when apiKey is not provided', async () => {
    const mockResponse = {
      success: true,
      result: withContractVersion({
        thinking: [],
        content: [{ type: 'text', value: 'No key mode' }],
      }),
    };

    fetchMock.mockReturnValue(createFetchResponse(mockResponse));
    const { result } = renderHook(() => useFogUI(), { wrapper: noKeyWrapper });

    await waitFor(async () => {
      await result.current.transform('prompt without key');
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = requestInit.headers as Record<string, string>;

    expect(headers['Content-Type']).toBe('application/json');
    expect(headers.Authorization).toBeUndefined();
  });

  it('should set hook error when API returns success false', async () => {
    const mockResponse = {
      success: false,
      error: 'Transformation failed from API',
      result: withContractVersion({
        thinking: [],
        content: [{ type: 'text', value: 'fallback' }],
      }),
    };

    fetchMock.mockReturnValue(createFetchResponse(mockResponse));
    const { result } = renderHook(() => useFogUI(), { wrapper });

    await waitFor(async () => {
      const transformResult = await result.current.transform('some content');
      expect(transformResult.success).toBe(false);
    });

    expect(result.current.error).toBe('Transformation failed from API');
  });

  it('should fail validation for malformed transform responses', async () => {
    // Missing required 'thinking' field — structured output from backend won't produce this,
    // but the schema now strictly validates rather than normalizing
    const invalidResponse = { success: true, result: { content: [{ type: 'invalid' }] } };
    fetchMock.mockReturnValue(createFetchResponse(invalidResponse));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const { result } = renderHook(() => useFogUI(), { wrapper });
    
    await waitFor(async () => {
      const transformResult = await result.current.transform('some content');
      expect(transformResult.success).toBe(false);
      if (!transformResult.success) {
        expect(transformResult.error).toBeDefined();
      }
    });

    consoleSpy.mockRestore();
  });

  it('should warn by default when transform result contractVersion is missing', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fetchMock.mockReturnValue(createFetchResponse({
      success: true,
      result: {
        thinking: [],
        content: [{ type: 'text', value: 'No contract version' }],
      },
    }));

    const { result } = renderHook(() => useFogUI(), { wrapper });

    await waitFor(async () => {
      const transformResult = await result.current.transform('missing contract version');
      expect(transformResult.success).toBe(true);
    });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[FogUI] Missing canonical contractVersion. Expected "fogui/1.0" in response metadata.'
    );
    expect(result.current.error).toBe(null);

    consoleWarnSpy.mockRestore();
  });

  it('should fail transform when strict contractVersion enforcement is enabled', async () => {
    fetchMock.mockReturnValue(createFetchResponse({
      success: true,
      result: {
        thinking: [],
        content: [{ type: 'text', value: 'Wrong contract version' }],
        metadata: {
          contractVersion: 'fogui/0.9',
        },
      },
    }));

    const { result } = renderHook(() => useFogUI(), { wrapper: strictContractWrapper });

    await waitFor(async () => {
      const transformResult = await result.current.transform('strict contract version');
      expect(transformResult.success).toBe(false);
      if (!transformResult.success) {
        expect(transformResult.error).toContain('Canonical contractVersion mismatch');
      }
    });

    expect(result.current.error).toContain('Canonical contractVersion mismatch');
  });

  it('should handle streaming transformations', async () => {
    const mockResponse = {
      success: true,
      result: withContractVersion({
        thinking: [],
        content: [{ type: 'text', value: 'Streamed Hello' }]
      })
    };
    const validatedResponse = fogUIResponseSchema.parse(mockResponse.result);
    fetchMock.mockReturnValue(createFetchResponse({ ...mockResponse, result: validatedResponse }));

    const { result } = renderHook(() => useFogUI(), { wrapper });

    await waitFor(async () => {
      const stream = result.current.transformStream('some streaming content');
      const events = [];
      for await (const event of stream) {
        events.push(event);
      }
      expect(events).toContainEqual({ type: 'result', data: validatedResponse });
      expect(events).toContainEqual({ type: 'done', data: null });
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should ignore unknown stream event types and keep known events', async () => {
    const lines = [
      'event: chunk\n',
      'data: partial-text\n\n',
      'event: usage\n',
      'data: {"transformTokens":12}\n\n',
      'event: done\n',
      'data: [DONE]\n\n',
    ];

    fetchMock.mockReturnValue(createStreamingResponse(lines));
    const { result } = renderHook(() => useFogUI(), { wrapper });

    const events: Array<{ type: string; data: unknown }> = [];
    await waitFor(async () => {
      const stream = result.current.transformStream('stream content');
      for await (const event of stream) {
        events.push(event);
      }
    });

    expect(events).toContainEqual({ type: 'usage', data: { transformTokens: 12 } });
    expect(events).toContainEqual({ type: 'done', data: null });
  });

  it('should stream result and done events', async () => {
    const resultPayload = withContractVersion({
      thinking: [],
      content: [{ type: 'text', value: 'Final state' }],
    });

    const lines = [
      'event: result\n',
      `data: ${JSON.stringify(resultPayload)}\n\n`,
      'event: done\n',
      'data: [DONE]\n\n',
    ];

    fetchMock.mockReturnValue(createStreamingResponse(lines));
    const { result } = renderHook(() => useFogUI(), { wrapper });

    const events: Array<{ type: string; data: unknown }> = [];
    await waitFor(async () => {
      const stream = result.current.transformStream('stream content');
      for await (const event of stream) {
        events.push(event);
      }
    });

    expect(events).toContainEqual({ type: 'result', data: resultPayload });
    expect(events).toContainEqual({ type: 'done', data: null });
  });

  it('should ignore invalid JSON for non-chunk stream events', async () => {
    const lines = [
      'event: usage\n',
      'data: not-json\n\n',
      'event: done\n',
      'data: [DONE]\n\n',
    ];

    fetchMock.mockReturnValue(createStreamingResponse(lines));
    const { result } = renderHook(() => useFogUI(), { wrapper });

    const events: Array<{ type: string; data: unknown }> = [];
    await waitFor(async () => {
      const stream = result.current.transformStream('stream content');
      for await (const event of stream) {
        events.push(event);
      }
    });

    // Invalid JSON for non-chunk events is ignored; done must still arrive.
    expect(events).toEqual([{ type: 'done', data: null }]);
  });

  it('should include stream context when intent/instructions options are provided', async () => {
    const lines = [
      'event: done\n',
      'data: [DONE]\n\n',
    ];

    fetchMock.mockReturnValue(createStreamingResponse(lines));
    const { result } = renderHook(() => useFogUI(), { wrapper });
    const eventTypes: string[] = [];

    await waitFor(async () => {
      const stream = result.current.transformStream('stream prompt', {
        intent: 'assistant',
        preferredComponents: ['Card', 'Table'],
        instructions: 'Return concise UI',
      });
      for await (const streamEvent of stream) {
        eventTypes.push(streamEvent.type);
      }
    });

    expect(eventTypes).toEqual(['done']);
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsedBody = JSON.parse(String(requestInit.body));

    expect(parsedBody.context).toEqual({
      intent: 'assistant',
      preferredComponents: ['Card', 'Table'],
      instructions: 'Return concise UI',
    });
  });

  it('should emit error when streaming result event has invalid shape', async () => {
    // With structured outputs, the backend won't emit malformed result events.
    // The schema now strictly validates; invalid shapes emit an error event.
    const lines = [
      'event: result\n',
      'data: {"invalid":true}\n\n',
      'event: done\n',
      'data: [DONE]\n\n',
    ];
    fetchMock.mockReturnValue(createStreamingResponse(lines));

    const { result } = renderHook(() => useFogUI(), { wrapper });

    const events: Array<{ type: string; data: any }> = [];
    await waitFor(async () => {
      const stream = result.current.transformStream('invalid stream');
      for await (const event of stream) {
        events.push(event);
      }
    });

    // Should emit an error (validation failed) and then done
    expect(events.some(e => e.type === 'error')).toBe(true);
    expect(events).toContainEqual({ type: 'done', data: null });
  });

  it('should emit stream error instead of result when strict contractVersion enforcement fails', async () => {
    const lines = [
      'event: result\n',
      'data: {"thinking":[],"content":[{"type":"text","value":"wrong version"}],"metadata":{"contractVersion":"fogui/0.9"}}\n\n',
      'event: done\n',
      'data: [DONE]\n\n',
    ];
    fetchMock.mockReturnValue(createStreamingResponse(lines));

    const { result } = renderHook(() => useFogUI(), { wrapper: strictContractWrapper });

    const events: Array<{ type: string; data: any }> = [];
    await waitFor(async () => {
      const stream = result.current.transformStream('strict stream');
      for await (const streamEvent of stream) {
        events.push(streamEvent);
      }
    });

    expect(events).not.toContainEqual({
      type: 'result',
      data: {
        thinking: [],
        content: [{ type: 'text', value: 'wrong version' }],
        metadata: { contractVersion: 'fogui/0.9' },
      },
    });
    expect(events).toContainEqual({
      type: 'error',
      data: {
        error: 'Canonical contractVersion mismatch. Expected "fogui/1.0" but received "fogui/0.9".',
      },
    });
    expect(events).toContainEqual({ type: 'done', data: null });
  });

  it('should yield error when streaming response has no body', async () => {
    fetchMock.mockReturnValue(createStreamingResponse([], true, false));
    const { result } = renderHook(() => useFogUI(), { wrapper });

    const events: Array<{ type: string; data: any }> = [];
    await waitFor(async () => {
      const stream = result.current.transformStream('no body');
      for await (const event of stream) {
        events.push(event);
      }
    });

    expect(events).toContainEqual({ type: 'error', data: { error: 'No response body' } });
  });

  it('should yield HTTP error when streaming response is not ok', async () => {
    fetchMock.mockReturnValue(createStreamingResponse([], false, true));
    const { result } = renderHook(() => useFogUI(), { wrapper });

    const events: Array<{ type: string; data: any }> = [];
    await waitFor(async () => {
      const stream = result.current.transformStream('http fail');
      for await (const event of stream) {
        events.push(event);
      }
    });

    expect(events).toContainEqual({ type: 'error', data: { error: 'HTTP 500' } });
  });

  it('clearError resets hook error state', async () => {
    fetchMock.mockReturnValue(createFetchResponse({ error: 'API Error' }, false));
    const { result } = renderHook(() => useFogUI(), { wrapper });

    await waitFor(async () => {
      await result.current.transform('fails');
    });

    expect(result.current.error).toContain('API Error');
    act(() => {
      result.current.clearError();
    });
    expect(result.current.error).toBe(null);
  });

});
