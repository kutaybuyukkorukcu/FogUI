import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { demoAdapter, demoAdapterConformance, DEMO_REQUIRED_COMPONENTS } from '../fogui.adapter';

describe('demoAdapter', () => {
  it('declares and satisfies the required component mappings', () => {
    expect(demoAdapterConformance.ok).toBe(true);
    expect(demoAdapterConformance.requiredComponents).toEqual([...DEMO_REQUIRED_COMPONENTS]);
  });

  it('renders the demo fallback component for debugging', () => {
    const FallbackComponent = demoAdapter.renderFallback;

    if (!FallbackComponent) {
      throw new Error('Expected demo adapter to expose a fallback renderer.');
    }

    render(
      <FallbackComponent
        block={{
          type: 'component',
          componentType: 'UnknownWidget',
          props: {},
          children: [],
        }}
        issue={{
          kind: 'unmapped-component',
          componentType: 'UnknownWidget',
          message: 'Unmapped component "UnknownWidget" received from canonical response.',
        }}
        availableComponents={['Card', 'List']}
        suggestion={'Card'}
      />
    );

    expect(screen.getByTestId('demo-adapter-fallback')).toHaveTextContent('UnknownWidget');
    expect(screen.getByTestId('demo-adapter-fallback')).toHaveTextContent('suggestion=Card');
  });
});