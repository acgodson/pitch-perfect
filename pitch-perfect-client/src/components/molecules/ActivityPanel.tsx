import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { VoiceCommandCenter } from "@/components/organisms";
import { VoiceRegistration } from "./VoiceRegistration";
import { PortfolioOverview, AddressBook } from "@/components/organisms";
import {
  ArrowLeft,
  Mic,
  User,
  Smile,
  Calendar,
  Plus,
  Home,
  Clock,
  Settings,
} from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

interface Profile {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  isActive?: boolean;
}

interface ActivityPanelProps {
  className?: string;
  selectedProfile?: Profile | null;
  onBackToProfiles?: () => void;
  onCreateProfile?: () => void;
  onProfileSelect?: (profile: Profile) => void;
  onProfileCreationStateChange?: (isCreating: boolean) => void;
  isProfileMatched?: boolean;
  showProfileActivity?: boolean;
  profiles?: Profile[];
  isLoadingProfiles?: boolean;
  onProfileCreationComplete?: (userId: string) => void;
}

export const ActivityPanel = ({
  className,
  selectedProfile,
  onBackToProfiles,
  onCreateProfile,
  onProfileSelect,
  onProfileCreationStateChange,
  isProfileMatched = false,
  showProfileActivity = false,
  profiles,
  isLoadingProfiles,
  onProfileCreationComplete,
}: ActivityPanelProps) => {
  const [profileCreationStep, setProfileCreationStep] = useState<
    "name" | "emoji" | "age" | "voice" | null
  >(null);
  const [profileData, setProfileData] = useState({
    name: "",
    emoji: "",
    isAdult: false,
  });
  const [activeTab, setActiveTab] = useState<"home" | "activity">("home");
  const [activeView, setActiveView] = useState<
    "dashboard" | "portfolio" | "addressbook" | "settings" | "security"
  >("dashboard");

  // Use the profile hook for voice session management
  const {
    currentSession,
    isSessionLoading,
    sessionError,
    identificationState,
    latestResponse,
    isProcessing,
    createVoiceSession,
    sendVoiceMessage,
    clearResponse,
    isVoiceSessionUnlocked,
  } = useProfile();

  // Track if we've already created a session for this profile match
  const hasCreatedSessionRef = useRef(false);

  // Initialize voice session when profile is matched
  useEffect(() => {
    if (
      isProfileMatched &&
      selectedProfile &&
      !currentSession &&
      !isSessionLoading &&
      !hasCreatedSessionRef.current
    ) {
      hasCreatedSessionRef.current = true;
      createVoiceSession();
    }
  }, [isProfileMatched, selectedProfile, currentSession, isSessionLoading]);

  // Reset the ref when profile match state changes
  useEffect(() => {
    if (!isProfileMatched) {
      hasCreatedSessionRef.current = false;
    }
  }, [isProfileMatched]);

  // Clear response when switching tabs
  useEffect(() => {
    if (activeTab === "home") {
      clearResponse();
    }
  }, [activeTab, clearResponse]);

  const handleCreateProfile = () => {
    setProfileCreationStep("name");
    onCreateProfile?.();
    onProfileCreationStateChange?.(true);
  };

  const handleQuickAction = (
    view: "portfolio" | "addressbook" | "settings" | "security",
  ) => {
    setActiveView(view);
  };

  const handleBackToDashboard = () => {
    setActiveView("dashboard");
  };

  const handleNextStep = () => {
    if (profileCreationStep === "name" && profileData.name.trim()) {
      setProfileCreationStep("emoji");
    } else if (profileCreationStep === "emoji" && profileData.emoji) {
      setProfileCreationStep("age");
    } else if (profileCreationStep === "age") {
      setProfileCreationStep("voice");
    }
  };

  const handleBackStep = () => {
    if (profileCreationStep === "emoji") {
      setProfileCreationStep("name");
    } else if (profileCreationStep === "age") {
      setProfileCreationStep("emoji");
    } else if (profileCreationStep === "voice") {
      setProfileCreationStep("age");
    }
  };

  const handleCancelCreation = () => {
    setProfileCreationStep(null);
    setProfileData({ name: "", emoji: "", isAdult: false });
    onBackToProfiles?.();
    onProfileCreationStateChange?.(false);
  };

  const handleVoiceCommand = async (audioBlob: Blob) => {
    if (currentSession) {
      await sendVoiceMessage(audioBlob);
    }
  };

  // Profile Activity View (when showProfileActivity is true)
  if (showProfileActivity && selectedProfile) {
    return (
      <div className="h-full p-4 md:p-6">
        <div className="h-full bg-white/8 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header with back button */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBackToProfiles}
                  className="text-white/70 hover:text-white"
                >
                  <ArrowLeft size={16} />
                </Button>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    {selectedProfile.name}'s Dashboard
                  </h2>
                  <div className="flex items-center space-x-2">
                    <p className="text-emerald-400 text-sm">
                      Voice matched profile
                    </p>
                    {isVoiceSessionUnlocked() && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                        <span className="text-emerald-300 text-xs">Session Active</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <Avatar className="w-12 h-12">
                <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-medium text-lg">
                  {selectedProfile.name.charAt(0)}
                </div>
              </Avatar>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab("home")}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "home"
                  ? "text-white border-b-2 border-emerald-400"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Home size={16} className="inline mr-2" />
              Home
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "activity"
                  ? "text-white border-b-2 border-emerald-400"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Mic size={16} className="inline mr-2" />
              Voice Activity
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === "home" && (
              <div className="p-6 space-y-6">
                {/* Welcome Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-4"
                >
                  <div className="relative">
                    <div className="w-16 h-16 mx-auto bg-emerald-400/20 rounded-full flex items-center justify-center">
                      <Mic size={32} className="text-emerald-400" />
                    </div>
                    {identificationState.isUnlocked && (
                      <div className="absolute -top-1 -right-4 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs animate-pulse">
                        ✓
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      Welcome back, {identificationState.identifiedUser || selectedProfile.name}!
                    </h3>
                    <div className="space-y-1">
                      <p className="text-blue-200 text-sm">
                        {identificationState.isUnlocked ? "Voice session active" : "Your voice has been recognized"}
                      </p>
                      {identificationState.confidence && (
                        <p className="text-emerald-300 text-xs">
                          Confidence: {(identificationState.confidence * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleQuickAction("portfolio")}
                    className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all text-left"
                  >
                    <div className="text-emerald-400 mb-2">💰</div>
                    <div className="text-white font-medium">Portfolio</div>
                    <div className="text-blue-200 text-sm">
                      View your assets
                    </div>
                  </button>

                  <button
                    onClick={() => handleQuickAction("addressbook")}
                    className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all text-left"
                  >
                    <div className="text-blue-400 mb-2">👥</div>
                    <div className="text-white font-medium">Address Book</div>
                    <div className="text-blue-200 text-sm">Manage contacts</div>
                  </button>

                  <button
                    onClick={() => handleQuickAction("settings")}
                    className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all text-left"
                  >
                    <div className="text-purple-400 mb-2">⚙️</div>
                    <div className="text-white font-medium">Settings</div>
                    <div className="text-blue-200 text-sm">Preferences</div>
                  </button>

                  <button
                    onClick={() => handleQuickAction("security")}
                    className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-all text-left"
                  >
                    <div className="text-red-400 mb-2">🔒</div>
                    <div className="text-white font-medium">Security</div>
                    <div className="text-blue-200 text-sm">Voice settings</div>
                  </button>
                </div>

                {/* Recent Activity */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="text-white font-medium mb-3">
                    Recent Activity
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3 text-sm">
                      <Clock size={14} className="text-blue-400" />
                      <span className="text-white/70">
                        Voice session started
                      </span>
                      <span className="text-blue-200">2 min ago</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm">
                      <Mic size={14} className="text-emerald-400" />
                      <span className="text-white/70">
                        Voice command processed
                      </span>
                      <span className="text-blue-200">1 min ago</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="p-6 space-y-6">
                {/* Voice Activity Section */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-4"
                >
                  <div className="w-16 h-16 mx-auto bg-emerald-400/20 rounded-full flex items-center justify-center">
                    <Mic size={32} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">
                      Voice Activity
                    </h3>
                    <p className="text-blue-200 text-sm">
                      {isProcessing
                        ? "Processing your voice..."
                        : "Ready for voice commands"}
                    </p>
                  </div>
                </motion.div>

                {/* Voice Command Center */}
                <div className="flex justify-center">
                  <VoiceCommandCenter
                    onCommand={(command) => {
                      // Handle text command if needed, but we're using voice
                      console.log("Text command:", command);
                    }}
                    className="mx-auto"
                    isProcessing={isProcessing}
                    isProfileMatched={false}
                  />
                </div>

                {/* Latest Response from ElizaOS */}
                {latestResponse && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 rounded-lg p-4 border border-white/10"
                  >
                    <h4 className="text-white font-medium mb-2">
                      Beca's Response:
                    </h4>
                    <p className="text-blue-200 text-sm leading-relaxed">
                      {latestResponse.length > 200
                        ? `${latestResponse.substring(0, 200)}...`
                        : latestResponse}
                    </p>
                  </motion.div>
                )}

                {/* Session Status */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="text-white font-medium mb-3">
                    Session Status
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/70">Session ID:</span>
                      <span className="text-blue-200 font-mono">
                        {currentSession?.id
                          ? currentSession.id.substring(0, 8) + "..."
                          : "Not connected"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Status:</span>
                      <span
                        className={`font-medium ${
                          currentSession ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {currentSession ? "Connected" : "Disconnected"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Processing:</span>
                      <span
                        className={`font-medium ${
                          isProcessing ? "text-yellow-400" : "text-emerald-400"
                        }`}
                      >
                        {isProcessing ? "Active" : "Idle"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Error Display */}
                {sessionError && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4">
                    <h4 className="text-red-300 font-medium mb-2">
                      Connection Error
                    </h4>
                    <p className="text-red-200 text-sm">{sessionError}</p>
                    <Button
                      onClick={createVoiceSession}
                      className="mt-3 bg-red-600 hover:bg-red-700"
                      size="sm"
                    >
                      Retry Connection
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* View Content */}
          {activeView !== "dashboard" && (
            <div className="absolute inset-0 bg-white/8 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToDashboard}
                    className="text-white/70 hover:text-white"
                  >
                    <ArrowLeft size={16} />
                  </Button>
                  <h2 className="text-xl font-semibold text-white">
                    {activeView === "portfolio" && "Portfolio Overview"}
                    {activeView === "addressbook" && "Address Book"}
                    {activeView === "settings" && "Settings"}
                    {activeView === "security" && "Security"}
                  </h2>
                  <div className="w-8" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {activeView === "portfolio" && (
                  <PortfolioOverview onBack={handleBackToDashboard} />
                )}
                {activeView === "addressbook" && (
                  <AddressBook onBack={handleBackToDashboard} />
                )}
                {activeView === "settings" && (
                  <div className="text-center text-white/60">
                    <Settings size={48} className="mx-auto mb-4" />
                    <p>Settings panel coming soon...</p>
                  </div>
                )}
                {activeView === "security" && (
                  <div className="text-center text-white/60">
                    <div className="text-4xl mb-4">🔒</div>
                    <p>Security settings coming soon...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Profile Creation Flow
  if (profileCreationStep) {
    return (
      <div className="h-full p-4 md:p-6">
        <div className="h-full bg-white/8 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* Header with back button */}
          <div className="p-6 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancelCreation}
                  className="text-white/70 hover:text-white"
                >
                  <ArrowLeft size={16} />
                </Button>
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    Create Profile
                  </h2>
                  <p className="text-blue-200 text-sm">
                    Step{" "}
                    {profileCreationStep === "name"
                      ? 1
                      : profileCreationStep === "emoji"
                        ? 2
                        : profileCreationStep === "age"
                          ? 3
                          : 4}{" "}
                    of 4
                  </p>
                </div>
              </div>
              {profileCreationStep === "voice" && (
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{profileData.emoji}</div>
                  <div className="text-right">
                    <div className="text-white font-medium">
                      {profileData.name}
                    </div>
                    <div className="text-blue-200 text-sm">
                      {profileData.isAdult ? "Adult Profile" : "Child Profile"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Creation Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {profileCreationStep === "name" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="text-center space-y-2">
                    <User size={48} className="mx-auto text-blue-400" />
                    <h3 className="text-lg font-medium text-white">
                      Enter Profile Name
                    </h3>
                    <p className="text-blue-200 text-sm">
                      What should we call you?
                    </p>
                  </div>
                  <Input
                    value={profileData.name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, name: e.target.value })
                    }
                    placeholder="Enter your name"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    onKeyPress={(e) => e.key === "Enter" && handleNextStep()}
                  />
                  <Button
                    onClick={handleNextStep}
                    disabled={!profileData.name.trim()}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  >
                    Next
                  </Button>
                </motion.div>
              )}

              {profileCreationStep === "emoji" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="text-center space-y-2">
                    <Smile size={48} className="mx-auto text-blue-400" />
                    <h3 className="text-lg font-medium text-white">
                      Choose Your Emoji
                    </h3>
                    <p className="text-blue-200 text-sm">
                      Pick an emoji that represents you
                    </p>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      "😊",
                      "😎",
                      "🤖",
                      "👾",
                      "🎮",
                      "🚀",
                      "⭐",
                      "🌟",
                      "💫",
                      "✨",
                      "🔥",
                      "💎",
                      "🎯",
                      "🎪",
                      "🎨",
                      "🎭",
                    ].map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() =>
                          setProfileData({ ...profileData, emoji })
                        }
                        className={`p-4 text-2xl rounded-lg border-2 transition-all ${
                          profileData.emoji === emoji
                            ? "border-emerald-400 bg-emerald-400/20"
                            : "border-white/20 hover:border-white/40"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={handleBackStep}
                      className="flex-1 border-white/20 text-white hover:bg-white/10"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleNextStep}
                      disabled={!profileData.emoji}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      Next
                    </Button>
                  </div>
                </motion.div>
              )}

              {profileCreationStep === "age" && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-4"
                >
                  <div className="text-center space-y-2">
                    <Calendar size={48} className="mx-auto text-blue-400" />
                    <h3 className="text-lg font-medium text-white">
                      Age Verification
                    </h3>
                    <p className="text-blue-200 text-sm">
                      Are you an adult or a child?
                    </p>
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() =>
                        setProfileData({ ...profileData, isAdult: true })
                      }
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        profileData.isAdult === true
                          ? "border-emerald-400 bg-emerald-400/20"
                          : "border-white/20 hover:border-white/40"
                      }`}
                    >
                      <div className="text-2xl mb-2">👨‍💼</div>
                      <div className="text-white font-medium">
                        Adult Profile
                      </div>
                      <div className="text-blue-200 text-sm">
                        Full access to all features
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        setProfileData({ ...profileData, isAdult: false })
                      }
                      className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                        profileData.isAdult === false
                          ? "border-emerald-400 bg-emerald-400/20"
                          : "border-white/20 hover:border-white/40"
                      }`}
                    >
                      <div className="text-2xl mb-2">👶</div>
                      <div className="text-white font-medium">
                        Child Profile
                      </div>
                      <div className="text-blue-200 text-sm">
                        Limited access with parental controls
                      </div>
                    </button>
                  </div>
                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      onClick={handleBackStep}
                      className="flex-1 border-white/20 text-white hover:bg-white/10"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleNextStep}
                      disabled={profileData.isAdult === undefined}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                    >
                      Next
                    </Button>
                  </div>
                </motion.div>
              )}

              {profileCreationStep === "voice" && (
                <VoiceRegistration
                  profileData={profileData}
                  onComplete={(userId) => {
                    console.log(
                      "Voice registration completed for user:",
                      userId,
                    );
                    // Handle successful registration
                    setProfileCreationStep(null);
                    setProfileData({ name: "", emoji: "", isAdult: false });
                    onBackToProfiles?.();
                    onProfileCreationStateChange?.(false);
                    onProfileCreationComplete?.(userId);
                  }}
                  onBack={handleBackStep}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default Profile Selection View
  return (
    <div className="h-full p-4 md:p-6">
      <div className="h-full bg-white/8 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Activity Panel Header */}
        <div className="p-6 border-b border-white/10 flex-shrink-0">
          <h2 className="text-xl font-semibold text-white">
            Who's using your wallet today?
          </h2>
          <p className="text-blue-200 text-sm mt-1">
            Identify your profile or create a new one
          </p>
        </div>

        {/* Profile Cards */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Loading State */}
            {isLoadingProfiles && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-blue-200 text-sm">Loading profiles...</p>
              </div>
            )}

            {/* No Profiles State - Show skeleton placeholders */}
            {!isLoadingProfiles && (!profiles || profiles.length === 0) && (
              <div className="space-y-4">
                {/* Bob Skeleton */}
                <div className="bg-white/3 rounded-lg p-4 border-2 border-white/5 cursor-not-allowed opacity-60">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-medium animate-pulse">
                      B
                    </div>
                    <div className="flex-1">
                      <div className="text-white/40 font-medium animate-pulse">
                        Bob
                      </div>
                      <div className="text-blue-200/30 text-sm">
                        Voice User
                      </div>
                      <div className="text-emerald-400/30 text-xs font-medium mt-1 animate-pulse">
                        Create profile to unlock
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  </div>
                </div>

                {/* Alice Skeleton */}
                <div className="bg-white/3 rounded-lg p-4 border-2 border-white/5 cursor-not-allowed opacity-60">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center text-white font-medium animate-pulse">
                      A
                    </div>
                    <div className="flex-1">
                      <div className="text-white/40 font-medium animate-pulse">
                        Alice
                      </div>
                      <div className="text-blue-200/30 text-sm">
                        Voice User
                      </div>
                      <div className="text-emerald-400/30 text-xs font-medium mt-1 animate-pulse">
                        Create profile to unlock
                      </div>
                    </div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  </div>
                </div>

                <div className="text-center py-4">
                  <p className="text-white/40 text-xs">Create your first profile to get started</p>
                </div>
              </div>
            )}

            {/* Profile Cards */}
            {!isLoadingProfiles && profiles && profiles.map((profile) => {
              const isMatchedProfile =
                isProfileMatched && selectedProfile?.id === profile.id;

              return (
                <div
                  key={profile.id}
                  onClick={() => onProfileSelect?.(profile)}
                  className={`bg-white/5 rounded-lg p-4 border-2 cursor-pointer transition-all hover:bg-white/10 ${
                    isMatchedProfile
                      ? "border-emerald-400 bg-emerald-400/10"
                      : selectedProfile?.id === profile.id
                        ? "border-blue-400 bg-blue-400/10"
                        : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-10 h-10">
                      <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                        {profile.name.charAt(0)}
                      </div>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-white font-medium">
                        {profile.name}
                      </div>
                      <div className="text-blue-200 text-sm">
                        {profile.role}
                      </div>
                      {isMatchedProfile && (
                        <div className="text-emerald-400 text-xs font-medium mt-1">
                          Voice matched - Click to proceed
                        </div>
                      )}
                    </div>
                    {isMatchedProfile && (
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    )}
                    {selectedProfile?.id === profile.id &&
                      !isProfileMatched && (
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      )}
                  </div>
                </div>
              );
            })}

            {/* Create Profile Button */}
            <button
              onClick={handleCreateProfile}
              className="w-full bg-white/5 rounded-lg p-4 border-2 border-dashed border-white/20 hover:bg-white/10 transition-all text-center"
            >
              <div className="text-white/70 hover:text-white">
                <Plus size={24} className="mx-auto mb-2" />
                <div className="text-sm">Create New Profile</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
