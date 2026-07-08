'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useStacks } from '@/hooks/useStacks';
import { executeHoldVaultDeposit } from '@/lib/flowvault';
import { loadVaultAsync, addDeposit, addConfirmation, LocalVault } from '@/lib/localVaultStore';
import {
  LockIcon, CheckCircleIcon, ClockIcon, WalletIcon,
  AlertTriangleIcon, InfoIcon, ArrowLeftIcon, PartyPopperIcon
} from '@/components/Icons';

type Step = 'connect' | 'deposit' | 'confirm' | 'done';

export default function VaultPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id ?? '');

  const { isSignedIn, address, openModal, network } = useStacks();
  const [vault, setVault] = useState<LocalVault | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [step, setStep] = useState<Step>('connect');
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [status, setStatus] = useState<string>('');

  // Load vault — async so it can fall back to server API for cross-browser links
  useEffect(() => {
    if (!id) return;
    loadVaultAsync(id).then(v => {
      setVault(v);
      setLoaded(true);
    });
  }, [id]);

  // ── Role detection ──
  const isCreator = !!address && !!vault && vault.creatorAddress === address;
  const isAuthorizedSigner = !!address && !!vault && (
    vault.partnerAddresses.includes(address) ||
    (vault.type === 'freelancer' && (vault.payouts ?? []).some(p => p.address === address))
  );
  const hasAlreadyConfirmed = !!address && !!vault && vault.confirmations.includes(address);

  // Advance to correct step once wallet connects
  useEffect(() => {
    if (!isSignedIn || step !== 'connect' || !vault) return;
    if (vault.type === 'partnership' && !isCreator) {
      // Non-creator partner must deposit their share
      const alreadyDeposited = vault.deposits.some(d => d.address === address);
      setStep(alreadyDeposited ? 'confirm' : 'deposit');
    } else {
      // Creator on vault page, or signer on non-partnership vault → go to confirm
      setStep('confirm');
    }
  }, [isSignedIn, step, vault, isCreator, address]);

  const handleDeposit = async () => {
    if (!isSignedIn || !address) { openModal(); return; }
    if (depositAmount <= 0) { setStatus('Enter an amount to deposit.'); return; }
    setStatus('Locking your share into FlowVault...');
    await executeHoldVaultDeposit(
      { amount: depositAmount, senderAddress: address, network },
      (_txId) => {
        if (vault) {
          const updated = addDeposit(vault.id, address, depositAmount);
          if (updated) setVault(updated);
        }
        setStatus('');
        setStep('confirm');
      },
      () => setStatus('Deposit cancelled.')
    );
  };

  const handleConfirm = () => {
    if (!vault || !address) return;
    const updated = addConfirmation(vault.id, address);
    if (updated) {
      setVault(updated);
      // Sync confirmation to server so other participants see it
      fetch(`/api/vaults/${vault.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmations: updated.confirmations, status: updated.status }),
      }).catch(() => {});
    }
    setStep('done');
  };

  const totalDeposited = vault?.deposits.reduce((s, d) => s + d.amount, 0) ?? 0;
  const allConfirmed = vault ? vault.confirmations.length >= vault.requiredConfirmations : false;

  // Determine step progress based on vault type
  let stepIndex = 0;
  let steps: { label: string; icon: React.ReactElement }[] = [];

  if (vault?.type === 'partnership') {
    stepIndex = { connect: 0, deposit: 1, confirm: 2, done: 3 }[step] ?? 0;
    steps = [
      { label: 'Connect Wallet', icon: <WalletIcon style={{ width: 14, height: 14 }} /> },
      { label: 'Deposit Share',  icon: <LockIcon style={{ width: 14, height: 14 }} /> },
      { label: 'Confirm',        icon: <CheckCircleIcon style={{ width: 14, height: 14 }} /> },
    ];
  } else {
    // Freelancer, Treasury, Grant Pool — Invitees don't deposit, they just confirm
    stepIndex = { connect: 0, deposit: 0, confirm: 1, done: 2 }[step] ?? 0;
    steps = [
      { label: 'Connect Wallet', icon: <WalletIcon style={{ width: 14, height: 14 }} /> },
      { label: 'Confirm',        icon: <CheckCircleIcon style={{ width: 14, height: 14 }} /> },
    ];
  }

  return (
    <div className="container" style={{ padding: '4rem 1.5rem', maxWidth: '680px' }}>

      {/* Back */}
      <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', color: '#0077b6', fontSize: '0.875rem', fontWeight: 600, marginBottom: '2rem', textDecoration: 'none' }}>
        <ArrowLeftIcon style={{ width: 16, height: 16 }} /> Back to Home
      </Link>

      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: '#caf0f8', color: '#03045e', padding: '0.3rem 0.875rem', borderRadius: '99px', fontSize: '0.8rem', fontWeight: 600, marginBottom: '1rem' }}>
          <LockIcon style={{ width: 13, height: 13 }} />
          {isCreator ? '👑 Your Vault' : 'Collab Escrow'} — Vault #{id}
        </div>
        <h1 style={{ color: '#03045e', fontSize: '2rem', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
          {step === 'done' ? 'All Done!'
            : isCreator ? 'Vault Dashboard'
            : "You've been invited to this Vault"}
        </h1>
        <p style={{ color: '#0077b6', fontSize: '1rem', lineHeight: 1.6 }}>
          {step === 'done'
            ? allConfirmed ? 'All parties confirmed — funds are releasing.' : 'Your confirmation is in. Waiting for others.'
            : isCreator
              ? `You created this vault. Share the link below with all required participants. ${vault ? `${vault.confirmations.length}/${vault.requiredConfirmations} confirmations received.` : ''}`
              : 'Connect your wallet to confirm your participation and release the funds.'}
        </p>
      </div>

      {/* Vault not found */}
      {loaded && !vault && (
        <div className="card" style={{ marginBottom: '1.5rem', borderColor: '#fbbf24', background: '#fffbeb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangleIcon style={{ width: 22, height: 22, color: '#d97706', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '0.2rem' }}>Vault #{id} not found</div>
              <div style={{ color: '#92400e', fontSize: '0.875rem' }}>
                Make sure you are using the same browser the vault was created in. Vault data is stored locally until the smart contract is deployed.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vault summary */}
      {vault && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <p className="section-title">Vault Summary</p>
          <div className="info-row">
            <span className="info-key">Type</span>
            <span className="info-value" style={{ textTransform: 'capitalize' }}>{vault.type.replace('-', ' ')}</span>
          </div>
          <div className="info-row">
            <span className="info-key">Total Deposited</span>
            <span className="info-value" style={{ fontWeight: 700, color: '#03045e' }}>{totalDeposited} STX</span>
          </div>
          <div className="info-row">
            <span className="info-key">Confirmations</span>
            <span className="info-value">
              <span style={{ color: '#0077b6', fontWeight: 700 }}>{vault.confirmations.length}</span>
              <span style={{ color: '#90e0ef' }}> / {vault.requiredConfirmations} needed</span>
            </span>
          </div>
          <div className="info-row">
            <span className="info-key">Status</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '99px', background: vault.status === 'released' ? '#d1fae5' : '#caf0f8', color: vault.status === 'released' ? '#065f46' : '#03045e' }}>
              {vault.status === 'released'
                ? <><CheckCircleIcon style={{ width: 13, height: 13 }} /> Released</>
                : <><LockIcon style={{ width: 13, height: 13 }} /> Holding</>}
            </span>
          </div>
        </div>
      )}

      {/* Progress Steps */}
      {step !== 'done' && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            {steps.map((s, i) => {
              const done = i < stepIndex;
              const active = i === stepIndex;
              return (
                <div key={i} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                  {i > 0 && <div style={{ position: 'absolute', left: 0, top: 14, width: '100%', height: 2, background: done ? '#0077b6' : '#caf0f8', zIndex: 0 }} />}
                  <div style={{ width: 28, height: 28, borderRadius: '50%', margin: '0 auto 0.4rem', background: done ? '#0077b6' : active ? '#00b4d8' : '#caf0f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: done || active ? 'white' : '#0077b6', position: 'relative', zIndex: 1, border: active ? '2px solid #0077b6' : 'none' }}>
                    {done ? <CheckCircleIcon style={{ width: 14, height: 14 }} /> : s.icon}
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: active ? '#03045e' : '#0077b6', fontWeight: active ? 700 : 400 }}>{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CONNECT ── */}
      {step === 'connect' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <WalletIcon style={{ width: 22, height: 22, color: '#0077b6' }} />
            <p className="section-title" style={{ margin: 0 }}>Step 1 — Connect Your Wallet</p>
          </div>
          <p style={{ color: '#0077b6', fontSize: '0.9375rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Connect the wallet address that was registered for this vault. Only registered wallets can participate.
          </p>
          <button onClick={openModal} className="btn btn-primary btn-full btn-lg">
            Connect Wallet
          </button>
        </div>
      )}

      {/* ── DEPOSIT ── */}
      {step === 'deposit' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <LockIcon style={{ width: 22, height: 22, color: '#0077b6' }} />
            <p className="section-title" style={{ margin: 0 }}>Step 2 — Deposit Your Share</p>
          </div>
          <div className="alert alert-info" style={{ marginBottom: '1.25rem' }}>
            <InfoIcon style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span>Connected as <strong style={{ fontFamily: 'monospace' }}>{address?.slice(0, 12)}...{address?.slice(-4)}</strong></span>
          </div>
          <p style={{ color: '#0077b6', fontSize: '0.9375rem', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            Enter your agreed deposit. Funds lock into FlowVault alongside the creator's deposit — nothing moves until all parties confirm.
          </p>
          <div className="form-group">
            <label className="form-label">Your Deposit Amount (STX)</label>
            <div className="input-with-suffix">
              <input type="number" className="form-input" placeholder="Enter your agreed share" value={depositAmount || ''} onChange={(e) => setDepositAmount(Number(e.target.value))} />
              <span className="input-suffix">STX</span>
            </div>
          </div>
          <button onClick={handleDeposit} className="btn btn-primary btn-full btn-lg" disabled={!depositAmount}>
            <LockIcon style={{ width: 18, height: 18 }} />
            Deposit {depositAmount > 0 ? `${depositAmount} STX` : ''} into Vault
          </button>
          {status && (
            <div className="alert alert-info" style={{ marginTop: '1.25rem' }}>
              <ClockIcon style={{ width: 16, height: 16, flexShrink: 0 }} /><span>{status}</span>
            </div>
          )}
        </div>
      )}

      {/* ── CONFIRM ── */}
      {step === 'confirm' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <CheckCircleIcon style={{ width: 22, height: 22, color: '#0077b6' }} />
            <p className="section-title" style={{ margin: 0 }}>
              {isCreator ? '✅ Approve & Release' : vault?.type === 'partnership' ? 'Step 3 — Confirm Release' : 'Step 2 — Confirm Release'}
            </p>
          </div>

          {/* Creator info banner */}
          {isCreator && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem' }}>
              <p style={{ margin: 0, color: '#1e40af', fontSize: '0.875rem', fontWeight: 500 }}>
                👑 You are the vault creator. Your confirmation counts as the <strong>client approval</strong>.
                {vault && vault.requiredConfirmations > 1 && ` ${vault.requiredConfirmations - 1} other signer(s) also need to confirm.`}
              </p>
            </div>
          )}

          {/* Already confirmed banner */}
          {hasAlreadyConfirmed && (
            <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircleIcon style={{ width: 18, height: 18, color: '#065f46', flexShrink: 0 }} />
              <span style={{ color: '#065f46', fontWeight: 600 }}>You already confirmed this vault. Waiting for {vault ? vault.requiredConfirmations - vault.confirmations.length : 0} more confirmation(s).</span>
            </div>
          )}

          {depositAmount > 0 && (
            <div style={{ background: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: '10px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CheckCircleIcon style={{ width: 18, height: 18, color: '#065f46', flexShrink: 0 }} />
              <span style={{ color: '#065f46', fontWeight: 600 }}>{depositAmount} STX deposited and locked in vault.</span>
            </div>
          )}
          {vault?.type === 'freelancer' && vault.payouts && vault.payouts.length > 0 && (
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <p style={{ margin: '0 0 0.75rem 0', fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>Team Payout Splits:</p>
              {vault.payouts.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: i === vault.payouts!.length - 1 ? 'none' : '1px solid #e2e8f0' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#475569' }}>{p.address.slice(0, 8)}...{p.address.slice(-4)}</span>
                  <span style={{ fontWeight: 600, color: '#03045e' }}>{p.amount} STX</span>
                </div>
              ))}
            </div>
          )}
          <p style={{ color: '#0077b6', fontSize: '0.9375rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            {isCreator
              ? 'Confirm to add your approval. Funds release automatically when all parties confirm.'
              : 'Confirm your agreement. Funds only release when all parties confirm.'}
          </p>
          {!hasAlreadyConfirmed && (
            <button onClick={handleConfirm} className="btn btn-primary btn-full btn-lg">
              <CheckCircleIcon style={{ width: 18, height: 18 }} />
              {isCreator ? 'Approve as Creator' : 'Confirm Release'}
            </button>
          )}
          {!hasAlreadyConfirmed && (
            <div className="alert alert-warning" style={{ marginTop: '1.25rem' }}>
              <AlertTriangleIcon style={{ width: 16, height: 16, flexShrink: 0 }} />
              <span>Only confirm if you are satisfied with the agreement. This action is irreversible.</span>
            </div>
          )}
          {status && (
            <div className="alert alert-info" style={{ marginTop: '1rem' }}>
              <ClockIcon style={{ width: 16, height: 16, flexShrink: 0 }} /><span>{status}</span>
            </div>
          )}
        </div>
      )}

      {/* ── DONE ── */}
      {step === 'done' && (
        <div className="card" style={{ textAlign: 'center', borderColor: '#a7f3d0', background: '#d1fae5' }}>
          <PartyPopperIcon style={{ width: 48, height: 48, color: '#065f46', margin: '0 auto 1rem' }} />
          <h2 style={{ color: '#065f46', marginBottom: '0.75rem' }}>
            {allConfirmed ? 'Funds Released!' : 'Confirmation Submitted!'}
          </h2>
          <p style={{ color: '#065f46', fontSize: '1rem', lineHeight: 1.6 }}>
            {allConfirmed
              ? 'All parties confirmed. FlowVault automatically released and split the funds.'
              : `Your deposit and confirmation are recorded. ${vault ? vault.requiredConfirmations - vault.confirmations.length : 0} more confirmation(s) needed before funds release.`}
          </p>
          <Link href="/" className="btn btn-secondary" style={{ display: 'inline-flex', marginTop: '1.5rem', gap: '0.4rem' }}>
            <ArrowLeftIcon style={{ width: 16, height: 16 }} /> Back to Home
          </Link>
        </div>
      )}
    </div>
  );
}
