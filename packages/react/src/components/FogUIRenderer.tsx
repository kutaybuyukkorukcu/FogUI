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

  const handleAction = onAction || contextOnAction;

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
          adapter={adapter}
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
  adapter: Adapter;
}

import { FogUIComponent } from '../types';

function ContentBlockRenderer({ block, registry, onAction, adapter }: ContentBlockRendererProps) {
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
      const { children, ...restProps } = block.props;
      const mappedProps = adapter.mapProps ? adapter.mapProps(componentType, restProps) : restProps;
      
      return (
        <Component {...mappedProps} onAction={onAction}>
          {block.children && block.children.map((childBlock, index) => (
            <ContentBlockRenderer
              key={index}
              block={childBlock}
              registry={registry}
              onAction={onAction}
              adapter={adapter}
            />
          ))}
        </Component>
      );
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
