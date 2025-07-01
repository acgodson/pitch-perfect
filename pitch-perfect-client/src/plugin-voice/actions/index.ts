import {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
  Content,
} from "@elizaos/core";
import { processVoiceMessage } from "./processVoiceMessage";
import { registerVoice } from "./registerVoice";
import { identifyVoice } from "./identifyVoice";
import { linkWallet } from "./linkWallet";

/**
 * All actions for the voice plugin
 */
export const voiceActions: Action[] = [
  processVoiceMessage,
  registerVoice,
  identifyVoice,
  linkWallet,
];
