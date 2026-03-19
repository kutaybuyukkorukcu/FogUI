import { useState, useCallback } from 'react';
import { useFogUIContext } from './providers/FogUIProvider';
import { fogUIResponseSchema } from './types/schema.zod';
import type {
  FogUIResponse,
  StreamDoneEvent,
  StreamErrorEvent,
  StreamEvent,
  StreamResultEvent,
  StreamUsageEvent,
  TransformOptions,
  TransformResult,
  UseFogUIReturn,
} from './types';

type StreamEventType = StreamEvent['type'];

interface SseFrame {
  event: string;
  data: string;
}

function parseJsonPayload(data: string): unknown {
  return JSON.parse(data);
}

function isSupportedEventType(value: string): value is StreamEventType {
  return value === 'result'
    || value === 'usage'
    || value === 'error'
    || value === 'done';
}

function parseSseFrames(chunkBuffer: string): { frames: SseFrame[]; remainder: string } {
  const rawFrames = chunkBuffer.split('\n\n');
  const remainder = rawFrames.pop() ?? '';

  const frames: SseFrame[] = rawFrames
    .map((raw): SseFrame | null => {
      const lines = raw.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
      if (lines.length === 0) return null;

      let event = 'message';
      const dataParts: string[] = [];

      for (const line of lines) {
        if (line.startsWith('event:')) {
          event = line.substring(6).trim();
        } else if (line.startsWith('data:')) {
          dataParts.push(line.substring(5).trim());
        }
      }

      return {
        event,
        data: dataParts.join('\n'),
      };
    })
    .filter((frame): frame is SseFrame => frame !== null);

  return { frames, remainder };
}

function toStreamEvents(frame: SseFrame): StreamEvent[] {
  if (frame.data === '[DONE]' || frame.event === 'done') {
    const doneEvent: StreamDoneEvent = { type: 'done', data: null };
    return [doneEvent];
  }

  if (!isSupportedEventType(frame.event) || frame.data.length === 0) {
    return [];
  }

  if (frame.event === 'result') {
    try {
      const parsed = parseJsonPayload(frame.data);
      const validation = fogUIResponseSchema.safeParse(parsed);
      if (validation.success) {
        const event: StreamResultEvent = { type: 'result', data: validation.data as FogUIResponse };
        return [event];
      }

      console.error(validation.error.issues);
      return [{ type: 'error', data: { error: 'Stream validation failed' } }];
    } catch {
      return [];
    }
  }

  if (frame.event === 'usage') {
    try {
      const parsed = parseJsonPayload(frame.data);
      return [{ type: 'usage', data: (parsed as StreamUsageEvent['data']) ?? {} }];
    } catch {
      return [];
    }
  }

  if (frame.event === 'error') {
    try {
      const parsed = parseJsonPayload(frame.data);
      if (parsed && typeof parsed === 'object' && typeof (parsed as { error?: unknown }).error === 'string') {
        return [{ type: 'error', data: parsed as StreamErrorEvent['data'] }];
      }

      return [{ type: 'error', data: { error: 'Stream processing failed', details: parsed } }];
    } catch {
      return [{ type: 'error', data: { error: 'Stream processing failed' } }];
    }
  }

  return [];
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
    let seenDoneEvent = false;

    try {
      const response = await fetch(`${endpoint}/fogui/transform/stream`, {
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
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseFrames(buffer);
        buffer = parsed.remainder;

        for (const frame of parsed.frames) {
          const events = toStreamEvents(frame);
          for (const event of events) {
            if (event.type === 'done') {
              seenDoneEvent = true;
            }
            yield event;
          }
        }
      }

      // Flush a trailing frame when stream does not end with an empty line.
      if (buffer.trim().length > 0) {
        const parsed = parseSseFrames(`${buffer}\n\n`);
        for (const frame of parsed.frames) {
          const events = toStreamEvents(frame);
          for (const event of events) {
            if (event.type === 'done') {
              seenDoneEvent = true;
            }
            yield event;
          }
        }
      }

    } catch (err) {
      // Some environments can throw a terminal network error after a valid done event.
      if ((err instanceof TypeError || err instanceof Error) &&
          seenDoneEvent &&
          String(err.message).toLowerCase().includes('network')) {
        return;
      }

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
