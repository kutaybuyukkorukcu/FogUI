import type { FogUIResponse } from '../types';

export interface ContractVersionValidationResult {
  readonly ok: boolean;
  readonly message?: string;
}

export function validateContractVersion(
  response: FogUIResponse,
  expectedVersion: string,
): ContractVersionValidationResult {
  const actualVersion = response.metadata?.contractVersion;

  if (actualVersion === expectedVersion) {
    return { ok: true };
  }

  if (!actualVersion) {
    return {
      ok: false,
      message: `Missing canonical contractVersion. Expected "${expectedVersion}" in response metadata.`,
    };
  }

  return {
    ok: false,
    message: `Canonical contractVersion mismatch. Expected "${expectedVersion}" but received "${actualVersion}".`,
  };
}