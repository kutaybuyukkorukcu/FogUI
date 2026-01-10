/**
 * Pre-built adapters for popular design systems.
 * 
 * These adapters map FogUI component types to components from popular UI libraries.
 * Simply import and use as your component registry.
 * 
 * @example Using Shadcn adapter
 * ```tsx
 * import { FogUIProvider } from '@fogui/react';
 * import { createShadcnAdapter } from '@fogui/react/adapters';
 * 
 * // Create adapter with your Shadcn components
 * const shadcnComponents = createShadcnAdapter({
 *   Card, CardHeader, CardContent, CardTitle, CardDescription,
 *   Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
 *   Alert, AlertTitle, AlertDescription,
 * });
 * 
 * function App() {
 *   return (
 *     <FogUIProvider apiKey="fog_xxx" components={shadcnComponents}>
 *       <MyApp />
 *     </FogUIProvider>
 *   );
 * }
 * ```
 * 
 * @packageDocumentation
 */

export { createShadcnAdapter, type ShadcnComponents } from './shadcn';
export { createHeadlessAdapter, type HeadlessConfig } from './headless';
