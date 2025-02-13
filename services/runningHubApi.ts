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

export const runningHubApi = {
  async uploadImage(imageData: string): Promise<string> {
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

  async createTask(imageFileName: string, mode: 'easyLighting' | 'cartoonBlindBox' | 'cartoonPortrait' | 'animeCharacter' | 'dreamlikeOil' | 'idPhoto'): Promise<string> {
    try {
      const requestBody = {
        workflowId: WORKFLOW_IDS[mode],
        apiKey: API_KEY,
        nodeInfoList: [
          {
            nodeId: NODE_IDS[mode],
            fieldName: "image",
            fieldValue: imageFileName
          }
        ]
      };

      console.log('Creating task with:', requestBody);

      const response = await fetchWithTimeout(`${API_BASE_URL}/task/openapi/create`, {
        method: 'POST',
        headers: {
          'User-Agent': 'Apifox/1.0.0 (https://apifox.com)',
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'Host': 'www.runninghub.ai',
          'Connection': 'keep-alive'
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log('Create task response:', responseText);

      const result: CreateTaskResponse = JSON.parse(responseText);
      console.log('Parsed create task response:', result);

      if (result.code !== 0) {
        console.error('Create task error:', result);
        throw new Error(result.msg);
      }

      return result.data.taskId;
    } catch (error) {
      console.error('Create task error details:', error);
      throw error;
    }
  },

  async checkStatus(taskId: string): Promise<string> {
    try {
      console.log('Checking status for taskId:', taskId);

      const response = await fetchWithTimeout(`${API_BASE_URL}/task/openapi/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Host': 'www.runninghub.ai'
        },
        body: JSON.stringify({ 
          taskId,
          apiKey: API_KEY
        }),
      });

      const responseText = await response.text();
      console.log('Status response:', responseText);

      const result: TaskStatusResponse = JSON.parse(responseText);
      console.log('Parsed status response:', result);

      if (result.code !== 0) {
        console.error('Status check error:', result);
        throw new Error(result.msg);
      }

      // The status is directly in result.data as a string
      return result.data;
    } catch (error) {
      console.error('Status check error details:', error);
      throw error;
    }
  },

  async getOutputs(taskId: string): Promise<string[]> {
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
}; 