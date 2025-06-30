import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log("[Voice Transcription] Processing audio transcription");

    // Get the audio file from the request
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: "No audio file provided" },
        { status: 400 },
      );
    }

    // Convert File to Buffer for OpenAI
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());

    // Create a File object that OpenAI can handle
    const openaiFile = new File([audioBuffer], "audio.webm", {
      type: audioFile.type || "audio/webm",
    });

    // Transcribe using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: openaiFile,
      language: "en", // optional
    });

    console.log(
      "[Voice Transcription] Transcription completed:",
      transcription.text,
    );

    return NextResponse.json({
      success: true,
      transcript: transcription.text,
      model: "whisper-1",
    });
  } catch (error) {
    console.error("[Voice Transcription] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Transcription failed",
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
