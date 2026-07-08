'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const stacksNetwork = {
  isMainnet: () => false,
  networkId: 'testnet' as const,
  coreApiUrl: 'https://stacks-node-api.testnet.stacks.co',
};

interface StacksContextType {
  isSignedIn: boolean;
  address: string | null;
  showModal: boolean;
  openModal: () => void;
  closeModal: () => void;
  connectWithWallet: (walletId: 'leather' | 'xverse') => void;
  connectDemo: () => void;
  disconnect: () => void;
  network: typeof stacksNetwork;
}

export const StacksContext = createContext<StacksContextType>({
  isSignedIn: false,
  address: null,
  showModal: false,
  openModal: () => {},
  closeModal: () => {},
  connectWithWallet: () => {},
  connectDemo: () => {},
  disconnect: () => {},
  network: stacksNetwork,
});

export function AppStacksProvider({ children }: { children: ReactNode }) {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem('collab_escrow_address');
    if (saved) {
      setIsSignedIn(true);
      setAddress(saved);
    }
  }, []);

  const openModal = useCallback(() => setShowModal(true), []);
  const closeModal = useCallback(() => setShowModal(false), []);

  const saveAddress = (addr: string) => {
    setIsSignedIn(true);
    setAddress(addr);
    localStorage.setItem('collab_escrow_address', addr);
    setShowModal(false);
  };

  const connectWithWallet = useCallback(async (walletId: 'leather' | 'xverse') => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;

    try {
      // 1. LEATHER (Reverted to the exact working version)
      if (walletId === 'leather') {
        const provider = win.LeatherProvider ?? win.StacksProvider;
        if (!provider) {
          alert('Leather wallet not detected. Make sure the extension is enabled and reload the page.');
          return;
        }
        
        const resp = await provider.request('getAddresses');
        const stxAddr = resp?.result?.addresses?.find((a: any) => a.symbol === 'STX');
        if (stxAddr?.address) {
          saveAddress(stxAddr.address);
        } else {
          alert('Leather connected but no STX address found. Make sure testnet is enabled.');
        }
        return;
      }

      // 2. XVERSE
      if (walletId === 'xverse') {
        const { getAddress, AddressPurpose, BitcoinNetworkType } = await import('sats-connect');
        
        await getAddress({
          payload: {
            purposes: [AddressPurpose.Stacks],
            message: 'Connect to FlowVault Escrow',
            network: {
              type: BitcoinNetworkType.Signet,
            },
          },
          onFinish: (response) => {
            // Find the Stacks address from the response
            const stxAddress = response.addresses.find(a => a.purpose === AddressPurpose.Stacks);
            if (stxAddress?.address) {
              saveAddress(stxAddress.address);
            } else {
              alert('Xverse connected but no STX address found. Ensure testnet is enabled in Xverse.');
            }
          },
          onCancel: () => {
            console.log('Xverse connection canceled');
          }
        });
        return;
      }
    } catch (err: unknown) {
      const msg = (err as Error).message ?? '';
      if (!msg.includes('cancel') && !msg.includes('reject') && !msg.includes('denied')) {
        alert(`${walletId} error: ` + msg);
      }
    }
  }, []);

  const connectDemo = useCallback(() => {
    saveAddress('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG');
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem('collab_escrow_address');
    setIsSignedIn(false);
    setAddress(null);
  }, []);

  return (
    <StacksContext.Provider value={{
      isSignedIn, address, showModal, openModal, closeModal,
      connectWithWallet, connectDemo, disconnect, network: stacksNetwork,
    }}>
      {children}
    </StacksContext.Provider>
  );
}

export function useStacks() {
  const ctx = useContext(StacksContext);
  if (!ctx) throw new Error('useStacks must be used within a StacksProvider');
  return ctx;
}
