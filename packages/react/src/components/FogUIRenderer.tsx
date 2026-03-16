import React from 'react';
import type {
  ContentBlock,
  FogUIActionErrorPayload,
  FogUIActionPayload,
  FogUIResponse,
} from '../types';
import { FogUIComponent } from '../types';
import { useFogUIContext } from '../providers/FogUIProvider';

import { Adapter } from '../types/adapter';

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
  onAction?: (action: string, data?: unknown) => void;
  onActionStart?: (payload: FogUIActionPayload) => void | Promise<void>;
  onActionComplete?: (payload: FogUIActionPayload) => void | Promise<void>;
  onActionError?: (payload: FogUIActionErrorPayload) => void | Promise<void>;
}

async function invokeHandler<TArgs extends unknown[]>(
  handler: ((...args: TArgs) => void | Promise<void>) | undefined,
  ...args: TArgs
): Promise<void> {
  if (!handler) return;
  await handler(...args);
}

function dispatchActionLifecycle(
  handlers: ActionLifecycleHandlers,
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
      {response.content.map((block) => (
        <ContentBlockRenderer
          key={getBlockKey(block)}
          block={block}
          registry={adapter.components}
          lifecycleHandlers={lifecycleHandlers}
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
  readonly lifecycleHandlers: Readonly<ActionLifecycleHandlers>;
  readonly adapter: Readonly<Adapter>;
}

function normalizeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

function findClosestComponent(missingType: string, availableTypes: string[]): string | null {
  if (availableTypes.length === 0) {
    return null;
  }

  const normalizedMissing = normalizeName(missingType);
  const exact = availableTypes.find((type) => normalizeName(type) === normalizedMissing);
  if (exact) {
    return exact;
  }

  const partial = availableTypes.find((type) => {
    const normalizedType = normalizeName(type);
    return normalizedType.includes(normalizedMissing) || normalizedMissing.includes(normalizedType);
  });

  return partial ?? null;
}

function getBlockKey(block: ContentBlock): string {
  if (block.type === 'text') {
    return `text:${block.value}`;
  }
  return `component:${block.componentType}:${JSON.stringify(block.props)}:${JSON.stringify(block.children ?? [])}`;
}

function hasActionHandlers(lifecycleHandlers: Readonly<ActionLifecycleHandlers>): boolean {
  return (
    !!lifecycleHandlers.onAction ||
    !!lifecycleHandlers.onActionStart ||
    !!lifecycleHandlers.onActionComplete ||
    !!lifecycleHandlers.onActionError
  );
}

function isContentBlockLike(value: unknown): value is ContentBlock {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const block = value as { type?: unknown };
  return block.type === 'text' || block.type === 'component';
}

function getRenderableChildren(
  blockChildren: unknown,
  propsChildren: unknown,
): ContentBlock[] {
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
      {lines.map((line, i) => (
        <React.Fragment key={line + '-' + i}>
          {line}
          {i < lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </div>
  );
}

function renderMappedComponent(
  block: Extract<ContentBlock, { type: 'component' }>,
  Component: React.ComponentType<any>,
  lifecycleHandlers: Readonly<ActionLifecycleHandlers>,
  registry: Readonly<ComponentRegistry>,
  adapter: Readonly<Adapter>,
): JSX.Element {
  const componentType = block.componentType as FogUIComponent['componentType'];
  const rawProps: Record<string, unknown> = block.props && typeof block.props === 'object'
    ? block.props
    : {};
  const propsChildren = rawProps.children;
  const restProps = Object.fromEntries(
    Object.entries(rawProps).filter(([key]) => key !== 'children')
  );
  const mappedProps = adapter.mapProps ? adapter.mapProps(componentType, restProps) : restProps;
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
      {childBlocks.map((childBlock) => (
        <ContentBlockRenderer
          key={getBlockKey(childBlock)}
          block={childBlock}
          registry={registry}
          lifecycleHandlers={lifecycleHandlers}
          adapter={adapter}
        />
      ))}
    </Component>
  );
}

function renderUnmappedComponent(block: Extract<ContentBlock, { type: 'component' }>, registry: Readonly<ComponentRegistry>): JSX.Element {
  const availableComponents = Object.keys(registry);
  const suggestion = findClosestComponent(block.componentType, availableComponents);
  const availableText = availableComponents.length > 0 ? availableComponents.join(', ') : 'none';
  const suggestionText = suggestion ? ` Did you mean "${suggestion}"?` : '';

  console.warn(
    `[FogUI] Unmapped component: "${block.componentType}".` +
    `${suggestionText}` +
    ` Available adapter components: ${availableText}.` +
    ` Add a "${block.componentType}" mapping in adapter.components.`
  );

  return (
    <UnmappedComponent
      componentType={block.componentType}
      availableComponents={availableComponents}
      suggestion={suggestion}
    />
  );
}

function ContentBlockRenderer({ block, registry, lifecycleHandlers, adapter }: ContentBlockRendererProps) {
  if (block.type === 'text') {
    return renderTextBlock(block.value);
  }

  if (block.type !== 'component') {
    return null;
  }

  const componentType = block.componentType as FogUIComponent['componentType'];
  const Component = registry[componentType];

  if (Component) {
    return renderMappedComponent(block, Component, lifecycleHandlers, registry, adapter);
  }

  return renderUnmappedComponent(block, registry);
}

// Move UnmappedComponent out of parent
function UnmappedComponent({
  componentType,
  availableComponents,
  suggestion,
}: Readonly<{ componentType: string; availableComponents: string[]; suggestion: string | null }>) {
  const availableText = availableComponents.length > 0 ? availableComponents.join(', ') : 'none';
  const suggestionText = suggestion ? ` Did you mean "${suggestion}"?` : '';

  return (
    <div data-fogui-unmapped="true" style={{ padding: '10px', border: '1px solid red', color: 'red' }}>
      Unmapped component: &quot;{componentType}&quot;.{suggestionText} Available adapter components: {availableText}. Add this mapping to your adapter&apos;s `components` object.
    </div>
  );
}
