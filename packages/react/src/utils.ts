import type { Adapter } from './types/adapter';

/**
 * A simple utility function to create an adapter with type safety.
 * It doesn't do much, but it ensures the object passed matches the Adapter interface.
 * @param adapter The adapter object.
 * @returns The same adapter object.
 */
export function createAdapter(adapter: Adapter): Adapter {
  return adapter;
}
