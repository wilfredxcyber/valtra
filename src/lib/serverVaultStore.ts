/**
 * Server-side vault store — in-memory Map that persists across requests
 * during the dev server session. When a real DB is added, swap this out.
 */
import { type LocalVault } from '@/lib/localVaultStore';

// Module-level map — survives across API calls within the same Node.js process
declare global {
  // eslint-disable-next-line no-var
  var __vaultStore: Map<string, LocalVault> | undefined;
}

// Reuse existing store across hot-reloads in dev
const store: Map<string, LocalVault> =
  globalThis.__vaultStore ?? (globalThis.__vaultStore = new Map());

export function serverSaveVault(vault: LocalVault): void {
  store.set(String(vault.id), vault);
}

export function serverLoadVault(id: string | number): LocalVault | null {
  return store.get(String(id)) ?? null;
}

export function serverAllVaults(): LocalVault[] {
  return Array.from(store.values());
}
