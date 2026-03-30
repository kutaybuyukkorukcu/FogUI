import type {
  Adapter,
  AdapterComponent,
  AdapterComponentRegistry,
  AdapterConformanceResult,
} from './types/adapter';

export const DEFAULT_REQUIRED_COMPONENTS: readonly string[] = [];

/**
 * A simple utility function to create an adapter with type safety.
 * It doesn't do much, but it ensures the object passed matches the Adapter interface.
 * @param adapter The adapter object.
 * @returns The same adapter object.
 */
export function createAdapter<TAdapter extends Adapter>(adapter: TAdapter): TAdapter {
  return adapter;
}

export function normalizeComponentType(value: string): string {
  return Array.from(value)
    .filter((char) => /[a-zA-Z0-9]/.test(char))
    .join('')
    .toLowerCase();
}

export function resolveAdapterComponent(
  registry: AdapterComponentRegistry,
  componentType: string,
): AdapterComponent | undefined {
  const indexedRegistry = registry as Record<string, AdapterComponent | undefined>;
  const exactMatch = indexedRegistry[componentType];
  if (exactMatch) {
    return exactMatch;
  }

  const normalizedTarget = normalizeComponentType(componentType);
  const matchingKey = Object.keys(registry).find((key) => normalizeComponentType(key) === normalizedTarget);
  return matchingKey ? indexedRegistry[matchingKey] : undefined;
}

export function findSuggestedComponent(
  registry: AdapterComponentRegistry,
  componentType: string,
): string | null {
  const availableTypes = Object.keys(registry);
  if (availableTypes.length === 0) {
    return null;
  }

  const normalizedTarget = normalizeComponentType(componentType);
  const partialMatch = availableTypes.find((key) => {
    const normalizedKey = normalizeComponentType(key);
    return normalizedKey.includes(normalizedTarget) || normalizedTarget.includes(normalizedKey);
  });

  return partialMatch ?? null;
}

export function getAdapterConformance(adapter: Adapter): AdapterConformanceResult {
  const requiredComponents = Array.from(new Set(adapter.conformance?.requiredComponents ?? DEFAULT_REQUIRED_COMPONENTS));
  const issues = requiredComponents
    .filter((componentType) => !resolveAdapterComponent(adapter.components, componentType))
    .map((componentType) => ({
      kind: 'missing-component' as const,
      componentType,
      message: `Adapter is missing a required component mapping for "${componentType}".`,
    }));

  return {
    ok: issues.length === 0,
    issues,
    requiredComponents,
  };
}
