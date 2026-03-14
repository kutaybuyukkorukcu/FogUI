# March 15th Sprint Plan

## Objective
The primary goal is to stabilize the project's demonstration capabilities and officially complete **Phase 1 (OSS Core)** of the product roadmap. The previous `client` application has proven unstable due to dependency and Node version conflicts.

To address this, we will create a new, clean, and stable demo application in a separate directory.

## Next Implementation Steps

### 1. Task: Create a New, Stable Demo Application

We will build a new React-based demo inside an `examples/` directory. This ensures it has its own clean dependencies and won't conflict with other parts of the project.

**Execution Plan:**
1.  **Scaffold New Vite Project:**
    - Create a new directory: `examples/react-demo`.
    - Initialize a new React + TypeScript project using a Vite template that is compatible with the environment's Node.js version.

2.  **Install Dependencies:**
    - Install `@fogui/react` from the local workspace (`npm install ../../packages/react`).
    - Add `react` and `react-dom`.

3.  **Implement the Demo Components:**
    - Create `src/fogui.adapter.ts`: A new, basic adapter with unstyled HTML elements for all canonical components.
    - Create `src/components/FogUIDemo.tsx`: A new demo component that:
        - Uses the `@fogui/react` provider, hook, and renderer.
        - Renders static JSON payloads to showcase different components (`Card`, `Table`, `List`, etc.).
        - Includes a simple UI to switch between the different JSON payloads.
    - Update `src/App.tsx` to render the `FogUIDemo` component.

4.  **Verification:**
    - Run the dev server for the new demo to ensure it is fully functional.

### 2. Future Work (Post-Sprint)

Once the demo is stable, we will proceed with the items from the product roadmap:

-   **Phase 2 - Adapter Ecosystem:**
    -   Implement an adapter for a major component library (e.g., MUI or Chakra UI).
    -   Introduce token mapping for themes (colors, spacing, etc.).

-   **Phase 3 - Agent-First UX:**
    -   Implement UI patch support for streaming updates.
    -   Define and implement action lifecycle hooks (`onActionStart`, `onActionComplete`, etc.).
