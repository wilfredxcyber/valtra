'use client';

import { useState } from 'react';
import { executeHoldVaultDeposit, executeSplitRelease, getExplorerUrl } from '@/lib/flowvault';
import { useStacks } from '@/hooks/useStacks';

export default function TestVaultPage() {
  const { isSignedIn, address, network } = useStacks();
  const [status, setStatus] = useState<string>('');
  const [txId, setTxId] = useState<string>('');

  const [depositAmount, setDepositAmount] = useState('10');
  const [splitAddress, setSplitAddress] = useState('ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM');
  const [splitAmount, setSplitAmount] = useState('5');

  const handleDepositHold = async () => {
    if (!address) return alert('Please connect wallet first');
    setStatus('Depositing into Hold Vault...');
    setTxId('');
    
    await executeHoldVaultDeposit(
      {
        amount: Number(depositAmount),
        senderAddress: address,
        network
      },
      (id) => {
        setTxId(id);
        setStatus('Successfully deposited (HOLD)');
      },
      () => {
        setStatus('User cancelled deposit');
      }
    );
  };

  const handleSplitRelease = async () => {
    if (!address) return alert('Please connect wallet first');
    setStatus('Executing Split Release...');
    setTxId('');
    
    await executeSplitRelease(
      {
        amount: Number(depositAmount),
        senderAddress: address,
        network,
        splitAddress: splitAddress,
        splitAmount: Number(splitAmount)
      },
      (id) => {
        setTxId(id);
        setStatus('Successfully deposited and split');
      },
      () => {
        setStatus('User cancelled split release');
      }
    );
  };

  if (!isSignedIn) {
    return <div className="p-10">Please connect your wallet in the main app first.</div>;
  }

  return (
    <div className="p-10 max-w-2xl mx-auto space-y-8 bg-gray-950 text-white min-h-screen">
      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
        FlowVault SDK Test Harness
      </h1>
      
      <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Amount (USDCx)</label>
          <input 
            type="number" 
            value={depositAmount} 
            onChange={e => setDepositAmount(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Split Address</label>
          <input 
            type="text" 
            value={splitAddress} 
            onChange={e => setSplitAddress(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Split Amount (USDCx)</label>
          <input 
            type="number" 
            value={splitAmount} 
            onChange={e => setSplitAmount(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-white"
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button 
            onClick={handleDepositHold}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded font-medium transition-colors"
          >
            Test Hold Deposit
          </button>
          
          <button 
            onClick={handleSplitRelease}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded font-medium transition-colors"
          >
            Test Split Deposit
          </button>
        </div>
      </div>

      {(status || txId) && (
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 shadow-xl">
          <h2 className="text-xl font-semibold mb-2">Result</h2>
          <p className="text-gray-300">{status}</p>
          {txId && (
            <a 
              href={getExplorerUrl(txId)} 
              target="_blank" 
              rel="noreferrer"
              className="text-blue-400 hover:text-blue-300 mt-2 block break-all"
            >
              View on Explorer: {txId}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
