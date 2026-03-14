import React from 'react';
import type { ContentBlock, FogUIResponse } from '../types';
import { FogUIComponent } from '../types';
import { useFogUIContext } from '../providers/FogUIProvider';

import { Adapter } from '../types/adapter';

export interface FogUIRendererProps {
  readonly response: FogUIResponse;
  readonly className?: string;
  readonly style?: React.CSSProperties;
  readonly onAction?: (action: any) => void;
}

export function FogUIRenderer({ response, className, style, onAction }: FogUIRendererProps) {
  const { adapter, onAction: contextOnAction } = useFogUIContext();

  const handleAction = onAction || contextOnAction;

  if (!response?.content) {
    return null;
  }

  return (
    <div className={className} style={style}>
      {response.content.map((block) => (
        <ContentBlockRenderer
          key={getBlockKey(block)}
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
  readonly block: Readonly<ContentBlock>;
  readonly registry: Readonly<ComponentRegistry>;
  readonly onAction?: (action: any) => void;
  readonly adapter: Readonly<Adapter>;
}

function getBlockKey(block: ContentBlock): string {
  if (block.type === 'text') {
    return `text:${block.value}`;
  }
  return `component:${block.componentType}:${JSON.stringify(block.props)}:${JSON.stringify(block.children ?? [])}`;
}

function ContentBlockRenderer({ block, registry, onAction, adapter }: ContentBlockRendererProps) {
  if (block.type === 'text') {
    const lines = block.value.split('\n');
    return (
      <div style={{ marginBottom: '12px', lineHeight: 1.6 }}>
        {lines.map((line, i) => (
          <React.Fragment key={line + '-' + i}>
            {line}
            {i < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </div>
    );
  }

  if (block.type === 'component') {
    const componentType = block.componentType as FogUIComponent['componentType'];
    const Component = registry[componentType];

    if (Component) {
      const restProps = { ...block.props };
      delete (restProps as { children?: unknown }).children;
      const mappedProps = adapter.mapProps ? adapter.mapProps(componentType, restProps) : restProps;

      return (
        <Component {...mappedProps} onAction={onAction}>
          {block.children?.map((childBlock) => (
            <ContentBlockRenderer
              key={getBlockKey(childBlock)}
              block={childBlock}
              registry={registry}
              onAction={onAction}
              adapter={adapter}
            />
          ))}
        </Component>
      );
    }

    console.warn(`[FogUI] Unmapped component: "${block.componentType}". Please add it to your adapter.`);
    return <UnmappedComponent componentType={block.componentType} />;
  }

  return null;
}

// Move UnmappedComponent out of parent
function UnmappedComponent({ componentType }: Readonly<{ componentType: string }>) {
  return (
    <div data-fogui-unmapped="true" style={{ padding: '10px', border: '1px solid red', color: 'red' }}>
      Unmapped component: &quot;{componentType}&quot;. Please add it to your adapter.
    </div>
  );
}
