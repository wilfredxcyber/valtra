'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useStacks } from '@/hooks/useStacks';
import { executeHoldVaultDeposit } from '@/lib/flowvault';
import { AlertTriangleIcon, ShieldAlertIcon, LockIcon } from '@/components/Icons';

const HIGH_THRESHOLD = 100;

export default function CreatePage() {
  const router = useRouter();
  const { isSignedIn, address, openModal, network } = useStacks();

  const [form, setForm] = useState({
    freelancerAddress: '',
    amount: '',
    freelancerShare: '90',
    platformShare: '10',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'depositing' | 'registering'>('form');

  const amountNum = parseFloat(form.amount) || 0;
  const isHighValue = amountNum > HIGH_THRESHOLD;
  const totalShare = parseInt(form.freelancerShare || '0') + parseInt(form.platformShare || '0');
  const sharesValid = totalShare === 100;

  const update = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isSignedIn || !address) { openModal(); return; }
    if (!sharesValid) { setError('Freelancer + platform shares must total 100%'); return; }
    if (amountNum <= 0) { setError('Amount must be greater than 0'); return; }

    setLoading(true);
    setStep('depositing');

    try {
      await executeHoldVaultDeposit(
        { amount: amountNum, senderAddress: address, network },
        async (vaultTxId) => {
          setStep('registering');
          // Register escrow off-chain
          const res = await fetch('/api/escrow', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              clientAddress: address,
              freelancerAddress: form.freelancerAddress,
              amount: amountNum,
              freelancerShare: parseInt(form.freelancerShare),
              platformShare: parseInt(form.platformShare),
              description: form.description || 'Freelance work escrow',
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Failed to register escrow');

          // Attach the vault tx ID and mark as LOCKED
          await fetch(`/api/escrow/${data.escrow.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vaultTxId, status: 'LOCKED' }),
          });

          router.push(`/escrow/${data.escrow.id}`);
        },
        () => {
          setError('Transaction cancelled');
          setStep('form');
          setLoading(false);
        }
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStep('form');
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <main className="main-content">
        <div className="container">
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <Link href="/" className="btn btn-ghost btn-sm" style={{ marginBottom: '1rem' }}>← Back</Link>
              <h1>Create Escrow</h1>
              <p style={{ marginTop: '0.375rem' }}>
                Lock payment into a FlowVault Hold Vault. Funds release only after both parties confirm.
              </p>
            </div>

            {!isSignedIn && (
              <div className="alert alert-warning" style={{ marginBottom: '1.5rem' }}>
                <span className="alert-icon" style={{ marginTop: 0, display: 'flex' }}><AlertTriangleIcon style={{ width: 18, height: 18 }} /></span>
                <span>
                  Connect your Stacks wallet first.{' '}
                  <button onClick={openModal} style={{ background: 'none', border: 'none', color: 'inherit', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>
                    Connect now
                  </button>
                </span>
              </div>
            )}

            <div className="card">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Your Address (Client)</label>
                  <input className="form-input" value={address ?? 'Not connected'} readOnly style={{ opacity: 0.7 }} />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="freelancerAddress">Freelancer&apos;s Stacks Address</label>
                  <input id="freelancerAddress" className="form-input" placeholder="ST2…" value={form.freelancerAddress}
                    onChange={(e) => update('freelancerAddress', e.target.value)} required />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="amount">Payment Amount</label>
                  <div className="input-with-suffix">
                    <input id="amount" type="number" step="0.01" min="0.01" className="form-input"
                      placeholder="0.00" value={form.amount} onChange={(e) => update('amount', e.target.value)} required />
                    <span className="input-suffix">STX</span>
                  </div>
                  {isHighValue && (
                    <div className="threshold-banner" style={{ marginTop: '0.75rem' }}>
                      <span className="threshold-banner-icon" style={{ display: 'flex' }}><ShieldAlertIcon style={{ width: 18, height: 18 }} /></span>
                      <div className="threshold-banner-text">
                        <strong>High-Value Payment</strong>
                        Amounts above {HIGH_THRESHOLD} STX require an additional confirmation before release.
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Release Split</label>
                  <div className="split-row">
                    <div>
                      <label className="form-label" htmlFor="freelancerShare" style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Freelancer %</label>
                      <div className="input-with-suffix">
                        <input id="freelancerShare" type="number" min="1" max="99" className="form-input"
                          value={form.freelancerShare} onChange={(e) => update('freelancerShare', e.target.value)} required />
                        <span className="input-suffix">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="form-label" htmlFor="platformShare" style={{ fontSize: '0.8125rem', fontWeight: 500 }}>Platform %</label>
                      <div className="input-with-suffix">
                        <input id="platformShare" type="number" min="0" max="99" className="form-input"
                          value={form.platformShare} onChange={(e) => update('platformShare', e.target.value)} />
                        <span className="input-suffix">%</span>
                      </div>
                    </div>
                  </div>
                  <p className="form-hint" style={{ color: sharesValid ? 'var(--success)' : 'var(--danger)' }}>
                    Total: {totalShare}% {sharesValid ? '✓' : '— must equal 100%'}
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="description">
                    Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input id="description" className="form-input" placeholder="e.g. Logo design — Phase 1"
                    value={form.description} onChange={(e) => update('description', e.target.value)} />
                </div>

                {error && (
                  <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                    <span className="alert-icon" style={{ marginTop: 0, display: 'flex' }}><AlertTriangleIcon style={{ width: 18, height: 18 }} /></span><span>{error}</span>
                  </div>
                )}

                <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading || !sharesValid}>
                  {loading ? (
                    <><span className="spinner" />{step === 'depositing' ? 'Waiting for wallet…' : 'Registering…'}</>
                  ) : <><LockIcon style={{ width: 18, height: 18, marginRight: 6 }} /> Lock Funds in Hold Vault</>}
                </button>

                <p className="form-hint" style={{ textAlign: 'center', marginTop: '0.75rem' }}>
                  Your wallet will prompt you to sign the FlowVault deposit on Stacks Testnet.
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
