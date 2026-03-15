import { describe, expect, it, vi } from 'vitest';

import { applyFogUIPatches } from '../patches';
import type { FogUIResponse } from '../types';

const baseResponse: FogUIResponse = {
  thinking: [{ status: 'complete', message: 'init' }],
  content: [
    { type: 'text', value: 'A' },
    { type: 'text', value: 'B' },
  ],
  metadata: {
    version: '1',
  },
};

describe('applyFogUIPatches', () => {
  it('applies replace, append, and remove patches', () => {
    const next = applyFogUIPatches(baseResponse, [
      { op: 'replace', path: '/content/0/value', value: 'A1' },
      { op: 'append', path: '/content', value: { type: 'text', value: 'C' } },
      { op: 'remove', path: '/content/1' },
    ]);

    expect(next).not.toBe(baseResponse);
    expect(next.content).toEqual([
      { type: 'text', value: 'A1' },
      { type: 'text', value: 'C' },
    ]);
    expect(baseResponse.content).toEqual([
      { type: 'text', value: 'A' },
      { type: 'text', value: 'B' },
    ]);
  });

  it('returns original response for empty patch set', () => {
    const next = applyFogUIPatches(baseResponse, []);
    expect(next).toBe(baseResponse);
  });

  it('warns and no-ops on invalid patch paths', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const next = applyFogUIPatches(baseResponse, [
      { op: 'replace', path: '/content/99/value', value: 'x' },
      { op: 'remove', path: '/missing/path' },
      { op: 'append', path: '/content/0', value: { type: 'text', value: 'z' } },
    ]);

    expect(next).toBe(baseResponse);
    expect(warnSpy).toHaveBeenCalledTimes(3);

    warnSpy.mockRestore();
  });
});
