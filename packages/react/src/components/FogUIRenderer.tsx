import React from 'react';
import type { FogUIResponse, ContentBlock } from '../types';
import { DynamicComponent, defaultComponentRegistry } from './ComponentRegistry';

interface FogUIRendererProps {
  /**
   * The FogUIResponse to render
   */
  response: FogUIResponse;
  /**
   * Custom component registry to override default components
   */
  componentRegistry?: Record<string, React.ComponentType<any>>;
  /**
   * Custom className for the container
   */
  className?: string;
}

/**
 * FogUIRenderer - Renders a FogUIResponse as React components.
 * 
 * @example
 * ```tsx
 * import { FogUIRenderer } from '@fogui/react';
 * 
 * function Chat({ response }) {
 *   return <FogUIRenderer response={response} />;
 * }
 * ```
 */
export function FogUIRenderer({ response, componentRegistry, className }: FogUIRendererProps) {
  const registry = componentRegistry || defaultComponentRegistry;

  if (!response || !response.content) {
    return null;
  }

  return (
    <div className={className}>
      {response.content.map((block, index) => (
        <ContentBlockRenderer 
          key={index} 
          block={block} 
          registry={registry}
        />
      ))}
    </div>
  );
}

interface ContentBlockRendererProps {
  block: ContentBlock;
  registry: Record<string, React.ComponentType<any>>;
}

function ContentBlockRenderer({ block, registry }: ContentBlockRendererProps) {
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
    return <DynamicComponent block={block} registry={registry} />;
  }

  return null;
}
