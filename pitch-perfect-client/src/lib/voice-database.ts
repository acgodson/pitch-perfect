/**
 * Voice Database Service
 * Manages voice profiles and settings using file-based storage for persistence
 */

import { VoiceProfile } from "./voice-api-client";
import fs from "fs";
import path from "path";

// Define VoiceSettings interface locally since it's not exported from voice-api-client
export interface VoiceSettings {
  identificationThreshold: number;
  consistencyThreshold: number;
  requiredPhrases: number;
  apiUrl: string;
}

export class VoiceDatabaseService {
  private static instance: VoiceDatabaseService | null = null;
  private isInitialized = false;
  private dataDir = path.resolve(process.cwd(), ".voice-data");
  private profilesFile = path.join(this.dataDir, "profiles.json");
  private settingsFile = path.join(this.dataDir, "settings.json");

  private constructor() {}

  public static getInstance(): VoiceDatabaseService {
    if (!VoiceDatabaseService.instance) {
      VoiceDatabaseService.instance = new VoiceDatabaseService();
    }
    return VoiceDatabaseService.instance;
  }

  /**
   * Initialize the database service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure data directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Initialize files if they don't exist
      await this.ensureFilesExist();

      this.isInitialized = true;
      console.log("[VoiceDatabaseService] Initialized with file-based storage");
    } catch (error) {
      console.error(
        "[VoiceDatabaseService] Failed to initialize database:",
        error,
      );
      throw error;
    }
  }

  /**
   * Ensure data files exist
   */
  private async ensureFilesExist(): Promise<void> {
    // Initialize profiles file
    if (!fs.existsSync(this.profilesFile)) {
      fs.writeFileSync(this.profilesFile, JSON.stringify([], null, 2));
    }

    // Initialize settings file
    if (!fs.existsSync(this.settingsFile)) {
      const defaultSettings: VoiceSettings = {
        identificationThreshold: 0.82,
        consistencyThreshold: 0.7,
        requiredPhrases: 5,
        apiUrl: "http://localhost:8000",
      };
      fs.writeFileSync(
        this.settingsFile,
        JSON.stringify(defaultSettings, null, 2),
      );
    }

    console.log("[VoiceDatabaseService] Data files ensured");
  }

  /**
   * Read profiles from file
   */
  private async readProfiles(): Promise<VoiceProfile[]> {
    try {
      const data = fs.readFileSync(this.profilesFile, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("[VoiceDatabaseService] Error reading profiles:", error);
      return [];
    }
  }

  /**
   * Write profiles to file
   */
  private async writeProfiles(profiles: VoiceProfile[]): Promise<void> {
    try {
      fs.writeFileSync(this.profilesFile, JSON.stringify(profiles, null, 2));
    } catch (error) {
      console.error("[VoiceDatabaseService] Error writing profiles:", error);
      throw error;
    }
  }

  /**
   * Read settings from file
   */
  private async readSettings(): Promise<VoiceSettings | null> {
    try {
      const data = fs.readFileSync(this.settingsFile, "utf8");
      return JSON.parse(data);
    } catch (error) {
      console.error("[VoiceDatabaseService] Error reading settings:", error);
      return null;
    }
  }

  /**
   * Write settings to file
   */
  private async writeSettings(settings: VoiceSettings): Promise<void> {
    try {
      fs.writeFileSync(this.settingsFile, JSON.stringify(settings, null, 2));
    } catch (error) {
      console.error("[VoiceDatabaseService] Error writing settings:", error);
      throw error;
    }
  }

  /**
   * Save a voice profile
   */
  public async saveVoiceProfile(profile: VoiceProfile): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Database not initialized");
    }

    const profiles = await this.readProfiles();
    const existingIndex = profiles.findIndex(
      (p) => p.userId === profile.userId,
    );

    if (existingIndex >= 0) {
      profiles[existingIndex] = profile;
    } else {
      profiles.push(profile);
    }

    await this.writeProfiles(profiles);
    console.log(
      `[VoiceDatabaseService] Saved voice profile for user: ${profile.userName}`,
    );
  }

  /**
   * Get a voice profile by user ID
   */
  public async getVoiceProfile(userId: string): Promise<VoiceProfile | null> {
    if (!this.isInitialized) {
      throw new Error("Database not initialized");
    }

    const profiles = await this.readProfiles();
    return profiles.find((p) => p.userId === userId) || null;
  }

  /**
   * Get all voice profiles
   */
  public async getAllVoiceProfiles(): Promise<VoiceProfile[]> {
    if (!this.isInitialized) {
      throw new Error("Database not initialized");
    }

    const profiles = await this.readProfiles();
    return profiles.sort(
      (a, b) => b.enrollmentTimestamp - a.enrollmentTimestamp,
    );
  }

  /**
   * Get voice profiles by browser session ID
   */
  public async getVoiceProfilesBySession(browserSessionId: string): Promise<VoiceProfile[]> {
    if (!this.isInitialized) {
      throw new Error("Database not initialized");
    }

    const profiles = await this.readProfiles();
    const sessionProfiles = profiles.filter(
      (p) => p.browserSessionId === browserSessionId
    );
    
    return sessionProfiles.sort(
      (a, b) => b.enrollmentTimestamp - a.enrollmentTimestamp,
    );
  }

  /**
   * Delete a voice profile
   */
  public async deleteVoiceProfile(userId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Database not initialized");
    }

    const profiles = await this.readProfiles();
    const filteredProfiles = profiles.filter((p) => p.userId !== userId);
    await this.writeProfiles(filteredProfiles);

    console.log(
      `[VoiceDatabaseService] Deleted voice profile for user: ${userId}`,
    );
  }

  /**
   * Get voice settings
   */
  public async getVoiceSettings(): Promise<VoiceSettings | null> {
    if (!this.isInitialized) {
      throw new Error("Database not initialized");
    }

    return await this.readSettings();
  }

  /**
   * Save voice settings
   */
  public async saveVoiceSettings(settings: VoiceSettings): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Database not initialized");
    }

    await this.writeSettings(settings);
    console.log("[VoiceDatabaseService] Saved voice settings");
  }

  /**
   * Get voice profile count
   */
  public async getVoiceProfileCount(): Promise<number> {
    if (!this.isInitialized) {
      throw new Error("Database not initialized");
    }

    const profiles = await this.readProfiles();
    return profiles.length;
  }

  /**
   * Clear all data
   */
  public async clearAllData(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("Database not initialized");
    }

    await this.writeProfiles([]);

    const defaultSettings: VoiceSettings = {
      identificationThreshold: 0.82,
      consistencyThreshold: 0.7,
      requiredPhrases: 5,
      apiUrl: "http://localhost:8000",
    };
    await this.writeSettings(defaultSettings);

    console.log("[VoiceDatabaseService] All data cleared");
  }

  /**
   * Closes the database connection.
   * Resets the initialization state without destroying the singleton instance.
   */
  public async close(): Promise<void> {
    if (this.isInitialized) {
      console.log("[VoiceDatabaseService] Resetting database service state.");
      this.isInitialized = false;
    }
  }
}

// Export singleton instance
export const voiceDatabaseService = VoiceDatabaseService.getInstance();
