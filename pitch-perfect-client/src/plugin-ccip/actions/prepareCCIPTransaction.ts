import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  ActionExample,
  ModelType,
} from "@elizaos/core";
import { 
  CCIPTransactionRequest, 
  CCIPTransactionPreview, 
  CCIPConversationContext,
  SupportedNetworks,
  PayFeesIn,
  NetworkConfig
} from "../types";
import { networkConfigs, networkAliases, commonTokens } from "../config";
import { getFees, parseAmount, isTokenSupported } from "../utils/ccipSdk";
import { Address } from "viem";

/**
 * Prepare CCIP Transaction Action
 * Handles voice commands to prepare cross-chain transactions
 */
export const prepareCCIPTransaction: Action = {
  name: "PREPARE_CCIP_TRANSACTION",
  similes: [
    "PREPARE_CROSS_CHAIN_TRANSFER",
    "SETUP_CCIP_PAYMENT", 
    "CREATE_CROSS_CHAIN_TRANSACTION",
    "PREPARE_CROSS_CHAIN_PAYMENT"
  ],
  description: "Prepare a cross-chain transaction using Chainlink CCIP from voice commands",
  
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const messageText = message.content.text?.toLowerCase() || "";
    
    // Check for cross-chain transaction keywords
    const ccipKeywords = [
      'send', 'transfer', 'pay', 'move',
      'cross-chain', 'cross chain', 'ccip',
      'ethereum', 'avalanche', 'base', 'arbitrum', 'optimism', 'polygon', 'bnb'
    ];
    
    const hasKeyword = ccipKeywords.some(keyword => messageText.includes(keyword));
    
    // Check if user has been identified (required for transactions)
    const isIdentified = !!(message.metadata as any)?.identifiedUser || !!(message.metadata as any)?.userId;
    
    console.log("[PREPARE_CCIP_TRANSACTION] Validation:", {
      hasKeyword,
      isIdentified,
      messageText: messageText.substring(0, 100)
    });
    
    return hasKeyword && isIdentified;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    console.log("[PREPARE_CCIP_TRANSACTION] Processing transaction preparation...");
    
    try {
      // Get conversation context
      const context = state?.providers?.ccipTransaction as CCIPConversationContext || {};
      const pendingTx = context.pendingTransaction;
      
      if (!pendingTx) {
        await callback?.({
          text: "I didn't detect a complete transaction request. Please specify the amount, token, recipient, and destination network. For example: 'Send 100 USDC to alice.eth on Base'",
          metadata: { source: "ccip_preparation", action: "incomplete_request" }
        });
        return false;
      }
      
      // Check for missing information and ask for clarification
      const missingInfo = getMissingTransactionInfo(pendingTx);
      if (missingInfo.length > 0) {
        const response = await askForMissingInfo(runtime, missingInfo, pendingTx);
        await callback?.({
          text: response,
          metadata: { 
            source: "ccip_preparation", 
            action: "request_missing_info",
            missingFields: missingInfo
          }
        });
        return true;
      }
      
      // Validate destination network
      if (!pendingTx.destinationNetwork || !networkConfigs[pendingTx.destinationNetwork]) {
        await callback?.({
          text: "I need to know which network to send to. Supported networks are: Ethereum, Avalanche, Base, Arbitrum, Optimism, Polygon, and BNB Chain. Which network would you like to use?",
          metadata: { source: "ccip_preparation", action: "request_network" }
        });
        return true;
      }
      
      // Prepare transaction preview
      const preview = await prepareTransactionPreview(pendingTx as CCIPTransactionRequest, context);
      
      // Generate response with transaction details
      const response = await generateTransactionResponse(runtime, preview, pendingTx as CCIPTransactionRequest);
      
      await callback?.({
        text: response,
        metadata: {
          source: "ccip_preparation",
          action: "transaction_prepared",
          transactionPreview: preview,
          requiresApproval: preview.requiresApproval
        }
      });
      
      return true;
      
    } catch (error) {
      console.error("[PREPARE_CCIP_TRANSACTION] Error:", error);
      
      await callback?.({
        text: "I encountered an error while preparing your cross-chain transaction. Please try again or contact support if the issue persists.",
        metadata: { source: "ccip_preparation", action: "error", error: error.message }
      });
      
      return false;
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Send 100 USDC to alice.eth on Base" }
      },
      {
        name: "{{user2}}",
        content: { 
          text: "I'll prepare a cross-chain transfer of 100 USDC to alice.eth on Base Sepolia. The estimated fee is 0.005 ETH. This transaction will require approval of USDC tokens before execution. Would you like me to proceed with this transaction?",
          action: "PREPARE_CCIP_TRANSACTION"
        }
      }
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "Transfer 50 CCIP-BnM to Bob on Avalanche" }
      },
      {
        name: "{{user2}}",
        content: {
          text: "I'll prepare a cross-chain transfer of 50 CCIP-BnM to Bob on Avalanche Fuji. The estimated fee is 2.5 LINK tokens. This transaction will require approval of CCIP-BnM tokens before execution. Would you like me to proceed?",
          action: "PREPARE_CCIP_TRANSACTION"
        }
      }
    ]
  ]
};

/**
 * Get missing transaction information
 */
function getMissingTransactionInfo(tx: Partial<CCIPTransactionRequest>): string[] {
  const missing: string[] = [];
  
  if (!tx.amount) missing.push("amount");
  if (!tx.token) missing.push("token");
  if (!tx.recipient) missing.push("recipient");
  if (!tx.destinationNetwork) missing.push("destination network");
  
  return missing;
}

/**
 * Ask for missing information using LLM
 */
async function askForMissingInfo(
  runtime: IAgentRuntime,
  missingInfo: string[],
  partialTx: Partial<CCIPTransactionRequest>
): Promise<string> {
  const prompt = `Generate a natural response asking for missing transaction information.

Missing information: ${missingInfo.join(", ")}
Current transaction details: ${JSON.stringify(partialTx, null, 2)}

Supported networks: Ethereum, Avalanche, Base, Arbitrum, Optimism, Polygon, BNB Chain
Supported tokens: USDC, CCIP-BnM, CCIP-LnM, LINK

Generate a helpful, conversational response asking for the missing information.`;

  return await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
}

/**
 * Prepare transaction preview with real fee estimation
 */
async function prepareTransactionPreview(
  tx: CCIPTransactionRequest,
  context: CCIPConversationContext
): Promise<CCIPTransactionPreview> {
  const destConfig = networkConfigs[tx.destinationNetwork];
  const sourceConfig = networkConfigs[context.preferredNetwork || SupportedNetworks.ETHEREUM_SEPOLIA];
  const tokenAddress = getTokenAddress(tx.token, context.preferredNetwork || SupportedNetworks.ETHEREUM_SEPOLIA);
  
  try {
    // Check if token is supported
    const supported = await isTokenSupported({
      sourceNetwork: context.preferredNetwork || SupportedNetworks.ETHEREUM_SEPOLIA,
      destinationNetwork: tx.destinationNetwork,
      tokenAddress: tokenAddress as Address
    });
    
    if (!supported) {
      console.warn("[PREPARE_CCIP_TRANSACTION] Token not supported on destination");
    }
    
    // Get real fee estimation using CCIP SDK
    const fees = await getFees({
      sourceNetwork: context.preferredNetwork || SupportedNetworks.ETHEREUM_SEPOLIA,
      destinationNetwork: tx.destinationNetwork,
      tokenAddress: tokenAddress as Address,
      amount: parseAmount(tx.amount, getTokenDecimals(tx.token)),
      destinationAccount: tx.recipient as Address
    });
    
    // Use native fee by default
    const estimatedFees = {
      amount: fees.nativeFee,
      token: getNativeTokenSymbol(context.preferredNetwork || SupportedNetworks.ETHEREUM_SEPOLIA)
    };
    
    return {
      from: context.userWalletAddress || "User Wallet",
      to: tx.recipient,
      amount: tx.amount,
      token: getTokenSymbol(tx.token),
      destinationNetwork: destConfig.description,
      estimatedFees: estimatedFees.amount,
      feeToken: estimatedFees.token,
      chainSelector: destConfig.chainSelector,
      routerAddress: destConfig.routerAddress,
      requiresApproval: true
    };
    
  } catch (error) {
    console.error("[PREPARE_CCIP_TRANSACTION] Fee estimation failed:", error);

    // TODO: throw actual error and not fallback
    
    // // Fallback to mock estimation
    // const estimatedFees = estimateTransactionFees(tx);
    
    // return {
    //   from: context.userWalletAddress || "User Wallet",
    //   to: tx.recipient,
    //   amount: tx.amount,
    //   token: getTokenSymbol(tx.token),
    //   destinationNetwork: destConfig.description,
    //   estimatedFees: estimatedFees.amount,
    //   feeToken: estimatedFees.token,
    //   chainSelector: destConfig.chainSelector,
    //   routerAddress: destConfig.routerAddress,
    //   requiresApproval: true
    // };
  }
}

/**
 * Generate transaction response using LLM
 */
async function generateTransactionResponse(
  runtime: IAgentRuntime,
  preview: CCIPTransactionPreview,
  request: CCIPTransactionRequest
): Promise<string> {
  const prompt = `Generate a natural response for a cross-chain transaction preparation.

Transaction Details:
- Amount: ${preview.amount} ${preview.token}
- Recipient: ${preview.to}
- Destination: ${preview.destinationNetwork}
- Estimated Fees: ${preview.estimatedFees} ${preview.feeToken}
- Requires Approval: ${preview.requiresApproval}

Generate a clear, helpful response explaining the transaction and asking for confirmation.
Be conversational and include key details like fees and approval requirements.`;

  return await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
}

/**
 * Get token address from config
 */
function getTokenAddress(tokenKey: string, network: SupportedNetworks): string {
  const config = networkConfigs[network];
  return config[tokenKey as keyof NetworkConfig] as string || config.usdcAddress || "";
}

/**
 * Get token symbol for display
 */
function getTokenSymbol(tokenKey: string): string {
  const symbolMap: { [key: string]: string } = {
    'usdcAddress': 'USDC',
    'ccipBnMAddress': 'CCIP-BnM',
    'ccipLnMAddress': 'CCIP-LnM',
    'linkTokenAddress': 'LINK'
  };
  
  return symbolMap[tokenKey] || 'USDC';
}

/**
 * Get token decimals
 */
function getTokenDecimals(tokenKey: string): number {
  const decimalMap: { [key: string]: number } = {
    'usdcAddress': 6,
    'ccipBnMAddress': 18,
    'ccipLnMAddress': 18,
    'linkTokenAddress': 18
  };
  
  return decimalMap[tokenKey] || 18;
}

/**
 * Get native token symbol for a network
 */
function getNativeTokenSymbol(network: SupportedNetworks): string {
  const symbolMap: { [key in SupportedNetworks]: string } = {
    [SupportedNetworks.ETHEREUM_SEPOLIA]: "ETH",
    [SupportedNetworks.AVALANCHE_FUJI]: "AVAX",
    [SupportedNetworks.BASE_SEPOLIA]: "ETH",
    [SupportedNetworks.ARBITRUM_SEPOLIA]: "ETH",
    [SupportedNetworks.OPTIMISM_SEPOLIA]: "ETH",
    [SupportedNetworks.POLYGON_AMOY]: "MATIC",
    [SupportedNetworks.BNB_CHAIN_TESTNET]: "BNB"
  };
  
  return symbolMap[network] || "ETH";
}

/**
 * Mock fee estimation (fallback when real estimation fails)
 */
function estimateTransactionFees(tx: CCIPTransactionRequest): { amount: string; token: string } {
  // Mock estimation based on destination network
  const baseFees: { [key in SupportedNetworks]: { amount: string; token: string } } = {
    [SupportedNetworks.ETHEREUM_SEPOLIA]: { amount: "0.005", token: "ETH" },
    [SupportedNetworks.AVALANCHE_FUJI]: { amount: "0.1", token: "AVAX" },
    [SupportedNetworks.BASE_SEPOLIA]: { amount: "0.002", token: "ETH" },
    [SupportedNetworks.ARBITRUM_SEPOLIA]: { amount: "0.003", token: "ETH" },
    [SupportedNetworks.OPTIMISM_SEPOLIA]: { amount: "0.003", token: "ETH" },
    [SupportedNetworks.POLYGON_AMOY]: { amount: "0.01", token: "MATIC" },
    [SupportedNetworks.BNB_CHAIN_TESTNET]: { amount: "0.001", token: "BNB" }
  };
  
  return baseFees[tx.destinationNetwork] || { amount: "0.005", token: "ETH" };
}