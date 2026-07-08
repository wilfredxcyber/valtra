import { openContractCall } from '@stacks/connect';
import { PostConditionMode, uintCV, principalCV } from '@stacks/transactions';

// Replace with the actual deployed contract address on testnet later
export const ESCROW_CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
export const ESCROW_CONTRACT_NAME = 'collab-escrow';

export interface ContractCallOptions {
  network: any;
  onFinish: (txId: string) => void;
  onCancel?: () => void;
}

export function createVaultOnChain(
  totalAmount: number,
  threshold: number,
  requiredConfirmations: number,
  options: ContractCallOptions
) {
  openContractCall({
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'create-vault',
    functionArgs: [
      uintCV(totalAmount),
      uintCV(threshold),
      uintCV(requiredConfirmations)
    ],
    network: options.network,
    postConditionMode: PostConditionMode.Allow,
    onFinish: (data) => options.onFinish(data.txId),
    onCancel: options.onCancel,
  });
}

export function addConfirmerOnChain(
  vaultId: number,
  confirmerPrincipal: string,
  options: ContractCallOptions
) {
  openContractCall({
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'add-confirmer',
    functionArgs: [
      uintCV(vaultId),
      principalCV(confirmerPrincipal)
    ],
    network: options.network,
    postConditionMode: PostConditionMode.Allow,
    onFinish: (data) => options.onFinish(data.txId),
    onCancel: options.onCancel,
  });
}

export function confirmReleaseOnChain(
  vaultId: number,
  flowvaultContractPrincipal: string,
  options: ContractCallOptions
) {
  openContractCall({
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'confirm-release',
    functionArgs: [
      uintCV(vaultId),
      principalCV(flowvaultContractPrincipal)
    ],
    network: options.network,
    postConditionMode: PostConditionMode.Allow,
    onFinish: (data) => options.onFinish(data.txId),
    onCancel: options.onCancel,
  });
}

export function initiateWindDownOnChain(
  vaultId: number,
  options: ContractCallOptions
) {
  openContractCall({
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'initiate-wind-down',
    functionArgs: [uintCV(vaultId)],
    network: options.network,
    postConditionMode: PostConditionMode.Allow,
    onFinish: (data) => options.onFinish(data.txId),
    onCancel: options.onCancel,
  });
}

export function disputeWindDownOnChain(
  vaultId: number,
  options: ContractCallOptions
) {
  openContractCall({
    contractAddress: ESCROW_CONTRACT_ADDRESS,
    contractName: ESCROW_CONTRACT_NAME,
    functionName: 'dispute-wind-down',
    functionArgs: [uintCV(vaultId)],
    network: options.network,
    postConditionMode: PostConditionMode.Allow,
    onFinish: (data) => options.onFinish(data.txId),
    onCancel: options.onCancel,
  });
}
