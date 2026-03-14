import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFogUI } from '../useFogUI';
import { FogUIProvider } from '../providers/FogUIProvider';
import React from 'react';
import { fogUIResponseSchema } from '../types/schema.zod';

// Mock fetch
const fetchMock = vi.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

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
});
