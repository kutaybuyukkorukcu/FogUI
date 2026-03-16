import { useState, useCallback } from 'react';
import { useFogUIContext } from './providers/FogUIProvider';
import { fogUIResponseSchema } from './types/schema.zod';
import { applyFogUIPatches } from './patches';
import type {
  FogUIResponse,
  FogUIPatchOperation,
  StreamChunkEvent,
  StreamDoneEvent,
  StreamErrorEvent,
  StreamEvent,
  StreamPatchEvent,
  StreamResultEvent,
  StreamUsageEvent,
  TransformOptions,
  TransformResult,
  UseFogUIReturn,
} from './types';

type StreamEventType = StreamEvent['type'];
type JsonHandler = (parsed: unknown) => StreamEvent[];

// Helper: parse event/data lines (outer scope)
function parseEventLine(line: string, currentEvent: string): { event: string, data: string } | null {
  if (line.startsWith('event:')) {
    return { event: line.substring(6).trim(), data: '' };
  } else if (line.startsWith('data:')) {
    return { event: currentEvent, data: line.substring(5).trim() };
  }
  return null;
}

function parsePatchOperations(parsed: unknown): FogUIPatchOperation[] {
  if (Array.isArray(parsed)) {
    return parsed as FogUIPatchOperation[];
  }

  if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { patches?: unknown }).patches)) {
    return (parsed as { patches: FogUIPatchOperation[] }).patches;
  }

  return [parsed as FogUIPatchOperation];
}

function isSupportedEventType(value: string): value is StreamEventType {
  return value === 'chunk'
    || value === 'patch'
    || value === 'result'
    || value === 'usage'
    || value === 'error'
    || value === 'done';
}

function parseJsonPayload(data: string): unknown {
  return JSON.parse(data);
}

const jsonHandlers: Record<Exclude<StreamEventType, 'chunk' | 'done'>, JsonHandler> = {
  patch: (parsed): StreamPatchEvent[] => [{ type: 'patch', data: parsePatchOperations(parsed) }],
  result: (parsed): StreamEvent[] => {
    const validation = fogUIResponseSchema.safeParse(parsed);
    if (validation.success) {
      const event: StreamResultEvent = { type: 'result', data: validation.data };
      return [event];
    }

    console.error(validation.error.issues);
    const errorEvent: StreamErrorEvent = {
      type: 'error',
      data: { error: 'Stream validation failed' },
    };
    return [errorEvent];
  },
  usage: (parsed): StreamUsageEvent[] => [{ type: 'usage', data: (parsed as StreamUsageEvent['data']) ?? {} }],
  error: (parsed): StreamErrorEvent[] => {
    if (parsed && typeof parsed === 'object' && typeof (parsed as { error?: unknown }).error === 'string') {
      return [{ type: 'error', data: parsed as StreamErrorEvent['data'] }];
    }

    return [{ type: 'error', data: { error: 'Stream processing failed', details: parsed } }];
  },
};

// Helper: handle parsed data (outer scope)
async function handleParsedData(currentEvent: string, data: string): Promise<StreamEvent[]> {
  if (data === '[DONE]') {
    const doneEvent: StreamDoneEvent = { type: 'done', data: null };
    return [doneEvent];
  }

  if (!data) return [];

  if (!currentEvent || !isSupportedEventType(currentEvent)) {
    return [];
  }

  if (currentEvent === 'chunk') {
    try {
      const parsed = parseJsonPayload(data);
      if (typeof parsed === 'string') {
        const event: StreamChunkEvent = { type: 'chunk', data: parsed };
        return [event];
      }
      const fallbackEvent: StreamChunkEvent = { type: 'chunk', data };
      return [fallbackEvent];
    } catch {
      const event: StreamChunkEvent = { type: 'chunk', data };
      return [event];
    }
  }

  if (currentEvent === 'done') {
    const doneEvent: StreamDoneEvent = { type: 'done', data: null };
    return [doneEvent];
  }

  try {
    const parsed = parseJsonPayload(data);
    const handler = jsonHandlers[currentEvent];
    return handler ? handler(parsed) : [];
  } catch {
    return [];
  }
}

// Helper: process lines
async function processLines(lines: string[], currentEvent: string): Promise<{ buffer: string, currentEvent: string, events: StreamEvent[] }> {
  const newBuffer = lines.pop() || '';
  const events: StreamEvent[] = [];

  for (const line of lines) {
    const parsedLine = parseEventLine(line, currentEvent);
    if (!parsedLine) continue;

    if (line.startsWith('event:')) {
      currentEvent = parsedLine.event;
    } else if (line.startsWith('data:')) {
      const parsedEvents = await handleParsedData(currentEvent, parsedLine.data);
      events.push(...parsedEvents);
    }
  }

  return { buffer: newBuffer, currentEvent, events };
}

/**
 * useFogUI - Main hook for transforming LLM output into structured UI.
 * 
 * @example
 * ```tsx
 * import { useFogUI, FogUIRenderer } from '@fogui/react';
 * 
 * function Chat() {
 *   const { transform, isLoading } = useFogUI();
 *   const [ui, setUI] = useState(null);
 * 
 *   const handleLLMResponse = async (llmOutput: string) => {
 *     const result = await transform(llmOutput);
 *     if (result.success) {
 *       setUI(result.result);
 *     }
 *   };
 * 
 *   return (
 *     <div>
 *       {isLoading && <p>Transforming...</p>}
 *       {ui && <FogUIRenderer response={ui} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useFogUI(): UseFogUIReturn {
  const { endpoint, apiKey } = useFogUIContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Transform raw LLM text into structured UI (non-streaming)
   */
  const transform = useCallback(async (
    content: string,
    options: TransformOptions = {}
  ): Promise<TransformResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${endpoint}/fogui/transform`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          content,
          context: options.intent || options.preferredComponents || options.instructions ? {
            intent: options.intent,
            preferredComponents: options.preferredComponents,
            instructions: options.instructions,
          } : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const json = await response.json();
      const validation = fogUIResponseSchema.safeParse(json.result);

      if (!validation.success) {
        const validationError = 'API response validation failed';
        setError(validationError);
        console.error(validation.error.issues);
        return { success: false, error: validationError };
      }

      const result: TransformResult = {
        ...json,
        result: validation.data,
      };
      
      if (!result.success) {
        setError(result.error || 'Transformation failed');
      }

      return result;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, apiKey]);

  /**
   * Transform with streaming - returns an async generator
   */


  const transformStream = useCallback(async function* (
    content: string,
    options: TransformOptions = {}
  ): AsyncGenerator<StreamEvent> {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${endpoint}/fogui/transform/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          content,
          context: options.intent || options.instructions ? {
            intent: options.intent,
            instructions: options.instructions,
          } : undefined,
          streaming: true,
          includeChunks: options.stream?.includeChunks ?? true,
          preferPatches: options.stream?.preferPatches ?? true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let currentEvent = '';


      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        const result = await processLines(lines, currentEvent);

        buffer = result.buffer;
        currentEvent = result.currentEvent;

        for (const event of result.events) {
          yield event;
        }
      }

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      yield { type: 'error', data: { error: message } };
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, apiKey]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const applyPatches = useCallback((current: FogUIResponse, patches: FogUIPatchOperation[]) => {
    return applyFogUIPatches(current, patches);
  }, []);

  return {
    transform,
    transformStream,
    applyPatches,
    isLoading,
    error,
    clearError,
  };
}
