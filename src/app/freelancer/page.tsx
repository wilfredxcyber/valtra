'use client';

import { useState } from 'react';
import { useStacks } from '@/hooks/useStacks';
import { executeHoldVaultDeposit } from '@/lib/flowvault';
import { saveVault } from '@/lib/localVaultStore';

type Step = 'setup' | 'created';

export default function FreelancerPage() {
  const { isSignedIn, address, openModal, network } = useStacks();
  const [step, setStep] = useState<Step>('setup');
  const [freelancers, setFreelancers] = useState<{ address: string; amount: number }[]>([{ address: '', amount: 0 }]);
  const [description, setDescription] = useState<string>('');
  const [vaultId, setVaultId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Helper for generating the shareable vault link (uses standard location format)
  const vaultLink = vaultId !== null && typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}/vault/${vaultId}`
    : '';

  const validFreelancers = freelancers.filter(f => f.address.trim() && f.amount > 0);
  const totalAmount = validFreelancers.reduce((sum, f) => sum + f.amount, 0);

  const addFreelancer = () => setFreelancers([...freelancers, { address: '', amount: 0 }]);
  const removeFreelancer = (i: number) => setFreelancers(freelancers.filter((_, idx) => idx !== i));
  const updateFreelancerAddress = (i: number, val: string) => {
    const updated = [...freelancers];
    updated[i].address = val;
    setFreelancers(updated);
  };
  const updateFreelancerAmount = (i: number, val: number) => {
    const updated = [...freelancers];
    updated[i].amount = val;
    setFreelancers(updated);
  };

  const handleCreate = async () => {
    if (!isSignedIn) { openModal(); return; }
    if (totalAmount <= 0 || validFreelancers.length === 0) {
      setStatus("Please add at least one freelancer with a valid address and amount.");
      return;
    }

    setStatus('Step 1/2 — Locking total payment into FlowVault...');
    await executeHoldVaultDeposit(
      { amount: totalAmount, senderAddress: address!, network },
      (txId) => {
        setStatus(`Step 2/2 — Deposit broadcast. Registering Team Escrow locally...`);
        
        // 1. Create unique ID
        const newVaultId = Date.now();
        
        // 2. Save the vault locally
        saveVault({
          id: newVaultId,
          type: 'freelancer',
          creatorAddress: address!,
          creatorAmount: totalAmount,
          partnerAddresses: validFreelancers.map(f => f.address),
          payouts: validFreelancers, // The split definition
          description: description,
          requiredConfirmations: validFreelancers.length + 1, // Client + ALL Freelancers
          confirmations: [], // IMPORTANT: Client is NO LONGER auto-confirmed here!
          deposits: [{ address: address!, amount: totalAmount }], // Creator's deposit
          status: 'holding',
          createdAt: Date.now(),
          flowvaultTxId: txId
        });

        // 4. Update UI
        setVaultId(newVaultId);
        setStep('created');
        setStatus('');
      },
      () => setStatus('Deposit cancelled.')
    );
  };

  const copyLink = () => {
    navigator.clipboard.writeText(vaultLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '680px' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#caf0f8', color: '#03045e', padding: '0.3rem 0.875rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' }}>
          💼 Team Escrow (Split Payout)
        </div>
        <h1 style={{ color: '#03045e', fontSize: '2rem', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
          {step === 'setup' ? 'Fund a Project Milestone' : 'Project Funded!'}
        </h1>
        <p style={{ color: '#0077b6', fontSize: '1rem', lineHeight: 1.6 }}>
          {step === 'setup'
            ? 'You (Client) lock the total payment. The Freelancers confirm delivery. You provide final approval → FlowVault splits and routes the funds.'
            : 'Share this link with your team. They connect and confirm delivery. You will return here to approve the final release.'}
        </p>
      </div>

      {step === 'setup' ? (
        <div className="card">
          <div className="form-group">
            <label className="form-label">Project Description (optional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Landing page redesign — Phase 1"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Freelancer Team & Payout Splits</label>
            {freelancers.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder={`Freelancer ${i + 1} (SP...)`}
                  value={f.address}
                  onChange={(e) => updateFreelancerAddress(i, e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.8125rem', flex: 2 }}
                />
                <div className="input-with-suffix" style={{ flex: 1, margin: 0 }}>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="0"
                    value={f.amount || ''}
                    onChange={(e) => updateFreelancerAmount(i, Number(e.target.value))}
                  />
                  <span className="input-suffix">STX</span>
                </div>
                {freelancers.length > 1 && (
                  <button onClick={() => removeFreelancer(i)} className="btn btn-ghost btn-sm" style={{ flexShrink: 0, color: 'var(--danger)' }}>✕</button>
                )}
              </div>
            ))}
            <button onClick={addFreelancer} className="btn btn-ghost btn-sm" style={{ marginTop: '0.25rem', color: '#0077b6' }}>+ Add Freelancer</button>
          </div>

          <div className="form-group" style={{ background: '#f8fafc', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--slate-200)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#03045e' }}>Total Project Cost:</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#03045e' }}>{totalAmount} STX</span>
            </div>
          </div>

          <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
            <span className="alert-icon">🔒</span>
            <span>Funds are locked on-chain. You maintain final approval before the funds are split and released to the team.</span>
          </div>

          <button
            onClick={handleCreate}
            className="btn btn-primary btn-full btn-lg"
            disabled={totalAmount <= 0 || validFreelancers.length === 0}
          >
            {isSignedIn ? `Lock ${totalAmount} STX in Escrow` : 'Connect Wallet to Continue'}
          </button>

          {status && (
            <div className="alert alert-info" style={{ marginTop: '1.25rem' }}>
              <span className="alert-icon">⏳</span><span>{status}</span>
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'var(--success)', background: 'var(--success-bg)' }}>
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>💼</div>
              <h3 style={{ color: '#065f46', marginBottom: '0.5rem' }}>Payment Locked in Escrow</h3>
              {description && <p style={{ color: '#065f46', fontSize: '0.875rem', marginBottom: '0.5rem' }}>"{description}"</p>}
              <p style={{ color: '#065f46', fontSize: '0.9375rem' }}>
                Vault ID: <code style={{ background: 'rgba(0,0,0,0.06)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>#{vaultId}</code>
              </p>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <p className="section-title">Confirmation Status</p>
            <div className="confirm-grid">
              <div className="confirm-card confirmed">
                <span className="confirm-icon">✅</span>
                <div className="confirm-label">Client (You)</div>
                <div className="confirm-status yes">Confirmed</div>
                <div className="address" style={{ marginTop: '0.5rem', fontSize: '0.7rem' }}>{address?.slice(0, 8)}...{address?.slice(-4)}</div>
              </div>
              <div className="confirm-card pending">
                <span className="confirm-icon">⏳</span>
                <div className="confirm-label">Freelancer</div>
                <div className="confirm-status no">Awaiting</div>
                <div className="address" style={{ marginTop: '0.5rem', fontSize: '0.7rem' }}>{validFreelancers[0]?.address?.slice(0, 8) ?? ''}...{validFreelancers[0]?.address?.slice(-4) ?? ''}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <p className="section-title">Share With the Freelancer</p>
            <p style={{ color: '#0077b6', fontSize: '0.9375rem', marginBottom: '1rem' }}>
              The freelancer opens this link, connects their wallet, and confirms they delivered the work.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div className="form-input" style={{ flex: 1, fontSize: '0.8125rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0.75rem 1rem', color: '#03045e' }}>
                {vaultLink}
              </div>
              <button onClick={copyLink} className="btn btn-secondary" style={{ flexShrink: 0 }}>
                {copied ? '✓ Copied' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
