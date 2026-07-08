/**
 * Local vault store — bridges the gap between the FlowVault on-chain deposit
 * and the Clarity contract that hasn't been deployed yet.
 *
 * When the collab-escrow.clar contract is deployed to testnet, swap the
 * localStorage calls here with real contract calls from vault.ts.
 */

export interface Milestone {
  id: number;
  label: string;       // e.g. "Phase 1: Prototype"
  amount: number;      // STX for this milestone
  confirmations: string[];
  status: 'pending' | 'approved' | 'released';
}

export interface LocalVault {
  id: number;
  type: 'partnership' | 'freelancer' | 'treasury' | 'grant-pool';
  creatorAddress: string;
  creatorAmount: number;
  partnerAddresses: string[]; // confirmers
  granteeAddress?: string;    // only for grant-pool
  payouts?: { address: string; amount: number }[]; // for freelancer team splits
  milestones?: Milestone[];   // optional: grant paid out in stages
  description?: string;
  requiredConfirmations: number;
  confirmations: string[];    // addresses that have confirmed
  deposits: { address: string; amount: number }[];
  status: 'holding' | 'released';
  createdAt: number;
  flowvaultTxId?: string;
}

export function saveVault(vault: LocalVault): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`vault_${vault.id}`, JSON.stringify(vault));
  // Also keep an index
  const ids: number[] = JSON.parse(localStorage.getItem('vault_ids') ?? '[]');
  if (!ids.includes(vault.id)) {
    ids.push(vault.id);
    localStorage.setItem('vault_ids', JSON.stringify(ids));
  }
  // Sync to server so other browsers/users can access the vault
  fetch(`/api/vaults`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vault),
  }).catch(() => { /* ignore network errors silently */ });
}

export function loadVault(id: number | string): LocalVault | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(`vault_${id}`);
  if (raw) return JSON.parse(raw) as LocalVault;
  return null; // caller should use loadVaultAsync if cross-browser support needed
}

/**
 * Async vault loader — first checks localStorage, then falls back to the
 * server API. Use this in vault/[id]/page.tsx so links work across browsers.
 */
export async function loadVaultAsync(id: number | string): Promise<LocalVault | null> {
  if (typeof window === 'undefined') return null;
  // 1. Try localStorage first (fastest)
  const raw = localStorage.getItem(`vault_${id}`);
  if (raw) {
    const v = JSON.parse(raw) as LocalVault;
    // Refresh from server in background to pick up confirmations from others
    fetch(`/api/vaults/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(serverVault => {
        if (serverVault) {
          // Merge: server is source of truth for confirmations/status
          const merged = { ...v, ...serverVault };
          localStorage.setItem(`vault_${id}`, JSON.stringify(merged));
        }
      })
      .catch(() => {});
    return v;
  }
  // 2. Fall back to server (cross-browser link)
  try {
    const res = await fetch(`/api/vaults/${id}`);
    if (!res.ok) return null;
    const vault = await res.json() as LocalVault;
    // Cache locally for next time
    localStorage.setItem(`vault_${id}`, JSON.stringify(vault));
    const ids: number[] = JSON.parse(localStorage.getItem('vault_ids') ?? '[]');
    if (!ids.includes(Number(id))) {
      ids.push(Number(id));
      localStorage.setItem('vault_ids', JSON.stringify(ids));
    }
    return vault;
  } catch {
    return null;
  }
}

export function addConfirmation(id: number, address: string): LocalVault | null {
  const vault = loadVault(id);
  if (!vault) return null;
  if (!vault.confirmations.includes(address)) {
    vault.confirmations.push(address);
  }
  if (vault.confirmations.length >= vault.requiredConfirmations) {
    vault.status = 'released';
  }
  saveVault(vault);
  return vault;
}

export function addDeposit(id: number, address: string, amount: number): LocalVault | null {
  const vault = loadVault(id);
  if (!vault) return null;
  const existing = vault.deposits.find(d => d.address === address);
  if (existing) {
    existing.amount += amount;
  } else {
    vault.deposits.push({ address, amount });
  }
  saveVault(vault);
  return vault;
}

export function allVaultIds(): number[] {
  if (typeof window === 'undefined') return [];
  return JSON.parse(localStorage.getItem('vault_ids') ?? '[]');
}

/**
 * Adds a signer's approval to a specific milestone.
 * When all required signers approve, the milestone status moves to 'approved'.
 * When the LAST milestone is approved, the whole vault becomes 'released'.
 */
export function confirmMilestone(vaultId: number, milestoneId: number, address: string): LocalVault | null {
  const vault = loadVault(vaultId);
  if (!vault || !vault.milestones) return null;
  const m = vault.milestones.find(ms => ms.id === milestoneId);
  if (!m || m.status === 'released') return vault;
  if (!m.confirmations.includes(address)) {
    m.confirmations.push(address);
  }
  if (m.confirmations.length >= vault.requiredConfirmations) {
    m.status = 'approved';
  }
  // If all milestones approved → whole vault released
  if (vault.milestones.every(ms => ms.status === 'approved' || ms.status === 'released')) {
    vault.status = 'released';
  }
  saveVault(vault);
  return vault;
}
