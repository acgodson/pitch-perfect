import { NextRequest, NextResponse } from "next/server";
import { elizaOSDatabaseConnector } from "../../../../../lib/elizaos-database-connector";
import { voiceDatabaseService } from "../../../../../lib/voice-database";

interface VoiceProfile {
  userId: string;
  userName: string;
  voiceEmbedding: number[];
  phraseEmbeddings: number[][];
  phrases: string[];
  consistencyScore: number;
  minConsistency: number;
  enrollmentTimestamp: number;
}

interface VoiceSettings {
  identificationThreshold: number;
  consistencyThreshold: number;
  requiredPhrases: number;
  apiUrl: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ action: string[] }> },
) {
  try {
    const resolvedParams = await params;
    const action = resolvedParams.action.join("/");

    console.log(`[Eliza Voice Registry] GET /${action}`);

    // Initialize database connection
    await elizaOSDatabaseConnector.initialize();
    const dbService = voiceDatabaseService;

    switch (action) {
      case "profiles":
        // Return profile summaries for ElizaOS provider
        const allProfiles = await dbService.getAllVoiceProfiles();
        const profileSummaries = allProfiles.map((profile) => ({
          userId: profile.userId,
          userName: profile.userName,
          consistencyScore: profile.consistencyScore,
          enrollmentTimestamp: profile.enrollmentTimestamp,
          phrasesCount: profile.phrases.length,
        }));

        return NextResponse.json({
          success: true,
          data: {
            profiles: profileSummaries,
            totalProfiles: allProfiles.length,
            lastSync: Date.now(),
          },
        });

      case "profiles/session":
        // Return profile summaries filtered by browser session
        const { searchParams } = new URL(request.url);
        const browserSessionId = searchParams.get("sessionId");
        
        if (!browserSessionId) {
          return NextResponse.json(
            { success: false, error: "Missing sessionId parameter" },
            { status: 400 },
          );
        }

        const sessionProfiles = await dbService.getVoiceProfilesBySession(browserSessionId);
        const sessionProfileSummaries = sessionProfiles.map((profile) => ({
          userId: profile.userId,
          userName: profile.userName,
          consistencyScore: profile.consistencyScore,
          enrollmentTimestamp: profile.enrollmentTimestamp,
          phrasesCount: profile.phrases.length,
        }));

        return NextResponse.json({
          success: true,
          data: {
            profiles: sessionProfileSummaries,
            totalProfiles: sessionProfiles.length,
            lastSync: Date.now(),
            browserSessionId: browserSessionId,
          },
        });

      case "registry":
        // Return full registry data
        const profiles = await dbService.getAllVoiceProfiles();
        const settings = await dbService.getVoiceSettings();

        return NextResponse.json({
          success: true,
          data: {
            profiles: profiles,
            totalProfiles: profiles.length,
            lastSync: Date.now(),
            settings: settings,
          },
        });

      case "registry/session":
        // Return full registry data filtered by browser session
        const { searchParams: sessionSearchParams } = new URL(request.url);
        const sessionId = sessionSearchParams.get("sessionId");
        
        if (!sessionId) {
          return NextResponse.json(
            { success: false, error: "Missing sessionId parameter" },
            { status: 400 },
          );
        }

        const sessionRegistryProfiles = await dbService.getVoiceProfilesBySession(sessionId);
        const sessionSettings = await dbService.getVoiceSettings();

        return NextResponse.json({
          success: true,
          data: {
            profiles: sessionRegistryProfiles,
            totalProfiles: sessionRegistryProfiles.length,
            lastSync: Date.now(),
            settings: sessionSettings,
            browserSessionId: sessionId,
          },
        });

      case "settings":
        const voiceSettings = await dbService.getVoiceSettings();
        return NextResponse.json({
          success: true,
          data: voiceSettings || {
            identificationThreshold: 0.82,
            consistencyThreshold: 0.7,
            requiredPhrases: 5,
            apiUrl: "http://localhost:8000",
          },
        });

      case "embeddings":
        // Return embeddings for vector search
        const profilesWithEmbeddings = await dbService.getAllVoiceProfiles();
        const embeddings = profilesWithEmbeddings.map((profile) => ({
          userId: profile.userId,
          userName: profile.userName,
          centroidEmbedding: profile.voiceEmbedding,
          phraseEmbeddings: profile.phraseEmbeddings,
          embeddingDimension: profile.voiceEmbedding.length,
        }));

        return NextResponse.json({
          success: true,
          data: embeddings,
        });

      case "stats":
        const allProfilesForStats = await dbService.getAllVoiceProfiles();
        const stats = calculateRegistryStats(allProfilesForStats);
        return NextResponse.json({
          success: true,
          data: stats,
        });

      default:
        return NextResponse.json(
          { success: false, error: "Unknown action" },
          { status: 404 },
        );
    }
  } catch (error) {
    console.error("[Eliza Voice Registry] GET Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string[] }> },
) {
  try {
    const resolvedParams = await params;
    const action = resolvedParams.action.join("/");
    const body = await request.json();

    console.log(`[Eliza Voice Registry] POST /${action}`);

    // Initialize database connection
    await elizaOSDatabaseConnector.initialize();
    const dbService = voiceDatabaseService;

    switch (action) {
      case "sync":
        // Frontend sends its localStorage data to sync with server
        if (body.profiles && Array.isArray(body.profiles)) {
          // Save each profile to the database
          for (const profile of body.profiles) {
            await dbService.saveVoiceProfile(profile);
          }

          console.log(
            `[Eliza Voice Registry] Synced ${body.profiles.length} profiles to database`,
          );
        }

        if (body.settings) {
          await dbService.saveVoiceSettings(body.settings);
        }

        const profileCount = await dbService.getVoiceProfileCount();
        return NextResponse.json({
          success: true,
          data: {
            profilesCount: profileCount,
            lastSync: Date.now(),
          },
        });

      case "identify":
        // Perform voice identification using database registry
        const { testEmbedding, threshold } = body;

        if (!testEmbedding || !Array.isArray(testEmbedding)) {
          return NextResponse.json(
            { success: false, error: "Invalid test embedding" },
            { status: 400 },
          );
        }

        const allProfilesForIdentification =
          await dbService.getAllVoiceProfiles();
        const settingsForIdentification = await dbService.getVoiceSettings();
        const identificationThreshold =
          threshold ||
          settingsForIdentification?.identificationThreshold ||
          0.82;

        const identificationResult = performVoiceIdentification(
          testEmbedding,
          allProfilesForIdentification,
          identificationThreshold,
        );

        return NextResponse.json({
          success: true,
          data: identificationResult,
        });

      case "identify/session":
        // Perform voice identification using database registry filtered by session
        const { testEmbedding: sessionTestEmbedding, threshold: sessionThreshold, browserSessionId } = body;

        if (!sessionTestEmbedding || !Array.isArray(sessionTestEmbedding)) {
          return NextResponse.json(
            { success: false, error: "Invalid test embedding" },
            { status: 400 },
          );
        }

        if (!browserSessionId) {
          return NextResponse.json(
            { success: false, error: "Missing browserSessionId" },
            { status: 400 },
          );
        }

        const sessionProfilesForIdentification =
          await dbService.getVoiceProfilesBySession(browserSessionId);
        const sessionSettingsForIdentification = await dbService.getVoiceSettings();
        const sessionIdentificationThreshold =
          sessionThreshold ||
          sessionSettingsForIdentification?.identificationThreshold ||
          0.82;

        const sessionIdentificationResult = performVoiceIdentification(
          sessionTestEmbedding,
          sessionProfilesForIdentification,
          sessionIdentificationThreshold,
        );

        return NextResponse.json({
          success: true,
          data: {
            ...sessionIdentificationResult,
            browserSessionId: browserSessionId,
            profilesSearched: sessionProfilesForIdentification.length,
          },
        });

      case "search":
        // Vector similarity search
        const { embedding, topK } = body;

        if (!embedding || !Array.isArray(embedding)) {
          return NextResponse.json(
            { success: false, error: "Invalid embedding" },
            { status: 400 },
          );
        }

        const allProfilesForSearch = await dbService.getAllVoiceProfiles();
        const searchResults = performVectorSearch(
          embedding,
          allProfilesForSearch,
          topK || 5,
        );

        return NextResponse.json({
          success: true,
          data: searchResults,
        });

      case "search/session":
        // Vector similarity search filtered by session
        const { embedding: sessionEmbedding, topK: sessionTopK, browserSessionId: searchSessionId } = body;

        if (!sessionEmbedding || !Array.isArray(sessionEmbedding)) {
          return NextResponse.json(
            { success: false, error: "Invalid embedding" },
            { status: 400 },
          );
        }

        if (!searchSessionId) {
          return NextResponse.json(
            { success: false, error: "Missing browserSessionId" },
            { status: 400 },
          );
        }

        const sessionProfilesForSearch = await dbService.getVoiceProfilesBySession(searchSessionId);
        const sessionSearchResults = performVectorSearch(
          sessionEmbedding,
          sessionProfilesForSearch,
          sessionTopK || 5,
        );

        return NextResponse.json({
          success: true,
          data: {
            results: sessionSearchResults,
            browserSessionId: searchSessionId,
            profilesSearched: sessionProfilesForSearch.length,
          },
        });

      default:
        return NextResponse.json(
          { success: false, error: "Unknown action" },
          { status: 404 },
        );
    }
  } catch (error) {
    console.error("[Eliza Voice Registry] POST Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ action: string[] }> },
) {
  try {
    const resolvedParams = await params;
    const action = resolvedParams.action.join("/");

    console.log(`[Eliza Voice Registry] DELETE /${action}`);

    // Initialize database connection
    await elizaOSDatabaseConnector.initialize();
    const dbService = voiceDatabaseService;

    switch (action) {
      case "clear":
        await dbService.clearAllData();
        return NextResponse.json({
          success: true,
          data: { message: "All voice data cleared" },
        });

      default:
        return NextResponse.json(
          { success: false, error: "Unknown action" },
          { status: 404 },
        );
    }
  } catch (error) {
    console.error("[Eliza Voice Registry] DELETE Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function performVoiceIdentification(
  testEmbedding: number[],
  registry: VoiceProfile[],
  threshold: number,
) {
  if (registry.length === 0) {
    return {
      identified: false,
      confidence: 0,
      allScores: [],
    };
  }

  const scores = registry.map((profile) => ({
    userName: profile.userName,
    score: cosineSimilarity(testEmbedding, profile.voiceEmbedding),
  }));

  scores.sort((a, b) => b.score - a.score);
  const bestMatch = scores[0];

  return {
    identified: bestMatch.score >= threshold,
    match:
      bestMatch.score >= threshold
        ? registry.find((p) => p.userName === bestMatch.userName)
        : undefined,
    confidence: bestMatch.score,
    allScores: scores,
  };
}

function performVectorSearch(
  queryEmbedding: number[],
  registry: VoiceProfile[],
  topK: number,
) {
  const scores = registry.map((profile) => ({
    userId: profile.userId,
    userName: profile.userName,
    score: cosineSimilarity(queryEmbedding, profile.voiceEmbedding),
  }));

  return scores.sort((a, b) => b.score - a.score).slice(0, topK);
}

function calculateRegistryStats(registry: VoiceProfile[]) {
  if (registry.length === 0) {
    return {
      totalProfiles: 0,
      averageConsistency: 0,
      totalPhrases: 0,
      averagePhrasesPerProfile: 0,
    };
  }

  const totalProfiles = registry.length;
  const averageConsistency =
    registry.reduce((sum, p) => sum + p.consistencyScore, 0) / totalProfiles;
  const totalPhrases = registry.reduce((sum, p) => sum + p.phrases.length, 0);
  const averagePhrasesPerProfile = totalPhrases / totalProfiles;

  return {
    totalProfiles,
    averageConsistency,
    totalPhrases,
    averagePhrasesPerProfile,
  };
}
