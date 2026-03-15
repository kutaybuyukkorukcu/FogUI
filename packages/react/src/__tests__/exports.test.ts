import { describe, expect, it } from 'vitest';

import * as RootExports from '../index';
import * as AdapterExports from '../adapters';
import * as ComponentExports from '../components';

describe('module exports', () => {
  it('exposes root public API entries', () => {
    expect(RootExports.FogUIProvider).toBeTypeOf('function');
    expect(RootExports.useFogUIContext).toBeTypeOf('function');
    expect(RootExports.createAdapter).toBeTypeOf('function');
    expect(RootExports.applyFogUIPatches).toBeTypeOf('function');
    expect(RootExports.useFogUI).toBeTypeOf('function');
    expect(RootExports.FogUIRenderer).toBeTypeOf('function');
    expect(RootExports.shadcnAdapter).toBeDefined();
    expect(RootExports.headlessAdapter).toBeDefined();
  });

  it('exposes adapter entrypoint exports', () => {
    expect(AdapterExports.shadcnAdapter).toBeDefined();
    expect(AdapterExports.headlessAdapter).toBeDefined();
  });

  it('exposes components entrypoint exports', () => {
    expect(ComponentExports.FogUIRenderer).toBeTypeOf('function');
  });
});
