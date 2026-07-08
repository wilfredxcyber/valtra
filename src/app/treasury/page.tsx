'use client';

import { useState } from 'react';
import { useStacks } from '@/hooks/useStacks';
import { executeHoldVaultDeposit } from '@/lib/flowvault';
import { saveVault, addConfirmation } from '@/lib/localVaultStore';

type Step = 'setup' | 'created';

export default function TreasuryPage() {
  const { isSignedIn, address, openModal, network } = useStacks();
  const [step, setStep] = useState<Step>('setup');
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState('STX');
  const [signerAddresses, setSignerAddresses] = useState<string[]>(['', '']);
  const [vaultId, setVaultId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Helper for generating the shareable vault link
  const vaultLink = vaultId !== null && typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}/vault/${vaultId}`
    : '';

  const required = signerAddresses.filter(a => a.trim()).length + 1; // +1 for creator

  const addSigner = () => setSignerAddresses([...signerAddresses, '']);
  const removeSigner = (i: number) => setSignerAddresses(signerAddresses.filter((_, idx) => idx !== i));
  const updateSigner = (i: number, val: string) => {
    const updated = [...signerAddresses];
    updated[i] = val;
    setSignerAddresses(updated);
  };

  const handleCreate = async () => {
    if (!isSignedIn) { openModal(); return; }
    const validSigners = signerAddresses.filter(a => a.trim());
    if (amount <= 0 || validSigners.length === 0) {
      setStatus('Please fill in the amount and at least one additional signer address.');
      return;
    }

    setStatus('Step 1/2 — Depositing into FlowVault...');
    await executeHoldVaultDeposit(
      { amount, senderAddress: address!, network },
      (txId) => {
        setStatus(`Step 2/2 — Deposit broadcast. Creating treasury vault locally...`);
        
        const newVaultId = Date.now();
        
        saveVault({
          id: newVaultId,
          type: 'treasury',
          creatorAddress: address!,
          creatorAmount: amount,
          partnerAddresses: validSigners,
          requiredConfirmations: required,
          confirmations: [], // none confirmed initially
          deposits: [{ address: address!, amount }], // creator's initial funding
          status: 'holding',
          createdAt: Date.now(),
          flowvaultTxId: txId
        });

        // Auto-confirm for the creator since they just created and funded it
        addConfirmation(newVaultId, address!);

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
          🏛️ DAO Treasury
        </div>
        <h1 style={{ color: '#03045e', fontSize: '2rem', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
          {step === 'setup' ? 'Initialize a Treasury Vault' : 'Treasury Live!'}
        </h1>
        <p style={{ color: '#0077b6', fontSize: '1rem', lineHeight: 1.6 }}>
          {step === 'setup'
            ? 'Deposit funds and add your signers. All registered signers must confirm before funds move.'
            : 'Share this link with your signers. Everyone must connect and confirm to release the treasury.'}
        </p>
      </div>

      {step === 'setup' ? (
        <div className="card">
          <div className="form-group">
            <label className="form-label">Total Treasury Funding (USDCx / $)</label>
            <div className="input-with-suffix">
              <input type="number" className="form-input" placeholder="e.g. 5000" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} />
              <select 
                className="input-suffix bg-transparent outline-none cursor-pointer border-none font-medium text-slate-500 hover:text-slate-700" 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="STX">STX</option>
                <option value="USDCx">USDCx</option>
              </select>
            </div>
            <span className="form-hint">You deposit this amount into the Multi-Sig vault.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Signers</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.75rem 1rem', background: '#f8fafc', border: '1.5px solid var(--slate-200)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: '#03045e', flex: 1 }}>{address?.slice(0, 20)}... (You — Creator)</span>
              <span className="badge badge-locked">Auto-added</span>
            </div>
            {signerAddresses.map((signer, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder={`Signer ${i + 2} wallet (SP...)`}
                  value={signer}
                  onChange={(e) => updateSigner(i, e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}
                />
                <button onClick={() => removeSigner(i)} className="btn btn-ghost btn-sm" style={{ flexShrink: 0, color: 'var(--danger)' }}>✕</button>
              </div>
            ))}
            <button onClick={addSigner} className="btn btn-ghost btn-sm" style={{ marginTop: '0.25rem', color: '#0077b6' }}>+ Add Signer</button>
          </div>

          <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
            <span className="alert-icon">ℹ️</span>
            <span>This vault will require <strong>all {required} signers</strong> to approve before any funds move.</span>
          </div>

          <button onClick={handleCreate} className="btn btn-primary btn-full btn-lg" disabled={!amount || !signerAddresses.some(a => a.trim())}>
            {isSignedIn ? 'Initialize Treasury' : 'Connect Wallet to Continue'}
          </button>

          {status && <div className="alert alert-info" style={{ marginTop: '1.25rem' }}><span className="alert-icon">⏳</span><span>{status}</span></div>}
        </div>
      ) : (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'var(--success)', background: 'var(--success-bg)' }}>
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🏛️</div>
              <h3 style={{ color: '#065f46', marginBottom: '0.5rem' }}>Treasury Active</h3>
              <p style={{ color: '#065f46' }}>Vault ID: <code style={{ background: 'rgba(0,0,0,0.06)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>#{vaultId}</code></p>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <p className="section-title">Signer Status ({required} required)</p>
            <div className="confirm-card confirmed" style={{ marginBottom: '0.75rem' }}>
              <span className="confirm-icon">✅</span>
              <div className="confirm-label">You (Creator)</div>
              <div className="confirm-status yes">Confirmed</div>
            </div>
            {signerAddresses.filter(a => a.trim()).map((signer, i) => (
              <div key={i} className="confirm-card pending" style={{ marginBottom: '0.5rem' }}>
                <span className="confirm-icon">⏳</span>
                <div className="confirm-label">Signer {i + 2}</div>
                <div className="confirm-status no">Awaiting</div>
                <div className="address" style={{ marginTop: '0.5rem', fontSize: '0.7rem' }}>{signer.slice(0, 10)}...{signer.slice(-4)}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <p className="section-title">Share With Your Signers</p>
            <p style={{ color: '#0077b6', fontSize: '0.9375rem', marginBottom: '1rem' }}>Each signer opens this link, connects their wallet, and clicks Confirm.</p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div className="form-input" style={{ flex: 1, fontSize: '0.8125rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0.75rem 1rem', color: '#03045e' }}>{vaultLink}</div>
              <button onClick={copyLink} className="btn btn-secondary" style={{ flexShrink: 0 }}>{copied ? '✓ Copied' : 'Copy Link'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
