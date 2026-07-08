'use client';

import Link from 'next/link';
import { useStacks } from '@/hooks/useStacks';
import { LockIcon, HandshakeIcon, SplitIcon, SparklesIcon } from '@/components/Icons';
import styles from './landing.module.css';

export default function HomePage() {
  const { isSignedIn, openModal } = useStacks();

  return (
    <div className={styles.lightLanding}>
      {/* ─── HERO SECTION ─── */}
      <section className={styles.hero}>
        <div className="container">
          <div className="animate-in">
            <div className={styles.heroBadge}>
              <SparklesIcon style={{ width: 16, height: 16 }} /> The New Standard for On-Chain Agreements
            </div>
            
            <h1>
              Trust, Codified.<br />
              <span style={{ color: '#00b4d8' }}>Never rely on a promise again.</span>
            </h1>
            
            <p className={styles.heroSubtitle}>
              Collab Escrow is a mutual-consent engine powered by Stacks and FlowVault. 
              When people put money in together, no one can take it out alone.
            </p>

            <div className={styles.heroActions}>
              {isSignedIn ? (
                <Link href="#vaults" className="btn btn-primary btn-lg" style={{ padding: '1rem 2.5rem', borderRadius: '99px' }}>
                  Explore Vaults
                </Link>
              ) : (
                <button className="btn btn-primary btn-lg" onClick={openModal} style={{ padding: '1rem 2.5rem', borderRadius: '99px' }}>
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── STORY / MISSION SECTION ─── */}
      <section className={styles.storySection}>
        <div className="container">
          <div className={styles.storyBox}>
            <h2>Rebuilding Trust in Crypto</h2>
            <p>
              In the early days of web3, "trustless" meant you didn't have to trust the counterparty. 
              But as complexity grew, we reverted to trusting single multi-sig signers, admins, or off-chain arbitrators. 
              <strong> Collab Escrow exists to fix this.</strong> By utilizing FlowVault Hold and Split primitives, 
              we've created a system where funds are absolutely locked until mathematical mutual consent is reached. 
              No timers. No loopholes. Just pure programmable agreement.
            </p>
          </div>
        </div>
      </section>

      {/* ─── FEATURES CAROUSEL ─── */}
      <section id="vaults" className={styles.carouselSection}>
        <h2>Choose Your Engine</h2>
        <div className={styles.carouselContainer}>
          
          <Link href="/partnership" className={styles.carouselCard}>
            <div style={{ color: '#00b4d8', marginBottom: '0.5rem' }}>
              <HandshakeIcon style={{ width: 40, height: 40 }} />
            </div>
            <h3>Partnership</h3>
            <p>
              The classic symmetrical vault. 2 or more partners deposit equal or varying amounts. 
              Funds only unlock when everyone confirms.
            </p>
            <div style={{ marginTop: '1.5rem', color: '#00b4d8', fontWeight: 600, fontSize: '0.875rem' }}>Launch Vault →</div>
          </Link>

          <Link href="/freelancer" className={styles.carouselCard}>
            <div style={{ color: '#0077b6', marginBottom: '0.5rem' }}>
              <LockIcon style={{ width: 40, height: 40 }} />
            </div>
            <h3>Freelancer Escrow</h3>
            <p>
              Client deposits the milestone. Freelancer does the work. 
              Both must cryptographically sign off before the funds are routed.
            </p>
            <div style={{ marginTop: '1.5rem', color: '#0077b6', fontWeight: 600, fontSize: '0.875rem' }}>Launch Vault →</div>
          </Link>

          <Link href="/treasury" className={styles.carouselCard}>
            <div style={{ color: '#90e0ef', marginBottom: '0.5rem' }}>
              <SplitIcon style={{ width: 40, height: 40 }} />
            </div>
            <h3>DAO Treasury</h3>
            <p>
              Secure community funds with a multi-signature threshold. 
              Require 3-of-5 or any configuration to approve large movements.
            </p>
            <div style={{ marginTop: '1.5rem', color: '#90e0ef', fontWeight: 600, fontSize: '0.875rem' }}>Launch Vault →</div>
          </Link>

          <Link href="/grant-pool" className={styles.carouselCard}>
            <div style={{ color: '#caf0f8', marginBottom: '0.5rem' }}>
              <SparklesIcon style={{ width: 40, height: 40 }} />
            </div>
            <h3>Grant Pool</h3>
            <p>
              Crowdfund a shared goal. The community deposits, but the funds are only 
              released to a specific 3rd-party grantee when approved.
            </p>
            <div style={{ marginTop: '1.5rem', color: '#caf0f8', fontWeight: 600, fontSize: '0.875rem' }}>Launch Vault →</div>
          </Link>

        </div>
      </section>

      {/* ─── TECH TRUST SECTION ─── */}
      <section className={styles.trustSection}>
        <div className={styles.trustGrid}>
          <div className={styles.trustItem}>
            <h4>Powered by FlowVault</h4>
            <p>Utilizing native Hold Vaults and automated Split routing.</p>
          </div>
          <div className={styles.trustItem}>
            <h4>Secured by Stacks</h4>
            <p>Settled on Bitcoin via Clarity Smart Contracts.</p>
          </div>
          <div className={styles.trustItem}>
            <h4>No Intermediaries</h4>
            <p>Zero admin keys. Your keys, your consent.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
