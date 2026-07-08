import { FlowVault, tokenToMicro } from 'flowvault-sdk';
import { openContractCall } from '@stacks/connect';

// PostConditionMode values from @stacks/transactions (defined inline to avoid stub conflicts)
const PostConditionMode = { Allow: 1, Deny: 2 } as const;

export const USDCX_DECIMALS = 6;
export const STX_DECIMALS = 6;

export function toMicroUnits(amount: number): number {
  return amount * (10 ** USDCX_DECIMALS);
}

export function fromMicroUnits(microAmount: number): number {
  return microAmount / (10 ** USDCX_DECIMALS);
}

export interface VaultParams {
  amount: number;
  senderAddress: string;
  network: { isMainnet: () => boolean, networkId: string };
}

export interface SplitVaultParams extends VaultParams {
  splitAddress: string;
  splitAmount: number;
}

export function createVaultClient(senderAddress: string, isMainnet: boolean) {
  return new FlowVault({
    network: isMainnet ? 'mainnet' : 'testnet',
    senderAddress,
    contractCallExecutor: async (call) => {
      return new Promise((resolve, reject) => {
        openContractCall({
          contractAddress: call.contractAddress,
          contractName: call.contractName,
          functionName: call.functionName,
          functionArgs: call.functionArgs,
          network: isMainnet ? 'mainnet' : 'testnet' as any,
          postConditions: call.postConditions,
          postConditionMode: String(call.postConditionMode ?? 'allow').toLowerCase().includes("deny") 
            ? PostConditionMode.Deny
            : PostConditionMode.Allow,
          onFinish: (data) => {
            console.log('Transaction broadcast:', data.txId);
            resolve({ txid: data.txId });
          },
          onCancel: () => {
            console.log('User canceled transaction');
            reject(new Error('Transaction canceled by user'));
          },
        });
      });
    },
  });
}

/**
 * Deposits funds into the vault with no routing rules, holding the funds.
 */
export async function executeHoldVaultDeposit(
  params: VaultParams,
  onFinish: (txId: string) => void,
  onCancel: () => void
) {
  try {
    const vault = createVaultClient(params.senderAddress, params.network.isMainnet());

    // Deposit directly — Hold Vault is the default state, no need to clearRoutingRules first.
    // clearRoutingRules() was removed because it fired a second wallet popup that confused users.
    const microAmount = toMicroUnits(params.amount);
    const res = await vault.deposit(microAmount);

    if (res && (res as any).txid) {
      onFinish((res as any).txid);
    } else {
      // Some wallet adapters return txId on the top level
      onFinish('pending');
    }
  } catch (err) {
    const msg = (err as Error).message ?? '';
    if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('rejected')) {
      onCancel();
    } else {
      console.error('[FlowVault deposit error]', err);
      alert('Deposit failed: ' + msg);
    }
  }
}

/**
 * Deposits funds into the vault and immediately routes/splits them to a recipient.
 */
export async function executeSplitRelease(
  params: SplitVaultParams,
  onFinish: (txId: string) => void,
  onCancel: () => void
) {
  try {
    const vault = createVaultClient(params.senderAddress, params.network.isMainnet());
    
    // Set routing rules for the split
    await vault.setRoutingRules({
      lockAmount: 0,
      lockUntilBlock: 0,
      splitAddress: params.splitAddress,
      splitAmount: toMicroUnits(params.splitAmount)
    });
    
    // Deposit the funds to trigger the split
    const res = await vault.deposit(toMicroUnits(params.amount));
    
    if (res && (res as any).txid) {
      onFinish((res as any).txid);
    }
  } catch (err) {
    if ((err as Error).message.includes('canceled')) {
      onCancel();
    } else {
      console.error(err);
      alert('Split release failed: ' + (err as Error).message);
    }
  }
}

export function getExplorerUrl(txId: string): string {
  return `https://explorer.stacks.co/txid/${txId}?chain=testnet`;
}

export function percentToBasisPoints(pct: number): number {
  return Math.round(pct * 100);
}

