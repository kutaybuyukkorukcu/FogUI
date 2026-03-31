# Design System Adapter Guide

FogUI renderer uses adapters to map canonical component types to your own UI components.

## Core idea

- Canonical shape stays protocol-agnostic.
- Adapter decides how `Card`, `Button`, `Table`, etc. map to your design system.
- `mapProps` lets you transform canonical props into component-specific props.
- `getAdapterConformance` lets you fail fast when required mappings are missing.

## Minimal adapter

```tsx
import { createAdapter, getAdapterConformance } from '@fogui/react';

export const adapter = createAdapter({
  components: {
    Card: ({ title, children }) => (
      <section>
        <h3>{title}</h3>
        {children}
      </section>
    ),
  },
  conformance: {
    requiredComponents: ['Card'],
  },
});

const conformance = getAdapterConformance(adapter);
if (!conformance.ok) {
  throw new Error(conformance.issues.map((issue) => issue.message).join('\n'));
}
```

## Adapter contract

- `components`: case-insensitive canonical component registry.
- `mapProps({ componentType, props })`: canonical prop translation hook.
- `conformance.requiredComponents`: mappings your application requires before rendering.
- `renderFallback`: optional override for unmapped components or prop-mapping failures.

## Boundary rules

- Adapters are design-system integration, not protocol translation.
- A2UI compatibility stays in the backend and arrives at React only as canonical FogUI output.
- Keep adapters deliberately small and application-specific instead of coupling the package to a bundled UI kit.

## Runtime guarantees

- Case-insensitive component matching for adapter keys.
- Adapter conformance checks for required mappings.
- Deterministic fallback rendering for unmapped components or `mapProps` failures.
- Deterministic action lifecycle: `onActionStart -> onAction -> onActionComplete|onActionError`.

## Migration note

- Older `mapProps(componentType, props)` adapters must be updated to `mapProps({ componentType, props })`.
- Keep contract-version handling in `FogUIProvider`; adapters should only deal with canonical component rendering.

