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

export const voiceActions: Action[] = [
  processVoiceMessage,
  registerVoice,
  identifyVoice,
];
