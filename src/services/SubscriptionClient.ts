import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
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
 */
export class SubscriptionClient {
  private client: AxiosInstance;

  constructor() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Add X-API-KEY header if configured
    if (config.coreHub.apiKey) {
      headers['X-API-KEY'] = config.coreHub.apiKey;
    }

    this.client = axios.create({
      baseURL: config.coreHub.url,
      timeout: config.coreHub.timeout,
      headers
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`Making request to Core Hub: ${config.method?.toUpperCase()} ${config.url}`, {
          data: config.data,
          params: config.params
        });
        return config;
      },
      (error) => {
        logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`Core Hub response: ${response.status} ${response.statusText}`, {
          data: response.data
        });
        return response;
      },
      (error: AxiosError) => {
        const coreHubError = this.handleApiError(error);
        logger.error('Core Hub API error:', coreHubError);
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
   */
  async acknowledgeMessage(messageId: string, subscriptionId?: string): Promise<void> {
    try {
      logger.debug(`Sending ACK for message: ${messageId}`, { subscriptionId });
      
      const params = subscriptionId ? { subscriptionId } : {};
      await this.client.post(`/messages/${messageId}/ack`, null, { params });
      
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
