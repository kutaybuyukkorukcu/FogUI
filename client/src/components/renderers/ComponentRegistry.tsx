import { useMemo } from 'react';
import { CardRenderer } from './CardRenderer';
import { ChartRenderer } from './ChartRenderer';
import type { ComponentBlock } from '../../types';
import { ConfirmationDialog } from './ConfirmationDialog';
import { ContainerRenderer } from './ContainerRenderer';
import { FormRenderer } from './FormRenderer';
import { ListRenderer } from './ListRenderer';
import { TableRenderer } from './TableRenderer';
import { useGenUIContext } from '../../lib/genui-sdk/GenUIProvider';

/**
 * Default component implementations using Tailwind CSS.
 * These are used when customers don't provide their own overrides.
 */
export const DEFAULT_COMPONENTS: Record<string, React.ComponentType<unknown>> = {
  // Base semantic components (5 core types)
  text: (({ value, variant }: { value: string; variant?: string }) => {
    const className = variant === 'heading' 
      ? 'text-xl font-bold' 
      : variant === 'caption' 
        ? 'text-sm text-gray-500' 
        : 'text-base';
    return <p className={className}>{value}</p>;
  }) as React.ComponentType<unknown>,
  card: CardRenderer as React.ComponentType<unknown>,
  list: ListRenderer as React.ComponentType<unknown>,
  table: TableRenderer as React.ComponentType<unknown>,
  container: ContainerRenderer as React.ComponentType<unknown>,
  
  // Extended components (can be overridden or ignored)
  chart: ChartRenderer as React.ComponentType<unknown>,
  form: FormRenderer as React.ComponentType<unknown>,
  confirmation: ConfirmationDialog as React.ComponentType<unknown>,
};

/**
 * Hook to get merged component registry.
 * Custom components from GenUIProvider override defaults.
 */
export function useComponentRegistry(): Record<string, React.ComponentType<unknown>> {
  const { components: customComponents } = useGenUIContext();
  
  return useMemo(() => ({
    ...DEFAULT_COMPONENTS,
    ...(customComponents as Record<string, React.ComponentType<unknown>>),
  }), [customComponents]);
}

interface DynamicComponentProps {
  block: ComponentBlock;
  sendMessage?: (message: string) => void;
}

/**
 * DynamicComponent - Renders a component based on componentType from the registry.
 * Uses custom overrides from GenUIProvider if available, otherwise falls back to defaults.
 */
export const DynamicComponent = ({ block, sendMessage }: DynamicComponentProps) => {
  const registry = useComponentRegistry();
  const { componentType, props } = block;
  const Component = registry[componentType];

  if (!Component) {
    console.warn(`Unknown component type: ${componentType}`);
    return (
      <div className="rounded border border-yellow-500 bg-yellow-50 p-4 text-sm">
        <p className="font-semibold text-yellow-800">Unknown component: {componentType}</p>
        <pre className="mt-2 overflow-auto text-xs text-yellow-700">
          {JSON.stringify(props, null, 2)}
        </pre>
      </div>
    );
  }

  // Pass the entire props object to the component along with sendMessage and children
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const componentProps = { 
    ...(props as Record<string, unknown>), 
    children: block.children,
    sendMessage 
  } as any;
  return <Component {...componentProps} />;
};

