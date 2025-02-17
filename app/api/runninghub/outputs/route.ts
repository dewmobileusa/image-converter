import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { taskId } = await request.json();
    const API_KEY = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;
    const API_BASE_URL = "https://www.runninghub.ai/api";

    const response = await fetch(`${API_BASE_URL}/task/openapi/outputs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "*/*",
        "Host": "www.runninghub.ai",
        "Connection": "keep-alive"
      },
      body: JSON.stringify({ 
        taskId,
        apiKey: API_KEY
      }),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Get outputs error:", error);
    return NextResponse.json(
      { error: "Failed to get outputs" },
      { status: 500 }
    );
  }
} 