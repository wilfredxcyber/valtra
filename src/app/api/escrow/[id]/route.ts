import { NextRequest, NextResponse } from 'next/server';
import { getEscrow, updateEscrow, computeStatus, HIGH_VALUE_THRESHOLD_STX } from '@/lib/escrowStore';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const escrow = getEscrow(id);
  if (!escrow) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ escrow, threshold: HIGH_VALUE_THRESHOLD_STX });
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { id } = await ctx.params;
  const escrow = getEscrow(id);
  if (!escrow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const merged = { ...escrow, ...body };
  const updated = updateEscrow(id, { ...body, status: computeStatus(merged) });

  return NextResponse.json({ escrow: updated });
}
