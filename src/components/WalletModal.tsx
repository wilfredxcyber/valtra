'use client';

import { useStacks } from '@/hooks/useStacks';
import Image from 'next/image';

const leatherLogo = (
  <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: '#121212' }}>
    <Image src="/leather.jpg" alt="Leather" fill style={{ objectFit: 'cover' }} />
  </div>
);

const xverseLogo = (
  <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: '#171717' }}>
    <Image src="/xverse.jpg" alt="Xverse" fill style={{ objectFit: 'cover' }} />
  </div>
);

const asignaLogo = (
  <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: '#110B29', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <span style={{ color: '#A78BFA', fontWeight: 700, fontSize: '1.1rem' }}>A</span>
  </div>
);

const fordefiLogo = (
  <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: 10, overflow: 'hidden', background: '#0C1220', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <span style={{ color: '#38BDF8', fontWeight: 700, fontSize: '1.1rem' }}>F</span>
  </div>
);

export default function WalletModal() {
  const { showModal, closeModal, connectWithWallet } = useStacks();

  if (!showModal) return null;

  return (
    <div className="wallet-modal-overlay" onClick={closeModal}>
      <div className="wallet-modal" onClick={(e) => e.stopPropagation()} style={{ padding: '1.5rem' }}>

        {/* Header */}
        <div className="wallet-modal-header" style={{ marginBottom: '0.25rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#0f172a' }}>
            Connect a wallet
          </h2>
          <button className="wallet-modal-close" onClick={closeModal}>✕</button>
        </div>

        <p style={{ margin: '0 0 1.5rem', fontSize: '0.875rem', color: '#64748b' }}>
          Select the wallet you want to connect to.
        </p>

        {/* ── Available wallets ─────────────────────────────── */}
        <p style={{ fontSize: '0.78rem', fontWeight: 500, color: '#94a3b8', marginBottom: '0.5rem', letterSpacing: '0.01em' }}>
          Available wallets
        </p>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden', marginBottom: '1.25rem' }}>
          
          {/* Leather row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              {leatherLogo}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#0f172a' }}>Leather</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>leather.io</div>
              </div>
            </div>
            <button
              onClick={() => connectWithWallet('leather')}
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 10, padding: '0.45rem 1.1rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}
            >
              Connect
            </button>
          </div>

          {/* Xverse row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              {xverseLogo}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#0f172a' }}>Xverse Wallet</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>xverse.app</div>
              </div>
            </div>
            <button
              onClick={() => connectWithWallet('xverse')}
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: 10, padding: '0.45rem 1.1rem', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(99,102,241,0.3)' }}
            >
              Connect
            </button>
          </div>

        </div>

        {/* ── Other wallets ─────────────────────────────────── */}
        <p style={{ fontSize: '0.78rem', fontWeight: 500, color: '#94a3b8', marginBottom: '0.5rem', letterSpacing: '0.01em' }}>
          Other wallets
        </p>
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>

          {/* Asigna row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              {asignaLogo}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#0f172a' }}>Asigna Multisig</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>asigna.io</div>
              </div>
            </div>
            <a
              href="https://asigna.io"
              target="_blank"
              rel="noopener noreferrer"
              style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.4rem 0.9rem', fontWeight: 500, fontSize: '0.875rem', color: '#475569', textDecoration: 'none', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              Open →
            </a>
          </div>

          {/* Fordefi row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              {fordefiLogo}
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#0f172a' }}>Fordefi</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>www.fordefi.com</div>
              </div>
            </div>
            <a
              href="https://fordefi.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.4rem 0.9rem', fontWeight: 500, fontSize: '0.875rem', color: '#475569', textDecoration: 'none', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              Install →
            </a>
          </div>

        </div>

      </div>
    </div>
  );
}


