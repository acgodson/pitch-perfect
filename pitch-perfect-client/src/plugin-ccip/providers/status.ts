import { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";

/**
 * CCIP Status Provider
 * Provides transaction status tracking capabilities
 */
export const ccipStatusProvider: Provider = {
  name: "ccipStatus",
  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State
  ) => {
    console.log("[CCIP Status Provider] Getting status tracking capabilities...");

    const statusCapabilities = {
      messageIdTracking: true,
      txHashTracking: true,
      statusPolling: true,
      explorerLinks: true,
      supportedNetworks: [
        "ethereumSepolia",
        "avalancheFuji",
        "baseSepolia",
        "arbitrumSepolia",
        "optimismSepolia",
        "polygonAmoy",
        "bnbChainTestnet",
      ],
    };

    const statusText = `# CCIP Status Tracking Capabilities

- Message ID Tracking: ${statusCapabilities.messageIdTracking ? "Available" : "Unavailable"}
- Transaction Hash Tracking: ${statusCapabilities.txHashTracking ? "Available" : "Unavailable"}
- Status Polling: ${statusCapabilities.statusPolling ? "Available" : "Unavailable"}
- Explorer Links: ${statusCapabilities.explorerLinks ? "Available" : "Unavailable"}

## Supported Networks
${statusCapabilities.supportedNetworks.map(network => `- ${network}`).join('\n')}`;

    return {
      data: statusCapabilities,
      values: {
        messageIdTracking: statusCapabilities.messageIdTracking,
        txHashTracking: statusCapabilities.txHashTracking,
        statusPolling: statusCapabilities.statusPolling,
        explorerLinks: statusCapabilities.explorerLinks,
        supportedNetworks: statusCapabilities.supportedNetworks,
      },
      text: statusText,
    };
  },
};