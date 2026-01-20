import type { ComponentBlock } from '../../../types';

/**
 * Base component prop interfaces for design system compatibility.
 * Customers implement these interfaces to provide their own component renderers.
 */

// =============================================================================
// Text Component
// =============================================================================

export interface TextProps {
  value: string;
  variant?: 'body' | 'heading' | 'caption';
}

// =============================================================================
// Card Component
// =============================================================================

export interface CardProps {
  title?: string;
  description?: string;
  data?: Record<string, unknown>;
  onClick?: () => void;
  children?: React.ReactNode;
}

// =============================================================================
// List Component
// =============================================================================

export interface ListProps {
  title?: string;
  items: unknown[];
  layout?: 'list' | 'grid' | 'compact';
  renderItem?: (item: unknown, index: number) => React.ReactNode;
}

// =============================================================================
// Table Component
// =============================================================================

export interface TableProps {
  columns: string[];
  rows: Record<string, unknown>[];
  title?: string;
}

// =============================================================================
// Container Component (Layout)
// =============================================================================

export interface ContainerProps {
  layout?: 'stack' | 'grid';
  direction?: 'vertical' | 'horizontal';
  gap?: 'sm' | 'md' | 'lg' | 'none';
  columns?: number;
  children?: ComponentBlock[];
  className?: string;
}

// =============================================================================
// Component Registry Type
// =============================================================================

/**
 * Registry mapping component type names to their React implementations.
 * Customers can provide partial overrides - undefined values fall back to defaults.
 */
export type ComponentRegistry = {
  text: React.ComponentType<TextProps>;
  card: React.ComponentType<CardProps>;
  list: React.ComponentType<ListProps>;
  table: React.ComponentType<TableProps>;
  container: React.ComponentType<ContainerProps>;
};

/**
 * Partial registry for customer overrides.
 * Any component not specified will use FogUI's default renderer.
 */
export type PartialComponentRegistry = Partial<ComponentRegistry>;
