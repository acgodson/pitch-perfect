import { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import {
  CCIPConversationContext,
  CCIPTransactionRequest,
  SupportedNetworks,
} from "../types";
import { networkAliases } from "../config";

/**
 * CCIP Transaction Provider
 * Manages conversation context for cross-chain transactions
 */
export const ccipTransactionProvider: Provider = {
  name: "ccipTransaction",

  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State
  ) => {
    console.log("[CCIP Transaction Provider] Getting transaction context...");

    // Get conversation context from state or initialize
    const existingContext =
      (state?.providers?.ccipTransaction as CCIPConversationContext) || {};

    // Extract user wallet address from identified user
    const userWalletAddress =
      (message.metadata as any)?.userId || existingContext.userWalletAddress;

    // Analyze message text for transaction intent
    const messageText = message.content.text?.toLowerCase() || "";
    const transactionIntent = parseTransactionIntent(messageText);

    // Build context
    const context: CCIPConversationContext = {
      ...existingContext,
      userWalletAddress,
      pendingTransaction:
        transactionIntent || existingContext.pendingTransaction,
    };

    console.log("[CCIP Transaction Provider] Context:", {
      hasPendingTransaction: !!context.pendingTransaction,
      userWalletAddress: context.userWalletAddress,
      preferredNetwork: context.preferredNetwork,
    });

    // Format context as text for the agent
    const contextText = `# CCIP Transaction Context

${context.userWalletAddress ? `**User Wallet:** ${context.userWalletAddress}` : "**User Wallet:** Not identified"}

${context.pendingTransaction ? `**Pending Transaction:** ${JSON.stringify(context.pendingTransaction, null, 2)}` : "**Pending Transaction:** None"}

${context.preferredNetwork ? `**Preferred Network:** ${context.preferredNetwork}` : "**Preferred Network:** Not set"}

${context.recentTransactions && context.recentTransactions.length > 0 ? `**Recent Transactions:** ${context.recentTransactions.length} transactions` : "**Recent Transactions:** None"}`;

    return {
      data: context,
      values: {
        userWalletAddress: context.userWalletAddress,
        hasPendingTransaction: !!context.pendingTransaction,
        pendingTransaction: context.pendingTransaction,
        preferredNetwork: context.preferredNetwork,
        recentTransactionsCount: context.recentTransactions?.length || 0,
      },
      text: contextText,
    };
  },
};

/**
 * Parse transaction intent from natural language
 */
function parseTransactionIntent(
  text: string
): Partial<CCIPTransactionRequest> | null {
  const intent: Partial<CCIPTransactionRequest> = {};
  let hasIntent = false;

  // Check for send/transfer keywords
  const sendKeywords = ["send", "transfer", "pay", "move"];
  const hasSendIntent = sendKeywords.some((keyword) =>
    text.includes(keyword)
  );

  if (!hasSendIntent) return null;

  // Extract amount and token
  const amountMatch = text.match(
    /(\d+(?:\.\d+)?)\s*(usdc|ccip-bnm|ccip-lnm|link|eth|avax|matic)/i
  );
  if (amountMatch) {
    intent.amount = amountMatch[1];
    intent.token = parseTokenSymbol(amountMatch[2]);
    hasIntent = true;
  }

  // Extract recipient
  const recipientPatterns = [
    /to\s+([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z]+)*)/i, // "to alice.eth" or "to alice"
    /to\s+(0x[a-fA-F0-9]{40})/i, // "to 0x..."
    /(alice|bob|charlie|david|eve)(?:\.[a-zA-Z]+)?/i, // Common names
  ];

  for (const pattern of recipientPatterns) {
    const match = text.match(pattern);
    if (match) {
      intent.recipient = match[1];
      hasIntent = true;
      break;
    }
  }

  // Extract destination network
  const networkPatterns = [
    /(?:on|to)\s+(ethereum|eth|avalanche|avax|base|arbitrum|arb|optimism|op|polygon|matic|bnb|bsc)/i,
    /(ethereum|eth|avalanche|avax|base|arbitrum|arb|optimism|op|polygon|matic|bnb|bsc)(?:\s+network)?/i,
  ];

  for (const pattern of networkPatterns) {
    const match = text.match(pattern);
    if (match) {
      const networkAlias = match[1].toLowerCase();
      intent.destinationNetwork = networkAliases[networkAlias];
      hasIntent = true;
      break;
    }
  }

  return hasIntent ? intent : null;
}

/**
 * Parse token symbol and return contract address key
 */
function parseTokenSymbol(symbol: string): string {
  const normalizedSymbol = symbol.toLowerCase();

  switch (normalizedSymbol) {
    case "usdc":
      return "usdcAddress";
    case "ccip-bnm":
    case "ccipbnm":
      return "ccipBnMAddress";
    case "ccip-lnm":
    case "cciplnm":
      return "ccipLnMAddress";
    case "link":
      return "linkTokenAddress";
    default:
      return "usdcAddress"; // Default to USDC
  }
}