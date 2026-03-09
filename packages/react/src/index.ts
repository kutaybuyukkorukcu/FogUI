// Provider & Context
export { FogUIProvider, useFogUIContext, createAdapter } from './providers/FogUIProvider';
export type { FogUIProviderProps, Adapter } from './providers/FogUIProvider';

// Main Hook
export { useFogUI } from './useFogUI';

// Types
export * from './types';
export * from './types/canonical';

// Components
export { FogUIRenderer } from './components/FogUIRenderer';

// Adapters
export { shadcnAdapter } from './adapters/shadcn';
export { headlessAdapter } from './adapters/headless';
