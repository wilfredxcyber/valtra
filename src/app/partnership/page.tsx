'use client';

import { useState } from 'react';
import { useStacks } from '@/hooks/useStacks';
import { executeHoldVaultDeposit } from '@/lib/flowvault';
import { saveVault, addConfirmation } from '@/lib/localVaultStore';

type Step = 'setup' | 'deposited' | 'confirmed';

export default function PartnershipPage() {
  const { isSignedIn, address, openModal, network } = useStacks();
  const [step, setStep] = useState<Step>('setup');
  const [amount, setAmount] = useState<number>();
  const [currency, setCurrency] = useState('STX');
  const [partnerAddress, setPartnerAddress] = useState<string>('');
  const [vaultId, setVaultId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const getVaultLink = () => {
    if (typeof window === 'undefined' || vaultId === null) return '';
    return `${window.location.protocol}//${window.location.host}/vault/${vaultId}`;
  };
  const vaultLink = getVaultLink();

  const handleCreate = async () => {
    if (!isSignedIn) { openModal(); return; }
    if (myAmount <= 0 || !partnerAddress.trim()) {
      setStatus("Please enter your deposit amount and your partner's wallet address.");
      return;
    }

    setStatus('Locking your share into the FlowVault Hold Vault...');
    await executeHoldVaultDeposit(
      { amount: myAmount, senderAddress: address!, network },
      (txId) => {
        // FlowVault deposit confirmed — create vault locally
        const newId = Date.now();
        saveVault({
          id: newId,
          type: 'partnership',
          creatorAddress: address!,
          creatorAmount: myAmount,
          partnerAddresses: [partnerAddress],
          requiredConfirmations: 2,
          confirmations: [address!], // creator auto-confirms on deposit
          deposits: [{ address: address!, amount: myAmount }],
          status: 'holding',
          createdAt: newId,
          flowvaultTxId: txId,
        });
        setVaultId(newId);
        setStep('deposited');
        setStatus('');
      },
      () => setStatus('Deposit cancelled.')
    );
  };

  const handleCreatorConfirm = () => {
    if (!isSignedIn || vaultId === null) return;
    // Creator already auto-confirmed on deposit — this is just a UI state update
    setStep('confirmed');
    setStatus('Your confirmation is locked in.');
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
          🤝 Partnership Vault
        </div>
        <h1 style={{ color: '#03045e', fontSize: '2rem', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
          {step === 'setup' ? 'Create a Partnership Vault' : step === 'deposited' ? 'Your Share is Locked' : "You've Confirmed!"}
        </h1>
        <p style={{ color: '#0077b6', fontSize: '1rem', lineHeight: 1.6 }}>
          Both partners deposit their own share. Funds only release when <strong>both</strong> of you confirm.
        </p>
      </div>

      {/* Progress Tracker */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {[
            { label: 'You Deposit', done: step !== 'setup', active: step === 'setup' },
            { label: 'Partner Deposits + Confirms', done: false, active: step === 'deposited' || step === 'confirmed' },
            { label: 'You Confirm', done: step === 'confirmed', active: step === 'deposited' },
            { label: 'Funds Released', done: false, active: step === 'confirmed' },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
              {i > 0 && <div style={{ position: 'absolute', left: 0, top: 14, width: '100%', height: 2, background: s.done ? '#0077b6' : '#caf0f8', zIndex: 0 }} />}
              <div style={{ width: 28, height: 28, borderRadius: '50%', margin: '0 auto 0.4rem', background: s.done ? '#0077b6' : s.active ? '#00b4d8' : '#caf0f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: s.done || s.active ? 'white' : '#0077b6', position: 'relative', zIndex: 1, border: s.active ? '2px solid #0077b6' : 'none' }}>
                {s.done ? '✓' : i + 1}
              </div>
              <div style={{ fontSize: '0.6875rem', color: s.active ? '#03045e' : '#0077b6', fontWeight: s.active ? 700 : 400, lineHeight: 1.2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SETUP ── */}
      {step === 'setup' && (
        <div className="card">
          <div className="form-group">
            <label className="form-label">Your Initial Deposit (USDCx / $)</label>
            <div className="input-with-suffix">
              <input type="number" className="form-input" placeholder="e.g. 1000" value={myAmount || ''} onChange={(e) => setMyAmount(Number(e.target.value))} />
              <select 
                className="input-suffix bg-transparent outline-none cursor-pointer border-none font-medium text-slate-500 hover:text-slate-700" 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="STX">STX</option>
                <option value="USDCx">USDCx</option>
              </select>
            </div>
            <span className="form-hint">Your portion only. Your partner deposits their own share via the vault link.</span>
          </div>
          <div className="form-group">
            <label className="form-label">Partner's Wallet Address</label>
            <input type="text" className="form-input" placeholder="SP..." value={partnerAddress} onChange={(e) => setPartnerAddress(e.target.value)} style={{ fontFamily: 'monospace', fontSize: '0.875rem' }} />
            <span className="form-hint">Your partner must connect this exact address to deposit and confirm.</span>
          </div>
          <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
            <span className="alert-icon">🔒</span>
            <span>After you deposit, you'll get a shareable link. Your partner opens it, deposits their share, then you both confirm — funds release.</span>
          </div>
          <button onClick={handleCreate} className="btn btn-primary btn-full btn-lg" disabled={!myAmount || !partnerAddress}>
            {isSignedIn ? 'Deposit My Share & Create Vault' : 'Connect Wallet to Continue'}
          </button>
          {status && <div className="alert alert-info" style={{ marginTop: '1.25rem' }}><span className="alert-icon">⏳</span><span>{status}</span></div>}
        </div>
      )}

      {/* ── DEPOSITED / WAITING ── */}
      {(step === 'deposited' || step === 'confirmed') && (
        <div>
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <p className="section-title">Confirmation Status</p>
            <div className="confirm-grid">
              <div className={`confirm-card ${step === 'confirmed' ? 'confirmed' : 'confirmed'}`}>
                <span className="confirm-icon">✅</span>
                <div className="confirm-label">You (Partner A)</div>
                <div className="confirm-status yes">Deposited & Confirmed</div>
                <div className="address" style={{ marginTop: '0.5rem', fontSize: '0.7rem' }}>{address?.slice(0, 8)}...{address?.slice(-4)}</div>
              </div>
              <div className="confirm-card pending">
                <span className="confirm-icon">⏳</span>
                <div className="confirm-label">Partner B</div>
                <div className="confirm-status no">Must deposit + confirm</div>
                <div className="address" style={{ marginTop: '0.5rem', fontSize: '0.7rem' }}>{partnerAddress.slice(0, 8)}...{partnerAddress.slice(-4)}</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <p className="section-title">Share With Your Partner</p>
            <p style={{ color: '#0077b6', fontSize: '0.9375rem', marginBottom: '1rem' }}>
              Your partner opens this link, connects their wallet, deposits their share, then confirms.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div className="form-input" style={{ flex: 1, fontSize: '0.8125rem', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0.75rem 1rem', color: '#03045e' }}>{vaultLink}</div>
              <button onClick={copyLink} className="btn btn-secondary" style={{ flexShrink: 0 }}>{copied ? '✓ Copied' : 'Copy Link'}</button>
            </div>
          </div>

          {step === 'confirmed' && (
            <div className="card" style={{ textAlign: 'center', borderColor: 'var(--success)', background: 'var(--success-bg)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</div>
              <h3 style={{ color: '#065f46', marginBottom: '0.5rem' }}>Waiting on Your Partner</h3>
              <p style={{ color: '#065f46', fontSize: '0.9375rem' }}>
                Your side is done. Once your partner deposits and confirms via the shared link, funds release automatically.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
