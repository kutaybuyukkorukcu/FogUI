# Design System Adapter Guide

FogUI renderer uses adapters to map canonical component types to your own UI components.

## Core idea

- Canonical shape stays protocol-agnostic.
- Adapter decides how `Card`, `Button`, `Table`, etc. map to your design system.
- `mapProps` lets you transform canonical props into component-specific props.

## Minimal adapter

```tsx
import { createAdapter } from '@fogui/react';

export const adapter = createAdapter({
  components: {
    Card: ({ title, children }) => (
      <section>
        <h3>{title}</h3>
        {children}
      </section>
    ),
  },
});
```

## Runtime guarantees

- Case-insensitive component matching for adapter keys.
- Inline warning for unmapped component types.
- Deterministic action lifecycle: `onActionStart -> onAction -> onActionComplete|onActionError`.

