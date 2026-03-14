import React from 'react';
import type { ContentBlock, FogUIResponse } from '../types';
import { useFogUIContext } from '../providers/FogUIProvider';

import { Adapter } from '../types/adapter';

export interface FogUIRendererProps {
  response: FogUIResponse;
  className?: string;
  style?: React.CSSProperties;
  onAction?: (action: any) => void;
}

export function FogUIRenderer({ response, className, style, onAction }: FogUIRendererProps) {
  const { adapter, onAction: contextOnAction } = useFogUIContext();

  const handleAction = onAction || ((action: any) => {
    if (typeof action === 'string') {
      contextOnAction?.('message', action);
    } else if (action && typeof action === 'object' && 'type' in action) {
      contextOnAction?.(action.type, action);
    } else {
      contextOnAction?.('action', action);
    }
  });

  if (!response || !response.content) {
    return null;
  }

  return (
    <div className={className} style={style}>
      {response.content.map((block, index) => (
        <ContentBlockRenderer
          key={index}
          block={block}
          registry={adapter.components}
          onAction={handleAction}
        />
      ))}
    </div>
  );
}

type ComponentRegistry = Adapter['components'];

interface ContentBlockRendererProps {
  block: ContentBlock;
  registry: ComponentRegistry;
  onAction?: (action: any) => void;
}

import { FogUIComponent } from '../types';

function ContentBlockRenderer({ block, registry, onAction }: ContentBlockRendererProps) {
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
    const componentType = block.componentType as FogUIComponent['componentType'];
    const Component = registry[componentType];
    if (Component) {
      return <Component {...block.props} onAction={onAction} />;
    }
    // Fallback for unmapped component
    const UnmappedComponent = () => (
      <div data-fogui-unmapped="true" style={{ padding: '10px', border: '1px solid red', color: 'red' }}>
        Unmapped component: &quot;{block.componentType}&quot;. Please add it to your adapter.
      </div>
    );
    console.warn(`[FogUI] Unmapped component: "${block.componentType}". Please add it to your adapter.`);
    return <UnmappedComponent />;
  }

  return null;
}
