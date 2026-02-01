import type { ContentBlock, FogUIResponse } from '../types';
import { DynamicComponent, defaultComponentRegistry, mergeRegistries } from './ComponentRegistry';

import React from 'react';
import { useFogUIContext } from '../FogUIProvider';

export interface FogUIRendererProps {
  /**
   * The FogUIResponse to render
   */
  response: FogUIResponse;
  /**
   * Custom component registry to override context/default components.
   * If not provided, uses the registry from FogUIProvider (if any),
   * falling back to defaultComponentRegistry.
   */
  componentRegistry?: Record<string, React.ComponentType<any>>;
  /**
   * Custom className for the container
   */
  className?: string;
  /**
   * Custom styles for the container
   */
  style?: React.CSSProperties;
  /**
   * Optional callback for component actions.
   * If provided, overrides the context's onAction handler.
   */
  sendMessage?: (message: string) => void;
}

/**
 * FogUIRenderer - Renders a FogUIResponse as React components.
 * 
 * Uses the component registry from FogUIProvider if configured,
 * otherwise falls back to default components.
 * 
 * @example Basic usage
 * ```tsx
 * import { FogUIRenderer } from '@fogui/react';
 * 
 * function Chat({ response }) {
 *   return <FogUIRenderer response={response} />;
 * }
 * ```
 * 
 * @example With inline component override
 * ```tsx
 * <FogUIRenderer 
 *   response={response} 
 *   componentRegistry={{ card: MySpecialCard }}
 * />
 * ```
 */
export function FogUIRenderer({ response, componentRegistry, className, style, sendMessage }: FogUIRendererProps) {
  // Try to get registry from context (set in FogUIProvider)
  let contextRegistry: Record<string, React.ComponentType<any>> | undefined;
  let contextOnAction: ((action: string, data?: unknown) => void) | undefined;
  
  try {
    const context = useFogUIContext();
    contextRegistry = context.componentRegistry;
    contextOnAction = context.onAction;
  } catch {
    // Not inside FogUIProvider, use defaults
  }

  // Handle actions: prefer prop > context > no-op
  const handleAction = sendMessage || ((msg: string) => contextOnAction?.('message', msg));

  // Merge: prop registry > context registry > default registry
  const registry = mergeRegistries(defaultComponentRegistry, contextRegistry, componentRegistry);

  if (!response || !response.content) {
    return null;
  }

  return (
    <div className={className} style={style}>
      {response.content.map((block, index) => (
        <ContentBlockRenderer 
          key={index} 
          block={block} 
          registry={registry}
          sendMessage={handleAction}
        />
      ))}
    </div>
  );
}

interface ContentBlockRendererProps {
  block: ContentBlock;
  registry: Record<string, React.ComponentType<any>>;
  sendMessage?: (message: string) => void;
}

function ContentBlockRenderer({ block, registry, sendMessage }: ContentBlockRendererProps) {
  if (block.type === 'text') {
    return (
      <div style={{ marginBottom: '12px', lineHeight: 1.6 }}>
        {block.value.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < block.value.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
    );
  }

  if (block.type === 'component') {
    return <DynamicComponent block={block} registry={registry} sendMessage={sendMessage} />;
  }

  return null;
}
