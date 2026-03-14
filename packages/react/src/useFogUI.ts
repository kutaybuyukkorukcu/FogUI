import { useState, useCallback } from 'react';
import { useFogUIContext } from './providers/FogUIProvider';
import { fogUIResponseSchema } from './types/schema.zod';
import type { TransformOptions, TransformResult, UseFogUIReturn, StreamEvent } from './types';

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
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.substring(6).trim();
          } else if (line.startsWith('data:')) {
            const data = line.substring(5).trim();
            
            if (data === '[DONE]') {
              yield { type: 'done', data: null };
              continue;
            }

              if (data) {
                try {
                  const parsed = JSON.parse(data);
                  if (currentEvent === 'result') {
                    const validation = fogUIResponseSchema.safeParse(parsed);
                    if (validation.success) {
                      yield { type: 'result', data: validation.data };
                    } else {
                      console.error(validation.error.issues);
                      yield { type: 'error', data: { error: 'Stream validation failed' } };
                    }
                  } else {
                    yield { type: currentEvent as StreamEvent['type'], data: parsed };
                  }
                } catch {
                  if (currentEvent === 'chunk') {
                    yield { type: 'chunk', data };
                  }
                }
              }
          }
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
