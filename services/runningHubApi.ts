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
  uploadImage: async (imageData: string): Promise<string> => {
    try {
      // Convert base64 to blob
      const base64Data = imageData.split(';base64,').pop();
      if (!base64Data) {
        throw new Error('Invalid image data format');
      }

      const byteCharacters = atob(base64Data);
      const byteArrays = [];

      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }

      const blob = new Blob(byteArrays, { type: 'image/jpeg' });
      const formData = new FormData();
      
      // Important: Order and exact naming matters
      formData.append('apiKey', API_KEY);
      formData.append('fileType', 'image');
      formData.append('file', blob, 'image.jpg');

      console.log('Preparing to upload image with size:', blob.size);

      const uploadResponse = await fetchWithTimeout(`${API_BASE_URL}/task/openapi/upload`, {
        method: 'POST',
        // Remove Content-Type header completely - let browser set it
        body: formData,
      });

      const responseText = await uploadResponse.text();
      console.log('Raw response:', responseText);

      let result: TaskResponse;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid response format');
      }

      console.log('Parsed response:', result);

      // Update success code check to match API documentation
      if (result.code !== 0) { // API returns code 0 for success
        console.error('API Error:', result);
        throw new Error(result.msg);
      }

      // Update to match the API response format
      return result.data.fileName; // Use fileName as taskId for subsequent calls
    } catch (error) {
      console.error('Upload error details:', error);
      throw error;
    }
  },

  createTask: async (imageFileName: string, mode: RunningHubMode): Promise<string> => {
    try {
      console.log('Creating task with:', { imageFileName, mode });

      const response = await fetch('/api/runninghub/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageFileName, mode }),
      });

      const result = await response.json();
      console.log('Create task response:', result);

      if (result.code !== 0) {
        if (result.msg === "TASK_QUEUE_MAXED") {
          throw new Error("TASK_QUEUE_MAXED");
        }
        throw new Error(result.msg || 'Failed to create task');
      }

      return result.data.taskId;
    } catch (error) {
      console.error('Create task error details:', error);
      throw error;
    }
  },

  checkStatus: async (taskId: string): Promise<string> => {
    try {
      console.log('Checking status for taskId:', taskId);

      const response = await fetch('/api/runninghub/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
      });

      const result = await response.json();
      console.log('Status response:', result);

      // Always return a valid status
      if (result.data) {
        return result.data;
      }

      return "PROCESSING";
    } catch (error) {
      console.error('Status check error details:', error);
      return "PROCESSING";
    }
  },

  getOutputs: async (taskId: string): Promise<string[]> => {
    try {
      console.log('Getting outputs for taskId:', taskId);

      const response = await fetchWithTimeout(`${API_BASE_URL}/task/openapi/outputs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'Host': 'www.runninghub.ai',
          'Connection': 'keep-alive'
        },
        body: JSON.stringify({ 
          taskId,
          apiKey: API_KEY
        }),
      });

      const responseText = await response.text();
      console.log('Outputs response:', responseText);

      const result: TaskOutputResponse = JSON.parse(responseText);
      console.log('Parsed outputs response:', result);

      if (result.code !== 0) {
        console.error('Get outputs error:', result);
        throw new Error(result.msg);
      }

      // Return all file URLs instead of just the first one
      return result.data.map(output => output.fileUrl);
    } catch (error) {
      console.error('Get outputs error details:', error);
      throw error;
    }
  },

  cancelTask: async (taskId: string): Promise<void> => {
    try {
      const response = await fetch('/api/runninghub/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel task');
      }
    } catch (error) {
      console.error('Cancel task error:', error);
      throw error;
    }
  },
}; 