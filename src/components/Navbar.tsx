'use client';

import Link from 'next/link';
import { useStacks } from '@/hooks/useStacks';

export default function Navbar() {
  const { isSignedIn, address, openModal, disconnect } = useStacks();

  const truncate = (addr: string) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-brand">
          <div className="brand-icon">CE</div>
          Collab Escrow
        </Link>

        {/* Desktop Navigation Links */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }} className="nav-links">
          <Link href="/partnership" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Partnership</Link>
          <Link href="/freelancer" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Freelancer</Link>
          <Link href="/treasury" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Treasury</Link>
          <Link href="/grant-pool" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Grant Pool</Link>
        </div>

        <div className="navbar-actions">
          {isSignedIn && address ? (
            <>
              <span className="wallet-address">{truncate(address)}</span>
              <button className="btn btn-ghost btn-sm" onClick={disconnect}>
                Disconnect
              </button>
            </>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={openModal}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
