// API Service utility for handling backend communications
export class ApiService {
  private static baseUrl = '/api';
  
  static async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      console.log(`Making API request to: ${url}`);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      console.log(`API Response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        throw new ApiError(response.status, response.statusText, errorText);
      }
      
      return response;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }
  
  static async get(endpoint: string, headers?: Record<string, string>) {
    return this.makeRequest(endpoint, { method: 'GET', headers });
  }
  
  static async post(endpoint: string, data?: any, headers?: Record<string, string>) {
    return this.makeRequest(endpoint, {
      method: 'POST',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  static async put(endpoint: string, data?: any, headers?: Record<string, string>) {
    return this.makeRequest(endpoint, {
      method: 'PUT',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  static async delete(endpoint: string, headers?: Record<string, string>) {
    return this.makeRequest(endpoint, { method: 'DELETE', headers });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public responseText: string
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = 'ApiError';
  }
}

// Supabase integration service
export class SupabaseIntegrationService {
  static async checkConnection(): Promise<boolean> {
    try {
      const response = await ApiService.get('/project/integrations/supabase/status');
      return response.ok;
    } catch (error) {
      console.error('Supabase connection check failed:', error);
      return false;
    }
  }
  
  static async getProjectInfo(projectId: string) {
    try {
      const response = await ApiService.get(`/project/integrations/supabase/${projectId}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get Supabase project info:', error);
      throw error;
    }
  }
}

// Chat service
export class ChatService {
  static async sendMessage(message: string, chatId?: string) {
    try {
      const response = await ApiService.post(`/chats/${chatId || 'new'}`, { message });
      return await response.json();
    } catch (error) {
      console.error('Failed to send chat message:', error);
      throw error;
    }
  }
  
  static async getChatHistory(chatId: string) {
    try {
      const response = await ApiService.get(`/chats/${chatId}`);
      return await response.json();
    } catch (error) {
      console.error('Failed to get chat history:', error);
      throw error;
    }
  }
}