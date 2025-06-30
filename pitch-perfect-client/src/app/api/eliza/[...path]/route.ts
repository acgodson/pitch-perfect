import { NextRequest, NextResponse } from "next/server";

const ELIZA_SERVER_URL =
  process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join("/");
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.toString();
    const elizaApiUrl = `${ELIZA_SERVER_URL}/api/${path}${query ? `?${query}` : ""}`;

    console.log(`[Eliza Proxy] GET ${elizaApiUrl}`);

    const response = await fetch(elizaApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `[Eliza Proxy] API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-API-KEY",
      },
    });
  } catch (error) {
    console.error("[Eliza Proxy] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect to ElizaOS API",
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
    const elizaApiUrl = `${ELIZA_SERVER_URL}/api/${path}`;

    console.log(`[Eliza Proxy] POST ${elizaApiUrl}`);

    const body = await request.text();
    const contentType =
      request.headers.get("content-type") || "application/json";

    const response = await fetch(elizaApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": contentType,
        Accept: "application/json",
      },
      body,
    });

    if (!response.ok) {
      console.error(
        `[Eliza Proxy] API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-API-KEY",
      },
    });
  } catch (error) {
    console.error("[Eliza Proxy] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect to ElizaOS API",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join("/");
    const elizaApiUrl = `${ELIZA_SERVER_URL}/api/${path}`;

    console.log(`[Eliza Proxy] PUT ${elizaApiUrl}`);

    const body = await request.text();
    const contentType =
      request.headers.get("content-type") || "application/json";

    const response = await fetch(elizaApiUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        Accept: "application/json",
      },
      body,
    });

    if (!response.ok) {
      console.error(
        `[Eliza Proxy] API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-API-KEY",
      },
    });
  } catch (error) {
    console.error("[Eliza Proxy] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect to ElizaOS API",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const resolvedParams = await params;
    const path = resolvedParams.path.join("/");
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.toString();
    const elizaApiUrl = `${ELIZA_SERVER_URL}/api/${path}${query ? `?${query}` : ""}`;

    console.log(`[Eliza Proxy] DELETE ${elizaApiUrl}`);

    const response = await fetch(elizaApiUrl, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `[Eliza Proxy] API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-API-KEY",
      },
    });
  } catch (error) {
    console.error("[Eliza Proxy] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to connect to ElizaOS API",
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
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-KEY",
    },
  });
}
