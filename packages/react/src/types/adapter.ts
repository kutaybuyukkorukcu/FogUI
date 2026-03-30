import React from 'react';
import type { ComponentBlock } from './schema';

export type AdapterComponent = React.ComponentType<any>;
export type AdapterComponentRegistry = Readonly<Record<string, AdapterComponent>>;

export interface AdapterMapPropsInput {
  readonly componentType: string;
  readonly props: Readonly<Record<string, unknown>>;
}

export interface AdapterConformance {
  readonly requiredComponents?: readonly string[];
}

export interface AdapterConformanceIssue {
  readonly kind: 'missing-component';
  readonly componentType: string;
  readonly message: string;
}

export interface AdapterConformanceResult {
  readonly ok: boolean;
  readonly issues: readonly AdapterConformanceIssue[];
  readonly requiredComponents: readonly string[];
}

export interface AdapterRenderIssue {
  readonly kind: 'map-props-failed' | 'unmapped-component';
  readonly componentType: string;
  readonly message: string;
  readonly error?: unknown;
}

export interface AdapterFallbackProps {
  readonly block: ComponentBlock;
  readonly issue: AdapterRenderIssue;
  readonly availableComponents: readonly string[];
  readonly suggestion: string | null;
}

/**
 * Defines the shape of a component adapter for a specific design system.
 * The adapter is responsible for mapping canonical FogUI components to the
 * actual components in the target design system.
 */
export interface Adapter {
  readonly components: AdapterComponentRegistry;

  readonly mapProps?: (input: AdapterMapPropsInput) => Record<string, unknown>;
  readonly renderFallback?: React.ComponentType<AdapterFallbackProps>;
  readonly conformance?: AdapterConformance;
}
