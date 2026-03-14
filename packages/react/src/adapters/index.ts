/**
 * Pre-built adapters for popular design systems.
 * 
 * These adapters map FogUI component types to components from popular UI libraries.
 * Simply import and use as your adapter.
 * 
 * @example Using the Shadcn adapter
 * ```tsx
 * import { FogUIProvider } from '@fogui/react';
 * import { shadcnAdapter } from '@fogui/react/adapters';
 * 
 * function App() {
 *   return (
 *     <FogUIProvider apiKey="fog_xxx" adapter={shadcnAdapter}>
 *       <MyApp />
 *     </FogUIProvider>
 *   );
 * }
 * ```
 * 
 * @packageDocumentation
 */

export { shadcnAdapter } from './shadcn';
export { headlessAdapter } from './headless';
