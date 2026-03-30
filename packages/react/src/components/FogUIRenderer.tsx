import React from 'react';
import type {
  ComponentBlock,
  ContentBlock,
  FogUIActionErrorPayload,
  FogUIActionPayload,
  FogUIResponse,
} from '../types';
import { useFogUIContext } from '../providers/FogUIProvider';
import type { Adapter, AdapterFallbackProps, AdapterRenderIssue } from '../types/adapter';
import { findSuggestedComponent, resolveAdapterComponent } from '../utils';

export interface FogUIRendererProps {
  readonly response: FogUIResponse;
  readonly className?: string;
  readonly style?: React.CSSProperties;
  readonly onAction?: (action: string, data?: unknown) => void;
  readonly onActionStart?: (payload: FogUIActionPayload) => void | Promise<void>;
  readonly onActionComplete?: (payload: FogUIActionPayload) => void | Promise<void>;
  readonly onActionError?: (payload: FogUIActionErrorPayload) => void | Promise<void>;
}

interface ActionLifecycleHandlers {
  readonly onAction?: (action: string, data?: unknown) => void;
  readonly onActionStart?: (payload: FogUIActionPayload) => void | Promise<void>;
  readonly onActionComplete?: (payload: FogUIActionPayload) => void | Promise<void>;
  readonly onActionError?: (payload: FogUIActionErrorPayload) => void | Promise<void>;
}

type ComponentRegistry = Adapter['components'];

interface ContentBlockRendererProps {
  readonly block: Readonly<ContentBlock>;
  readonly registry: Readonly<ComponentRegistry>;
  readonly lifecycleHandlers: Readonly<ActionLifecycleHandlers>;
  readonly adapter: Readonly<Adapter>;
}

async function invokeHandler<TArgs extends unknown[]>(
  handler: ((...args: TArgs) => void | Promise<void>) | undefined,
  ...args: TArgs
): Promise<void> {
  if (!handler) {
    return;
  }

  await handler(...args);
}

function dispatchActionLifecycle(
  handlers: Readonly<ActionLifecycleHandlers>,
  sourceComponent: string,
  action: string,
  data?: unknown,
): void {
  const payload: FogUIActionPayload = {
    action,
    data,
    sourceComponent,
    timestamp: new Date().toISOString(),
  };

  const runLifecycle = async () => {
    await invokeHandler(handlers.onActionStart, payload);
    await invokeHandler(handlers.onAction, action, data);
    await invokeHandler(handlers.onActionComplete, payload);
  };

  void runLifecycle().catch((error) => {
    void invokeHandler(handlers.onActionError, {
      ...payload,
      error,
    }).catch((handlerError) => {
      console.warn('[FogUI] onActionError handler failed', handlerError);
    });
  });
}

function getBlockKey(block: ContentBlock, index: number): string {
  if (block.type === 'text') {
    return 'text:' + index;
  }

  return 'component:' + block.componentType + ':' + index;
}

function hasActionHandlers(lifecycleHandlers: Readonly<ActionLifecycleHandlers>): boolean {
  return Boolean(
    lifecycleHandlers.onAction ||
    lifecycleHandlers.onActionStart ||
    lifecycleHandlers.onActionComplete ||
    lifecycleHandlers.onActionError,
  );
}

function isContentBlockLike(value: unknown): value is ContentBlock {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const block = value as { type?: unknown };
  return block.type === 'component' || block.type === 'text';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getRenderableChildren(blockChildren: unknown, propsChildren: unknown): ContentBlock[] {
  if (Array.isArray(blockChildren) && blockChildren.length > 0) {
    return blockChildren.filter(isContentBlockLike);
  }

  if (Array.isArray(propsChildren)) {
    return propsChildren.filter(isContentBlockLike);
  }

  if (isContentBlockLike(propsChildren)) {
    return [propsChildren];
  }

  return [];
}

function renderTextBlock(value: string): JSX.Element {
  const lines = String(value ?? '').split('\n');
  return (
    <div style={{ marginBottom: '12px', lineHeight: 1.6 }}>
      {lines.map((line, index) => (
        <React.Fragment key={`${line}-${index}`}>
          {line}
          {index < lines.length - 1 ? <br /> : null}
        </React.Fragment>
      ))}
    </div>
  );
}

function renderFallback(
  block: ComponentBlock,
  issue: AdapterRenderIssue,
  registry: Readonly<ComponentRegistry>,
  adapter?: Readonly<Adapter>,
): JSX.Element {
  const availableComponents = Object.keys(registry);
  const suggestion = findSuggestedComponent(registry, block.componentType);
  const availableText = availableComponents.length > 0 ? availableComponents.join(', ') : 'none';
  const suggestionText = suggestion ? ` Did you mean "${suggestion}"?` : '';

  console.warn(
    `[FogUI] ${issue.message}` +
    `${suggestionText}` +
    ` Available adapter components: ${availableText}.`,
  );

  const FallbackComponent = adapter?.renderFallback ?? DefaultFallbackComponent;
  return (
    <FallbackComponent
      block={block}
      issue={issue}
      availableComponents={availableComponents}
      suggestion={suggestion}
    />
  );
}

function renderMappedComponent(
  block: ComponentBlock,
  Component: React.ComponentType<any>,
  lifecycleHandlers: Readonly<ActionLifecycleHandlers>,
  registry: Readonly<ComponentRegistry>,
  adapter: Readonly<Adapter>,
): JSX.Element {
  const rawProps = isRecord(block.props) ? block.props : {};
  const propsChildren = rawProps.children;
  const restProps = Object.fromEntries(Object.entries(rawProps).filter(([key]) => key !== 'children'));

  let mappedProps = restProps;

  if (adapter.mapProps) {
    try {
      const candidateProps = adapter.mapProps({
        componentType: block.componentType,
        props: restProps,
      });

      if (!isRecord(candidateProps)) {
        return renderFallback(
          block,
          {
            kind: 'map-props-failed',
            componentType: block.componentType,
            message: `Adapter mapProps for "${block.componentType}" must return an object.`,
          },
          registry,
          adapter,
        );
      }

      mappedProps = candidateProps;
    } catch (error) {
      return renderFallback(
        block,
        {
          kind: 'map-props-failed',
          componentType: block.componentType,
          message: `Adapter mapProps failed for "${block.componentType}".`,
          error,
        },
        registry,
        adapter,
      );
    }
  }

  const childBlocks = getRenderableChildren(block.children, propsChildren);
  const wrappedOnAction = hasActionHandlers(lifecycleHandlers)
    ? (action: string, data?: unknown) => {
        dispatchActionLifecycle(lifecycleHandlers, block.componentType, action, data);
      }
    : undefined;

  if (childBlocks.length === 0) {
    return <Component {...mappedProps} onAction={wrappedOnAction} />;
  }

  return (
    <Component {...mappedProps} onAction={wrappedOnAction}>
      {childBlocks.map((childBlock, index) => (
        <ContentBlockRenderer
          key={getBlockKey(childBlock, index)}
          block={childBlock}
          registry={registry}
          lifecycleHandlers={lifecycleHandlers}
          adapter={adapter}
        />
      ))}
    </Component>
  );
}

function ContentBlockRenderer({ block, registry, lifecycleHandlers, adapter }: ContentBlockRendererProps) {
  if (block.type === 'text') {
    return renderTextBlock(block.value);
  }

  if (block.type !== 'component') {
    return null;
  }

  const Component = resolveAdapterComponent(registry, block.componentType);

  if (!Component) {
    return renderFallback(
      block,
      {
        kind: 'unmapped-component',
        componentType: block.componentType,
        message: `Unmapped component "${block.componentType}" received from canonical response.`,
      },
      registry,
      adapter,
    );
  }

  return renderMappedComponent(block, Component, lifecycleHandlers, registry, adapter);
}

function DefaultFallbackComponent({
  block,
  issue,
  availableComponents,
  suggestion,
}: AdapterFallbackProps) {
  const availableText = availableComponents.length > 0 ? availableComponents.join(', ') : 'none';
  const suggestionText = suggestion ? ` Did you mean "${suggestion}"?` : '';

  return (
    <div data-fogui-unmapped="true" style={{ padding: '10px', border: '1px solid red', color: 'red' }}>
      {issue.kind === 'map-props-failed' ? 'Adapter prop mapping failed' : 'Unmapped component'}: &quot;{block.componentType}&quot;.{suggestionText} Available adapter components: {availableText}.
    </div>
  );
}

export function FogUIRenderer({
  response,
  className,
  style,
  onAction,
  onActionStart,
  onActionComplete,
  onActionError,
}: FogUIRendererProps) {
  const {
    adapter,
    onAction: contextOnAction,
    onActionStart: contextOnActionStart,
    onActionComplete: contextOnActionComplete,
    onActionError: contextOnActionError,
  } = useFogUIContext();

  const lifecycleHandlers: ActionLifecycleHandlers = {
    onAction: onAction || contextOnAction,
    onActionStart: onActionStart || contextOnActionStart,
    onActionComplete: onActionComplete || contextOnActionComplete,
    onActionError: onActionError || contextOnActionError,
  };

  if (!Array.isArray(response?.content)) {
    return null;
  }

  return (
    <div className={className} style={style}>
      {response.content.map((block, index) => (
        <ContentBlockRenderer
          key={getBlockKey(block, index)}
          block={block}
          registry={adapter.components}
          lifecycleHandlers={lifecycleHandlers}
          adapter={adapter}
        />
      ))}
    </div>
  );
}
