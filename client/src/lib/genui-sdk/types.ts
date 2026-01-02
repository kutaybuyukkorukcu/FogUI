/**
 * GenUI SDK - Core types and interfaces
 */

import { GenerativeUIResponse } from "../../types";

/**
 * Configuration for the GenUI SDK
 */
export interface GenUIConfig {
  /**
   * Your GenUI API key (get it from https://genui.dev/dashboard)
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
  result?: GenerativeUIResponse;
  error?: string;
  usage?: {
    transformTokens: number;
    model: string;
    estimatedCost: number;
    processingTimeMs: number;
  };
}

export interface UseGenUIReturn {
  /**
   * Transform raw LLM text into structured UI
   */
  transform: (content: string, options?: TransformOptions) => Promise<TransformResult>;

  /**
   * Transform with streaming - returns an async generator
   */
  transformStream: (content: string, options?: TransformOptions) => AsyncGenerator<{
    type: 'chunk' | 'result' | 'usage' | 'error' | 'done';
    data: unknown;
  }>;

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
