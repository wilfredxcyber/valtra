'use client';

import { AppStacksProvider } from '@/hooks/useStacks';
import Navbar from '@/components/Navbar';
import WalletModal from '@/components/WalletModal';
import { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AppStacksProvider>
      <Navbar />
      {children}
      <WalletModal />
    </AppStacksProvider>
  );
}
