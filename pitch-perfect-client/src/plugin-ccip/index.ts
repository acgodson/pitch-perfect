import {
  Plugin,
  Provider,
  Action,
  IAgentRuntime,
  Memory,
  State,
  Content,
  HandlerCallback,
  EventType,
  MessagePayload,
  ModelType,
  logger,
} from "@elizaos/core";
import { ccipActions } from "./actions";
import { ccipTransactionProvider } from "./providers/transaction";
import { ccipStatusProvider } from "./providers/status";

/**
 * CCIP Plugin for ElizaOS
 * Handles cross-chain transaction preparation and status tracking for voice commands
 */
const ccipPlugin: Plugin = {
  name: "pitch-perfect-ccip",
  description:
    "Cross-chain interoperability plugin for Pitch Perfect - handles CCIP transaction preparation and tracking from voice commands",

  providers: [ccipTransactionProvider, ccipStatusProvider],

  actions: ccipActions,

  events: {},

  routes: [],

  init: async (config: any, runtime: IAgentRuntime) => {
    console.log("[CCIP Plugin] Initializing CCIP plugin...");

    // Register actions
    if (ccipActions) {
      for (const action of ccipActions) {
        runtime.registerAction(action);
        console.log(`[CCIP Plugin] Registered action: ${action.name}`);
      }
    }

    // Register providers
    if (ccipTransactionProvider) {
      runtime.registerProvider(ccipTransactionProvider);
      console.log("[CCIP Plugin] Registered CCIP transaction provider");
    }

    if (ccipStatusProvider) {
      runtime.registerProvider(ccipStatusProvider);
      console.log("[CCIP Plugin] Registered CCIP status provider");
    }

    console.log("[CCIP Plugin] CCIP plugin initialization complete");
  },
};

export default ccipPlugin;