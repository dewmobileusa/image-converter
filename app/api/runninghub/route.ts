import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;
if (!API_KEY) {
  throw new Error('RunningHub API key is not configured');
}

const API_BASE_URL = 'https://www.runninghub.ai/task/openapi';

// Single image workflow and node IDs
const SINGLE_IMAGE_WORKFLOW_IDS = {
  easyLighting: "1889119863665844226",
  cartoonBlindBox: "1887752924372860930",
  cartoonPortrait: "1889592477429522434",
  animeCharacter: "1889855846065614850",
  dreamlikeOil: "1889903634522550273",
  idPhoto: "1834120666105933826"
} as const;

const SINGLE_IMAGE_NODE_IDS = {
  easyLighting: "22",
  cartoonBlindBox: "132",
  cartoonPortrait: "226",
  animeCharacter: "40",
  dreamlikeOil: "40",
  idPhoto: "14"
} as const;

// Dual image workflow and node IDs
const DUAL_IMAGE_WORKFLOW_IDS = {
  clothTryOn: "1891600506811273217"
} as const;

const DUAL_IMAGE_NODE_IDS = {
  clothTryOn: {
    source: "6",
    target: "7"
  }
} as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('API: Received request body:', body);
    const { action = "upload", ...requestData } = body;

    let response;
    switch (action) {
      case "upload":
        if (!requestData.imageData) {
          throw new Error('Image data is required');
        }
        response = await handleImageUpload(requestData.imageData);
        break;
      case "create":
        response = await handleTaskCreation(requestData.imageFileName, requestData.mode, requestData.targetImageFileName);
        break;
      case "checkStatus":
        response = await handleStatusCheck(requestData.taskId);
        break;
      case "getOutputs":
        response = await handleGetOutputs(requestData.taskId);
        break;
      case "cancel":
        response = await handleTaskCancellation(requestData.taskId);
        break;
      default:
        throw new Error("Invalid action");
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}

// Helper functions to handle each action
async function handleImageUpload(imageData: string) {
  if (!imageData) {
    throw new Error('Image data is required');
  }
  
  console.log('API: Starting image upload to RunningHub...');
  
  // Convert base64 to blob
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
  const binaryData = Buffer.from(base64Data, 'base64');
  
  // Create form data
  const formData = new FormData();
  formData.append('apiKey', API_KEY as string);
  formData.append('file', new Blob([binaryData], { type: 'image/jpeg' }), 'image.jpg');
  formData.append('fileType', 'image');
  
  console.log('API: Image data prepared for upload');
  
  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  console.log('API: RunningHub response status:', response.status);

  if (!response.ok) {
    console.error('API: Upload failed with status:', response.status);
    throw new Error('Failed to upload image');
  }

  const data = await response.json();
  console.log('API: RunningHub response:', data);

  if (data.code !== 0) {
    console.error('API: Upload failed with code:', data.code, 'message:', data.msg);
    throw new Error(data.msg || 'Failed to upload image');
  }

  console.log('API: Upload successful, fileName:', data.data.fileName);
  return { 
    success: true, 
    imageFileName: data.data.fileName 
  };
}

async function handleTaskCreation(imageFileName: string, mode: string, targetImageFileName?: string) {
  if (!imageFileName) {
    throw new Error('Image file name is required');
  }
  if (!mode) {
    throw new Error('Mode is required');
  }

  console.log('API: Creating task...', { mode, imageFileName, targetImageFileName });
  
  let workflowId, nodeInfoList;

  // Check if it's a dual image mode
  if (mode === "clothTryOn") {
    if (!targetImageFileName) {
      console.error('API: Target image missing for cloth try-on');
      throw new Error('Target image is required for cloth try-on');
    }
    workflowId = DUAL_IMAGE_WORKFLOW_IDS[mode];
    nodeInfoList = [
      {
        nodeId: DUAL_IMAGE_NODE_IDS.clothTryOn.source,
        fieldName: "image",
        fieldValue: imageFileName
      },
      {
        nodeId: DUAL_IMAGE_NODE_IDS.clothTryOn.target,
        fieldName: "image",
        fieldValue: targetImageFileName
      }
    ];
  } else {
    // Single image mode
    workflowId = SINGLE_IMAGE_WORKFLOW_IDS[mode as keyof typeof SINGLE_IMAGE_WORKFLOW_IDS];
    const nodeId = SINGLE_IMAGE_NODE_IDS[mode as keyof typeof SINGLE_IMAGE_NODE_IDS];
    
    if (!workflowId || !nodeId) {
      console.error('API: Invalid mode', { mode, workflowId, nodeId });
      throw new Error(`Invalid mode: ${mode}`);
    }

    nodeInfoList = [{
      nodeId,
      fieldName: "image",
      fieldValue: imageFileName
    }];
  }

  const requestBody = {
    workflowId,
    apiKey: API_KEY,
    nodeInfoList
  };

  console.log('API: Task creation request:', requestBody);

  const response = await fetch(`${API_BASE_URL}/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  console.log('API: Task creation response status:', response.status);

  const data = await response.json();
  console.log('API: Task creation response:', data);

  if (data.code !== 0) {
    console.error('API: Task creation failed with code:', data.code, 'message:', data.msg);
    throw new Error(data.msg || 'Failed to create task');
  }

  console.log('API: Task created successfully, taskId:', data.data.taskId);
  return { 
    success: true, 
    taskId: data.data.taskId,
    status: data.data.taskStatus 
  };
}

async function handleStatusCheck(taskId: string) {
  try {
    console.log('API: Checking task status...', { taskId });
    
    const response = await fetch(`${API_BASE_URL}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId,
        apiKey: API_KEY
      }),
    });

    console.log('API: Status check response status:', response.status);

    const data = await response.json();
    console.log('API: Status check response:', data);

    if (data.code !== 0) {
      console.error('API: Status check failed with code:', data.code, 'message:', data.msg);
      throw new Error(data.msg || 'Failed to check status');
    }
    
    let status;
    switch (data.data?.toLowerCase()) {
      case 'pending':
      case 'processing':
      case 'running':
        status = 'PROCESSING';
        break;
      case 'success':
      case 'completed':
        status = 'SUCCESS';
        break;
      case 'failed':
        status = 'FAILED';
        break;
      default:
        status = 'FAILED';
    }

    console.log('API: Task status:', { status, rawStatus: data.data });
    return { success: true, status, rawStatus: data.data };
  } catch (error) {
    console.error('API: Status check error:', error);
    throw new Error('Failed to check status');
  }
}

async function handleGetOutputs(taskId: string) {
  console.log('API: Getting task outputs...', { taskId });
  
  const response = await fetch(`${API_BASE_URL}/outputs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      taskId,
      apiKey: API_KEY
    }),
  });

  console.log('API: Get outputs response status:', response.status);

  const data = await response.json();
  console.log('API: Get outputs response:', data);

  if (data.code !== 0) {
    console.error('API: Get outputs failed with code:', data.code, 'message:', data.msg);
    throw new Error(data.msg || 'Failed to get outputs');
  }

  // Extract file URLs from the response
  const outputUrls = data.data.map((output: { fileUrl: string; fileType: string }) => output.fileUrl);
  console.log('API: Task outputs retrieved successfully:', outputUrls);
  
  return { 
    success: true, 
    outputUrls 
  };
}

async function handleTaskCancellation(taskId: string) {
  const response = await fetch(`${API_BASE_URL}/task/cancel/${taskId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to cancel task');
  }

  return { success: true };
} 