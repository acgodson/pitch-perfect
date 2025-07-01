// pages/index.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { VoiceCommandCenter } from "@/components/organisms";
import { BackgroundPattern, FloatingActionButton } from "@/components/atoms";
import {
  MobileMicOverlay,
  ActivityPanel,
  VoiceCommands,
} from "@/components/molecules";
import { motion } from "framer-motion";
import { useProfile } from "@/hooks/useProfile";
import { transcribeAudio } from "@/lib/voice-api-client";

interface Profile {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  isActive?: boolean;
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

export default function LandingPage() {
  const router = useRouter();
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showMobileMic, setShowMobileMic] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProfileMatched, setIsProfileMatched] = useState(false);
  const [showProfileActivity, setShowProfileActivity] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);

  // Use the profile hook for voice session management
  const {
    currentSession,
    isSessionLoading,
    sessionError,
    identificationState,
    latestResponse,
    isProcessing: isVoiceProcessing,
    shouldNavigateToMainActivity,
    createVoiceSession,
    sendVoiceMessage,
    clearResponse,
    setLatestResponse,
    isVoiceSessionUnlocked,
    resetNavigationFlag,
  } = useProfile();

  // Load profiles from localStorage on page load
  useEffect(() => {
    const loadProfilesFromLocalStorage = async () => {
      try {
        setIsLoadingProfiles(true);

        // Import VoiceSyncManager dynamically to avoid SSR issues
        const { VoiceSyncManager } = await import("../lib/voice-sync-manager");
        const voiceSyncManager = VoiceSyncManager.getInstance();

        // Get profiles from localStorage
        const voiceRegistry = voiceSyncManager.getVoiceRegistryFromStorage();

        console.log("🔍 Raw profiles from localStorage:", voiceRegistry);

        if (voiceRegistry && voiceRegistry.profiles && voiceRegistry.profiles.length > 0) {
          // Convert localStorage profiles to Profile interface
          const apiProfiles: Profile[] = voiceRegistry.profiles.map((profile: any, index: number) => {
            console.log(`🔍 Processing profile ${index}:`, {
              userId: profile.userId,
              userName: profile.userName,
              consistencyScore: profile.consistencyScore,
              browserSessionId: profile.browserSessionId,
            });

            return {
              id: profile.userId || `profile-${index}`,
              name: profile.userName || "Unknown User",
              role: "Voice User",
              avatar: `/avatars/user-${index}.jpg`,
              isActive: profile.consistencyScore > 0.8, // Consider active if good consistency
            };
          });
          setProfiles(apiProfiles);
          console.log("📋 Loaded profiles from localStorage:", apiProfiles);
        } else {
          console.log("📋 No profiles found in localStorage");
          setProfiles([]);
        }
      } catch (error) {
        console.error("❌ Error loading profiles from localStorage:", error);
        setProfiles([]);
      } finally {
        setIsLoadingProfiles(false);
      }
    };

    loadProfilesFromLocalStorage();
  }, []);

  // Function to add a specific profile after registration
  const addProfileAfterRegistration = async (userId: string) => {
    try {
      console.log("🔄 Adding specific profile after registration:", userId);

      // Fetch only the specific profile from the server
      const response = await fetch(`/api/eliza/voice-registry/profiles?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.profile) {
          const newProfile: Profile = {
            id: data.data.profile.userId,
            name: data.data.profile.userName,
            role: "Voice User",
            avatar: `/avatars/user-${profiles.length}.jpg`,
            isActive: data.data.profile.consistencyScore > 0.8,
          };

          // Add to local state
          setProfiles(prev => [...prev, newProfile]);
          console.log("✅ Added new profile to local state:", newProfile);
        }
      } else {
        console.error("❌ Failed to fetch specific profile:", response.status);
      }
    } catch (error) {
      console.error("❌ Error adding profile after registration:", error);
    }
  };

  const handleProfileSelect = (profile: Profile) => {
    // If this is a matched profile, proceed to their activity panel
    if (isProfileMatched && selectedProfile?.id === profile.id) {
      console.log(
        "🎯 Proceeding to activity panel for matched profile:",
        profile.name,
      );
      setShowProfileActivity(true);
      return;
    }

    // Normal profile selection
    setSelectedProfile(profile);
    setIsProfileMatched(false);
  };

  const handleBackToProfiles = () => {
    setSelectedProfile(null);
    setIsCreatingProfile(false);
    setIsProfileMatched(false);
    setShowProfileActivity(false);
    clearResponse();
  };

  const handleCreateProfile = () => {
    console.log("📝 Starting profile creation flow");
    setIsCreatingProfile(true);
  };

  // Handle profile creation completion
  const handleProfileCreationComplete = async (userId?: string, isAutoUnlocked?: boolean) => {
    console.log("✅ Profile creation completed, adding new profile...", { userId, isAutoUnlocked });
    setIsCreatingProfile(false);

    if (userId) {
      await addProfileAfterRegistration(userId);
      
      // If registration automatically unlocked the session, navigate to main activity
      if (isAutoUnlocked) {
        console.log("🔓 Session auto-unlocked after registration, showing main activity");
        setShowProfileActivity(true);
      }
    }
  };

  const handleVoiceCommand = async (audioBlob: Blob) => {
    console.log("🎤 Voice command received, size:", audioBlob.size, "bytes");
    console.log("🔍 Current session state:", {
      isUnlocked: identificationState.isUnlocked,
      identifiedUser: identificationState.identifiedUser,
      selectedProfile: selectedProfile?.name,
      isProfileMatched: isProfileMatched,
    });

    // Check if we have an active voice session (user is already identified)
    if (identificationState.isUnlocked || isVoiceSessionUnlocked()) {
      console.log("🔓 Session is unlocked - transcribing voice to text for conversation");
      setIsProcessing(true);

      try {
        // Transcribe the audio to text using OpenAI/voice API
        console.log("🎤 Transcribing audio for conversation...");
        const transcript = await transcribeAudio(audioBlob);
        console.log("📝 Transcribed text:", transcript);

        // Send transcribed text to agent as a regular conversation message
        if (currentSession) {
          console.log("💬 Sending transcribed text to agent:", transcript);
          
          // Import SocketIOManager dynamically
          const SocketIOManager = (await import("../lib/socketio-manager")).default;
          const socketIOManager = SocketIOManager.getInstance();

          await socketIOManager.sendChannelMessage(
            transcript, // Send the transcribed text
            currentSession.channelId,
            "text_chat", // Mark as text chat, not voice
            currentSession.channelId,
            undefined,
            [],
            {
              source: "voice_transcription",
              sessionId: currentSession.id,
              transcript: transcript,
              identifiedUser: identificationState.identifiedUser,
              identifiedUserId: identificationState.identifiedUserId,
              browserSessionId: (await import("../lib/voice-sync-manager")).VoiceSyncManager.getInstance().getBrowserSessionId(),
              timestamp: Date.now(),
            },
          );

          console.log("✅ Transcribed message sent to agent");
        } else {
          console.error("❌ No active session for conversation");
        }

        setIsProcessing(false);
        return;
      } catch (error) {
        console.error("❌ Error transcribing voice for conversation:", error);
        setIsProcessing(false);
        return;
      }
    }

    // If no session is unlocked, check if this is a voice identification attempt
    if (!selectedProfile && !identificationState.isUnlocked) {
      console.log("🔍 No profile selected - initiating voice identification");
      setIsProcessing(true);

      try {
        // First, transcribe the audio to check for startup phrase
        console.log("🎤 Transcribing audio for startup phrase detection...");
        const transcript = await transcribeAudio(audioBlob);
        console.log("📝 Transcribed text:", transcript);

        // Check if the transcript contains the startup phrase
        const startupPhrase = "beca, listen up";
        const transcriptLower = transcript.toLowerCase();
        
        // Use similarity matching instead of exact matching
        const similarity = calculateSimilarity(transcriptLower, startupPhrase);
        
        // Also check for just "listen up" as a fallback
        const hasListenUp = transcriptLower.includes("listen up") || transcriptLower.includes("listening up");
        const hasStartupPhrase = similarity > 0.5 || hasListenUp; // More forgiving threshold

        console.log("🔍 Startup phrase detection:", {
          transcript: transcriptLower,
          expected: startupPhrase,
          similarity: similarity,
          hasListenUp: hasListenUp,
          threshold: 0.5,
          detected: hasStartupPhrase
        });

        if (!hasStartupPhrase) {
          console.log("❌ Startup phrase not detected, asking user to try again");
          setIsProcessing(false);
          // You could show a message to the user here
          return;
        }

        console.log("✅ Startup phrase detected, proceeding with voice identification");

        // Create voice session for identification
        console.log("📡 Creating voice session for identification...");
        const session = await createVoiceSession();

        // Check if session was created successfully
        if (!session) {
          console.error("❌ Session creation failed");
          setIsProcessing(false);
          return;
        }

        console.log("📤 Sending voice message for identification...");
        
        // Send voice message using the session directly
        setIsProcessing(true);
        setLatestResponse(null);

        try {
          // Convert Blob to base64 string
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

          // Import SocketIOManager dynamically
          const SocketIOManager = (await import("../lib/socketio-manager")).default;
          const socketIOManager = SocketIOManager.getInstance();

          await socketIOManager.sendChannelMessage(
            "Voice message",
            session.channelId,
            "voice_chat",
            session.channelId,
            undefined,
            [], // No attachments - send base64 in metadata
            {
              source: "voice_recording",
              sessionId: session.id,
              audioData: audioBase64,
              transcript: transcript,
              browserSessionId: (await import("../lib/voice-sync-manager")).VoiceSyncManager.getInstance().getBrowserSessionId(),
              timestamp: Date.now(),
            },
          );

          console.log("✅ Voice message sent for identification");

          // Listen for response from ElizaOS for voice identification
          const handleIdentificationResponse = (data: any) => {
            console.log("📨 Received message for identification:", {
              senderName: data.senderName,
              text: data.text,
              thought: data.thought,
              channelId: data.channelId,
              roomId: data.roomId,
              source: data.source,
              metadata: data.metadata,
            });

            // Use roomId for broadcast messages, fallback to channelId
            const messageChannelId = data.roomId || data.channelId;
            
            console.log("🔍 Channel matching for identification:", {
              messageChannelId,
              sessionChannelId: session.channelId,
              matches: messageChannelId === session.channelId,
              senderId: data.senderId,
              entityId: socketIOManager.getEntityId(),
              isFromSelf: data.senderId === socketIOManager.getEntityId(),
            });
            
            if (
              messageChannelId === session.channelId &&
              data.senderId !== socketIOManager.getEntityId()
            ) {
              // Use thought field if available, otherwise fall back to text
              const responseMessage = data.thought || data.text;
              console.log("🤖 Agent identification response:", responseMessage);
              setLatestResponse(responseMessage);
              setIsProcessing(false);

              // Check for voice identification success/failure using structured metadata
              if (data.metadata?.identificationSuccess !== undefined) {
                if (data.metadata.identificationSuccess) {
                  console.log("✅ Voice identification successful from metadata:", data.metadata);
                  
                  // The useProfile hook will handle the session state updates
                  // We just need to handle the UI navigation here
                  setSelectedProfile({
                    id: data.metadata.userId || "unknown",
                    name: data.metadata.identifiedUser || "Unknown User",
                    role: "User",
                    isActive: true,
                  });
                  setIsProfileMatched(true);
                  setIsProcessing(false);

                  // Navigate to activity panel immediately
                  console.log("🎯 Navigating to activity panel for:", data.metadata.identifiedUser);
                  setShowProfileActivity(true);
                } else {
                  console.log("❌ Voice identification failed from metadata:", data.metadata);
                  setIsProcessing(false);
                }
              } else {
                // Fallback to string matching for legacy responses
                if (responseMessage.includes("🎉 Welcome back") || responseMessage.includes("Voice identification successful")) {
                  console.log("✅ Voice identification successful (legacy response), updating UI...");

                  // Extract user info from the response
                  const userNameMatch = responseMessage.match(/Welcome back, ([^!]+)!/);
                  const userName = userNameMatch ? userNameMatch[1] : "Unknown User";

                  setSelectedProfile({
                    id: "legacy_user",
                    name: userName,
                    role: "User",
                    isActive: true,
                  });
                  setIsProfileMatched(true);
                  setIsProcessing(false);
                  
                  // Navigate to activity panel
                  console.log("🎯 Navigating to activity panel for:", userName);
                  setShowProfileActivity(true);
                } else if (responseMessage.includes("❌ Voice identification failed")) {
                  console.log("❌ Voice identification failed");
                  setIsProcessing(false);
                }
              }

              // Clean up the listener after processing
              socketIOManager.off("messageBroadcast", handleIdentificationResponse);
            }
          };

          socketIOManager.on("messageBroadcast", handleIdentificationResponse);

          // Cleanup listener after 10 seconds if no response
          setTimeout(() => {
            socketIOManager.off("messageBroadcast", handleIdentificationResponse);
            if (isProcessing) {
              setIsProcessing(false);
              setLatestResponse("Voice identification timed out. Please try again.");
            }
          }, 10000);

        } catch (error) {
          console.error("❌ Error sending voice message:", error);
          setIsProcessing(false);
        }

        // The actual identification will be handled by the agent response
        // We'll wait for the response instead of using mock data
      } catch (error) {
        console.error("❌ Voice identification error:", error);
        setIsProcessing(false);
      }
    } else {
      // Profile is already selected, handle normal voice commands
      console.log(
        "💬 Voice command from",
        selectedProfile.name,
        ":",
        audioBlob.size,
        "bytes",
      );

      if (currentSession) {
        console.log("📤 Sending voice message to agent...");
        await sendVoiceMessage(audioBlob);
      } else {
        console.log("⚠️ No active session for voice command");
      }
    }
  };

  // Update processing state based on voice processing
  useEffect(() => {
    setIsProcessing(isVoiceProcessing);
  }, [isVoiceProcessing]);

  // Handle navigation after successful registration
  useEffect(() => {
    if (shouldNavigateToMainActivity) {
      console.log("🚀 Navigation flag set, showing main activity");
      setShowProfileActivity(true);
      resetNavigationFlag();
    }
  }, [shouldNavigateToMainActivity, resetNavigationFlag]);

  // Initialize session state on page load
  useEffect(() => {
    if (identificationState.isUnlocked && identificationState.identifiedUser) {
      console.log("🔄 Session already unlocked for:", identificationState.identifiedUser);
      // Set profile as selected and matched
      setSelectedProfile({
        id: identificationState.identifiedUserId || "unknown",
        name: identificationState.identifiedUser,
        role: "Voice User",
        isActive: true,
      });
      setIsProfileMatched(true);
      setShowProfileActivity(true);
    }
  }, [identificationState]);

  // Log agent responses
  useEffect(() => {
    if (latestResponse) {
      console.log("🤖 Agent response received:", latestResponse);
    }
  }, [latestResponse]);

  return (
    <BackgroundPattern>
      {/* Main Layout */}
      <div className="min-h-screen flex">
        {/* Left Panel - 60% width */}
        <div className="hidden md:flex w-3/5 flex-col items-center justify-center p-8">
          <motion.div
            className="text-center space-y-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Voice Command Center */}
            <div
              className={`transition-all duration-300 ${isCreatingProfile ? "opacity-50 pointer-events-none" : ""}`}
            >
              <VoiceCommandCenter
                onCommand={handleVoiceCommand}
                className="mx-auto"
                isProcessing={isProcessing}
                isProfileMatched={isProfileMatched || identificationState.isUnlocked}
                showSuccessIndicator={identificationState.showSuccessUI}
                identifiedUser={identificationState.identifiedUser}
                onNavigateToActivity={() => {
                  console.log("🎯 Green tick clicked, navigating to main activity");
                  setShowProfileActivity(true);
                }}
              />
            </div>

            {/* Success Message Overlay */}
            {identificationState.showSuccessUI && identificationState.identifiedUser && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5 }}
              >
                <div className="bg-emerald-500/90 backdrop-blur-md text-white px-6 py-4 rounded-2xl shadow-2xl border border-emerald-400/30">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <span className="text-lg">✅</span>
                    </div>
                    <div>
                      <p className="font-semibold">Welcome back!</p>
                      <p className="text-sm text-emerald-100">{identificationState.identifiedUser}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}


            <motion.div
              className="space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              {!showProfileActivity && (
                <>
                  <h1 className="text-5xl md:text-6xl font-bold text-white tracking-tight drop-shadow-2xl">
                    Pitch Perfect
                  </h1>
                </>
              )}
            </motion.div>

            {/* Voice Commands */}
            {!selectedProfile && !isCreatingProfile && (
              <VoiceCommands
                className="mt-8"
                isIdentificationMode={true}
              />
            )}

            {/* Voice Commands for active profile */}
            {showProfileActivity && (
              <VoiceCommands
                className="mt-8"
                isIdentificationMode={false}
              />
            )}

          </motion.div>
        </div>

        {/* Right Panel - Activity & Profile Management */}
        <div className="w-full md:w-2/5 h-screen overflow-hidden">
          <ActivityPanel
            selectedProfile={selectedProfile}
            onBackToProfiles={handleBackToProfiles}
            onCreateProfile={handleCreateProfile}
            onProfileSelect={handleProfileSelect}
            onProfileCreationStateChange={setIsCreatingProfile}
            isProfileMatched={isProfileMatched}
            showProfileActivity={showProfileActivity}
            profiles={profiles}
            isLoadingProfiles={isLoadingProfiles}
            onProfileCreationComplete={handleProfileCreationComplete}
          />
        </div>
      </div>

      {/* Mobile Floating Action Button */}
      <FloatingActionButton onClick={() => setShowMobileMic(true)} />

      {/* Mobile Mic Overlay */}
      <MobileMicOverlay
        isOpen={showMobileMic}
        onClose={() => setShowMobileMic(false)}
        onCommand={handleVoiceCommand}
      />
    </BackgroundPattern>
  );
}
