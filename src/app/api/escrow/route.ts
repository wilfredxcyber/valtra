import { NextRequest, NextResponse } from 'next/server';
import { createEscrow, listEscrows, HIGH_VALUE_THRESHOLD_STX } from '@/lib/escrowStore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientAddress, freelancerAddress, amount, freelancerShare, platformShare, description } = body;

    if (!clientAddress || !freelancerAddress || !amount || !freelancerShare) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const totalShare = Number(freelancerShare) + Number(platformShare || 0);
    if (totalShare > 100) {
      return NextResponse.json({ error: 'Shares must not exceed 100%' }, { status: 400 });
    }

    const escrow = createEscrow({
      clientAddress,
      freelancerAddress,
      amount: Number(amount),
      freelancerShare: Number(freelancerShare),
      platformShare: Number(platformShare || 0),
      description: description || 'Freelance work escrow',
    });

    return NextResponse.json({ success: true, escrow, threshold: HIGH_VALUE_THRESHOLD_STX });
  } catch (err) {
    console.error('[POST /api/escrow]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  const escrows = listEscrows();
  return NextResponse.json({ escrows, threshold: HIGH_VALUE_THRESHOLD_STX });
}
