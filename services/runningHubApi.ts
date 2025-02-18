export const API_BASE_URL = 'https://www.runninghub.ai/api';
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

const API_KEY = process.env.NEXT_PUBLIC_RUNNINGHUB_API_KEY;

if (!API_KEY) {
  throw new Error('NEXT_PUBLIC_RUNNINGHUB_API_KEY is not defined in environment variables');
}

// Add timeout configuration at the top
const TIMEOUT_DURATION = 180000; // 3 minutes in milliseconds

// Helper function to handle timeouts
const fetchWithTimeout = async (url: string, options: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_DURATION);

  try {
    const response = await fetch(url, {
      ...options,
      mode: "cors",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

export interface TaskResponse {
  code: number;
  data: {
    taskId: string;
    [key: string]: any;
  };
  msg: string;
}

export interface TaskStatus {
  code: number;
  data: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    [key: string]: any;
  };
  msg: string;
}

export interface TaskOutputResponse {
  code: number;
  msg: string;
  data: Array<{
    fileUrl: string;
    fileType: string;
  }>;
}

export interface CreateTaskResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    clientId: string;
    taskStatus: string;
    promptTips: string;
  };
}

export interface TaskStatusResponse {
  code: number;
  msg: string;
  data: string; // The status is directly a string in the response
}

interface NodeInfo {
  nodeId: string;
  fieldName: string;
  fieldValue: string | number;
}

// Add type for mode
type RunningHubMode = keyof typeof WORKFLOW_IDS;

export const runningHubApi = {
  async uploadImage(imageData: string): Promise<string> {
    const response = await fetch("/api/runninghub", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageData }),
    });

    if (!response.ok) {
      throw new Error("Failed to upload image");
    }

    const data = await response.json();
    return data.imageFileName;
  },

  async createTask(imageFileName: string, mode: RunningHubMode): Promise<string> {
    const response = await fetch("/api/runninghub", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageFileName, mode }),
    });

    if (!response.ok) {
      throw new Error("Failed to create task");
    }

    const data = await response.json();
    return data.taskId;
  },

  async checkStatus(taskId: string): Promise<"PROCESSING" | "SUCCESS" | "FAILED"> {
    const response = await fetch("/api/runninghub", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ taskId, action: "checkStatus" }),
    });

    if (!response.ok) {
      throw new Error("Failed to check status");
    }

    const data = await response.json();
    return data.status;
  },

  async getOutputs(taskId: string): Promise<string[]> {
    const response = await fetch("/api/runninghub", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ taskId, action: "getOutputs" }),
    });

    if (!response.ok) {
      throw new Error("Failed to get outputs");
    }

    const data = await response.json();
    return data.outputUrls;
  },

  async cancelTask(taskId: string): Promise<void> {
    const response = await fetch("/api/runninghub", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ taskId, action: "cancel" }),
    });

    if (!response.ok) {
      throw new Error("Failed to cancel task");
    }
  },
}; 