'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Escrow } from '@/lib/escrowStore';
import { LockIcon } from '@/components/Icons';

export default function EscrowsPage() {
  const [escrows, setEscrows] = useState<Escrow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/escrow');
      const data = await res.json();
      setEscrows(data.escrows || []);
      setLoading(false);
    };
    load();
    const i = setInterval(load, 5000);
    return () => clearInterval(i);
  }, []);

  const statusColor: Record<string, string> = {
    PENDING: 'badge-pending', LOCKED: 'badge-locked',
    AWAITING_THRESHOLD: 'badge-pending', RELEASED: 'badge-released',
  };
  const truncate = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  return (
    <div className="page-wrapper">
      <main className="main-content">
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h1>All Escrows</h1>
              <p>Live payment escrows on Collab Escrow.</p>
            </div>
            <Link href="/create" className="btn btn-primary">+ New Escrow</Link>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <div className="spinner spinner-blue" style={{ width: 36, height: 36 }} />
            </div>
          ) : escrows.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}><LockIcon style={{ width: 48, height: 48, color: 'var(--slate-300)' }} /></span>
              <h3>No escrows yet</h3>
              <p>Create your first escrow to get started.</p>
              <Link href="/create" className="btn btn-primary" style={{ marginTop: '1rem' }}>Create Escrow</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {escrows.map((e) => {
                const confirmCount = [e.clientConfirmed, e.freelancerConfirmed].filter(Boolean).length;
                return (
                  <Link href={`/escrow/${e.id}`} key={e.id} style={{ textDecoration: 'none' }}>
                    <div className="card" style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>#{e.id}</span>
                            <span className={`badge ${statusColor[e.status] ?? 'badge-pending'}`}>
                              <span className="badge-dot" />{e.status.replace('_', ' ')}
                            </span>
                          </div>
                          <p style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>{e.description}</p>
                          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8125rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                            <span>Client: <span className="address" style={{ fontSize: '0.75rem' }}>{truncate(e.clientAddress)}</span></span>
                            <span>Freelancer: <span className="address" style={{ fontSize: '0.75rem' }}>{truncate(e.freelancerAddress)}</span></span>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--blue-700)', letterSpacing: '-0.03em' }}>
                            {e.amount} STX
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                            {confirmCount}/2 confirmed
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
