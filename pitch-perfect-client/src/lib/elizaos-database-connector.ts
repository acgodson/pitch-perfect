/**
 * ElizaOS Database Connector
 * Connects to the local voice database using SQLite for persistence
 */

import { voiceDatabaseService } from "./voice-database";

export class ElizaOSDatabaseConnector {
  private static instance: ElizaOSDatabaseConnector | null = null;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): ElizaOSDatabaseConnector {
    if (!ElizaOSDatabaseConnector.instance) {
      ElizaOSDatabaseConnector.instance = new ElizaOSDatabaseConnector();
    }
    return ElizaOSDatabaseConnector.instance;
  }

  /**
   * Initialize the database connection
   */
  public async initialize(): Promise<void> {
    if (this.isConnected) return;

    try {
      console.log(
        "[ElizaOSDatabaseConnector] Initializing SQLite voice database...",
      );

      // Initialize the voice database service
      await voiceDatabaseService.initialize();

      this.isConnected = true;
      console.log(
        "[ElizaOSDatabaseConnector] Connected to voice database successfully",
      );
    } catch (error) {
      console.error(
        "[ElizaOSDatabaseConnector] Failed to initialize database:",
        error,
      );
      throw new Error(
        `Failed to initialize voice database: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get the voice database service
   */
  public getVoiceDatabaseService() {
    return voiceDatabaseService;
  }

  /**
   * Check if the database is connected
   */
  public isDatabaseConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Close the database connection
   */
  public async close(): Promise<void> {
    if (this.isConnected) {
      await voiceDatabaseService.close();
      this.isConnected = false;
      console.log("[ElizaOSDatabaseConnector] Database connection closed");
    }
  }
}

// Export singleton instance
export const elizaOSDatabaseConnector = ElizaOSDatabaseConnector.getInstance();
