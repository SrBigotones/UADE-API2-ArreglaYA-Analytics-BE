import { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { createAxiosInstance } from '../config/axios';
import { 
  SubscriptionRequest, 
  SubscriptionResponse, 
  SubscriptionStatus,
  CoreHubApiError
} from '../types/subscription';
import { logger } from '../config/logger';
import config from '../config';

/**
 * HTTP Client for Core Hub Subscription API
 * Handles all communication with the core subscription endpoints
 * 
 * Usa createAxiosInstance() para garantizar que los interceptores de logging
 * se apliquen a todas las peticiones al Core Hub
 */
export class SubscriptionClient {
  private client: AxiosInstance;

  constructor(coreHubConfig?: typeof config.coreHub) {
    // Use provided config or get current values from global config (allows SSM to update)
    const coreHub = coreHubConfig || config.coreHub;
    
    // Log the Core Hub configuration being used
    logger.info('🔧 Initializing SubscriptionClient with Core Hub URL:', coreHub.url);
    logger.info('📝 Core Hub config:', {
      url: coreHub.url,
      timeout: coreHub.timeout,
      hasApiKey: !!coreHub.apiKey,
      retryAttempts: coreHub.retryAttempts
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Add X-API-Key header if configured (case sensitive!)
    if (coreHub.apiKey) {
      headers['X-API-Key'] = coreHub.apiKey;
      logger.info('✅ Core Hub API Key configured');
    } else {
      logger.warn('⚠️ No Core Hub API Key configured');
    }

    // Usar createAxiosInstance en vez de axios.create para mantener interceptores
    this.client = createAxiosInstance({
      baseURL: coreHub.url,
      timeout: coreHub.timeout,
      headers,
      // Configuración para mejorar la estabilidad de la conexión
      maxRedirects: 5,
      maxBodyLength: 10 * 1024 * 1024, // 10MB
      maxContentLength: 10 * 1024 * 1024, // 10MB
      validateStatus: function (status: number) {
        return status >= 200 && status < 300;
      },
      // Configuración de Keep-Alive
      httpAgent: new (require('http').Agent)({
        keepAlive: true,
        keepAliveMsecs: coreHub.keepAliveTimeout,
        maxSockets: 100
      }),
      httpsAgent: new (require('https').Agent)({
        keepAlive: true,
        keepAliveMsecs: coreHub.keepAliveTimeout,
        maxSockets: 100
      })
    });

    // Implementar mecanismo de retry
    let retryCount = 0;
    this.client.interceptors.response.use(undefined, async (error) => {
      const requestConfig = error.config;
      
      // Solo reintentar en errores de red o 5xx
      if (
        retryCount < coreHub.retryAttempts && 
        (error.code === 'ECONNABORTED' || 
         error.code === 'ECONNREFUSED' || 
         error.message.includes('socket hang up') ||
         (error.response && error.response.status >= 500))
      ) {
        retryCount++;
        logger.warn(`Retrying request (attempt ${retryCount}/${coreHub.retryAttempts})...`);
        
        // Esperar antes de reintentar
        await new Promise(resolve => setTimeout(resolve, coreHub.retryDelay));
        
        // Reintentar la petición
        return this.client(requestConfig);
      }
      
      return Promise.reject(error);
    });

    // Add custom error handler for Core Hub specific errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const coreHubError = this.handleApiError(error);
        return Promise.reject(coreHubError);
      }
    );
  }

  /**
   * Create a new subscription
   */
  async createSubscription(request: SubscriptionRequest): Promise<SubscriptionResponse> {
    try {
      logger.info('Creating subscription for squad:', request.squadName);
      
      const response: AxiosResponse<SubscriptionResponse> = await this.client.post('/subscribe', request);
      
      logger.info('Subscription created successfully:', response.data.subscriptionId);
      return response.data;
      
    } catch (error) {
      logger.error('Failed to create subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<SubscriptionResponse> {
    try {
      logger.debug('Fetching subscription:', subscriptionId);
      
      const response: AxiosResponse<SubscriptionResponse> = await this.client.get(`/subscribe/${subscriptionId}`);
      
      return response.data;
      
    } catch (error) {
      logger.error(`Failed to fetch subscription ${subscriptionId}:`, error);
      throw error;
    }
  }

  /**
   * Get all active subscriptions
   */
  async getAllActiveSubscriptions(): Promise<SubscriptionResponse[]> {
    try {
      logger.debug('Fetching all active subscriptions');
      
      const response: AxiosResponse<SubscriptionResponse[]> = await this.client.get('/subscribe');
      
      logger.debug(`Found ${response.data.length} active subscriptions`);
      return response.data;
      
    } catch (error) {
      logger.error('Failed to fetch active subscriptions:', error);
      throw error;
    }
  }

  /**
   * Get subscriptions by squad
   */
  async getSubscriptionsBySquad(squadName: string): Promise<SubscriptionResponse[]> {
    try {
      logger.debug('Fetching subscriptions for squad:', squadName);
      
      const response: AxiosResponse<SubscriptionResponse[]> = await this.client.get(`/subscribe/squad/${squadName}`);
      
      logger.debug(`Found ${response.data.length} subscriptions for squad ${squadName}`);
      return response.data;
      
    } catch (error) {
      logger.error(`Failed to fetch subscriptions for squad ${squadName}:`, error);
      throw error;
    }
  }

  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(subscriptionId: string, status: SubscriptionStatus): Promise<void> {
    try {
      logger.info(`Updating subscription ${subscriptionId} status to:`, status);
      
      await this.client.put(`/subscribe/${subscriptionId}/status`, null, {
        params: { status }
      });
      
      logger.info('Subscription status updated successfully');
      
    } catch (error) {
      logger.error(`Failed to update subscription ${subscriptionId} status:`, error);
      throw error;
    }
  }

  /**
   * Get subscription statistics by squad
   */
  async getSubscriptionStats(squadName: string): Promise<number> {
    try {
      logger.debug('Fetching subscription stats for squad:', squadName);
      
      const response: AxiosResponse<number> = await this.client.get(`/subscribe/stats/squad/${squadName}`);
      
      logger.debug(`Squad ${squadName} has ${response.data} active subscriptions`);
      return response.data;
      
    } catch (error) {
      logger.error(`Failed to fetch stats for squad ${squadName}:`, error);
      throw error;
    }
  }

  /**
   * Send ACK for a processed message
   * Format: POST /messages/ack/{subscriptionId}
   * Body: { "messageId": "{ID_MENSAJE}" }
   */
  async acknowledgeMessage(messageId: string, subscriptionId: string): Promise<void> {
    try {
      logger.debug(`Sending ACK for message: ${messageId}`, { subscriptionId });
      
      await this.client.post(`/messages/ack/${subscriptionId}`, {
        messageId: messageId
      });
      
      logger.debug(`ACK sent successfully for message: ${messageId}`);
      
    } catch (error) {
      logger.error(`Failed to send ACK for message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Health check - verify Core Hub is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      logger.debug('Performing Core Hub health check');
      
      // Try to get all subscriptions as a health check
      await this.client.get('/subscribe');
      
      logger.debug('Core Hub health check passed');
      return true;
      
    } catch (error) {
      logger.warn('Core Hub health check failed:', error);
      return false;
    }
  }

  /**
   * Handle API errors and convert to standardized format
   */
  private handleApiError(error: AxiosError): CoreHubApiError {
    // Manejar errores de conexión específicamente
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      logger.error('Core Hub connection timeout', {
        code: error.code,
        url: error.config?.url,
        timeout: error.config?.timeout
      });
      return {
        message: 'Connection timeout with Core Hub',
        status: 504,
        timestamp: new Date().toISOString()
      };
    }

    if (error.code === 'ECONNREFUSED' || error.message.includes('socket hang up')) {
      logger.error('Core Hub connection refused', {
        code: error.code,
        url: error.config?.url,
        baseURL: error.config?.baseURL
      });
      return {
        message: 'Unable to establish connection with Core Hub',
        status: 503,
        timestamp: new Date().toISOString()
      };
    }

    const status = error.response?.status || 500;
    const message = (error.response?.data as any)?.message || error.message || 'Unknown error occurred';
    
    return {
      message,
      status,
      timestamp: new Date().toISOString()
    };
  }

}

/**
 * Factory function to create a SubscriptionClient instance
 */
export function createSubscriptionClient(): SubscriptionClient {
  return new SubscriptionClient();
}
