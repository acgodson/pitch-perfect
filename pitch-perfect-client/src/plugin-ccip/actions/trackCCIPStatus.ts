import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  ModelType,
} from "@elizaos/core";
import { CCIPTransactionStatus, SupportedNetworks } from "../types";
import { getTransactionStatus, isValidMessageId } from "../utils/ccipSdk";

/**
 * Track CCIP Status Action
 * Handles voice commands to check cross-chain transaction status
 */
export const trackCCIPStatus: Action = {
  name: "TRACK_CCIP_STATUS",
  similes: [
    "CHECK_CCIP_STATUS",
    "GET_TRANSACTION_STATUS",
    "CHECK_CROSS_CHAIN_STATUS",
    "TRACK_TRANSACTION"
  ],
  description: "Track the status of a cross-chain CCIP transaction using message ID",
  
  validate: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const messageText = message.content.text?.toLowerCase() || "";
    
    // Check for status tracking keywords
    const statusKeywords = [
      'status', 'track', 'check', 'monitor',
      'message id', 'transaction', 'transfer',
      'completed', 'pending', 'failed'
    ];
    
    const hasKeyword = statusKeywords.some(keyword => messageText.includes(keyword));
    
    // Check for message ID pattern (0x followed by hex)
    const hasMessageId = /0x[a-fA-F0-9]{64}/.test(messageText);
    
    // Check if asking about recent transaction
    const isRecentQuery = messageText.includes('recent') || 
                         messageText.includes('last') || 
                         messageText.includes('latest');
    
    console.log("[TRACK_CCIP_STATUS] Validation:", {
      hasKeyword,
      hasMessageId,
      isRecentQuery,
      messageText: messageText.substring(0, 100)
    });
    
    return hasKeyword && (hasMessageId || isRecentQuery);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: any,
    callback?: HandlerCallback
  ): Promise<boolean> => {
    console.log("[TRACK_CCIP_STATUS] Processing status tracking...");
    
    try {
      const messageText = message.content.text || "";
      
      // Extract message ID if present
      const messageIdMatch = messageText.match(/0x[a-fA-F0-9]{64}/);
      const messageId = messageIdMatch?.[0];
      
      if (messageId) {
        // Track specific message ID
        const status = await getCCIPTransactionStatus(messageId);
        const response = await generateStatusResponse(runtime, status);
        
        await callback?.({
          text: response,
          metadata: {
            source: "ccip_status",
            action: "status_check",
            messageId,
            status: status.status
          }
        });
        
      } else {
        // Check recent transactions
        const recentTransactions = await getRecentTransactions(runtime, message);
        
        if (recentTransactions.length === 0) {
          await callback?.({
            text: "I don't see any recent cross-chain transactions to track. When you send a transaction, I'll provide you with a message ID that you can use to track its status.",
            metadata: { source: "ccip_status", action: "no_recent_transactions" }
          });
        } else {
          const response = await generateRecentTransactionsResponse(runtime, recentTransactions);
          
          await callback?.({
            text: response,
            metadata: {
              source: "ccip_status",
              action: "recent_transactions",
              transactionCount: recentTransactions.length
            }
          });
        }
      }
      
      return true;
      
    } catch (error) {
      console.error("[TRACK_CCIP_STATUS] Error:", error);
      
      await callback?.({
        text: "I encountered an error while checking the transaction status. Please make sure you provided a valid message ID or try again later.",
        metadata: { source: "ccip_status", action: "error", error: error.message }
      });
      
      return false;
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "Check status of transaction 0x25d18c6adfc1f99514b40f9931a14ca08228cdbabfc5226c1e6a43ce7441595d" }
      },
      {
        name: "{{user2}}",
        content: { 
          text: "Your transaction 0x25d18c6...441595d has been successfully completed! ✅ The tokens were transferred from Avalanche Fuji to Ethereum Sepolia. You can view the details on the CCIP Explorer.",
          action: "TRACK_CCIP_STATUS"
        }
      }
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "What's the status of my recent transactions?" }
      },
      {
        name: "{{user2}}",
        content: {
          text: "Here are your recent cross-chain transactions:\n\n1. 100 USDC to alice.eth on Base - ✅ Completed\n2. 50 CCIP-BnM to bob.eth on Avalanche - 🟡 Pending\n\nThe pending transaction should complete within the next few minutes.",
          action: "TRACK_CCIP_STATUS"
        }
      }
    ]
  ]
};

/**
 * Get CCIP transaction status using real SDK
 */
async function getCCIPTransactionStatus(messageId: string): Promise<CCIPTransactionStatus> {
  console.log(`[TRACK_CCIP_STATUS] Checking status for message ID: ${messageId}`);
  
  if (!isValidMessageId(messageId)) {
    throw new Error("Invalid message ID format");
  }
  
  // For demo purposes, we'll check Avalanche Fuji -> Ethereum Sepolia
  // In production, you'd need to track the actual source/destination from transaction history
  try {
    const status = await getTransactionStatus(
      messageId,
      SupportedNetworks.AVALANCHE_FUJI,
      SupportedNetworks.ETHEREUM_SEPOLIA
    );
    
    return status;
  } catch (error) {
    console.error("[TRACK_CCIP_STATUS] Real status check failed:", error);
    
    // Fallback to basic status
    // return {
    //   messageId,
    //   status: 'UNKNOWN',
    //   sourceChain: "avalancheFuji",
    //   destinationChain: "ethereumSepolia",
    //   timestamp: Date.now(),
    //   explorerUrl: `https://ccip.chain.link/msg/${messageId}`
    // };
  }
}

/**
 * Get recent transactions for the user
 */
async function getRecentTransactions(runtime: IAgentRuntime, message: Memory): Promise<CCIPTransactionStatus[]> {
  // In production, query from conversation history or user's transaction database
  const userId = (message.metadata as any)?.userId || (message.metadata as any)?.identifiedUser;
  
  if (!userId) {
    return [];
  }
}

/**
 * Generate status response using LLM
 */
async function generateStatusResponse(runtime: IAgentRuntime, status: CCIPTransactionStatus): Promise<string> {
  const statusEmoji = {
    'SUCCESS': '✅',
    'PENDING': '🟡', 
    'FAILED': '❌',
    'UNKNOWN': '❓'
  };
  
  const prompt = `Generate a natural response for a CCIP transaction status check.

Transaction Status:
- Message ID: ${status.messageId}
- Status: ${status.status} ${statusEmoji[status.status]}
- Source Chain: ${status.sourceChain}
- Destination Chain: ${status.destinationChain}
- Explorer URL: ${status.explorerUrl}

Generate a clear, helpful response explaining the current status.
Include relevant emojis and mention the explorer link if the transaction is completed.`;

  return await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
}

/**
 * Generate recent transactions response using LLM
 */
async function generateRecentTransactionsResponse(
  runtime: IAgentRuntime, 
  transactions: CCIPTransactionStatus[]
): Promise<string> {
  const prompt = `Generate a natural response listing recent CCIP transactions.

Recent Transactions:
${transactions.map((tx, i) => `${i + 1}. Message ID: ${tx.messageId.substring(0, 10)}...
   Status: ${tx.status}
   Route: ${tx.sourceChain} → ${tx.destinationChain}
   Time: ${new Date(tx.timestamp || 0).toLocaleTimeString()}`).join('\n')}

Generate a conversational summary of these transactions with appropriate status emojis.
Keep it concise but informative.`;

  return await runtime.useModel(ModelType.TEXT_SMALL, { prompt });
}