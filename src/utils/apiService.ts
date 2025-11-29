// Extraction sync service
export class ExtractionSyncService {
  static async syncExtractions(gameType?: 'superenalotto' | 'lotto' | '10elotto' | 'millionday' | 'all', year?: number) {
    try {
      let endpoint = gameType && gameType !== 'all' 
        ? `/sync/sync-all?gameType=${gameType}`
        : '/sync/sync-all';
      
      // Add year parameter if specified
      if (year) {
        endpoint += endpoint.includes('?') ? `&year=${year}` : `?year=${year}`;
      }
      
      const response = await ApiService.get(endpoint);
      
      // Check content type before parsing
      const contentType = response.headers.get('content-type') || '';
      let data: any;
      
      try {
        if (!contentType.includes('application/json')) {
          // Try to read as text first to check if we got source code
          const text = await response.clone().text();
          if (text.trim().startsWith('import ') || text.trim().startsWith('export ') || text.includes('from \'@')) {
            throw new Error('API routing error: received source code instead of JSON. This is likely a Vercel configuration issue. Check vercel.json rewrites.');
          }
          throw new Error(`Expected JSON but got ${contentType}. Response preview: ${text.substring(0, 200)}`);
        }
        data = await response.json();
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('routing error')) {
          throw parseError;
        }
        // If JSON parsing fails, try to get the text to see what we got
        const text = await response.text();
        if (text.trim().startsWith('import ') || text.trim().startsWith('export ')) {
          throw new Error('API routing error: received source code instead of JSON. This is likely a Vercel configuration issue. Check vercel.json rewrites.');
        }
        throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}. Response: ${text.substring(0, 200)}`);
      }
      
      // Handle different response formats
      if (gameType && gameType !== 'all') {
        // Single game response - check if response has gameType field or is direct result
        if (data.gameType || data.total !== undefined) {
          return {
            success: data.success !== false,
            message: data.message || 'Sync completed',
            total: data.total || 0,
            new: data.new || 0,
          };
        }
        // If response is wrapped in results object
        const gameResult = data.results?.[gameType];
        if (gameResult) {
          return {
            success: gameResult.success !== false,
            message: gameResult.message || 'Sync completed',
            total: gameResult.total || 0,
            new: gameResult.new || 0,
          };
        }
        // Fallback
        return {
          success: data.success !== false,
          message: data.message || 'Sync completed',
          total: 0,
          new: 0,
        };
      } else {
        // All games response
        return {
          success: data.success !== false,
          message: data.message || 'Sync completed',
          results: data.results || {},
        };
      }
    } catch (error) {
      console.error('Failed to sync extractions:', error);
      throw error;
    }
  }
  
  static async syncAllGames() {
    return this.syncExtractions('all');
  }
  
  static async syncSuperEnalotto() {
    return this.syncExtractions('superenalotto');
  }
  
  static async cleanupDuplicates(gameType: 'superenalotto' | 'lotto' | '10elotto' | 'millionday') {
    try {
      const endpoint = `/cleanup-duplicates?gameType=${gameType}`;
      const response = await ApiService.get(endpoint);
      const data = await response.json();
      
      return {
        success: data.success !== false,
        message: data.message || 'Cleanup completed',
        removed: data.removed || 0,
        kept: data.kept || 0,
        duplicatesFound: data.duplicatesFound || 0,
      };
    } catch (error) {
      console.error('Failed to cleanup duplicates:', error);
      throw error;
    }
  }
}

// API Service utility for handling backend communications
export class ApiService {
  private static baseUrl = '/api';
  
  static async makeRequest(endpoint: string, options: RequestInit = {}, retries = 3): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        console.log(`Making API request to: ${url} (attempt ${attempt + 1}/${retries})`);
        
        // Add timeout - increased for historical data scraping (10 minutes)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout for historical sync
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });
        
        clearTimeout(timeoutId);
        console.log(`API Response: ${response.status} ${response.statusText}`);
        
        if (!response.ok) {
          const contentType = response.headers.get('content-type') || '';
          const isJson = contentType.includes('application/json');
          let errorData: any = null;
          let errorText = '';
          
          try {
            const text = await response.text();
            
            // Check if we got source code instead of JSON (common Vercel routing issue)
            if (text.trim().startsWith('import ') || text.trim().startsWith('export ') || text.includes('from \'@')) {
              console.error('API returned source code instead of JSON. This is likely a Vercel routing issue.');
              errorText = 'API routing error: received source code instead of JSON response. Please check Vercel configuration.';
            } else if (isJson) {
              try {
                errorData = JSON.parse(text);
                errorText = errorData?.error || errorData?.message || JSON.stringify(errorData);
              } catch (parseError) {
                errorText = text.substring(0, 200);
              }
            } else {
              errorText = text.substring(0, 200);
            }
          } catch (e) {
            errorText = `HTTP ${response.status} ${response.statusText}`;
          }
          
          console.error(`API Error ${response.status}:`, errorText);
          
          // Retry on 5xx errors (server errors) but not on 4xx
          if (response.status >= 500 && attempt < retries - 1) {
            const backoff = 300 * (attempt + 1) ** 2; // Exponential backoff
            console.log(`Retrying after ${backoff}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
            continue;
          }
          
          // Extract meaningful error message
          const errorMessage = errorData?.error || errorData?.message || errorText || `HTTP ${response.status}`;
          throw new ApiError(response.status, response.statusText, errorMessage);
        }
        
        return response;
      } catch (error) {
        // Handle abort/timeout
        if (error instanceof Error && error.name === 'AbortError') {
          console.error('Request timeout');
          if (attempt < retries - 1) {
            const backoff = 300 * (attempt + 1) ** 2;
            await new Promise(resolve => setTimeout(resolve, backoff));
            continue;
          }
          throw new ApiError(504, 'Request Timeout', 'The request took too long to complete');
        }
        
        // Network errors - retry
        if (attempt < retries - 1 && error instanceof Error && 
            (error.message.includes('fetch') || error.message.includes('network'))) {
          const backoff = 300 * (attempt + 1) ** 2;
          console.log(`Network error, retrying after ${backoff}ms...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }
        
        console.error('API Request failed:', error);
        throw error;
      }
    }
    
    throw new ApiError(500, 'Request Failed', 'All retry attempts failed');
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