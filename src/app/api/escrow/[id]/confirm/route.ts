import { NextRequest, NextResponse } from 'next/server';
import {
  getEscrow,
  updateEscrow,
  isReadyForRelease,
  computeStatus,
  HIGH_VALUE_THRESHOLD_STX,
} from '@/lib/escrowStore';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const escrow = getEscrow(id);
  if (!escrow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (escrow.status === 'RELEASED') {
    return NextResponse.json({ error: 'Escrow already released' }, { status: 400 });
  }

  const body = await req.json();
  const { role, address } = body;

  if (!role || !address) {
    return NextResponse.json({ error: 'role and address are required' }, { status: 400 });
  }

  const updates: Partial<typeof escrow> = {};

  if (role === 'client') {
    if (escrow.clientAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Address does not match client' }, { status: 403 });
    }
    updates.clientConfirmed = true;
  } else if (role === 'freelancer') {
    if (escrow.freelancerAddress.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Address does not match freelancer' }, { status: 403 });
    }
    updates.freelancerConfirmed = true;
  } else if (role === 'additional') {
    const isParty =
      escrow.clientAddress.toLowerCase() === address.toLowerCase() ||
      escrow.freelancerAddress.toLowerCase() === address.toLowerCase();
    if (!isParty) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    if (!escrow.needsAdditionalConfirmation) {
      return NextResponse.json({ error: 'No additional confirmation needed' }, { status: 400 });
    }
    updates.additionalConfirmed = true;
  } else {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const merged = { ...escrow, ...updates };
  updates.status = computeStatus(merged as typeof escrow);
  const updated = updateEscrow(id, updates);
  const ready = isReadyForRelease(updated!);

  return NextResponse.json({ escrow: updated, readyForRelease: ready, threshold: HIGH_VALUE_THRESHOLD_STX });
}
