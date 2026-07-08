import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { serverSaveVault, serverLoadVault } from '@/lib/serverVaultStore';
import { type LocalVault } from '@/lib/localVaultStore';

async function saveVault(vault: LocalVault) {
  try {
    // Try Vercel KV first (production)
    await kv.set(`vault:${vault.id}`, vault);
    // Also add to index
    await kv.sadd('vault_ids', String(vault.id));
  } catch {
    // Fall back to in-memory (local dev without KV env vars)
    serverSaveVault(vault);
  }
}

async function getVault(id: string): Promise<LocalVault | null> {
  try {
    const vault = await kv.get<LocalVault>(`vault:${id}`);
    return vault ?? null;
  } catch {
    return serverLoadVault(id);
  }
}

// POST /api/vaults — save a vault
export async function POST(req: NextRequest) {
  try {
    const vault = await req.json() as LocalVault;
    if (!vault?.id) return NextResponse.json({ error: 'Missing vault id' }, { status: 400 });
    await saveVault(vault);
    return NextResponse.json({ ok: true, id: vault.id });
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }
}

