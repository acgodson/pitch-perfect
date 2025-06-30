import { useState, useCallback, useRef, useEffect } from "react";
import {
  voiceSessionManager,
  type VoiceSession,
} from "@/lib/voice-session-manager";
import SocketIOManager from "@/lib/socketio-manager";
import { VoiceSyncManager } from "../lib/voice-sync-manager";
import { VoiceProfile } from "../lib/voice-api-client";

interface ProfileData {
  name: string;
  emoji: string;
  isAdult: boolean;
}

interface VoiceRegistrationState {
  currentStep: number;
  isRecording: boolean;
  recordings: Blob[];
  isLoading: boolean;
  error: string | null;
  currentPhrase: string;
  progress: number;
  isReadyToComplete: boolean;
  agentResponse: string | null;
}

interface UseProfileReturn {
  // Voice registration state
  registrationState: VoiceRegistrationState;

  // Voice session state
  currentSession: VoiceSession | null;
  isSessionLoading: boolean;
  sessionError: string | null;

  // Latest response from ElizaOS
  latestResponse: string | null;
  isProcessing: boolean;

  // Voice registration methods
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
  handleNextPhrase: () => void;
  handleCompleteRegistration: (
    profileData: ProfileData,
    onComplete?: (userId: string) => void,
  ) => Promise<void>;

  // Voice session methods
  createVoiceSession: () => Promise<VoiceSession | null>;
  sendVoiceMessage: (audioBlob: Blob) => Promise<void>;

  // Response handling
  clearResponse: () => void;
  setLatestResponse: (response: string | null) => void;
}

const REQUIRED_PHRASES = 2;
const ENROLLMENT_PHRASES = [
  "The quick brown fox jumps over the lazy dog",
  "Hello world, this is a test phrase",
];

export const useProfile = (): UseProfileReturn => {
  const [registrationState, setRegistrationState] =
    useState<VoiceRegistrationState>({
      currentStep: 0,
      isRecording: false,
      recordings: [],
      isLoading: false,
      error: null,
      currentPhrase: ENROLLMENT_PHRASES[0],
      progress: 0,
      isReadyToComplete: false,
      agentResponse: null,
    });

  const [currentSession, setCurrentSession] = useState<VoiceSession | null>(
    null,
  );
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [latestResponse, setLatestResponse] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Store mediaRecorder reference
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Add ref to track current channel ID to avoid race conditions
  const currentChannelIdRef = useRef<string | null>(null);

  const socketIOManager = SocketIOManager.getInstance();

  // Store original profile data for registration
  const [originalProfileData, setOriginalProfileData] = useState<ProfileData | null>(null);

  // Set up persistent registration response listener
  useEffect(() => {
    console.log(
      "🔧 Setting up registration response listener for channel:",
      currentSession?.channelId,
    );
    console.log("🔧 Current session state:", currentSession);

    // Update the ref when session changes
    if (currentSession?.channelId) {
      currentChannelIdRef.current = currentSession.channelId;
      console.log("🔧 Updated currentChannelIdRef to:", currentChannelIdRef.current);
    }

    // Test listener to see ALL messageBroadcast events
    const testListener = (data: any) => {
      console.log("🧪 TEST: Received ANY messageBroadcast event:", {
        senderName: data.senderName,
        text: data.text,
        roomId: data.roomId,
        channelId: data.channelId,
        source: data.source,
      });
    };

    const handleRegistrationResponse = async (data: any) => {
      let extractedVoiceProfile: any = null;
      console.log("📨 Received message from ElizaOS:", {
        senderName: data.senderName,
        text: data.text,
        thought: data.thought,
        channelId: data.channelId,
        roomId: data.roomId,
        source: data.source,
        metadata: data.metadata,
      });

      // Listen for messages from the agent in our active session channel
      // Use roomId for broadcast messages, fallback to channelId
      const messageChannelId = data.roomId || data.channelId;
      console.log("🔍 Channel comparison:", {
        messageChannelId,
        sessionChannelId: currentSession?.channelId,
        refChannelId: currentChannelIdRef.current,
        matches: messageChannelId === currentChannelIdRef.current || messageChannelId === currentSession?.channelId,
        senderId: data.senderId,
        entityId: socketIOManager.getEntityId(),
        isFromSelf: data.senderId === socketIOManager.getEntityId(),
      });

      if (
        (messageChannelId === currentChannelIdRef.current || messageChannelId === currentSession?.channelId) &&
        data.senderId !== socketIOManager.getEntityId()
      ) {
        console.log("🤖 Received registration response from agent:", data);

        // Use thought field if available, otherwise fall back to text
        const responseMessage = data.thought || data.text;

        // BETTER APPROACH: Fetch the complete profile from server after registration
        if (
          responseMessage &&
          (responseMessage.includes("🎉 Voice registration successful") ||
            responseMessage.includes("Successfully registered voice") ||
            responseMessage.includes("Consistency Score"))
        ) {
          console.log(
            "✅ Voice registration successful, fetching complete profile from server...",
          );

          // Fetch the latest profile from server to get complete data with embeddings
          try {
            // Determine the correct URL based on environment
            const baseUrl = typeof window === "undefined" 
              ? "http://localhost:4000"  // Node.js/ElizaOS agent environment
              : "";                      // Browser environment (relative URLs work)
            
            const response = await fetch(`${baseUrl}/api/eliza/voice-registry/profiles`);
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data?.profiles?.length > 0) {
                // Get the most recent profile (should be the one we just created)
                const latestProfile = data.data.profiles[0];
                extractedVoiceProfile = latestProfile;
                console.log("🎯 Fetched complete voice profile from server:", {
                  userId: latestProfile.userId,
                  userName: latestProfile.userName,
                  hasEmbeddings: latestProfile.voiceEmbedding.length > 0,
                  embeddingCount: latestProfile.phraseEmbeddings.length,
                  embeddingDimension: latestProfile.voiceEmbedding.length,
                });
              }
            }
          } catch (fetchError) {
            console.error(
              "❌ Failed to fetch profile from server:",
              fetchError,
            );
          }
        }

        // Update agent response state - but don't overwrite success messages
        setRegistrationState((prev) => {
          // If we already have a success message, don't overwrite it with action confirmations
          if (
            prev.agentResponse &&
            (prev.agentResponse.includes("🎉 Voice registration successful") ||
              prev.agentResponse.includes("Successfully registered voice") ||
              prev.agentResponse.includes("Consistency Score"))
          ) {
            // Only update if this is also a success message (not an action confirmation)
            if (
              responseMessage &&
              (responseMessage.includes("🎉 Voice registration successful") ||
                responseMessage.includes("Successfully registered voice") ||
                responseMessage.includes("Consistency Score"))
            ) {
              return { ...prev, agentResponse: responseMessage };
            }
            return prev; // Keep the existing success message
          }
          return { ...prev, agentResponse: responseMessage };
        });

        // Check for registration success/failure
        if (data.metadata?.registrationSuccess !== undefined) {
          if (data.metadata.registrationSuccess) {
            console.log("✅ Voice registration successful:", data.metadata);
            setRegistrationState((prev) => ({
              ...prev,
              isLoading: false,
              error: null,
            }));
          } else {
            console.error("❌ Voice registration failed:", data.metadata);
            setRegistrationState((prev) => ({
              ...prev,
              error:
                data.metadata.error ||
                "Voice registration failed. Please try again.",
              isLoading: false,
            }));
          }
        }

        // Also check for error messages in the response
        if (
          responseMessage &&
          responseMessage.includes("❌ Voice registration failed")
        ) {
          console.error(
            "❌ Voice registration failed from agent response:",
            responseMessage,
          );
          setRegistrationState((prev) => ({
            ...prev,
            error:
              "Voice registration failed. Please ensure the voice API service is running.",
            isLoading: false,
          }));
        }

        // Check for success messages - Updated to catch the actual response format
        if (
          responseMessage &&
          (responseMessage.includes("🎉 Voice registration successful") ||
            responseMessage.includes("Voice profile created") ||
            responseMessage.includes("Consistency Score") ||
            responseMessage.includes("successful for") ||
            responseMessage.includes("Successfully registered voice"))
        ) {
          console.log(
            "✅ Voice registration successful from agent response:",
            responseMessage,
          );

          // Save voice profile to localStorage for frontend cache and identification
          try {
            const voiceSyncManager = VoiceSyncManager.getInstance();

            // Extract user info from the response - prioritize original profile data, then server data, then agent metadata, then fallback
            const userName = originalProfileData?.name || 
                           extractedVoiceProfile?.userName || 
                           data.metadata?.userName || 
                           "Unknown User";
            const userId = extractedVoiceProfile?.userId || 
                         data.metadata?.userId || 
                         `user_${Date.now()}`;
            const consistencyScore = extractedVoiceProfile?.consistencyScore || 
                                   data.metadata?.consistencyScore || 
                                   0.9;
            const phrasesCount = data.metadata?.phrasesCount || 2;

            console.log("🔍 Profile data sources:", {
              originalProfileData: originalProfileData?.name,
              extractedVoiceProfile: extractedVoiceProfile?.userName,
              agentMetadata: data.metadata?.userName,
              finalUserName: userName,
              finalUserId: userId,
            });

            // IMPORTANT: Use extracted voice profile from server fetch (most reliable)
            const agentVoiceProfile = extractedVoiceProfile || data.metadata?.voiceProfile;

            let voiceProfile: VoiceProfile;

            if (
              agentVoiceProfile &&
              agentVoiceProfile.voiceEmbedding &&
              agentVoiceProfile.phraseEmbeddings
            ) {
              // Use the complete profile from server (with embeddings)
              voiceProfile = {
                userId: agentVoiceProfile.userId || userId,
                userName: agentVoiceProfile.userName || userName,
                voiceEmbedding: agentVoiceProfile.voiceEmbedding,
                phraseEmbeddings: agentVoiceProfile.phraseEmbeddings,
                phrases: agentVoiceProfile.phrases || [
                  "The quick brown fox jumps over the lazy dog",
                  "Hello world, this is a test phrase",
                ],
                consistencyScore:
                  agentVoiceProfile.consistencyScore || consistencyScore,
                minConsistency: agentVoiceProfile.minConsistency || 0.7,
                enrollmentTimestamp:
                  agentVoiceProfile.enrollmentTimestamp || Date.now(),
                browserSessionId: voiceSyncManager.getBrowserSessionId(),
              };
              console.log(
                "🎯 Using complete voice profile from server (with embeddings)",
              );
            } else {
              // Fallback: Create profile without embeddings (will be populated by server sync)
              voiceProfile = {
                userId: userId,
                userName: userName,
                voiceEmbedding: [], // Will be populated by server sync
                phraseEmbeddings: [], // Will be populated by server sync
                phrases: [
                  "The quick brown fox jumps over the lazy dog",
                  "Hello world, this is a test phrase",
                ],
                consistencyScore: consistencyScore,
                minConsistency: 0.7,
                enrollmentTimestamp: Date.now(),
                browserSessionId: voiceSyncManager.getBrowserSessionId(),
              };
              console.log(
                "⚠️ Using fallback profile (no embeddings from server)",
              );
            }

            // Add to localStorage
            voiceSyncManager.addVoiceProfile(voiceProfile);

            // Verify the profile has valid embeddings for identification
            const hasValidEmbeddings =
              voiceProfile.voiceEmbedding.length > 0 &&
              voiceProfile.phraseEmbeddings.length > 0 &&
              voiceProfile.phraseEmbeddings.every((emb) => emb.length > 0);

            console.log("💾 Voice profile saved to localStorage:", {
              userId: voiceProfile.userId,
              userName: voiceProfile.userName,
              consistencyScore: voiceProfile.consistencyScore,
              hasEmbeddings: voiceProfile.voiceEmbedding.length > 0,
              embeddingCount: voiceProfile.phraseEmbeddings.length,
              hasValidEmbeddings: hasValidEmbeddings,
              voiceEmbeddingDimension: voiceProfile.voiceEmbedding.length,
              phraseEmbeddingDimensions: voiceProfile.phraseEmbeddings.map(
                (emb) => emb.length,
              ),
              browserSessionId: voiceProfile.browserSessionId,
            });

            if (!hasValidEmbeddings) {
              console.warn(
                "⚠️ Voice profile saved but missing embeddings - voice identification may not work!",
              );
            } else {
              console.log(
                "✅ Voice profile saved with valid embeddings - ready for identification!",
              );
            }

            // Trigger sync to server (this will ensure embeddings are available for identification)
            voiceSyncManager.syncToServer().then((success) => {
              if (success) {
                console.log("🔄 Voice profile synced to server successfully");
              } else {
                console.warn(
                  "⚠️ Voice profile sync to server failed - identification may not work",
                );
              }
            });
          } catch (localStorageError) {
            console.error(
              "❌ Error saving voice profile to localStorage:",
              localStorageError,
            );
          }

          // CRITICAL: Update UI state to show success and stop loading
          setRegistrationState((prev) => ({
            ...prev,
            isLoading: false,
            error: null,
            agentResponse: responseMessage,
          }));

          // Check for voice identification success/failure
          if (data.metadata?.identificationSuccess !== undefined) {
            if (data.metadata.identificationSuccess) {
              console.log("✅ Voice identification successful:", data.metadata);
              setRegistrationState((prev) => ({
                ...prev,
                isLoading: false,
                error: null,
              }));
              
              // Update the current session with the identified user
              if (data.metadata.identifiedUser && data.metadata.userId) {
                console.log("🎯 User identified:", data.metadata.identifiedUser);
                // You could update the session or trigger a callback here
              }
            } else {
              console.error("❌ Voice identification failed:", data.metadata);
              setRegistrationState((prev) => ({
                ...prev,
                error: data.metadata.error || "Voice identification failed. Please try again.",
                isLoading: false,
              }));
            }
          }

          // Don't process any more messages for this registration
          return;
        }
      }
    };

    // Set up response listener
    console.log("🔌 Attaching messageBroadcast listener to SocketIO manager");
    socketIOManager.on("messageBroadcast", testListener); // Test listener first
    socketIOManager.on("messageBroadcast", handleRegistrationResponse);
    console.log("✅ messageBroadcast listener attached");

    // Cleanup listener on unmount
    return () => {
      console.log("🧹 Cleaning up registration response listener");
      socketIOManager.off("messageBroadcast", testListener);
      socketIOManager.off("messageBroadcast", handleRegistrationResponse);
    };
  }, [currentSession, socketIOManager]);

  // Debug: Track currentSession changes
  useEffect(() => {
    console.log("🔄 currentSession changed:", {
      id: currentSession?.id,
      channelId: currentSession?.channelId,
      title: currentSession?.title,
      timestamp: new Date().toISOString(),
    });
  }, [currentSession]);

  // Voice recording methods
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const newRecordings = [...registrationState.recordings, audioBlob];
        const newProgress = (newRecordings.length / REQUIRED_PHRASES) * 100;

        setRegistrationState((prev) => ({
          ...prev,
          recordings: newRecordings,
          isRecording: false,
          progress: newProgress,
          isReadyToComplete: newRecordings.length >= REQUIRED_PHRASES,
          error: null,
        }));

        // Stop the stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
        mediaRecorderRef.current = null;
      };

      mediaRecorder.start();
      setRegistrationState((prev) => ({
        ...prev,
        isRecording: true,
        error: null,
      }));

      // Store references
      mediaRecorderRef.current = mediaRecorder;
      streamRef.current = stream;
    } catch (error) {
      console.error("Recording error:", error);
      setRegistrationState((prev) => ({
        ...prev,
        error: "Failed to access microphone",
        isRecording: false,
      }));
    }
  }, [registrationState.recordings]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const resetRecording = useCallback(() => {
    setRegistrationState((prev) => {
      const newRecordings = prev.recordings.slice(0, -1);
      const newProgress = (newRecordings.length / REQUIRED_PHRASES) * 100;
      return {
        ...prev,
        recordings: newRecordings,
        progress: newProgress,
        isReadyToComplete: newRecordings.length >= REQUIRED_PHRASES,
        error: null,
      };
    });
  }, []);

  const handleNextPhrase = useCallback(() => {
    setRegistrationState((prev) => {
      const nextStep = prev.currentStep + 1;
      if (nextStep < REQUIRED_PHRASES) {
        return {
          ...prev,
          currentStep: nextStep,
          currentPhrase: ENROLLMENT_PHRASES[nextStep],
        };
      }
      return prev;
    });
  }, []);

  const handleCompleteRegistration = useCallback(
    async (profileData: ProfileData, onComplete?: (userId: string) => void) => {
      // Guard against insufficient recordings
      if (
        !registrationState.recordings ||
        registrationState.recordings.length < REQUIRED_PHRASES
      ) {
        console.error(
          `Insufficient recordings: ${registrationState.recordings?.length || 0}/${REQUIRED_PHRASES} required`,
        );
        setRegistrationState((prev) => ({
          ...prev,
          error: `Please record ${REQUIRED_PHRASES} phrases before completing registration`,
          isLoading: false,
        }));
        return;
      }

      // Store original profile data for later use
      setOriginalProfileData(profileData);

      setRegistrationState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        agentResponse: null,
      }));

      try {
        // Create voice session first
        const sessionId = await voiceSessionManager.createSession();
        if (!sessionId) {
          throw new Error("Failed to create voice session");
        }

        console.log("🎤 Voice session created successfully:", sessionId);

        // Get the channel ID from the socket manager
        const channelId = socketIOManager.getActiveSessionChannelId();
        if (!channelId) {
          throw new Error("No active session channel");
        }

        // Create a mock session object
        const session = {
          id: sessionId,
          channelId: channelId,
          title: "Voice Registration",
          messageCount: 0,
          lastActivity: new Date().toISOString(),
          preview: "Voice registration in progress",
          isFromAgent: false,
          createdAt: new Date().toISOString(),
          userId: "11111111-1111-1111-1111-111111111111",
          agentId:
            process.env.NEXT_PUBLIC_AGENT_ID ||
            "fde21462-4177-054d-bb49-af260d0d95e9",
          sessionType: "voice" as const,
          metadata: {},
        };

        setCurrentSession(session);

        // Update the ref to track current channel ID (avoids race conditions)
        currentChannelIdRef.current = session.channelId;
        console.log(
          "🎯 Updated currentChannelIdRef:",
          currentChannelIdRef.current,
        );

        // Wait for the state update to be processed before sending message
        // This ensures the useEffect with the listener is set up with the correct channelId
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Initialize SocketIO connection if not already connected
        if (!socketIOManager.isSocketConnected()) {
          console.log("🔌 Initializing SocketIO connection...");
          const userEntity = "11111111-1111-1111-1111-111111111111";
          socketIOManager.initialize(userEntity);

          // Wait for connection to be established
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("SocketIO connection timeout"));
            }, 10000);

            const checkConnection = () => {
              if (socketIOManager.isSocketConnected()) {
                clearTimeout(timeout);
                resolve();
              } else {
                setTimeout(checkConnection, 100);
              }
            };
            checkConnection();
          });

          console.log("✅ SocketIO connection established");
        }

        // Join the channel
        await socketIOManager.joinChannel(session.channelId);
        console.log("📢 Joined channel:", session.channelId);

        // Set the active session channel ID for message filtering (following starter kit pattern)
        socketIOManager.setActiveSessionChannelId(session.channelId);
        console.log("🎯 Set active session channel ID:", session.channelId);

        // Wait a moment for the channel join to be processed
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Convert Blob objects to base64 strings (like Node.js test)
        const convertBlobToBase64 = (blob: Blob): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              // Extract base64 data (remove data:audio/webm;base64, prefix)
              const base64 = result.split(",")[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        };

        // Convert all recordings to base64
        const audioFilesBase64 = await Promise.all(
          registrationState.recordings.map((blob) => convertBlobToBase64(blob)),
        );

        console.log("📤 Sending voice registration data to ElizaOS...");
        console.log("📋 Registration details:", {
          channelId: session.channelId,
          sessionId: session.id,
          agentId: session.agentId,
          recordingsCount: registrationState.recordings.length,
          userName: profileData.name,
          audioFormat: "base64 strings (like Node.js test)",
        });

        // Send registration data to ElizaOS using the DM channel (following starter kit pattern)
        await socketIOManager.sendChannelMessage(
          "Voice registration request",
          session.channelId, // Use the DM channel ID
          "voice_registration",
          session.channelId, // Use the DM channel ID as session channel ID
          undefined,
          [], // No attachments - send base64 in metadata like Node.js test
          {
            source: "voice_registration",
            sessionId: session.id,
            channelId: session.channelId,
            targetAgentId: session.agentId,
            registrationData: {
              userName: profileData.name,
              audioFiles: audioFilesBase64, // Base64 strings like Node.js test
              phraseIndices: Array.from(
                { length: REQUIRED_PHRASES },
                (_, i) => i,
              ),
              profileData: profileData,
              browserSessionId: VoiceSyncManager.getInstance().getBrowserSessionId(), // Include browser session ID
            },
            timestamp: Date.now(),
          },
        );

        console.log("✅ Voice registration data sent to ElizaOS");

        // Cleanup listener after 30 seconds if no response
        setTimeout(() => {
          if (registrationState.isLoading) {
            console.log("⏰ Registration timeout - no response received");
            setRegistrationState((prev) => ({
              ...prev,
              error: "Registration timeout. Please try again.",
              isLoading: false,
            }));
          }
        }, 30000);
      } catch (error) {
        console.error("❌ Registration error:", error);
        setRegistrationState((prev) => ({
          ...prev,
          error: "Failed to register voice profile",
          isLoading: false,
        }));
      }
    },
    [registrationState.recordings, socketIOManager],
  );

  // Voice session methods
  const createVoiceSession = useCallback(async (): Promise<VoiceSession | null> => {
    setIsSessionLoading(true);
    setSessionError(null);

    try {
      const sessionId = await voiceSessionManager.createSession();
      if (sessionId) {
        // Get the channel ID from the socket manager
        const channelId = socketIOManager.getActiveSessionChannelId();
        if (!channelId) {
          throw new Error("No active session channel");
        }

        // Create a session object
        const session = {
          id: sessionId,
          channelId: channelId,
          title: "Voice Session",
          messageCount: 0,
          lastActivity: new Date().toISOString(),
          preview: "Voice session active",
          isFromAgent: false,
          createdAt: new Date().toISOString(),
          userId: "11111111-1111-1111-1111-111111111111",
          agentId:
            process.env.NEXT_PUBLIC_AGENT_ID ||
            "fde21462-4177-054d-bb49-af260d0d95e9",
          sessionType: "voice" as const,
          metadata: {},
        };

        setCurrentSession(session);
        return session;
      } else {
        throw new Error("Failed to create voice session");
      }
    } catch (error) {
      console.error("Session creation error:", error);
      setSessionError("Failed to create voice session");
      return null;
    } finally {
      setIsSessionLoading(false);
    }
  }, [socketIOManager]);

  const sendVoiceMessage = useCallback(
    async (audioBlob: Blob) => {
      if (!currentSession) {
        console.error("No active session for voice message");
        return;
      }

      setIsProcessing(true);
      setLatestResponse(null);

      try {
        // Convert Blob to base64 string (like Node.js test)
        const convertBlobToBase64 = (blob: Blob): Promise<string> => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result as string;
              const base64 = result.split(",")[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        };

        const audioBase64 = await convertBlobToBase64(audioBlob);

        await socketIOManager.sendChannelMessage(
          "Voice message",
          currentSession.channelId,
          "voice_chat",
          currentSession.channelId,
          undefined,
          [], // No attachments - send base64 in metadata like Node.js test
          {
            source: "voice_recording",
            sessionId: currentSession.id,
            audioData: audioBase64, // Base64 string like Node.js test
            browserSessionId: VoiceSyncManager.getInstance().getBrowserSessionId(), // Include browser session ID
            timestamp: Date.now(),
          },
        );

        // Listen for response from ElizaOS
        const handleMessageBroadcast = (data: any) => {
          if (
            data.channelId === currentSession.channelId &&
            data.senderId !== socketIOManager.getEntityId()
          ) {
            // Use thought field if available, otherwise fall back to text
            const responseMessage = data.thought || data.text;
            console.log("🤖 Agent response:", responseMessage);
            setLatestResponse(responseMessage);
            setIsProcessing(false);

            // Check for voice identification success/failure
            if (data.metadata?.identificationSuccess !== undefined) {
              if (data.metadata.identificationSuccess) {
                console.log("✅ Voice identification successful:", data.metadata);
                
                // Update the current session with the identified user
                if (data.metadata.identifiedUser && data.metadata.userId) {
                  console.log("🎯 User identified:", data.metadata.identifiedUser);
                  // You could update the session or trigger a callback here
                }
              } else {
                console.error("❌ Voice identification failed:", data.metadata);
                setLatestResponse(
                  data.metadata.error || "Voice identification failed. Please try again."
                );
              }
            }
          }
        };

        socketIOManager.on("messageBroadcast", handleMessageBroadcast);

        // Cleanup listener after 10 seconds
        setTimeout(() => {
          socketIOManager.off("messageBroadcast", handleMessageBroadcast);
          if (isProcessing) {
            setIsProcessing(false);
          }
        }, 10000);
      } catch (error) {
        console.error("Error sending voice message:", error);
        setIsProcessing(false);
        setLatestResponse(
          "Sorry, I had trouble processing your voice message. Please try again.",
        );
      }
    },
    [currentSession, socketIOManager, isProcessing],
  );

  const clearResponse = useCallback(() => {
    setLatestResponse(null);
  }, []);

  return {
    registrationState,
    currentSession,
    isSessionLoading,
    sessionError,
    latestResponse,
    isProcessing,
    startRecording,
    stopRecording,
    resetRecording,
    handleNextPhrase,
    handleCompleteRegistration,
    createVoiceSession,
    sendVoiceMessage,
    clearResponse,
    setLatestResponse,
  };
};
