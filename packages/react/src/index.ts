export { FogUIProvider, useFogUIContext } from './providers/FogUIProvider';
export { createAdapter, getAdapterConformance } from './utils';
export type { FogUIContractVersionConfig, FogUIProviderProps } from './providers/FogUIProvider';

// Main Hook
export { useFogUI } from './useFogUI';

// Types
export * from './types';
export * from './types/schema';
export * from './types/adapter';
export * from './types/schema.zod';

// Components
export { FogUIRenderer } from './components/FogUIRenderer';

// Adapters
export { headlessAdapter } from './adapters/headless';
