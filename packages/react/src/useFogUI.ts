import { useCallback, useState } from 'react';
import { validateContractVersion } from './internal/contractVersion';
import { readSseResponse } from './internal/stream';
import { useFogUIContext } from './providers/FogUIProvider';
import { fogUITransformResultSchema } from './types/schema.zod';
import type { FogUIResponse, StreamEvent, TransformOptions, TransformResult, UseFogUIReturn } from './types';

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
  const { endpoint, apiKey, fetchImplementation, requestHeaders, contractVersion } = useFogUIContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClient = fetchImplementation ?? fetch;

  const createRequestHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (requestHeaders) {
      Object.assign(headers, requestHeaders);
    }

    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    return headers;
  }, [apiKey, requestHeaders]);

  const createRequestBody = useCallback((content: string, options: TransformOptions = {}) => ({
    content,
    context: options.intent || options.preferredComponents || options.instructions
      ? {
          intent: options.intent,
          preferredComponents: options.preferredComponents,
          instructions: options.instructions,
        }
      : undefined,
  }), []);

  const enforceContractVersion = useCallback((response: FogUIResponse): string | null => {
    const validation = validateContractVersion(response, contractVersion.expected);
    if (validation.ok) {
      return null;
    }

    const message = validation.message ?? 'Canonical contractVersion validation failed';
    if (contractVersion.strict) {
      setError(message);
      return message;
    }

    console.warn(`[FogUI] ${message}`);
    return null;
  }, [contractVersion]);

  const parseTransformResponse = useCallback(async (response: Response): Promise<TransformResult> => {
    const json = await response.json();
    const validation = fogUITransformResultSchema.safeParse(json);

    if (!validation.success) {
      const validationError = 'API response validation failed';
      setError(validationError);
      console.error(validation.error.issues);
      return { success: false, error: validationError };
    }

    const result = validation.data;
    const canonicalResult = result.result as FogUIResponse | undefined;

    if (canonicalResult) {
      const contractVersionError = enforceContractVersion(canonicalResult);
      if (contractVersionError) {
        const upstreamError = result.success ? null : result.error || 'Transformation failed';
        const combinedError = upstreamError
          ? `${upstreamError}; ${contractVersionError}`
          : contractVersionError;
        setError(combinedError);
        return {
          success: false,
          error: combinedError,
          result: canonicalResult,
          usage: result.usage,
        };
      }
    }

    if (!result.success) {
      const message = result.error || 'Transformation failed';
      setError(message);
      return {
        success: false,
        error: message,
        result: canonicalResult,
        usage: result.usage,
      };
    }

    return {
      success: true,
      result: canonicalResult as FogUIResponse,
      usage: result.usage,
    };
  }, [enforceContractVersion]);

  const shouldSuppressPostDoneNetworkError = useCallback((streamError: unknown, seenDoneEvent: boolean): boolean => (
    seenDoneEvent &&
    (streamError instanceof Error || streamError instanceof TypeError) &&
    String(streamError.message).toLowerCase().includes('network')
  ), []);

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
      const response = await fetchClient(`${endpoint}/fogui/transform`, {
        method: 'POST',
        headers: createRequestHeaders(),
        body: JSON.stringify(createRequestBody(content, options)),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return parseTransformResponse(response);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [createRequestBody, createRequestHeaders, endpoint, fetchClient]);

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
      const response = await fetchClient(`${endpoint}/fogui/transform/stream`, {
        method: 'POST',
        headers: createRequestHeaders(),
        body: JSON.stringify(createRequestBody(content, options)),
      });

      for await (const event of readSseResponse(response)) {
        if (event.type === 'result') {
          const contractVersionError = enforceContractVersion(event.data);
          if (contractVersionError) {
            yield { type: 'error', data: { error: contractVersionError } };
            continue;
          }
        }

        seenDoneEvent = seenDoneEvent || event.type === 'done';
        yield event;
      }

    } catch (err) {
      // Some environments can throw a terminal network error after a valid done event.
      if (shouldSuppressPostDoneNetworkError(err, seenDoneEvent)) {
        return;
      }

      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      yield { type: 'error', data: { error: message } };
    } finally {
      setIsLoading(false);
    }
  }, [createRequestBody, createRequestHeaders, endpoint, enforceContractVersion, fetchClient, shouldSuppressPostDoneNetworkError]);

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
