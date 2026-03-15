import type { FogUIPatchOperation, FogUIResponse } from './types';

interface ParentResolution {
  parent: unknown;
  key: string;
}

function decodeJsonPointer(path: string): string[] {
  if (!path || path === '/') {
    return [];
  }

  return path
    .split('/')
    .slice(1)
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
}

function resolveParent(root: unknown, tokens: string[]): ParentResolution | null {
  if (tokens.length === 0) {
    return null;
  }

  let current: unknown = root;
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const token = tokens[i];

    if (Array.isArray(current)) {
      const index = Number(token);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return null;
      }
      current = current[index];
      continue;
    }

    if (current && typeof current === 'object' && token in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[token];
      continue;
    }

    return null;
  }

  return {
    parent: current,
    key: tokens[tokens.length - 1],
  };
}

function cloneResponse(current: FogUIResponse): FogUIResponse {
  if (typeof structuredClone === 'function') {
    return structuredClone(current);
  }

  return JSON.parse(JSON.stringify(current)) as FogUIResponse;
}

function warnInvalidPatch(patch: FogUIPatchOperation): void {
  console.warn('[FogUI] Ignored invalid patch operation', patch);
}

function applySinglePatch(target: FogUIResponse, patch: FogUIPatchOperation): boolean {
  const tokens = decodeJsonPointer(patch.path);

  if (patch.op === 'append') {
    const appendTarget = tokens.length === 0
      ? target
      : tokens.reduce<unknown>((acc, token) => {
          if (Array.isArray(acc)) {
            const index = Number(token);
            if (!Number.isInteger(index) || index < 0 || index >= acc.length) return undefined;
            return acc[index];
          }

          if (acc && typeof acc === 'object') {
            return (acc as Record<string, unknown>)[token];
          }

          return undefined;
        }, target);

    if (!Array.isArray(appendTarget) || patch.value === undefined) {
      warnInvalidPatch(patch);
      return false;
    }

    appendTarget.push(patch.value);
    return true;
  }

  const resolution = resolveParent(target, tokens);
  if (!resolution) {
    warnInvalidPatch(patch);
    return false;
  }

  const { parent, key } = resolution;

  if (Array.isArray(parent)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= parent.length) {
      warnInvalidPatch(patch);
      return false;
    }

    if (patch.op === 'replace') {
      if (patch.value === undefined) {
        warnInvalidPatch(patch);
        return false;
      }
      parent[index] = patch.value;
      return true;
    }

    if (patch.op === 'remove') {
      parent.splice(index, 1);
      return true;
    }

    warnInvalidPatch(patch);
    return false;
  }

  if (!parent || typeof parent !== 'object') {
    warnInvalidPatch(patch);
    return false;
  }

  const objectParent = parent as Record<string, unknown>;
  if (!(key in objectParent)) {
    warnInvalidPatch(patch);
    return false;
  }

  if (patch.op === 'replace') {
    if (patch.value === undefined) {
      warnInvalidPatch(patch);
      return false;
    }
    objectParent[key] = patch.value;
    return true;
  }

  if (patch.op === 'remove') {
    delete objectParent[key];
    return true;
  }

  warnInvalidPatch(patch);
  return false;
}

export function applyFogUIPatches(current: FogUIResponse, patches: FogUIPatchOperation[]): FogUIResponse {
  if (!patches.length) {
    return current;
  }

  let next: FogUIResponse | null = null;
  for (const patch of patches) {
    const target: FogUIResponse = next ?? cloneResponse(current);
    const changed = applySinglePatch(target, patch);

    if (changed) {
      next = target;
    }
  }

  return next ?? current;
}
