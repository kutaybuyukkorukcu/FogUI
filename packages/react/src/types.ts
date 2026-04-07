import type { FogUIResponse } from './types/schema';

export type { ContentBlock, FogUIResponse, ThinkingItem } from './types/schema';
export * from './types/schema';

export interface FogUIConfig {
  readonly apiKey?: string;
}

export interface TransformOptions {
  readonly intent?: string;
  readonly preferredComponents?: readonly string[];
  readonly instructions?: string;
}

export interface FogUIActionPayload {
  readonly action: string;
  readonly data?: unknown;
  readonly timestamp: string;
  readonly sourceComponent: string;
}

export interface FogUIActionErrorPayload extends FogUIActionPayload {
  readonly error: unknown;
}

export interface TransformUsage {
  readonly transformTokens?: number | null;
  readonly model?: string | null;
  readonly estimatedCost?: number | null;
  readonly processingTimeMs?: number | null;
  readonly [key: string]: unknown;
}

export interface TransformSuccessResult {
  readonly success: true;
  readonly result: FogUIResponse;
  readonly usage?: TransformUsage;
}

export interface TransformFailureResult {
  readonly success: false;
  readonly error: string;
  readonly result?: FogUIResponse;
  readonly usage?: TransformUsage;
}

export type TransformResult = TransformSuccessResult | TransformFailureResult;

export interface UseFogUIReturn {
  readonly transform: (content: string, options?: TransformOptions) => Promise<TransformResult>;
  readonly transformStream: (content: string, options?: TransformOptions) => AsyncGenerator<StreamEvent>;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly clearError: () => void;
}

export interface StreamResultEvent {
  readonly type: 'result';
  readonly data: FogUIResponse;
}

export interface StreamUsageEvent {
  readonly type: 'usage';
  readonly data: {
    readonly transformTokens?: number;
    readonly processingTimeMs?: number;
    readonly [key: string]: unknown;
  };
}

export interface StreamErrorEvent {
  readonly type: 'error';
  readonly data: {
    readonly error: string;
    readonly [key: string]: unknown;
  };
}

export interface StreamDoneEvent {
  readonly type: 'done';
  readonly data: null;
}

export type StreamEvent = StreamResultEvent | StreamUsageEvent | StreamErrorEvent | StreamDoneEvent;
