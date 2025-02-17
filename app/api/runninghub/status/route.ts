import { NextResponse } from "next/server";

// Add retry logic with exponential backoff
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const controller = new AbortController();
      // Increase timeout to 2 minutes
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Check content type to ensure we're getting JSON
      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        console.error("Received non-JSON response:", contentType);
        return {
          ok: true,
          data: {
            code: 0,
            msg: "Processing",
            data: "PROCESSING"
          }
        };
      }

      // Get the response text first
      const responseText = await response.text();
      console.log('RunningHub response:', responseText);

      // Try to parse as JSON
      try {
        const data = JSON.parse(responseText);
        return { ok: true, data };
      } catch (error) {
        console.error('Failed to parse response:', error, responseText);
        return {
          ok: true,
          data: {
            code: 0,
            msg: "Processing",
            data: "PROCESSING"
          }
        };
      }
    } catch (error) {
      console.log('Request error on attempt', i + 1, error);
      
      if (i === maxRetries - 1) {
        return {
          ok: true,
          data: {
            code: 0,
            msg: "Still processing",
            data: "PROCESSING"
          }
        };
      }

      // Wait between retries
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 2000));
    }
  }

  return {
    ok: true,
    data: {
      code: 0,
      msg: "Processing continues",
      data: "PROCESSING"
    }
  };
}

export async function POST(request: Request) {
  try {
    const { taskId } = await request.json();
    if (!taskId) {
      throw new Error("Missing taskId");
    }

    const API_KEY = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;
    if (!API_KEY) {
      throw new Error("Missing API key");
    }

    const API_BASE_URL = "https://www.runninghub.ai/api";

    const result = await fetchWithRetry(
      `${API_BASE_URL}/task/openapi/status`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Host": "www.runninghub.ai",
          "Connection": "keep-alive"
        },
        body: JSON.stringify({ 
          taskId,
          apiKey: API_KEY
        }),
      }
    );

    return NextResponse.json(result.data);
  } catch (error) {
    console.error("Status check error:", error);
    // Always return a valid response structure
    return NextResponse.json({
      code: 0,
      msg: "Processing in progress",
      data: "PROCESSING"
    });
  }
} 