import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useFogUI } from '../useFogUI';
import { FogUIProvider } from '../providers/FogUIProvider';
import React from 'react';
import { fogUIResponseSchema } from '../types/schema.zod';
import type { FogUIResponse, FogUIPatchOperation } from '../types';

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

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <FogUIProvider apiKey="test-key">{children}</FogUIProvider>
);

describe('useFogUI', () => {

  it('should successfully transform content and return a valid result', async () => {
    const mockResponse = {
      success: true,
      result: {
        thinking: [],
        content: [{ type: 'text', value: 'Hello' }]
      }
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
      expect(transformResult.error).toContain('API Error');
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should include context when transform options are provided', async () => {
    const mockResponse = {
      success: true,
      result: {
        thinking: [],
        content: [{ type: 'text', value: 'With context' }],
      },
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

  it('should set hook error when API returns success false', async () => {
    const mockResponse = {
      success: false,
      error: 'Transformation failed from API',
      result: {
        thinking: [],
        content: [{ type: 'text', value: 'fallback' }],
      },
    };

    fetchMock.mockReturnValue(createFetchResponse(mockResponse));
    const { result } = renderHook(() => useFogUI(), { wrapper });

    await waitFor(async () => {
      const transformResult = await result.current.transform('some content');
      expect(transformResult.success).toBe(false);
    });

    expect(result.current.error).toBe('Transformation failed from API');
  });

  it('should handle validation errors in the response', async () => {
    const invalidResponse = { success: true, result: { content: [{ type: 'invalid' }] } };
    fetchMock.mockReturnValue(createFetchResponse(invalidResponse));
    
    const { result } = renderHook(() => useFogUI(), { wrapper });
    
    await waitFor(async () => {
      const transformResult = await result.current.transform('some content');
      expect(transformResult.success).toBe(false);
      expect(transformResult.error).toBe('API response validation failed');
    });
  });

  it('should handle streaming transformations', async () => {
    const mockResponse = {
      success: true,
      result: {
        thinking: [],
        content: [{ type: 'text', value: 'Streamed Hello' }]
      }
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

  it('should stream chunk events and unknown event payloads', async () => {
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

    expect(events).toContainEqual({ type: 'chunk', data: 'partial-text' });
    expect(events).toContainEqual({ type: 'usage', data: { transformTokens: 12 } });
    expect(events).toContainEqual({ type: 'done', data: null });
  });

  it('should stream mixed chunk, patch, result, and done events', async () => {
    const resultPayload = {
      thinking: [],
      content: [{ type: 'text', value: 'Final state' }],
    };

    const lines = [
      'event: chunk\n',
      'data: partial\n\n',
      'event: patch\n',
      'data: {"op":"append","path":"/content","value":{"type":"text","value":"partial"}}\n\n',
      'event: result\n',
      `data: ${JSON.stringify(resultPayload)}\n\n`,
      'event: done\n',
      'data: [DONE]\n\n',
    ];

    fetchMock.mockReturnValue(createStreamingResponse(lines));
    const { result } = renderHook(() => useFogUI(), { wrapper });

    const events: Array<{ type: string; data: unknown }> = [];
    await waitFor(async () => {
      const stream = result.current.transformStream('mixed stream content');
      for await (const event of stream) {
        events.push(event);
      }
    });

    expect(events).toContainEqual({ type: 'chunk', data: 'partial' });
    expect(events).toContainEqual({
      type: 'patch',
      data: [{ op: 'append', path: '/content', value: { type: 'text', value: 'partial' } }],
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

    await waitFor(async () => {
      const stream = result.current.transformStream('stream prompt', {
        intent: 'assistant',
        instructions: 'Return concise UI',
      });
      for await (const event of stream) {
        console.log(event);
        // exhaust stream without processing events
      }
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsedBody = JSON.parse(String(requestInit.body));

    expect(parsedBody.context).toEqual({
      intent: 'assistant',
      instructions: 'Return concise UI',
    });
    expect(parsedBody.streaming).toBe(true);
    expect(parsedBody.includeChunks).toBe(true);
    expect(parsedBody.preferPatches).toBe(true);
  });

  it('should allow overriding stream transport options', async () => {
    const lines = [
      'event: done\n',
      'data: [DONE]\n\n',
    ];

    fetchMock.mockReturnValue(createStreamingResponse(lines));
    const { result } = renderHook(() => useFogUI(), { wrapper });

    await waitFor(async () => {
      const stream = result.current.transformStream('stream prompt', {
        stream: {
          includeChunks: false,
          preferPatches: true,
        },
      });

      for await (const event of stream) {
        expect(event).toBeDefined();
      }
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const parsedBody = JSON.parse(String(requestInit.body));

    expect(parsedBody.includeChunks).toBe(false);
    expect(parsedBody.preferPatches).toBe(true);
  });

  it('should yield error when streaming result validation fails', async () => {
    const lines = [
      'event: result\n',
      'data: {"invalid":true}\n\n',
      'event: done\n',
      'data: [DONE]\n\n',
    ];
    fetchMock.mockReturnValue(createStreamingResponse(lines));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useFogUI(), { wrapper });

    const events: Array<{ type: string; data: any }> = [];
    await waitFor(async () => {
      const stream = result.current.transformStream('invalid stream');
      for await (const event of stream) {
        events.push(event);
      }
    });

    expect(events).toContainEqual({ type: 'error', data: { error: 'Stream validation failed' } });
    consoleErrorSpy.mockRestore();
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

  it('applyPatches applies incremental updates from hook API', () => {
    const { result } = renderHook(() => useFogUI(), { wrapper });

    const current: FogUIResponse = {
      thinking: [],
      content: [{ type: 'text', value: 'A' }],
    };
    const patches: FogUIPatchOperation[] = [
      { op: 'append', path: '/content', value: { type: 'text', value: 'B' } },
    ];

    const next = result.current.applyPatches(current, patches);
    expect(next.content).toHaveLength(2);
    expect(next.content[1]).toEqual({ type: 'text', value: 'B' });
  });
});
