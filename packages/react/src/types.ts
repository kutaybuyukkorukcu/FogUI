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

export interface StreamEvent {
  type: 'chunk' | 'result' | 'usage' | 'error' | 'done';
  data: unknown;
}

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
