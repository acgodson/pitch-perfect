/**
 * Voice Session State Manager
 * Manages voice identification session state with browser persistence
 */

export interface VoiceSessionState {
  isUnlocked: boolean;
  identifiedUser?: string;
  identifiedUserId?: string;
  confidence?: number;
  unlockTimestamp?: number;
  browserSessionId?: string;
  expirationTime?: number; // Session expiration
}

const SESSION_STORAGE_KEY = "voice_session_state";
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export class VoiceSessionStateManager {
  private static instance: VoiceSessionStateManager | null = null;

  private constructor() {}

  public static getInstance(): VoiceSessionStateManager {
    if (!VoiceSessionStateManager.instance) {
      VoiceSessionStateManager.instance = new VoiceSessionStateManager();
    }
    return VoiceSessionStateManager.instance;
  }

  /**
   * Get current session state from localStorage
   */
  getSessionState(): VoiceSessionState | null {
    try {
      // Check if we're in a browser environment
      if (typeof window === "undefined" || typeof localStorage === "undefined") {
        return null;
      }

      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!stored) return null;

      const state: VoiceSessionState = JSON.parse(stored);
      
      // Check if session has expired
      if (state.expirationTime && Date.now() > state.expirationTime) {
        this.clearSessionState();
        return null;
      }

      return state;
    } catch (error) {
      console.error("[VoiceSessionState] Error reading session state:", error);
      return null;
    }
  }

  /**
   * Set session state to localStorage
   */
  setSessionState(state: VoiceSessionState): void {
    try {
      // Check if we're in a browser environment
      if (typeof window === "undefined" || typeof localStorage === "undefined") {
        console.log("[VoiceSessionState] Skipping localStorage save - not in browser environment");
        return;
      }

      // Set expiration time if not provided
      if (!state.expirationTime) {
        state.expirationTime = Date.now() + SESSION_TIMEOUT;
      }

      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
      console.log("[VoiceSessionState] Session state saved:", {
        identifiedUser: state.identifiedUser,
        isUnlocked: state.isUnlocked,
        expiresAt: new Date(state.expirationTime).toISOString(),
      });
    } catch (error) {
      console.error("[VoiceSessionState] Error saving session state:", error);
    }
  }

  /**
   * Update session with identification data
   */
  updateWithIdentification(identificationData: {
    identifiedUser: string;
    identifiedUserId: string;
    confidence: number;
    browserSessionId?: string;
  }): void {
    const state: VoiceSessionState = {
      isUnlocked: true,
      identifiedUser: identificationData.identifiedUser,
      identifiedUserId: identificationData.identifiedUserId,
      confidence: identificationData.confidence,
      unlockTimestamp: Date.now(),
      browserSessionId: identificationData.browserSessionId,
      expirationTime: Date.now() + SESSION_TIMEOUT,
    };

    this.setSessionState(state);
  }

  /**
   * Clear session state
   */
  clearSessionState(): void {
    try {
      // Check if we're in a browser environment
      if (typeof window === "undefined" || typeof localStorage === "undefined") {
        return;
      }

      localStorage.removeItem(SESSION_STORAGE_KEY);
      console.log("[VoiceSessionState] Session state cleared");
    } catch (error) {
      console.error("[VoiceSessionState] Error clearing session state:", error);
    }
  }

  /**
   * Check if current session is unlocked and valid
   */
  isSessionUnlocked(): boolean {
    const state = this.getSessionState();
    return state?.isUnlocked || false;
  }

  /**
   * Get identified user from current session
   */
  getIdentifiedUser(): { userName: string; userId: string; confidence: number } | null {
    const state = this.getSessionState();
    if (state?.isUnlocked && state.identifiedUser && state.identifiedUserId) {
      return {
        userName: state.identifiedUser,
        userId: state.identifiedUserId,
        confidence: state.confidence || 0,
      };
    }
    return null;
  }

  /**
   * Extend session expiration
   */
  extendSession(): void {
    const currentState = this.getSessionState();
    if (currentState) {
      currentState.expirationTime = Date.now() + SESSION_TIMEOUT;
      this.setSessionState(currentState);
      console.log("[VoiceSessionState] Session extended");
    }
  }

  /**
   * Check if session is about to expire (within 5 minutes)
   */
  isSessionExpiringSoon(): boolean {
    const state = this.getSessionState();
    if (!state?.expirationTime) return false;
    
    const timeUntilExpiration = state.expirationTime - Date.now();
    return timeUntilExpiration <= 5 * 60 * 1000; // 5 minutes
  }
}

// Export singleton instance
export const voiceSessionState = VoiceSessionStateManager.getInstance();