import {
  syncVoiceRegistry,
  getVoiceRegistry,
  type VoiceProfile,
} from "./voice-api-client";

/**
 * Voice Sync Manager for ElizaOS
 * Handles synchronization between browser localStorage and server-side voice registry
 */

const VOICE_REGISTRY_KEY = "elizaVoiceRegistry";
const VOICE_SETTINGS_KEY = "elizaVoiceSettings";
const BROWSER_SESSION_KEY = "elizaBrowserSessionId";

export interface VoiceSettings {
  identificationThreshold: number;
  consistencyThreshold: number;
  requiredPhrases: number;
  apiUrl: string;
}

export interface VoiceRegistryData {
  profiles: VoiceProfile[];
  settings: VoiceSettings;
  lastSync: number;
  browserSessionId: string;
}

export class VoiceSyncManager {
  private static instance: VoiceSyncManager | null = null;
  private syncInProgress = false;
  private lastSyncAttempt = 0;
  private syncInterval = 30000; // 30 seconds
  private browserSessionId: string;

  private constructor() {
    this.browserSessionId = this.getOrCreateBrowserSessionId();
  }

  public static getInstance(): VoiceSyncManager {
    if (!VoiceSyncManager.instance) {
      VoiceSyncManager.instance = new VoiceSyncManager();
    }
    return VoiceSyncManager.instance;
  }

  /**
   * Get or create a unique browser session ID
   */
  private getOrCreateBrowserSessionId(): string {
    if (typeof window === "undefined") {
      return "server-session";
    }

    let sessionId = localStorage.getItem(BROWSER_SESSION_KEY);
    if (!sessionId) {
      sessionId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(BROWSER_SESSION_KEY, sessionId);
      console.log("[VoiceSyncManager] Created new browser session ID:", sessionId);
    }
    return sessionId;
  }

  /**
   * Get the current browser session ID
   */
  public getBrowserSessionId(): string {
    return this.browserSessionId;
  }

  /**
   * Get voice registry from localStorage with session partitioning
   */
  public getVoiceRegistryFromStorage(): VoiceRegistryData {
    if (typeof window === "undefined") {
      return {
        profiles: [],
        settings: this.getDefaultSettings(),
        lastSync: 0,
        browserSessionId: this.browserSessionId,
      };
    }

    try {
      const storedRegistry = localStorage.getItem(VOICE_REGISTRY_KEY);
      const storedSettings = localStorage.getItem(VOICE_SETTINGS_KEY);

      const profiles = storedRegistry ? JSON.parse(storedRegistry) : [];
      
      // Filter profiles by current browser session
      const sessionProfiles = profiles.filter((profile: any) => 
        profile.browserSessionId === this.browserSessionId
      );

      return {
        profiles: sessionProfiles,
        settings: storedSettings
          ? JSON.parse(storedSettings)
          : this.getDefaultSettings(),
        lastSync: parseInt(localStorage.getItem("elizaVoiceLastSync") || "0"),
        browserSessionId: this.browserSessionId,
      };
    } catch (error) {
      console.error(
        "[VoiceSyncManager] Error reading from localStorage:",
        error,
      );
      return {
        profiles: [],
        settings: this.getDefaultSettings(),
        lastSync: 0,
        browserSessionId: this.browserSessionId,
      };
    }
  }

  /**
   * Save voice registry to localStorage
   */
  public saveVoiceRegistryToStorage(data: VoiceRegistryData): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(VOICE_REGISTRY_KEY, JSON.stringify(data.profiles));
      localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(data.settings));
      localStorage.setItem("elizaVoiceLastSync", data.lastSync.toString());
    } catch (error) {
      console.error("[VoiceSyncManager] Error saving to localStorage:", error);
    }
  }

  /**
   * Add a voice profile to localStorage
   */
  public addVoiceProfile(profile: VoiceProfile): void {
    if (typeof window === "undefined") {
      console.warn("[VoiceSyncManager] Cannot add profile on server side");
      return;
    }

    try {
      const currentData = this.getVoiceRegistryFromStorage();
      
      // Add browser session ID to the profile if not already present
      const profileWithSession = {
        ...profile,
        browserSessionId: profile.browserSessionId || this.browserSessionId,
      };

      // Check if profile already exists (by userId)
      const existingIndex = currentData.profiles.findIndex(
        (p) => p.userId === profile.userId,
      );

      if (existingIndex >= 0) {
        // Update existing profile
        currentData.profiles[existingIndex] = profileWithSession;
        console.log(
          `[VoiceSyncManager] Updated existing voice profile: ${profile.userName}`,
        );
      } else {
        // Add new profile
        currentData.profiles.push(profileWithSession);
        console.log(
          `[VoiceSyncManager] Added new voice profile: ${profile.userName}`,
        );
      }

      // Save to localStorage
      localStorage.setItem(VOICE_REGISTRY_KEY, JSON.stringify(currentData.profiles));
      localStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(currentData.settings));
      localStorage.setItem("elizaVoiceLastSync", currentData.lastSync.toString());

      console.log(
        `[VoiceSyncManager] Voice registry saved to localStorage: ${currentData.profiles.length} profiles`,
      );
    } catch (error) {
      console.error("[VoiceSyncManager] Error adding voice profile:", error);
    }
  }

  /**
   * Update an existing voice profile
   */
  public updateVoiceProfile(
    userId: string,
    updates: Partial<VoiceProfile>,
  ): void {
    const data = this.getVoiceRegistryFromStorage();
    const index = data.profiles.findIndex((p) => p.userId === userId);

    if (index !== -1) {
      data.profiles[index] = { ...data.profiles[index], ...updates };
      data.lastSync = Date.now();
      this.saveVoiceRegistryToStorage(data);
    }
  }

  /**
   * Remove a voice profile
   */
  public removeVoiceProfile(userId: string): void {
    const data = this.getVoiceRegistryFromStorage();
    data.profiles = data.profiles.filter((p) => p.userId !== userId);
    data.lastSync = Date.now();
    this.saveVoiceRegistryToStorage(data);
  }

  /**
   * Update voice settings
   */
  public updateVoiceSettings(settings: Partial<VoiceSettings>): void {
    const data = this.getVoiceRegistryFromStorage();
    data.settings = { ...data.settings, ...settings };
    data.lastSync = Date.now();
    this.saveVoiceRegistryToStorage(data);
  }

  /**
   * Sync localStorage data to server
   */
  public async syncToServer(): Promise<boolean> {
    if (this.syncInProgress) {
      console.log("[VoiceSyncManager] Sync already in progress, skipping");
      return false;
    }

    this.syncInProgress = true;

    try {
      const localData = this.getVoiceRegistryFromStorage();
      console.log(
        `[VoiceSyncManager] Syncing ${localData.profiles.length} profiles to server`,
      );

      // Determine the correct URL based on environment
      const baseUrl = typeof window === "undefined" 
        ? "http://localhost:4000"  // Node.js/ElizaOS agent environment
        : "";                      // Browser environment (relative URLs work)
      
      const syncUrl = `${baseUrl}/api/eliza/voice-registry/sync`;

      // Use session-based sync endpoint
      const response = await fetch(syncUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          profiles: localData.profiles,
          settings: localData.settings,
          browserSessionId: this.browserSessionId, // Include browser session ID
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Unknown error in sync");
      }

      console.log(
        `[VoiceSyncManager] ✅ Synced ${data.data.profilesCount} profiles to server`,
      );

      // Update last sync timestamp
      localData.lastSync = data.data.lastSync;
      this.saveVoiceRegistryToStorage(localData);

      return true;
    } catch (error) {
      console.error("[VoiceSyncManager] ❌ Sync error:", error);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync server data to localStorage
   */
  public async syncFromServer(): Promise<boolean> {
    if (this.syncInProgress) {
      console.log("[VoiceSyncManager] Sync already in progress, skipping");
      return false;
    }

    this.syncInProgress = true;

    try {
      console.log("[VoiceSyncManager] Syncing from server...");

      // Determine the correct URL based on environment
      const baseUrl = typeof window === "undefined" 
        ? "http://localhost:4000"  // Node.js/ElizaOS agent environment
        : "";                      // Browser environment (relative URLs work)
      
      const registryUrl = `${baseUrl}/api/eliza/voice-registry/registry/session?sessionId=${this.browserSessionId}`;

      // Use session-based registry endpoint
      const response = await fetch(registryUrl);

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Unknown error in sync");
      }

      const serverData = data.data;

      console.log(
        `[VoiceSyncManager] ✅ Synced ${serverData.profiles.length} profiles from server`,
      );

      // Merge server data with local data
      const currentData = this.getVoiceRegistryFromStorage();
      const mergedData: VoiceRegistryData = {
        profiles: serverData.profiles, // Use server profiles (they're already filtered by session)
        settings: currentData.settings, // Keep local settings
        lastSync: serverData.lastSync,
        browserSessionId: this.browserSessionId,
      };

      this.saveVoiceRegistryToStorage(mergedData);

      return true;
    } catch (error) {
      console.error("[VoiceSyncManager] ❌ Sync error:", error);
      return false;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Perform bidirectional sync
   */
  public async performSync(): Promise<boolean> {
    console.log("[VoiceSyncManager] Performing bidirectional sync");

    // First sync local to server
    const toServerSuccess = await this.syncToServer();

    // Then sync server to local
    const fromServerSuccess = await this.syncFromServer();

    return toServerSuccess || fromServerSuccess;
  }

  /**
   * Get default voice settings
   */
  private getDefaultSettings(): VoiceSettings {
    return {
      identificationThreshold: 0.82,
      consistencyThreshold: 0.7,
      requiredPhrases: 5,
      apiUrl: process.env.NEXT_PUBLIC_VOICE_API_URL || "http://localhost:8000",
    };
  }

  /**
   * Clear all voice data
   */
  public clearAllData(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(VOICE_REGISTRY_KEY);
      localStorage.removeItem(VOICE_SETTINGS_KEY);
      localStorage.removeItem("elizaVoiceLastSync");
      console.log("[VoiceSyncManager] All voice data cleared");
    } catch (error) {
      console.error("[VoiceSyncManager] Error clearing data:", error);
    }
  }

  /**
   * Get sync status
   */
  public getSyncStatus(): {
    lastSync: number;
    profilesCount: number;
    syncInProgress: boolean;
  } {
    const data = this.getVoiceRegistryFromStorage();
    return {
      lastSync: data.lastSync,
      profilesCount: data.profiles.length,
      syncInProgress: this.syncInProgress,
    };
  }

  /**
   * Set sync interval
   */
  public setSyncInterval(interval: number): void {
    this.syncInterval = interval;
  }
}

// Export singleton instance
export const voiceSyncManager = VoiceSyncManager.getInstance();
