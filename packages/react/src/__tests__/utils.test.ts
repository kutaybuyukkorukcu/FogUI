import { describe, it, expect } from 'vitest';
import { createAdapter, getAdapterConformance, normalizeComponentType, resolveAdapterComponent } from '../utils';
import type { Adapter } from '../types/adapter';

describe('utils', () => {
  it('should return the same object passed to it', () => {
    const mockAdapter: Adapter = {
      components: {
        Card: () => null,
      },
    };
    
    const result = createAdapter(mockAdapter);
    expect(result).toBe(mockAdapter);
  });

  it('normalizes component names for registry lookup', () => {
    expect(normalizeComponentType('A2Ui_Unsupported-Node')).toBe('a2uiunsupportednode');
  });

  it('resolves adapter components case-insensitively', () => {
    const Card = () => null;
    const adapter = createAdapter({
      components: {
        Card,
      },
    });

    expect(resolveAdapterComponent(adapter.components, 'card')).toBe(Card);
  });

  it('collects missing required components during conformance checks', () => {
    const adapter = createAdapter({
      components: {
        Card: () => null,
      },
      conformance: {
        requiredComponents: ['Card', 'Button'],
      },
    });

    expect(getAdapterConformance(adapter)).toEqual({
      ok: false,
      issues: [
        {
          kind: 'missing-component',
          componentType: 'Button',
          message: 'Adapter is missing a required component mapping for "Button".',
        },
      ],
      requiredComponents: ['Card', 'Button'],
    });
  });
});