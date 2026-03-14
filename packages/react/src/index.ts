// Provider & Context
export { FogUIProvider, useFogUIContext, createAdapter } from './providers/FogUIProvider';
export type { FogUIProviderProps } from './providers/FogUIProvider';

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
export { shadcnAdapter } from './adapters/shadcn';
export { headlessAdapter } from './adapters/headless';
