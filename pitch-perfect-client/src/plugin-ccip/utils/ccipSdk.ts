/**
 * CCIP SDK Integration Utilities
 * Real implementation using Chainlink CCIP JavaScript SDK
 */

import { createClient, TransferStatus } from "@chainlink/ccip-js";
import {
  createPublicClient,
  createWalletClient,
  http,
  custom,
  Address,
  Hash,
  PublicClient,
  Client,
} from "viem";
import {
  CCIPTransactionStatus,
  SupportedNetworks,
  CCIPTransactionRequest,
} from "../types";
import { networkConfigs } from "../config";
import {
  sepolia,
  avalancheFuji,
  baseSepolia,
  arbitrumSepolia,
  optimismSepolia,
  polygonAmoy,
  bscTestnet,
} from "viem/chains";

/**
 * Initialize CCIP Client using the real SDK
 */
export function createCCIPClient() {
  console.log("[CCIP SDK] Creating real CCIP client");
  return createClient();
}

/**
 * Real transfer tokens function using CCIP SDK
 */
export async function transferTokens(params: {
  walletClient: any; // WalletClient from viem
  routerAddress: Address;
  tokenAddress: Address;
  amount: bigint;
  destinationAccount: Address;
  destinationChainSelector: string;
  feeTokenAddress?: Address;
  data?: `0x${string}`;
}): Promise<{ txHash: Hash; messageId: Hash }> {
  console.log("[CCIP SDK] Executing real transfer tokens:", params);

  const ccipClient = createCCIPClient();

  try {
    const result = await ccipClient.transferTokens({
      client: params.walletClient,
      routerAddress: params.routerAddress,
      destinationChainSelector: params.destinationChainSelector,
      amount: params.amount,
      destinationAccount: params.destinationAccount,
      tokenAddress: params.tokenAddress,
      feeTokenAddress: params.feeTokenAddress,
      data: params.data,
    });

    console.log("[CCIP SDK] Transfer successful:", {
      txHash: result.txHash,
      messageId: result.messageId,
    });

    return {
      txHash: result.txHash,
      messageId: result.messageId,
    };
  } catch (error) {
    console.error("[CCIP SDK] Transfer failed:", error);
    throw error;
  }
}

/**
 * Real get transaction status function using CCIP SDK
 */
export async function getTransactionStatus(
  messageId: string,
  sourceNetwork: SupportedNetworks,
  destinationNetwork: SupportedNetworks
): Promise<CCIPTransactionStatus> {
  console.log("[CCIP SDK] Getting real transaction status:", {
    messageId,
    sourceNetwork,
    destinationNetwork,
  });

  const ccipClient = createCCIPClient();

  try {
    const destConfig = networkConfigs[destinationNetwork];

    // Map network to viem chain
    const chainMap: any = {
      "Ethereum Sepolia Testnet": sepolia,
      "Avalanche Fuji Testnet": avalancheFuji,
      "Base Sepolia Testnet": baseSepolia,
      "Arbitrum Sepolia Testnet": arbitrumSepolia,
      "Optimism Sepolia Testnet": optimismSepolia,
      "Polygon Amoy Testnet": polygonAmoy,
      "BNB Chain Testnet": bscTestnet,
    };
    const viemChain = chainMap[destConfig.description];
    const publicClient = createPublicClient({
      chain: viemChain,
      transport: http(destConfig.rpc),
    });

    const sourceConfig = networkConfigs[sourceNetwork];

    const result = await ccipClient.getTransferStatus({
      client: publicClient as Client,
      destinationRouterAddress: destConfig.routerAddress as Address,
      sourceChainSelector: sourceConfig.chainSelector,
      messageId: messageId as Hash,
    });

    // Convert SDK status to our format
    const status = convertTransferStatus(result);

    return {
      messageId,
      status,
      sourceChain: sourceNetwork,
      destinationChain: destinationNetwork,
      timestamp: Date.now(),
      explorerUrl: getCCIPExplorerUrl(messageId),
    };
  } catch (error) {
    console.error("[CCIP SDK] Status check failed:", error);

    return {
      messageId,
      status: "UNKNOWN",
      sourceChain: sourceNetwork,
      destinationChain: destinationNetwork,
      timestamp: Date.now(),
    };
  }
}

/**
 * Real get fees function using CCIP SDK
 */
export async function getFees(params: {
  sourceNetwork: SupportedNetworks;
  destinationNetwork: SupportedNetworks;
  tokenAddress: Address;
  amount: bigint;
  destinationAccount: Address;
  feeTokenAddress?: Address;
}): Promise<{ nativeFee: string; linkFee: string }> {
  console.log("[CCIP SDK] Getting real fees:", params);

  const ccipClient = createCCIPClient();

  try {
    const sourceConfig = networkConfigs[params.sourceNetwork];
    const destConfig = networkConfigs[params.destinationNetwork];

    // Map network to viem chain
    const chainMap: any = {
      "Ethereum Sepolia Testnet": sepolia,
      "Avalanche Fuji Testnet": avalancheFuji,
      "Base Sepolia Testnet": baseSepolia,
      "Arbitrum Sepolia Testnet": arbitrumSepolia,
      "Optimism Sepolia Testnet": optimismSepolia,
      "Polygon Amoy Testnet": polygonAmoy,
      "BNB Chain Testnet": bscTestnet,
    };
    const viemChain = chainMap[sourceConfig.description];
    const publicClient = createPublicClient({
      chain: viemChain,
      transport: http(sourceConfig.rpc),
    });

    // Get fee in native token (no feeTokenAddress)
    const nativeFee = await ccipClient.getFee({
      client: publicClient as Client,
      routerAddress: sourceConfig.routerAddress as Address,
      destinationAccount: params.destinationAccount,
      destinationChainSelector: destConfig.chainSelector,
      amount: params.amount,
      tokenAddress: params.tokenAddress,
      // feeTokenAddress not specified = native token
    });

    // Get fee in LINK token
    const linkFee = await ccipClient.getFee({
      client: publicClient as Client,
      routerAddress: sourceConfig.routerAddress as Address,
      destinationAccount: params.destinationAccount,
      destinationChainSelector: destConfig.chainSelector,
      amount: params.amount,
      tokenAddress: params.tokenAddress,
      feeTokenAddress: sourceConfig.linkTokenAddress as Address,
    });

    return {
      nativeFee: formatAmount(nativeFee),
      linkFee: formatAmount(linkFee),
    };
  } catch (error) {
    console.error("[CCIP SDK] Fee calculation failed:", error);

    // Return fallback fees
    return {
      nativeFee: "0.005",
      linkFee: "2.5",
    };
  }
}

/**
 * Real approve router function using CCIP SDK
 */
export async function approveRouter(params: {
  walletClient: any;
  routerAddress: Address;
  tokenAddress: Address;
  amount: bigint;
}): Promise<{ txHash: Hash }> {
  console.log("[CCIP SDK] Approving router:", params);

  const ccipClient = createCCIPClient();

  try {
    const result = await ccipClient.approveRouter({
      client: params.walletClient,
      routerAddress: params.routerAddress,
      tokenAddress: params.tokenAddress,
      amount: params.amount,
      waitForReceipt: true,
    });

    console.log("[CCIP SDK] Router approval successful:", result.txHash);

    return {
      txHash: result.txHash,
    };
  } catch (error) {
    console.error("[CCIP SDK] Router approval failed:", error);
    throw error;
  }
}

/**
 * Check token allowance using CCIP SDK
 */
export async function getAllowance(params: {
  sourceNetwork: SupportedNetworks;
  routerAddress: Address;
  tokenAddress: Address;
  account: Address;
}): Promise<bigint> {
  console.log("[CCIP SDK] Getting allowance:", params);

  const ccipClient = createCCIPClient();

  try {
    const sourceConfig = networkConfigs[params.sourceNetwork];

    // Map network to viem chain
    const chainMap: any = {
      "Ethereum Sepolia Testnet": sepolia,
      "Avalanche Fuji Testnet": avalancheFuji,
      "Base Sepolia Testnet": baseSepolia,
      "Arbitrum Sepolia Testnet": arbitrumSepolia,
      "Optimism Sepolia Testnet": optimismSepolia,
      "Polygon Amoy Testnet": polygonAmoy,
      "BNB Chain Testnet": bscTestnet,
    };
    const viemChain = chainMap[sourceConfig.description];
    const publicClient = createPublicClient({
      chain: viemChain,
      transport: http(sourceConfig.rpc),
    });

    const allowance = await ccipClient.getAllowance({
      client: publicClient as Client,
      routerAddress: params.routerAddress,
      tokenAddress: params.tokenAddress,
      account: params.account,
    });

    console.log("[CCIP SDK] Allowance:", allowance.toString());

    return allowance;
  } catch (error) {
    console.error("[CCIP SDK] Allowance check failed:", error);
    return 0n;
  }
}

/**
 * Check if token is supported on destination chain
 */
export async function isTokenSupported(params: {
  sourceNetwork: SupportedNetworks;
  destinationNetwork: SupportedNetworks;
  tokenAddress: Address;
}): Promise<boolean> {
  console.log("[CCIP SDK] Checking token support:", params);

  const ccipClient = createCCIPClient();

  try {
    const sourceConfig = networkConfigs[params.sourceNetwork];
    const destConfig = networkConfigs[params.destinationNetwork];

    // Map network to viem chain
    const chainMap: any = {
      "Ethereum Sepolia Testnet": sepolia,
      "Avalanche Fuji Testnet": avalancheFuji,
      "Base Sepolia Testnet": baseSepolia,
      "Arbitrum Sepolia Testnet": arbitrumSepolia,
      "Optimism Sepolia Testnet": optimismSepolia,
      "Polygon Amoy Testnet": polygonAmoy,
      "BNB Chain Testnet": bscTestnet,
    };
    const viemChain = chainMap[sourceConfig.description];
    const publicClient = createPublicClient({
      chain: viemChain,
      transport: http(sourceConfig.rpc),
    });

    const isSupported = await ccipClient.isTokenSupported({
      client: publicClient as Client,
      routerAddress: sourceConfig.routerAddress as Address,
      destinationChainSelector: destConfig.chainSelector,
      tokenAddress: params.tokenAddress,
    });

    console.log("[CCIP SDK] Token supported:", isSupported);

    return isSupported;
  } catch (error) {
    console.error("[CCIP SDK] Token support check failed:", error);
    return false;
  }
}

/**
 * Convert SDK TransferStatus to our format
 */
function convertTransferStatus(
  status: TransferStatus | null
): "SUCCESS" | "PENDING" | "FAILED" | "UNKNOWN" {
  if (!status) return "UNKNOWN";

  //@ts-ignore
  if ("state" in status) {
    switch (status.state) {
      case "SUCCESS":
        return "SUCCESS";
      case "PENDING":
        return "PENDING";
      case "FAILURE":
        return "FAILED";
      default:
        return "UNKNOWN";
    }
  }
  return "UNKNOWN";
}

/**
 * Format message ID for display
 */
export function formatMessageId(messageId: string): string {
  if (messageId.length <= 10) return messageId;
  return `${messageId.substring(0, 6)}...${messageId.substring(
    messageId.length - 4
  )}`;
}

/**
 * Get CCIP Explorer URL for message ID
 */
export function getCCIPExplorerUrl(messageId: string): string {
  return `https://ccip.chain.link/msg/${messageId}`;
}

/**
 * Validate message ID format
 */
export function isValidMessageId(messageId: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(messageId);
}

/**
 * Convert amount to appropriate units
 */
export function parseAmount(amount: string, decimals: number = 18): bigint {
  const parts = amount.split(".");
  const wholePart = parts[0] || "0";
  const fracPart = (parts[1] || "")
    .padEnd(decimals, "0")
    .substring(0, decimals);

  return BigInt(wholePart + fracPart);
}

/**
 * Format amount for display
 */
export function formatAmount(amount: bigint, decimals: number = 18): string {
  const amountStr = amount.toString().padStart(decimals + 1, "0");
  const wholePart = amountStr.substring(0, amountStr.length - decimals) || "0";
  const fracPart = amountStr.substring(amountStr.length - decimals);

  // Remove trailing zeros from fractional part
  const trimmedFracPart = fracPart.replace(/0+$/, "");

  return trimmedFracPart ? `${wholePart}.${trimmedFracPart}` : wholePart;
}

/**
 * Create wallet client for transaction execution
 */
export function createWalletClientForChain(
  network: SupportedNetworks,
  provider: any
) {
  const config = networkConfigs[network];

  return createWalletClient({
    transport: custom(provider),
  });
}

/**
 * Create public client for reading blockchain data
 */
export function createPublicClientForChain(network: SupportedNetworks) {
  const config = networkConfigs[network];
  // You may need to map config.description to a viem chain if needed
  return createPublicClient({
    // chain: ...,
    transport: http(config.rpc),
  });
}
