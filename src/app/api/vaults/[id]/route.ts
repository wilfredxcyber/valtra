import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { serverLoadVault, serverSaveVault } from '@/lib/serverVaultStore';
import { type LocalVault } from '@/lib/localVaultStore';

async function getVault(id: string): Promise<LocalVault | null> {
  try {
    const vault = await kv.get<LocalVault>(`vault:${id}`);
    return vault ?? null;
  } catch {
    return serverLoadVault(id);
  }
}

async function patchVault(id: string, patch: Partial<LocalVault>): Promise<LocalVault | null> {
  let vault = await getVault(id);
  if (!vault) return null;

  vault = { ...vault, ...patch };

  // Auto-release if all confirmations collected
  if (vault.confirmations && vault.requiredConfirmations &&
      vault.confirmations.length >= vault.requiredConfirmations) {
    vault.status = 'released';
  }

  try {
    await kv.set(`vault:${id}`, vault);
  } catch {
    serverSaveVault(vault);
  }

  return vault;
}

// GET /api/vaults/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const vault = await getVault(id);
  if (!vault) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(vault);
}

// PATCH /api/vaults/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const patch = await req.json();
  const vault = await patchVault(id, patch);
  if (!vault) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(vault);
}
