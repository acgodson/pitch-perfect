import { NextRequest, NextResponse } from "next/server";

const VOICE_API_URL =
  process.env.VOICE_API_URL ||
  process.env.NEXT_PUBLIC_VOICE_API_URL ||
  "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join("/");
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.toString();
    const voiceApiUrl = `${VOICE_API_URL}/${path}${query ? `?${query}` : ""}`;

    console.log(`[Eliza Voice Proxy] GET ${voiceApiUrl}`);

    const response = await fetch(voiceApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `[Eliza Voice Proxy] API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-API-KEY",
      },
    });
  } catch (error) {
    console.error("[Eliza Voice Proxy] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect to Voice Embedding API",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join("/");
    const voiceApiUrl = `${VOICE_API_URL}/${path}`;

    console.log(`[Eliza Voice Proxy] POST ${voiceApiUrl}`);

    // Handle different content types
    const contentType = request.headers.get("content-type") || "";
    let body: any;

    if (contentType.includes("multipart/form-data")) {
      // For audio file uploads - pass through FormData
      body = await request.formData();
    } else if (contentType.includes("application/json")) {
      // For JSON data
      const text = await request.text();
      body = text;
    } else {
      // For other content types
      body = await request.arrayBuffer();
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    // Only set Content-Type for non-FormData requests
    if (!(body instanceof FormData)) {
      headers["Content-Type"] = contentType || "application/json";
    }

    const response = await fetch(voiceApiUrl, {
      method: "POST",
      headers,
      body:
        body instanceof FormData
          ? body
          : typeof body === "string"
            ? body
            : new Uint8Array(body as ArrayBuffer),
    });

    if (!response.ok) {
      console.error(
        `[Eliza Voice Proxy] API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-API-KEY",
      },
    });
  } catch (error) {
    console.error("[Eliza Voice Proxy] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect to Voice Embedding API",
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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-KEY",
    },
  });
}
