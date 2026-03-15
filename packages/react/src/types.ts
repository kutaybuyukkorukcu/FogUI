/**
 * FogUI SDK - Core types and interfaces
 */

/**
 * Configuration for the FogUI SDK
 */
export interface FogUIConfig {
  /**
   * Your FogUI API key (get it from https://fogui.dev/dashboard)
   */
  apiKey: string;
}

export interface TransformOptions {
  /**
   * Hints about the user's intent (e.g., "weather_query", "data_analysis")
   */
  intent?: string;

  /**
   * Preferred component types to use
   */
  preferredComponents?: string[];

  /**
   * Custom instructions for transformation
   */
  instructions?: string;

  /**
   * Streaming behavior controls.
   */
  stream?: {
    /**
     * Emit chunk events for legacy consumers.
     * @default true
     */
    includeChunks?: boolean;
    /**
     * Prefer patch events as the primary incremental transport.
     * @default true
     */
    preferPatches?: boolean;
  };
}

export interface FogUIActionPayload {
  action: string;
  data?: unknown;
  timestamp: string;
  sourceComponent: string;
}

export interface FogUIActionErrorPayload extends FogUIActionPayload {
  error: unknown;
}

export interface FogUIPatchOperation {
  op: 'replace' | 'append' | 'remove';
  path: string;
  value?: unknown;
}

export interface TransformResult {
  success: boolean;
  result?: FogUIResponse;
  error?: string;
  usage?: {
    transformTokens: number;
    model: string;
    estimatedCost: number;
    processingTimeMs: number;
  };
}

export interface UseFogUIReturn {
  /**
   * Transform raw LLM text into structured UI
   */
  transform: (content: string, options?: TransformOptions) => Promise<TransformResult>;

  /**
   * Transform with streaming - returns an async generator
   */
  transformStream: (content: string, options?: TransformOptions) => AsyncGenerator<StreamEvent>;

  /**
   * Apply incremental UI patches to an existing canonical response.
   */
  applyPatches: (current: FogUIResponse, patches: FogUIPatchOperation[]) => FogUIResponse;

  /**
   * Whether a transformation is in progress
   */
  isLoading: boolean;

  /**
   * Current error if any
   */
  error: string | null;

  /**
   * Clear error state
   */
  clearError: () => void;
}

export interface StreamChunkEvent {
  type: 'chunk';
  data: string;
}

export interface StreamPatchEvent {
  type: 'patch';
  data: FogUIPatchOperation[];
}

export interface StreamResultEvent {
  type: 'result';
  data: FogUIResponse;
}

export interface StreamUsageEvent {
  type: 'usage';
  data: {
    transformTokens?: number;
    processingTimeMs?: number;
    [key: string]: unknown;
  };
}

export interface StreamErrorEvent {
  type: 'error';
  data: {
    error: string;
    [key: string]: unknown;
  };
}

export interface StreamDoneEvent {
  type: 'done';
  data: null;
}

export type StreamEvent =
  | StreamChunkEvent
  | StreamPatchEvent
  | StreamResultEvent
  | StreamUsageEvent
  | StreamErrorEvent
  | StreamDoneEvent;

export * from './types/schema';

// ============================================
// FogUI Response Types
// ============================================

export interface ThinkingItem {
  status: 'active' | 'complete';
  message: string;
  timestamp?: string;
}

export type ContentBlock = TextBlock | ComponentBlock;

export interface TextBlock {
  type: 'text';
  value: string;
}

export interface ComponentBlock {
  type: 'component';
  componentType: string;
  props: Record<string, unknown>;
  children?: ComponentBlock[];
}

export interface FogUIResponse {
  thinking: ThinkingItem[];
  content: ContentBlock[];
  metadata?: {
    timestamp?: string;
    version?: string;
    modelUsed?: string;
    queryType?: string;
    [key: string]: unknown;
  };
}
