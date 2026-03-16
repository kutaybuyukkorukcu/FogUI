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

function getValueAtTokens(root: unknown, tokens: string[]): unknown {
  return tokens.reduce<unknown>((acc, token) => {
    if (Array.isArray(acc)) {
      const index = Number(token);
      if (!Number.isInteger(index) || index < 0 || index >= acc.length) {
        return undefined;
      }
      return acc[index];
    }

    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[token];
    }

    return undefined;
  }, root);
}

function applyAppendPatch(target: FogUIResponse, tokens: string[], patch: FogUIPatchOperation): boolean {
  const appendTarget = tokens.length === 0 ? target : getValueAtTokens(target, tokens);
  if (!Array.isArray(appendTarget) || patch.value === undefined) {
    return false;
  }

  appendTarget.push(patch.value);
  return true;
}

function applyArrayPatch(parent: unknown[], key: string, patch: FogUIPatchOperation): boolean {
  const index = Number(key);
  if (!Number.isInteger(index) || index < 0 || index >= parent.length) {
    return false;
  }

  if (patch.op === 'replace') {
    if (patch.value === undefined) {
      return false;
    }

    parent[index] = patch.value;
    return true;
  }

  if (patch.op === 'remove') {
    parent.splice(index, 1);
    return true;
  }

  return false;
}

function applyObjectPatch(parent: unknown, key: string, patch: FogUIPatchOperation): boolean {
  if (!parent || typeof parent !== 'object') {
    return false;
  }

  const objectParent = parent as Record<string, unknown>;
  if (!(key in objectParent)) {
    return false;
  }

  if (patch.op === 'replace') {
    if (patch.value === undefined) {
      return false;
    }

    objectParent[key] = patch.value;
    return true;
  }

  if (patch.op === 'remove') {
    delete objectParent[key];
    return true;
  }

  return false;
}

function applySinglePatch(target: FogUIResponse, patch: FogUIPatchOperation): boolean {
  const tokens = decodeJsonPointer(patch.path);

  if (patch.op === 'append') {
    if (!applyAppendPatch(target, tokens, patch)) {
      warnInvalidPatch(patch);
      return false;
    }

    return true;
  }

  const resolution = resolveParent(target, tokens);
  if (!resolution) {
    warnInvalidPatch(patch);
    return false;
  }

  const { parent, key } = resolution;
  const changed = Array.isArray(parent)
    ? applyArrayPatch(parent, key, patch)
    : applyObjectPatch(parent, key, patch);

  if (!changed) {
    warnInvalidPatch(patch);
  }

  return changed;
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
