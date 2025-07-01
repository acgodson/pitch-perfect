import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { VoiceEmbeddingService } from "../providers/embedding";

export const linkWallet: Action = {
  name: "LINK_WALLET",
  description: "Links a wallet address to a user's voice profile.",
  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ): Promise<boolean> => {
    // This action is triggered directly by an API call, not by conversation.
    // Validation can be minimal or can check for a specific marker in metadata.
    return (message.metadata as any)?.action === "LINK_WALLET";
  },
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State,
    options?: { [key: string]: unknown },
    callback?: HandlerCallback
  ): Promise<unknown> => {
    const metadata = message.metadata as any;
    const { userId, walletAddress } = metadata;

    if (!userId || !walletAddress) {
      const errorMsg = "User ID and wallet address are required.";
      return callback?.({ text: errorMsg, error: true });
    }

    try {
      const memories = await runtime.getMemories({ tableName: "profiles" });
      const profileMemory = memories.find(
        (m) => (m.content as any)?.userId === userId
      );

      if (!profileMemory) {
        throw new Error(`Profile for user ${userId} not found.`);
      }

      // Update the content of the memory with the new wallet address
      await runtime.updateMemory({
        id: profileMemory.id,
        content: {
          ...profileMemory.content,
          walletAddress: walletAddress,
        },
      });

      const successMsg = `Successfully linked wallet ${walletAddress}.`;
      return callback?.({ text: successMsg });

    } catch (error) {
      const errorMsg = `Failed to link wallet: ${error.message}`;
      return callback?.({ text: errorMsg, error: true });
    }
  },
}; 