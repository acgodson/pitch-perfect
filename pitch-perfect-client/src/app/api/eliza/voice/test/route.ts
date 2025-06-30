import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Voice API Test Endpoint",
    endpoints: {
      embedding: "/api/eliza/voice/extract_embedding",
      transcription: "/api/eliza/voice/transcribe",
      registry: "/api/eliza/voice-registry/profiles",
    },
    status: "ready",
  });
}
