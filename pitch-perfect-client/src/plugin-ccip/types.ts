export enum SupportedNetworks {
  ETHEREUM_SEPOLIA = "ethereumSepolia",
  AVALANCHE_FUJI = "avalancheFuji",
  BASE_SEPOLIA = "baseSepolia",
  ARBITRUM_SEPOLIA = "arbitrumSepolia",
  OPTIMISM_SEPOLIA = "optimismSepolia", 
  POLYGON_AMOY = "polygonAmoy",
  BNB_CHAIN_TESTNET = "bnbChainTestnet"
}

export interface NetworkConfig {
  description: string;
  chainSelector: string;
  rpc?: string;
  routerAddress: string;
  linkTokenAddress: string;
  wrappedNativeAddress?: string;
  ccipBnMAddress: string;
  ccipLnMAddress?: string;
  usdcAddress?: string;
}

export enum PayFeesIn {
  Native = 0,
  LINK = 1
}

export enum DestinationType {
  CCIP_EVM = 0,
  CCIP_TELEPORTER = 1,
  CCIP_SVM = 2
}

export interface CCIPTransactionRequest {
  recipient: string;
  token: string;
  amount: string;
  destinationNetwork: SupportedNetworks;
  payFeesIn: PayFeesIn;
  destinationType?: DestinationType;
  avalancheReceiver?: string; // For Teleporter routing
}

export interface CCIPTransactionPreview {
  from: string;
  to: string;
  amount: string;
  token: string;
  destinationNetwork: string;
  estimatedFees: string;
  feeToken: string;
  chainSelector: string;
  routerAddress: string;
  requiresApproval: boolean;
}

export interface CCIPTransactionStatus {
  messageId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'UNKNOWN';
  sourceChain: string;
  destinationChain: string;
  timestamp?: number;
  explorerUrl?: string;
}

export interface CCIPConversationContext {
  pendingTransaction?: Partial<CCIPTransactionRequest>;
  lastTransactionId?: string;
  userWalletAddress?: string;
  preferredNetwork?: SupportedNetworks;
  recentTransactions?: CCIPTransactionStatus[];
}