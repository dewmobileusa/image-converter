import { NextResponse } from "next/server";

const WORKFLOW_IDS = {
  easyLighting: "1889119863665844226",
  cartoonBlindBox: "1887752924372860930",
  cartoonPortrait: "1889592477429522434",
  animeCharacter: "1889855846065614850",
  dreamlikeOil: "1889903634522550273",
  idPhoto: "1834120666105933826"
} as const;

const NODE_IDS = {
  easyLighting: "22",
  cartoonBlindBox: "132",
  cartoonPortrait: "226",
  animeCharacter: "40",
  dreamlikeOil: "40",
  idPhoto: "14"
} as const;

// Add type for mode
type RunningHubMode = keyof typeof WORKFLOW_IDS;

export async function POST(request: Request) {
  try {
    const { imageFileName, mode } = await request.json();
    
    // Type check for mode
    if (!imageFileName || !mode || !(mode in WORKFLOW_IDS)) {
      throw new Error("Missing or invalid parameters");
    }

    const typedMode = mode as RunningHubMode;
    const API_KEY = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;
    if (!API_KEY) {
      throw new Error("Missing API key");
    }

    const API_BASE_URL = "https://www.runninghub.ai/api";

    const response = await fetch(`${API_BASE_URL}/task/openapi/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Host": "www.runninghub.ai",
        "Connection": "keep-alive"
      },
      body: JSON.stringify({
        workflowId: WORKFLOW_IDS[typedMode],
        apiKey: API_KEY,
        nodeInfoList: [
          {
            nodeId: NODE_IDS[typedMode],
            fieldName: "image",
            fieldValue: imageFileName
          }
        ]
      }),
    });

    // Get the response text once and reuse it
    const responseText = await response.text();
    console.log('RunningHub response:', responseText);

    try {
      const data = JSON.parse(responseText);
      
      // Check for queue maxed error
      if (data.code === 1 && data.msg?.includes("task queue maxed")) {
        return NextResponse.json(
          {
            code: 1,
            msg: "TASK_QUEUE_MAXED",
            data: null
          },
          { status: 429 } // Too Many Requests
        );
      }

      return NextResponse.json(data);
    } catch (error) {
      console.error("Create task error:", error);
      return NextResponse.json(
        {
          code: 1,
          msg: "Failed to create task: Invalid response format",
          data: null
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Create task error:", error);
    return NextResponse.json(
      { 
        code: 1,
        msg: error instanceof Error ? error.message : "Failed to create task",
        data: null
      },
      { status: 500 }
    );
  }
} 