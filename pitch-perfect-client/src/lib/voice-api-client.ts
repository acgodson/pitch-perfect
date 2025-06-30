/**
 * Voice API Client for ElizaOS
 * Handles communication with voice embedding API and voice registry
 */

// Handle both browser and Node.js environments
const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    // Browser environment - use relative URLs
    return "";
  } else {
    // Node.js environment - use Next.js API server
    return "http://localhost:4000";
  }
};

const VOICE_API_BASE = `${getBaseUrl()}/api/eliza/voice`;
const VOICE_REGISTRY_BASE = `${getBaseUrl()}/api/eliza/voice-registry`;

export interface VoiceEmbeddingResponse {
  success: boolean;
  embedding: number[];
  embedding_dimension: number;
  model: string;
  error?: string;
}

export interface VoiceHealthResponse {
  status: string;
  model?: string;
  device?: string;
  embedding_dimension?: number;
}

export interface VoiceProfile {
  userId: string;
  userName: string;
  voiceEmbedding: number[];
  phraseEmbeddings: number[][];
  phrases: string[];
  consistencyScore: number;
  minConsistency: number;
  enrollmentTimestamp: number;
  browserSessionId?: string; // Optional browser session ID for partitioning
}

export interface VoiceIdentificationResult {
  identified: boolean;
  match?: VoiceProfile;
  confidence?: number;
  allScores: Array<{ userName: string; score: number }>;
}

export interface VoiceSearchResult {
  userId: string;
  userName: string;
  score: number;
}

export interface VoiceRegistryStats {
  totalProfiles: number;
  averageConsistency: number;
  totalPhrases: number;
  averagePhrasesPerProfile: number;
}

/**
 * Check voice API health status
 */
export async function checkVoiceApiHealth(): Promise<VoiceHealthResponse> {
  try {
    const response = await fetch(`${VOICE_API_BASE}/health`);

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(
      `Voice API health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Extract voice embedding from audio data
 */
export async function extractVoiceEmbedding(
  audioBlob: Blob,
): Promise<number[]> {
  const formData = new FormData();
  formData.append("audio", audioBlob);

  const response = await fetch(`${VOICE_API_BASE}/extract_embedding`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Voice embedding extraction failed: ${response.status}`);
  }

  const data: VoiceEmbeddingResponse = await response.json();

  if (!data.success) {
    throw new Error(
      data.error || "Unknown error in voice embedding extraction",
    );
  }

  return data.embedding;
}

/**
 * Get voice registry profiles
 */
export async function getVoiceRegistryProfiles(): Promise<{
  profiles: Array<{
    userId: string;
    userName: string;
    consistencyScore: number;
    enrollmentTimestamp: number;
    phrasesCount: number;
  }>;
  totalProfiles: number;
  lastSync: number;
}> {
  const response = await fetch(`${VOICE_REGISTRY_BASE}/profiles`);

  if (!response.ok) {
    throw new Error(
      `Failed to get voice registry profiles: ${response.status}`,
    );
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(
      data.error || "Unknown error getting voice registry profiles",
    );
  }

  return data.data;
}

/**
 * Get full voice registry data
 */
export async function getVoiceRegistry(): Promise<{
  profiles: VoiceProfile[];
  totalProfiles: number;
  lastSync: number;
}> {
  const response = await fetch(`${VOICE_REGISTRY_BASE}/registry`);

  if (!response.ok) {
    throw new Error(`Failed to get voice registry: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Unknown error getting voice registry");
  }

  return data.data;
}

/**
 * Sync voice registry from frontend localStorage
 */
export async function syncVoiceRegistry(
  profiles: VoiceProfile[],
  settings?: any,
): Promise<{
  profilesCount: number;
  lastSync: number;
}> {
  const response = await fetch(`${VOICE_REGISTRY_BASE}/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ profiles, settings }),
  });

  if (!response.ok) {
    throw new Error(`Failed to sync voice registry: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Unknown error syncing voice registry");
  }

  return data.data;
}

/**
 * Identify voice using test embedding
 */
export async function identifyVoice(
  testEmbedding: number[],
  threshold?: number,
): Promise<VoiceIdentificationResult> {
  const response = await fetch(`${VOICE_REGISTRY_BASE}/identify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ testEmbedding, threshold }),
  });

  if (!response.ok) {
    throw new Error(`Failed to identify voice: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Unknown error identifying voice");
  }

  return data.data;
}

/**
 * Search for similar voices
 */
export async function searchVoices(
  embedding: number[],
  topK: number = 5,
): Promise<VoiceSearchResult[]> {
  const response = await fetch(`${VOICE_REGISTRY_BASE}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ embedding, topK }),
  });

  if (!response.ok) {
    throw new Error(`Failed to search voices: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Unknown error searching voices");
  }

  return data.data;
}

/**
 * Get voice registry statistics
 */
export async function getVoiceRegistryStats(): Promise<VoiceRegistryStats> {
  const response = await fetch(`${VOICE_REGISTRY_BASE}/stats`);

  if (!response.ok) {
    throw new Error(`Failed to get voice registry stats: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Unknown error getting voice registry stats");
  }

  return data.data;
}

/**
 * Get voice registry settings
 */
export async function getVoiceSettings(): Promise<{
  identificationThreshold: number;
  consistencyThreshold: number;
  requiredPhrases: number;
  apiUrl: string;
}> {
  const response = await fetch(`${VOICE_REGISTRY_BASE}/settings`);

  if (!response.ok) {
    throw new Error(`Failed to get voice settings: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Unknown error getting voice settings");
  }

  return data.data;
}

/**
 * Clear voice registry cache
 */
export async function clearVoiceRegistry(): Promise<{ message: string }> {
  const response = await fetch(`${VOICE_REGISTRY_BASE}/clear`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to clear voice registry: ${response.status}`);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Unknown error clearing voice registry");
  }

  return data.data;
}

/**
 * Transcribe audio using our local transcription service
 * This uses OpenAI's Whisper API via our Next.js route
 */
export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("audio", audioBlob);

    const response = await fetch("/api/eliza/voice/transcribe", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Unknown error in transcription");
    }

    return data.transcript || "Voice recording for identification";
  } catch (error) {
    console.error("[Voice API] Transcription error:", error);
    // Return a fallback message if transcription fails
    return "Voice recording for identification";
  }
}
