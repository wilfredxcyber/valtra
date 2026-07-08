'use client';

import { useState } from 'react';
import { useStacks } from '@/hooks/useStacks';
import { executeHoldVaultDeposit } from '@/lib/flowvault';
import { saveVault, addConfirmation, type Milestone } from '@/lib/localVaultStore';

type Step = 'setup' | 'created';

interface MilestoneInput {
  label: string;
  amount: number;
}

export default function GrantPoolPage() {
  const { isSignedIn, address, openModal, network } = useStacks();
  const [step, setStep] = useState<Step>('setup');
  const [granteeAddress, setGranteeAddress] = useState<string>('');
  const [communitySigners, setCommunitySigners] = useState<string[]>(['', '']);
  const [goalDescription, setGoalDescription] = useState<string>('');
  const [vaultId, setVaultId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // ── Milestone mode ──
  const [useMilestones, setUseMilestones] = useState(false);
  const [milestones, setMilestones] = useState<MilestoneInput[]>([
    { label: 'Phase 1', amount: 0 },
    { label: 'Phase 2', amount: 0 },
  ]);
  // Lump-sum amount (used when milestones are OFF)
  const [lumpAmount, setLumpAmount] = useState<number>(0);

  // Computed total
  const totalAmount = useMilestones
    ? milestones.reduce((s, m) => s + (m.amount || 0), 0)
    : lumpAmount;

  const vaultLink = vaultId !== null && typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.host}/vault/${vaultId}`
    : '';

  const validSigners = communitySigners.filter(a => a.trim());

  const addSigner = () => setCommunitySigners([...communitySigners, '']);
  const removeSigner = (i: number) => setCommunitySigners(communitySigners.filter((_, idx) => idx !== i));
  const updateSigner = (i: number, val: string) => {
    const updated = [...communitySigners];
    updated[i] = val;
    setCommunitySigners(updated);
  };

  const addMilestone = () => setMilestones([...milestones, { label: `Phase ${milestones.length + 1}`, amount: 0 }]);
  const removeMilestone = (i: number) => setMilestones(milestones.filter((_, idx) => idx !== i));
  const updateMilestone = (i: number, field: keyof MilestoneInput, val: string | number) => {
    const updated = [...milestones];
    updated[i] = { ...updated[i], [field]: val };
    setMilestones(updated);
  };

  const isValid = () => {
    if (!granteeAddress || validSigners.length === 0) return false;
    if (useMilestones) {
      return milestones.length > 0 && milestones.every(m => m.label.trim() && m.amount > 0);
    }
    return lumpAmount > 0;
  };

  const handleCreate = async () => {
    if (!isSignedIn) { openModal(); return; }
    if (!isValid()) {
      setStatus('Please fill in all fields.');
      return;
    }

    setStatus('Step 1/2 — Locking funds into FlowVault on-chain...');
    await executeHoldVaultDeposit(
      { amount: totalAmount, senderAddress: address!, network },
      (txId) => {
        setStatus('Step 2/2 — Saving grant vault...');
        const newVaultId = Date.now();

        // Build milestone objects if enabled
        const milestonesData: Milestone[] | undefined = useMilestones
          ? milestones.map((m, i) => ({
              id: i + 1,
              label: m.label,
              amount: m.amount,
              confirmations: [],
              status: 'pending' as const,
            }))
          : undefined;

        saveVault({
          id: newVaultId,
          type: 'grant-pool',
          creatorAddress: address!,
          creatorAmount: totalAmount,
          partnerAddresses: validSigners,
          granteeAddress,
          description: goalDescription,
          milestones: milestonesData,
          requiredConfirmations: validSigners.length,
          confirmations: [],
          deposits: [{ address: address!, amount: totalAmount }],
          status: 'holding',
          createdAt: Date.now(),
          flowvaultTxId: txId,
        });

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
          ✨ Grant Pool
        </div>
        <h1 style={{ color: '#03045e', fontSize: '2rem', letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
          {step === 'setup' ? 'Create a Grant Pool' : 'Grant Pool Live!'}
        </h1>
        <p style={{ color: '#0077b6', fontSize: '1rem', lineHeight: 1.6 }}>
          {step === 'setup'
            ? 'Pool community funds. Community signers approve before the grantee receives anything — all at once or milestone by milestone.'
            : 'Share this link with your community signers. Each milestone releases funds directly to the grantee when approved.'}
        </p>
      </div>

      {step === 'setup' ? (
        <div className="card">
          {/* Goal Description */}
          <div className="form-group">
            <label className="form-label">Grant Goal / Description</label>
            <input type="text" className="form-input" placeholder="e.g. Developer grant for open-source tool X" value={goalDescription} onChange={(e) => setGoalDescription(e.target.value)} />
          </div>

          {/* Grantee */}
          <div className="form-group">
            <label className="form-label">Grantee Wallet Address</label>
            <input type="text" className="form-input" placeholder="SP... (who receives the funds)" value={granteeAddress} onChange={(e) => setGranteeAddress(e.target.value)} style={{ fontFamily: 'monospace', fontSize: '0.875rem' }} />
            <span className="form-hint">Receives funds directly — does not need to sign.</span>
          </div>

          {/* ── Payout Mode Toggle ── */}
          <div className="form-group">
            <label className="form-label">Payout Method</label>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={() => setUseMilestones(false)}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '10px', border: `2px solid ${!useMilestones ? '#0077b6' : '#caf0f8'}`,
                  background: !useMilestones ? '#caf0f8' : 'white', color: !useMilestones ? '#03045e' : '#0077b6',
                  fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.15s',
                }}
              >
                💰 Lump Sum
                <div style={{ fontSize: '0.7rem', fontWeight: 400, marginTop: '0.2rem', color: '#0077b6' }}>Release all at once</div>
              </button>
              <button
                type="button"
                onClick={() => setUseMilestones(true)}
                style={{
                  flex: 1, padding: '0.75rem', borderRadius: '10px', border: `2px solid ${useMilestones ? '#0077b6' : '#caf0f8'}`,
                  background: useMilestones ? '#caf0f8' : 'white', color: useMilestones ? '#03045e' : '#0077b6',
                  fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.15s',
                }}
              >
                🪜 Milestones
                <div style={{ fontSize: '0.7rem', fontWeight: 400, marginTop: '0.2rem', color: '#0077b6' }}>Release stage by stage</div>
              </button>
            </div>

            {/* Lump sum input */}
            {!useMilestones && (
              <div className="input-with-suffix">
                <input type="number" className="form-input" placeholder="0" value={lumpAmount || ''} onChange={(e) => setLumpAmount(Number(e.target.value))} />
                <span className="input-suffix">USDCx / $</span>
              </div>
            )}

            {/* Milestone inputs */}
            {useMilestones && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 36px', gap: '0.5rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Milestone Label</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Amount (STX)</span>
                  <span />
                </div>
                {milestones.map((m, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 130px 36px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={`Phase ${i + 1} name`}
                      value={m.label}
                      onChange={(e) => updateMilestone(i, 'label', e.target.value)}
                      style={{ fontSize: '0.875rem' }}
                    />
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0"
                      value={m.amount || ''}
                      onChange={(e) => updateMilestone(i, 'amount', Number(e.target.value))}
                      style={{ fontSize: '0.875rem' }}
                    />
                    <button
                      onClick={() => removeMilestone(i)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)', padding: '0.25rem' }}
                      disabled={milestones.length <= 1}
                    >✕</button>
                  </div>
                ))}
                <button onClick={addMilestone} className="btn btn-ghost btn-sm" style={{ color: '#0077b6', marginTop: '0.25rem' }}>
                  + Add Milestone
                </button>
                {/* Total summary */}
                <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#f0f9ff', borderRadius: '10px', border: '1px solid #caf0f8', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 600, color: '#0077b6', fontSize: '0.875rem' }}>Total to Lock:</span>
                  <span style={{ fontWeight: 800, color: '#03045e', fontSize: '0.9rem' }}>{totalAmount} STX</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem', lineHeight: 1.5 }}>
                  All {totalAmount} STX is locked in FlowVault at once. Community signers approve each milestone separately — funds go to the grantee stage by stage.
                </p>
              </div>
            )}
          </div>

          {/* Community Signers */}
          <div className="form-group">
            <label className="form-label">Community Signers (must all approve)</label>
            {communitySigners.map((signer, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input type="text" className="form-input" placeholder={`Community signer ${i + 1} (SP...)`} value={signer} onChange={(e) => updateSigner(i, e.target.value)} style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }} />
                <button onClick={() => removeSigner(i)} className="btn btn-ghost btn-sm" style={{ flexShrink: 0, color: 'var(--danger)' }}>✕</button>
              </div>
            ))}
            <button onClick={addSigner} className="btn btn-ghost btn-sm" style={{ marginTop: '0.25rem', color: '#0077b6' }}>+ Add Signer</button>
          </div>

          <div className="alert alert-info" style={{ marginBottom: '1.5rem' }}>
            <span className="alert-icon">ℹ️</span>
            <span>
              {useMilestones
                ? `All ${validSigners.length} signers must approve each milestone before funds release to the grantee${granteeAddress ? ` (${granteeAddress.slice(0, 10)}...)` : ''}.`
                : `All ${validSigners.length} community signers must approve before the grantee${granteeAddress ? ` (${granteeAddress.slice(0, 10)}...)` : ''} receives ${lumpAmount} STX.`
              }
            </span>
          </div>

          <button onClick={handleCreate} className="btn btn-primary btn-full btn-lg" disabled={!isValid()}>
            {isSignedIn ? `Lock ${totalAmount} STX & Create Grant Pool` : 'Connect Wallet to Continue'}
          </button>

          {status && <div className="alert alert-info" style={{ marginTop: '1.25rem' }}><span className="alert-icon">⏳</span><span>{status}</span></div>}
        </div>
      ) : (
        <div>
          {/* Success Banner */}
          <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'var(--success)', background: 'var(--success-bg)' }}>
            <div style={{ textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✨</div>
              <h3 style={{ color: '#065f46', marginBottom: '0.5rem' }}>Grant Pool Active</h3>
              {goalDescription && <p style={{ color: '#065f46', fontSize: '0.875rem', marginBottom: '0.5rem' }}>"{goalDescription}"</p>}
              <p style={{ color: '#065f46' }}>
                Vault ID: <code style={{ background: 'rgba(0,0,0,0.06)', padding: '0.2rem 0.5rem', borderRadius: '6px' }}>#{vaultId}</code>
              </p>
              {totalAmount > 0 && (
                <p style={{ color: '#065f46', fontWeight: 700, marginTop: '0.5rem' }}>{totalAmount} STX locked in FlowVault</p>
              )}
            </div>
          </div>

          {/* Grantee */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <p className="section-title">Grantee (Recipient)</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: 'var(--blue-50)', borderRadius: 'var(--radius-md)', border: '1px solid var(--blue-200)' }}>
              <span style={{ fontSize: '1.5rem' }}>🎯</span>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--blue-900)', fontSize: '0.875rem' }}>
                  {useMilestones ? 'Receives funds per milestone approval' : 'Will receive upon full approval'}
                </div>
                <div className="address" style={{ fontSize: '0.75rem' }}>{granteeAddress}</div>
              </div>
            </div>
          </div>

          {/* Milestone breakdown (if enabled) */}
          {useMilestones && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <p className="section-title">Milestone Payout Schedule</p>
              <p style={{ color: '#0077b6', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Community signers approve each phase. Funds go directly to the grantee when a phase is approved.
              </p>
              {milestones.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #caf0f8', marginBottom: '0.5rem', background: '#f0f9ff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#caf0f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#03045e', fontWeight: 700, fontSize: '0.8rem' }}>{i + 1}</div>
                    <span style={{ fontWeight: 600, color: '#03045e', fontSize: '0.875rem' }}>{m.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: 800, color: '#0077b6', fontSize: '0.9rem' }}>{m.amount} STX</span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', background: '#e2e8f0', padding: '0.15rem 0.5rem', borderRadius: '99px' }}>Pending Approval</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Community Signers */}
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <p className="section-title">Community Approvals ({validSigners.length} needed)</p>
            {validSigners.map((signer, i) => (
              <div key={i} className="confirm-card pending" style={{ marginBottom: '0.5rem', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>⏳</span>
                <div>
                  <div className="confirm-label">Community Signer {i + 1}</div>
                  <div className="address" style={{ fontSize: '0.7rem' }}>{signer.slice(0, 12)}...{signer.slice(-4)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Share Link */}
          <div className="card">
            <p className="section-title">Share With Community Signers</p>
            <p style={{ color: '#0077b6', fontSize: '0.9375rem', marginBottom: '1rem' }}>
              Each signer opens this link, connects their wallet, and approves
              {useMilestones ? ' each milestone one by one.' : ' the grant.'}
            </p>
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
