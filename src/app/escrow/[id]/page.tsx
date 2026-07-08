'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import { useStacks } from '@/hooks/useStacks';
import { executeSplitRelease, getExplorerUrl, percentToBasisPoints } from '@/lib/flowvault';
import type { Escrow } from '@/lib/escrowStore';
import { AlertTriangleIcon, CheckCircleIcon, CircleIcon, ShieldAlertIcon, InfoIcon, SparklesIcon, SplitIcon } from '@/components/Icons';

export default function EscrowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { isSignedIn, address, openModal, network } = useStacks();

  const [escrow, setEscrow] = useState<Escrow | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 4000); };

  const fetchEscrow = useCallback(async () => {
    try {
      const res = await fetch(`/api/escrow/${id}`);
      if (!res.ok) throw new Error('Not found');
      const data = await res.json();
      setEscrow(data.escrow);
    } catch { setError('Escrow not found.'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => {
    fetchEscrow();
    const interval = setInterval(fetchEscrow, 5000);
    return () => clearInterval(interval);
  }, [fetchEscrow]);

  const role = !address ? null
    : address === escrow?.clientAddress ? 'client'
    : address === escrow?.freelancerAddress ? 'freelancer'
    : 'observer';

  const alreadyConfirmed =
    (role === 'client' && escrow?.clientConfirmed) ||
    (role === 'freelancer' && escrow?.freelancerConfirmed);

  const canConfirm = isSignedIn && role && role !== 'observer' && !alreadyConfirmed && escrow?.status !== 'RELEASED';
  const canAdditional = isSignedIn && escrow?.needsAdditionalConfirmation && !escrow?.additionalConfirmed &&
    escrow?.clientConfirmed && escrow?.freelancerConfirmed && (role === 'client' || role === 'freelancer');
  const readyForRelease = escrow?.clientConfirmed && escrow?.freelancerConfirmed && escrow?.additionalConfirmed && escrow?.status !== 'RELEASED';

  const handleConfirm = async (confirmRole: 'client' | 'freelancer' | 'additional') => {
    if (!address || !escrow) return;
    setConfirming(true); setError('');
    try {
      const res = await fetch(`/api/escrow/${id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: confirmRole, address }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEscrow(data.escrow);
      showToast('Confirmation recorded');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Confirmation failed');
    } finally { setConfirming(false); }
  };

  const handleRelease = async () => {
    if (!address || !escrow) return;
    setReleasing(true); setError('');
    try {
      const recipients = [
        { address: escrow.freelancerAddress, share: percentToBasisPoints(escrow.freelancerShare) },
        ...(escrow.platformShare > 0
          ? [{ address: escrow.clientAddress, share: percentToBasisPoints(escrow.platformShare) }]
          : []),
      ];
      
      // Use first recipient as the primary split target
      const primaryRecipient = recipients[0];
      await executeSplitRelease(
        { splitAddress: primaryRecipient?.address ?? '', splitAmount: escrow.amount * ((primaryRecipient?.share ?? 5000) / 10000), amount: escrow.amount, network, senderAddress: address },
        async (txId) => {
          await fetch(`/api/escrow/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ releaseTxId: txId, status: 'RELEASED' }),
          });
          await fetchEscrow();
          showToast('Funds released!');
          setReleasing(false);
        },
        () => {
          setError('Transaction cancelled');
          setReleasing(false);
        }
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Release failed');
      setReleasing(false);
    }
  };

  const truncate = (addr: string) => `${addr.slice(0, 8)}…${addr.slice(-6)}`;

  const statusColor: Record<string, string> = {
    PENDING: 'badge-pending', LOCKED: 'badge-locked',
    AWAITING_THRESHOLD: 'badge-pending', RELEASED: 'badge-released',
  };

  if (loading) return (
    <div className="page-wrapper">
      <main className="main-content">
        <div className="container" style={{ textAlign: 'center', paddingTop: '4rem' }}>
          <div className="spinner spinner-blue" style={{ width: 40, height: 40 }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading escrow…</p>
        </div>
      </main>
    </div>
  );

  if (error && !escrow) return (
    <div className="page-wrapper">
      <main className="main-content">
        <div className="container">
          <div className="alert alert-warning" style={{ maxWidth: 500, margin: '2rem auto' }}>
            <span className="alert-icon" style={{ marginTop: 0, display: 'flex' }}><AlertTriangleIcon style={{ width: 18, height: 18 }} /></span>
            <span>{error} <Link href="/">Go home</Link></span>
          </div>
        </div>
      </main>
    </div>
  );

  if (!escrow) return null;

  return (
    <div className="page-wrapper">

      <main className="main-content">
        <div className="container">
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <Link href="/escrows" className="btn btn-ghost btn-sm" style={{ marginBottom: '1.5rem', display: 'inline-flex' }}>
              ← All Escrows
            </Link>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <h1 style={{ marginBottom: '0.25rem' }}>Escrow #{escrow.id}</h1>
                <p>{escrow.description}</p>
              </div>
              <span className={`badge ${statusColor[escrow.status] ?? 'badge-pending'}`}>
                <span className="badge-dot" />{escrow.status.replace('_', ' ')}
              </span>
            </div>

            {/* Amount display */}
            <div className="amount-display" style={{ marginBottom: '1.5rem' }}>
              <div className="amount-value">{escrow.amount.toLocaleString()} STX</div>
              <div className="amount-label">
                Held in FlowVault · {escrow.freelancerShare}% freelancer / {escrow.platformShare}% platform
              </div>
            </div>

            {/* Confirmation grid */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div className="card-header">
                <h3>Confirmation Status</h3>
                <p style={{ fontSize: '0.875rem' }}>Both parties must confirm before funds can be released.</p>
              </div>

              <div className="confirm-grid">
                <div className={`confirm-card ${escrow.clientConfirmed ? 'confirmed' : 'pending'}`}>
                  <span className="confirm-icon">{escrow.clientConfirmed ? <CheckCircleIcon style={{ width: 20, height: 20, color: 'var(--success)' }} /> : <CircleIcon style={{ width: 20, height: 20, color: 'var(--slate-400)' }} />}</span>
                  <div className="confirm-label">Client</div>
                  <div className={`confirm-status ${escrow.clientConfirmed ? 'yes' : 'no'}`}>
                    {escrow.clientConfirmed ? 'Confirmed' : 'Pending'}
                  </div>
                  <div className="address" style={{ marginTop: '0.5rem', fontSize: '0.6875rem' }}>{truncate(escrow.clientAddress)}</div>
                </div>

                <div className={`confirm-card ${escrow.freelancerConfirmed ? 'confirmed' : 'pending'}`}>
                  <span className="confirm-icon">{escrow.freelancerConfirmed ? <CheckCircleIcon style={{ width: 20, height: 20, color: 'var(--success)' }} /> : <CircleIcon style={{ width: 20, height: 20, color: 'var(--slate-400)' }} />}</span>
                  <div className="confirm-label">Freelancer</div>
                  <div className={`confirm-status ${escrow.freelancerConfirmed ? 'yes' : 'no'}`}>
                    {escrow.freelancerConfirmed ? 'Confirmed' : 'Pending'}
                  </div>
                  <div className="address" style={{ marginTop: '0.5rem', fontSize: '0.6875rem' }}>{truncate(escrow.freelancerAddress)}</div>
                </div>
              </div>

              {/* High-value threshold */}
              {escrow.needsAdditionalConfirmation && (
                <div className="threshold-banner" style={{ marginTop: '1rem' }}>
                  <span className="threshold-banner-icon" style={{ display: 'flex' }}><ShieldAlertIcon style={{ width: 18, height: 18 }} /></span>
                  <div className="threshold-banner-text">
                    <strong>High-Value Threshold Active</strong>
                    This payment exceeds 100 STX and requires an additional confirmation.{' '}
                    {escrow.additionalConfirmed ? <><CheckCircleIcon style={{ width: 14, height: 14, display: 'inline', verticalAlign: 'text-bottom' }} /> Additional confirmed.</> : <><CircleIcon style={{ width: 14, height: 14, display: 'inline', verticalAlign: 'text-bottom' }} /> Awaiting additional confirmation.</>}
                  </div>
                </div>
              )}

              {/* Observer */}
              {role === 'observer' && isSignedIn && (
                <div className="alert alert-info" style={{ marginTop: '1rem' }}>
                  <span className="alert-icon" style={{ marginTop: 0, display: 'flex' }}><InfoIcon style={{ width: 18, height: 18 }} /></span>
                  <span>Your wallet is not a party in this escrow. Switch wallets to confirm.</span>
                </div>
              )}

              {/* Not connected */}
              {!isSignedIn && (
                <button className="btn btn-secondary btn-full" style={{ marginTop: '1rem' }} onClick={openModal}>
                  Connect Wallet to Confirm
                </button>
              )}

              {/* Primary confirm */}
              {canConfirm && (
                <button className="btn btn-primary btn-full" style={{ marginTop: '1rem' }}
                  onClick={() => handleConfirm(role as 'client' | 'freelancer')} disabled={confirming}>
                  {confirming ? <><span className="spinner" />Confirming…</> : <><CheckCircleIcon style={{ width: 16, height: 16, marginRight: 6 }} /> Confirm as {role === 'client' ? 'Client' : 'Freelancer'}</>}
                </button>
              )}

              {alreadyConfirmed && escrow.status !== 'RELEASED' && (
                <div className="alert alert-success" style={{ marginTop: '1rem' }}>
                  <span className="alert-icon" style={{ marginTop: 0, display: 'flex' }}><CheckCircleIcon style={{ width: 18, height: 18 }} /></span>
                  <span>You have confirmed. Waiting for the other party.</span>
                </div>
              )}

              {/* Additional confirmation */}
              {canAdditional && (
                <button className="btn btn-full" style={{ marginTop: '1rem', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '0.75rem 1.5rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  onClick={() => handleConfirm('additional')} disabled={confirming}>
                  {confirming ? <><span className="spinner" />Confirming…</> : <><ShieldAlertIcon style={{ width: 18, height: 18 }} /> Submit Additional Confirmation (High-Value)</>}
                </button>
              )}
            </div>

            {/* Release trigger */}
            {readyForRelease && (
              <div className="card animate-in" style={{ marginBottom: '1.5rem', border: '2px solid var(--success)', background: '#f0fdf4' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}><SparklesIcon style={{ width: 40, height: 40, color: 'var(--success)' }} /></div>
                  <h3 style={{ color: '#065f46', marginBottom: '0.375rem' }}>Both Parties Have Confirmed!</h3>
                  <p style={{ color: '#065f46', fontSize: '0.9375rem', marginBottom: '1.25rem' }}>
                    Trigger the FlowVault Split Release to distribute funds to all recipients.
                  </p>
                  <button className="btn btn-success btn-lg" onClick={handleRelease} disabled={releasing}>
                    {releasing ? <><span className="spinner" />Waiting for wallet…</> : <><SplitIcon style={{ width: 18, height: 18, marginRight: 6 }} /> Execute Release & Split</>}
                  </button>
                </div>
              </div>
            )}

            {/* Released */}
            {escrow.status === 'RELEASED' && (
              <div className="card animate-in" style={{ marginBottom: '1.5rem', background: 'var(--success-bg)', border: '2px solid var(--success)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center' }}><CheckCircleIcon style={{ width: 40, height: 40, color: 'var(--success)' }} /></div>
                  <h3 style={{ color: '#065f46' }}>Funds Released!</h3>
                  <p style={{ color: '#065f46', marginBottom: '1rem' }}>Split executed via FlowVault Split Vault Flow.</p>
                  {escrow.releaseTxId && (
                    <a href={getExplorerUrl(escrow.releaseTxId)} target="_blank" rel="noopener noreferrer" className="explorer-link">
                      View on Stacks Explorer
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Details */}
            <div className="card">
              <div className="card-header"><h3>Escrow Details</h3></div>
              {[
                ['Escrow ID', escrow.id],
                ['Amount', `${escrow.amount} STX`],
                ['Freelancer Share', `${escrow.freelancerShare}%`],
                ['Platform Share', `${escrow.platformShare}%`],
                ['Created', new Date(escrow.createdAt).toLocaleString()],
              ].map(([k, v]) => (
                <div className="info-row" key={k}>
                  <span className="info-key">{k}</span>
                  <span className="info-value">{v}</span>
                </div>
              ))}
              <div className="info-row">
                <span className="info-key">Client</span>
                <span className="address">{truncate(escrow.clientAddress)}</span>
              </div>
              <div className="info-row">
                <span className="info-key">Freelancer</span>
                <span className="address">{truncate(escrow.freelancerAddress)}</span>
              </div>
              {escrow.vaultTxId && (
                <div className="info-row">
                  <span className="info-key">Hold Vault Tx</span>
                  <a href={getExplorerUrl(escrow.vaultTxId)} target="_blank" rel="noopener noreferrer" className="explorer-link">View</a>
                </div>
              )}
              {escrow.releaseTxId && (
                <div className="info-row">
                  <span className="info-key">Release Tx</span>
                  <a href={getExplorerUrl(escrow.releaseTxId)} target="_blank" rel="noopener noreferrer" className="explorer-link">View</a>
                </div>
              )}
            </div>

            {error && (
              <div className="alert alert-warning" style={{ marginTop: '1rem' }}>
                <span className="alert-icon" style={{ marginTop: 0, display: 'flex' }}><AlertTriangleIcon style={{ width: 18, height: 18 }} /></span><span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {toast && (
        <div className="toast-container">
          <div className="toast toast-success">{toast}</div>
        </div>
      )}
    </div>
  );
}
