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
  Route,
  Component,
} from "@elizaos/core";
import { voiceEmbeddingProvider } from "./providers/embedding";
import { conversationContextProvider } from "./providers/conversation";
import { voiceActions } from "./actions";
import { v4 as uuidv4 } from "uuid";

/**
 * Voice message handler template
 */
const voiceMessageHandlerTemplate = `You are a voice assistant plugin for ElizaOS. Your role is to handle voice-related messages and trigger appropriate actions.

## Available Providers
{{providers}}

## Current Message
Text: {{messageText}}
Metadata: {{messageMetadata}}

## Instructions
1. **SIMPLE RULE**: If the message contains audio data (metadata.audioData or metadata.raw.audioData) and is NOT a registration request, this is ALWAYS a voice identification request
2. If this is a voice registration request (metadata contains registrationData), call the REGISTER_VOICE action
3. If this is a voice identification request (has audio data), call the IDENTIFY_VOICE action
4. If this is a general message without audio data, call the PROCESS_VOICE_MESSAGE action

## Response Format
Respond with the action name only.

For voice identification: "IDENTIFY_VOICE"
For voice registration: "REGISTER_VOICE" 
For general messages: "PROCESS_VOICE_MESSAGE"`;

/**
 * Extract response components from LLM response
 */
function extractResponseComponents(text: string): {
  thought?: string;
  text?: string;
  actions?: string[];
} {
  // Extract actions from the response text - now expects just the action name
  const actions: string[] = [];
  const cleanText = text.trim().toUpperCase();

  if (cleanText.includes("REGISTER_VOICE")) {
    actions.push("REGISTER_VOICE");
  }
  if (cleanText.includes("IDENTIFY_VOICE")) {
    actions.push("IDENTIFY_VOICE");
  }
  if (cleanText.includes("PROCESS_VOICE_MESSAGE")) {
    actions.push("PROCESS_VOICE_MESSAGE");
  }

  return {
    text: text,
    actions: actions.length > 0 ? actions : undefined,
  };
}

/**
 * Message handler for voice-related messages
 */
const messageReceivedHandler = async ({
  runtime,
  message,
  callback,
}: {
  runtime: IAgentRuntime;
  message: Memory;
  callback: HandlerCallback;
}): Promise<void> => {
  console.log("[Voice Plugin] ===== MESSAGE HANDLING START =====");
  console.log("[Voice Plugin] Message received:", {
    text: message.content.text,
    source: (message.metadata as any)?.source,
    channelId: (message.metadata as any)?.channelId,
  });

  // Save the incoming message
  await Promise.all([
    runtime.addEmbeddingToMemory(message),
    runtime.createMemory(message, "messages"),
  ]);

  // Compose state using our providers (use original message like Node.js test)
  const state = await runtime.composeState(
    message,
    null, // include all providers
    null // no private/dynamic providers
  );

  // Create prompt from state (sanitize to remove base64 audio data)
  const prompt = composePromptFromState({
    state,
    template: voiceMessageHandlerTemplate,
    message,
  });

  console.log("[Voice Plugin] Prompt created, length:", prompt.length);
  console.log(
    "[Voice Plugin] Message metadata keys:",
    Object.keys(message.metadata || {})
  );
  console.log(
    "[Voice Plugin] Message metadata for logging:",
    JSON.stringify(message.metadata, null, 2).substring(0, 500) + "..."
  );

  try {
    if (message.entityId === runtime.agentId) {
      console.log("[Voice Plugin] Message is from the agent itself, skipping");
      return;
    }

    console.log("[Voice Plugin] Generated prompt:", prompt);

    // Debug: Check available actions and their validation
    console.log(
      "[Voice Plugin] Available actions:",
      runtime.actions.map((a) => a.name)
    );

    for (const action of runtime.actions) {
      if (
        action.name === "IDENTIFY_VOICE" ||
        action.name === "PROCESS_VOICE_MESSAGE"
      ) {
        try {
          const isValid = await action.validate?.(runtime, message, state);
          console.log(
            `[Voice Plugin] Action ${action.name} validation:`,
            isValid
          );
        } catch (error) {
          console.error(
            `[Voice Plugin] Error validating ${action.name}:`,
            error
          );
        }
      }
    }

    // Use the LLM to generate response
    const response = await runtime.useModel(ModelType.TEXT_SMALL, {
      prompt,
    });

    console.log("[Voice Plugin] LLM response:", response);

    // Extract response components
    const { thought, text, actions } = extractResponseComponents(response);

    // Execute actions if specified
    if (actions && actions.length > 0) {
      console.log("[Voice Plugin] Executing actions:", actions);

      let actionExecuted = false;
      let identificationResult = null;

      for (const actionName of actions) {
        const action = runtime.actions.find((a) => a.name === actionName);
        if (action) {
          console.log(`[Voice Plugin] Executing action: ${actionName}`);
          try {
            const result = await action.handler(
              runtime,
              message,
              undefined, // state
              {}, // options
              callback
            );

            // Store identification result for transcript processing
            if (actionName === "IDENTIFY_VOICE" && result) {
              identificationResult = result;
            }

            actionExecuted = true;
          } catch (error) {
            console.error(
              `[Voice Plugin] Error executing action ${actionName}:`,
              error
            );
          }
        } else {
          console.warn(`[Voice Plugin] Action not found: ${actionName}`);
        }
      }

      // If voice identification was successful, process the transcript as a command
      if (
        actionExecuted &&
        identificationResult &&
        identificationResult.success &&
        identificationResult.identified
      ) {
        console.log(
          "[Voice Plugin] Voice identification successful, processing transcript as command"
        );

        // Get the transcript from the original message
        const metadata = message.metadata as any;
        const transcript =
          metadata?.transcript ||
          metadata?.raw?.transcript ||
          message.content.text;

        if (transcript && transcript !== "Voice message") {
          console.log("[Voice Plugin] Processing transcript:", transcript);

          // Create a new message with the transcript content
          const transcriptMessage: Memory = {
            ...message,
            content: {
              ...message.content,
              text: transcript,
            },
            metadata: {
              ...message.metadata,
              source: "transcript_command",
              originalMessageId: message.id,
              identifiedUser: identificationResult.user?.userName,
              userId: identificationResult.user?.userId,
            },
          };

          // Process the transcript as a regular command
          try {
            const transcriptResponse = await runtime.useModel(
              ModelType.TEXT_SMALL,
              {
                prompt: `You are Beca, a helpful voice assistant. The user has been identified as ${identificationResult.user?.userName}. They said: "${transcript}"

Please respond naturally and helpfully to their request. If they said a startup phrase like "Beca, listen up" or similar, ask how you can help them today. Otherwise, try to fulfill their request.

Respond in a conversational, helpful tone.`,
              }
            );

            // Send the transcript response
            await callback({
              text: transcriptResponse,
              thought: `Processed transcript command from ${identificationResult.user?.userName}: ${transcript}`,
              metadata: {
                source: "transcript_response",
                identifiedUser: identificationResult.user?.userName,
                originalTranscript: transcript,
              },
            });

            return; // Don't send the plugin's own response
          } catch (error) {
            console.error("[Voice Plugin] Error processing transcript:", error);
          }
        }
      }

      // If an action was executed successfully, don't send the plugin's own response
      // The action's response (with metadata) should be sent instead
      if (actionExecuted) {
        console.log(
          "[Voice Plugin] Action executed successfully, skipping plugin response"
        );
        return;
      }
    }

    // Send response
    await callback({
      text:
        text ||
        "I received your message. How can I help you with voice commands?",
      thought: thought || "Processing message through voice plugin",
      actions: actions || [],
    });
  } catch (error) {
    console.error("[Voice Plugin] Error in message handler:", error);

    // Send error response
    await callback({
      text: "Sorry, I had trouble processing your message. Please try again.",
      thought: `Error in voice message handler: ${error.message}`,
    });
  }

  console.log("[Voice Plugin] ===== MESSAGE HANDLING COMPLETE =====");
};

/**
 * Compose prompt from state (simplified version)
 */
function composePromptFromState({
  state,
  template,
  message,
}: {
  state: State;
  template: string;
  message: Memory;
}): string {
  // Replace providers placeholder with actual provider data (no sanitization like Node.js test)
  const providersText = Object.entries(state.providers || {})
    .map(([name, data]) => `## ${name}\n${JSON.stringify(data, null, 2)}`)
    .join("\n\n");

  // Get message text and metadata (sanitize to remove base64 audio data)
  const messageText = message.content.text || "";
  const sanitizedMetadata = sanitizeMetadataForPrompt(message.metadata);
  const messageMetadata = JSON.stringify(sanitizedMetadata, null, 2);

  return template
    .replace("{{providers}}", providersText)
    .replace("{{messageText}}", messageText)
    .replace("{{messageMetadata}}", messageMetadata);
}

/**
 * Sanitize metadata to remove base64 audio data from prompt
 */
function sanitizeMetadataForPrompt(metadata: any): any {
  if (!metadata || typeof metadata !== "object") {
    return metadata;
  }

  const copy = Array.isArray(metadata) ? [...metadata] : { ...metadata };

  // Handle registrationData.audioFiles
  if (
    copy.registrationData &&
    Array.isArray(copy.registrationData.audioFiles)
  ) {
    copy.registrationData = {
      ...copy.registrationData,
      audioFiles: copy.registrationData.audioFiles.map(
        (_, i) => `[base64 audio file ${i + 1}]`
      ),
    };
  }

  // Handle audioData field
  if (copy.audioData) {
    copy.audioData = "[base64 audio data]";
  }

  // Handle any audioFiles arrays anywhere in the object
  if (Array.isArray(copy.audioFiles)) {
    copy.audioFiles = copy.audioFiles.map(
      (_, i) => `[base64 audio file ${i + 1}]`
    );
  }

  // Recursively sanitize nested objects
  for (const key of Object.keys(copy)) {
    if (typeof copy[key] === "object" && copy[key] !== null) {
      copy[key] = sanitizeMetadataForPrompt(copy[key]);
    }
  }

  return copy;
}

/**
 * Voice Plugin for ElizaOS
 * Provides voice recognition, embedding extraction, voice registry management, and conversation context
 */
const voicePlugin: Plugin = {
  name: "voice-plugin",
  description: "A voice plugin for handling voice interactions in ElizaOS.",
  providers: [voiceEmbeddingProvider, conversationContextProvider],
  actions: voiceActions,
  events: {
    [EventType.MESSAGE_RECEIVED]: [
      async (payload: MessagePayload) => {
        await messageReceivedHandler({
          runtime: payload.runtime,
          message: payload.message,
          callback: payload.callback,
        });
      },
    ],
  },

  routes: [],

  init: async (config: any, runtime: IAgentRuntime) => {
    console.log("[Voice Plugin] Initializing voice plugin...");

    // Register actions
    if (voiceActions) {
      for (const action of voiceActions) {
        runtime.registerAction(action);
        console.log(`[Voice Plugin] Registered action: ${action.name}`);
      }
    }

    // Register providers
    if (voiceEmbeddingProvider) {
      runtime.registerProvider(voiceEmbeddingProvider);
      console.log("[Voice Plugin] Registered voice embedding provider");
    }

    if (conversationContextProvider) {
      runtime.registerProvider(conversationContextProvider);
      console.log("[Voice Plugin] Registered conversation context provider");
    }

    console.log("[Voice Plugin] Voice plugin initialization complete");
  },
};

export default voicePlugin;
