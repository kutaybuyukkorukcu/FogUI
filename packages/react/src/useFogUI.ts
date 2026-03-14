import { useState, useCallback } from 'react';
import { useFogUIContext } from './providers/FogUIProvider';
import { fogUIResponseSchema } from './types/schema.zod';
import type { TransformOptions, TransformResult, UseFogUIReturn, StreamEvent } from './types';

// Helper: parse event/data lines (outer scope)
function parseEventLine(line: string, currentEvent: string): { event: string, data: string } | null {
  if (line.startsWith('event:')) {
    return { event: line.substring(6).trim(), data: '' };
  } else if (line.startsWith('data:')) {
    return { event: currentEvent, data: line.substring(5).trim() };
  }
  return null;
}

// Helper: handle parsed data (outer scope)
async function handleParsedData(currentEvent: string, data: string): Promise<StreamEvent[]> {
  if (data === '[DONE]') {
    return [{ type: 'done', data: null }];
  }
  if (!data) return [];
    const parsed = JSON.parse(data);
    if (currentEvent === 'result') {
      const validation = fogUIResponseSchema.safeParse(parsed);
      if (validation.success) {
        return [{ type: 'result', data: validation.data }];
      } else {
        console.error(validation.error.issues);
        return [{ type: 'error', data: { error: 'Stream validation failed' } }];
      }
    } else {
      return [{ type: currentEvent as StreamEvent['type'], data: parsed }];
    }
  } catch {
    if (currentEvent === 'chunk') {
      return [{ type: 'chunk', data }];
    }
  }

  return [];
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

  return {
    transform,
    transformStream,
    isLoading,
    error,
    clearError,
  };
}
