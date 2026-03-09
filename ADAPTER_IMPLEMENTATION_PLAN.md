# Implementation Plan: Shadcn/Tailwind Adapter (Phase 1)

This document outlines the concrete steps to implement the default Shadcn/Tailwind CSS adapter for FogUI.

**Goal**: Deliver a default adapter within `@fogui/react` that maps FogUI’s canonical components to a standard Shadcn UI implementation. The adapter will rely entirely on the host application's Tailwind CSS configuration for styling.

---

### 1. Project Setup & Scaffolding

-   **Location**: All new code will reside within the `packages/react` workspace.
-   **Directory Structure**:
    ```
    packages/react/src/
    ├── adapters/
    │   └── shadcn.ts       # The Shadcn adapter implementation
    ├── components/
    │   └── FogUIRenderer.tsx # The core component renderer (may need updates)
    ├── providers/
    │   └── FogUIProvider.tsx   # The main provider (will be updated for adapter)
    └── types/
        └── canonical.ts    # Type definitions for our canonical components
    ```

### 2. Canonical Component Schema Definition

-   **Action**: Create `packages/react/src/types/canonical.ts`.
-   **Details**: Define the props interfaces for the initial set of components. These interfaces will be generic and map easily to common component props.

    ```typescript
    // packages/react/src/types/canonical.ts

    export interface ButtonProps {
      variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
      size?: 'default' | 'sm' | 'lg' | 'icon';
      onClick?: () => void;
    }

    export interface CardProps {
      title?: string;
      description?: string;
      footer?: React.ReactNode;
    }

    export interface TableProps {
      headers: string[];
      rows: (string | React.ReactNode)[][];
    }
    
    // ... Define other components like Input, Label, Badge, etc.
    ```

### 3. Adapter API and Provider Integration

-   **Action**: Update `FogUIProvider.tsx` and create the `createAdapter` utility.
-   **Details**:
    1.  Define the `Adapter` type.
    2.  Create a `createAdapter` function that accepts the component map and returns a structured `Adapter` object.
    3.  Update `FogUIProvider` to accept an `adapter` prop and make it available via a React context.
    4.  Implement a `useComponentRegistry` hook that returns the active component map.

    ```typescript
    // Example structure in providers/FogUIProvider.tsx

    export interface Adapter {
      components: Record<string, React.ComponentType<any>>;
      // mapProps function can be added in Phase 2
    }

    export const FogUIContext = React.createContext<{ adapter: Adapter } | null>(null);

    export const FogUIProvider = ({ adapter, children }) => {
      // ...
    };

    export const useComponentRegistry = () => {
      const context = React.useContext(FogUIContext);
      // ... return adapter.components
    };
    ```

### 4. Shadcn Adapter Implementation

-   **Action**: Create `packages/react/src/adapters/shadcn.ts`.
-   **Details**:
    1.  This file will export a pre-configured `shadcnAdapter`.
    2.  It will map canonical component names to simple wrappers around `div`s with Tailwind CSS classes, as Shadcn components are not available in this package directly. The host application is responsible for providing the actual Shadcn components and styles. This adapter essentially provides the correct class names and structure.
    3.  For layout components like `Stack` and `Grid`, the adapter will provide simple Flexbox/Grid container components.

    ```typescript
    // packages/react/src/adapters/shadcn.ts
    import { createAdapter } from '../providers/FogUIProvider';

    // A simple wrapper that applies Tailwind classes
    const Button = (props) => <button className="inline-flex items-center justify-center ..." {...props} />;
    const Card = (props) => <div className="rounded-xl border bg-card text-card-foreground shadow" {...props} />;
    
    export const shadcnAdapter = createAdapter({
      components: {
        Button,
        Card,
        // ... map other components
        Stack: (props) => <div className="flex flex-col space-y-4" {...props} />,
        Grid: (props) => <div className="grid grid-cols-12 gap-4" {...props} />,
      },
    });
    ```

### 5. Update the `FogUIRenderer`

-   **Action**: Modify `FogUIRenderer.tsx` to use the adapter.
-   **Details**:
    1.  Use the `useComponentRegistry` hook to get the component map.
    2.  When parsing the JSON from the backend, look up the component in the map.
    3.  If the component exists, render it with the given props.
    4.  **Fallback**: If the component is not in the registry, render a basic HTML element (e.g., `<button>`, `<div>`) and add a `data-fogui-unmapped="true"` attribute. Log a warning to the console to inform the developer.

### 6. Validation and Testing

-   **Unit/Integration Tests**:
    -   Add tests for the `FogUIProvider` to ensure the adapter is passed correctly.
    -   Write tests for the `FogUIRenderer` that provide a sample JSON and assert that the correct components (or fallbacks) are rendered.
-   **Example Usage**:
    -   Update the `client` or `dashboard` application to import and use the `FogUIProvider` with the `shadcnAdapter`.
    -   This will serve as the primary end-to-end test to verify that generated UI correctly uses the application's existing Tailwind CSS and Shadcn styles.

---
