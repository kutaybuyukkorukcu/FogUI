import { describe, it, expect } from 'vitest';
import { createAdapter } from '../utils';
import type { Adapter } from '../types/adapter';

describe('createAdapter', () => {
  it('should return the same object passed to it', () => {
    const mockAdapter: Adapter = {
      // Assuming Adapter has some properties, add mock values here
      name: 'test-adapter'
    } as any;
    
    const result = createAdapter(mockAdapter);
    expect(result).toBe(mockAdapter);
  });
});