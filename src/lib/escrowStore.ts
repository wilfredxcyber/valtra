// Escrow store — simple in-memory store (resets on server restart; good for demo)
// In production, replace with SQLite/Postgres.

export type EscrowStatus = 'PENDING' | 'LOCKED' | 'RELEASED' | 'AWAITING_THRESHOLD';

export interface Escrow {
  id: string;
  clientAddress: string;
  freelancerAddress: string;
  amount: number; // in STX
  freelancerShare: number; // percentage 0-100
  platformShare: number; // percentage 0-100
  description: string;
  vaultTxId: string | null; // testnet tx ID for the Hold Vault deposit
  releaseTxId: string | null; // testnet tx ID for the release
  clientConfirmed: boolean;
  freelancerConfirmed: boolean;
  additionalConfirmed: boolean; // extra step for high-value payments
  needsAdditionalConfirmation: boolean;
  status: EscrowStatus;
  createdAt: string;
  updatedAt: string;
}

// STX threshold. Payments above this require an extra confirmation.
export const HIGH_VALUE_THRESHOLD_STX = 100;

// Global in-memory store
const store: Map<string, Escrow> = new Map();

export function createEscrow(
  data: Omit<
    Escrow,
    | 'id'
    | 'clientConfirmed'
    | 'freelancerConfirmed'
    | 'additionalConfirmed'
    | 'needsAdditionalConfirmation'
    | 'status'
    | 'createdAt'
    | 'updatedAt'
    | 'vaultTxId'
    | 'releaseTxId'
  >
): Escrow {
  const id = Math.random().toString(36).slice(2, 10).toUpperCase();
  const needsAdditional = data.amount > HIGH_VALUE_THRESHOLD_STX;
  const escrow: Escrow = {
    ...data,
    id,
    vaultTxId: null,
    releaseTxId: null,
    clientConfirmed: false,
    freelancerConfirmed: false,
    additionalConfirmed: !needsAdditional,
    needsAdditionalConfirmation: needsAdditional,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.set(id, escrow);
  return escrow;
}

export function getEscrow(id: string): Escrow | undefined {
  return store.get(id);
}

export function updateEscrow(id: string, updates: Partial<Escrow>): Escrow | null {
  const escrow = store.get(id);
  if (!escrow) return null;
  const updated: Escrow = { ...escrow, ...updates, updatedAt: new Date().toISOString() };
  store.set(id, updated);
  return updated;
}

export function listEscrows(): Escrow[] {
  return Array.from(store.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function computeStatus(escrow: Escrow): EscrowStatus {
  if (escrow.releaseTxId) return 'RELEASED';
  if (!escrow.vaultTxId) return 'PENDING';
  if (escrow.clientConfirmed && escrow.freelancerConfirmed && !escrow.additionalConfirmed) {
    return 'AWAITING_THRESHOLD';
  }
  return 'LOCKED';
}

export function isReadyForRelease(escrow: Escrow): boolean {
  return (
    escrow.clientConfirmed &&
    escrow.freelancerConfirmed &&
    escrow.additionalConfirmed &&
    escrow.status !== 'RELEASED'
  );
}
