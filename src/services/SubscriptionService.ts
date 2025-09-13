import { SubscriptionClient, createSubscriptionClient } from './SubscriptionClient';
import { 
  SubscriptionRequest, 
  SubscriptionResponse, 
  SubscriptionStatus,
  CreateSubscriptionOptions,
  UpdateSubscriptionStatusOptions
} from '../types/subscription';
import { logger } from '../config/logger';
import config from '../config';

/**
 * High-level service for managing subscriptions to Core Hub
 * Provides business logic and caching for subscription operations
 */
export class SubscriptionService {
  private client: SubscriptionClient;
  private subscriptionCache: Map<string, SubscriptionResponse> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.client = createSubscriptionClient();
    
    logger.info('SubscriptionService initialized with Core Hub config:', {
      baseUrl: config.coreHub.url,
      timeout: config.coreHub.timeout
    });
  }

  /**
   * Create a subscription for ArreglaYA Analytics events
   */
  async createAnalyticsSubscription(options: CreateSubscriptionOptions): Promise<SubscriptionResponse> {
    try {
      logger.info('Creating analytics subscription:', options);

      // Validate webhook URL format
      this.validateWebhookUrl(options.webhookUrl);

      const request: SubscriptionRequest = {
        webhookUrl: options.webhookUrl,
        squadName: options.squadName,
        topic: options.topic,
        eventName: options.eventName
      };

      const response = await this.client.createSubscription(request);

      // Cache the subscription
      if (response.subscriptionId) {
        this.cacheSubscription(response);
      }

      logger.info('Analytics subscription created successfully:', response.subscriptionId);
      return response;

    } catch (error) {
      logger.error('Failed to create analytics subscription:', error);
      throw new Error(`Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Subscribe to all ArreglaYA events (orders, payments, etc.)
   */
  async subscribeToAllArreglaYAEvents(webhookUrl: string): Promise<SubscriptionResponse[]> {
    const subscriptions: SubscriptionResponse[] = [];
    
    const eventSubscriptions = [
      {
        squadName: 'arreglaya-analytics',
        topic: 'orders.*',
        eventName: 'order*',
        description: 'All order events'
      },
      {
        squadName: 'arreglaya-analytics',
        topic: 'payments.*',
        eventName: 'payment*',
        description: 'All payment events'
      },
      {
        squadName: 'arreglaya-analytics',
        topic: 'users.*',
        eventName: 'user*',
        description: 'All user events'
      },
      {
        squadName: 'arreglaya-analytics',
        topic: 'services.*',
        eventName: 'service*',
        description: 'All service events'
      }
    ];

    for (const sub of eventSubscriptions) {
      try {
        logger.info(`Creating subscription for ${sub.description}`);
        
        const response = await this.createAnalyticsSubscription({
          webhookUrl,
          squadName: sub.squadName,
          topic: sub.topic,
          eventName: sub.eventName
        });

        subscriptions.push(response);
        
        // Small delay between subscriptions to avoid overwhelming the API
        await this.delay(100);
        
      } catch (error) {
        logger.error(`Failed to create subscription for ${sub.description}:`, error);
        // Continue with other subscriptions even if one fails
      }
    }

    logger.info(`Created ${subscriptions.length} subscriptions out of ${eventSubscriptions.length} attempted`);
    return subscriptions;
  }

  /**
   * Get subscription by ID with caching
   */
  async getSubscription(subscriptionId: string): Promise<SubscriptionResponse | null> {
    try {
      // Check cache first
      const cached = this.getCachedSubscription(subscriptionId);
      if (cached) {
        logger.debug('Returning cached subscription:', subscriptionId);
        return cached;
      }

      logger.debug('Fetching subscription from API:', subscriptionId);
      const response = await this.client.getSubscription(subscriptionId);
      
      // Cache the result
      this.cacheSubscription(response);
      
      return response;

    } catch (error) {
      if ((error as any)?.status === 404) {
        logger.warn('Subscription not found:', subscriptionId);
        return null;
      }
      
      logger.error('Failed to get subscription:', error);
      throw new Error(`Failed to get subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all active subscriptions for ArreglaYA Analytics
   */
  async getAnalyticsSubscriptions(): Promise<SubscriptionResponse[]> {
    try {
      logger.debug('Fetching analytics subscriptions');
      
      const subscriptions = await this.client.getSubscriptionsBySquad('arreglaya-analytics');
      
      // Cache all subscriptions
      subscriptions.forEach(sub => this.cacheSubscription(sub));
      
      logger.info(`Found ${subscriptions.length} analytics subscriptions`);
      return subscriptions;

    } catch (error) {
      logger.error('Failed to get analytics subscriptions:', error);
      throw new Error(`Failed to get analytics subscriptions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update subscription status
   */
  async updateSubscriptionStatus(options: UpdateSubscriptionStatusOptions): Promise<void> {
    try {
      logger.info(`Updating subscription ${options.subscriptionId} to status: ${options.status}`);
      
      await this.client.updateSubscriptionStatus(options.subscriptionId, options.status);
      
      // Update cache
      const cached = this.getCachedSubscription(options.subscriptionId);
      if (cached) {
        cached.status = options.status;
        this.cacheSubscription(cached);
      }
      
      logger.info('Subscription status updated successfully');

    } catch (error) {
      logger.error('Failed to update subscription status:', error);
      throw new Error(`Failed to update subscription status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Activate a subscription
   */
  async activateSubscription(subscriptionId: string): Promise<void> {
    await this.updateSubscriptionStatus({
      subscriptionId,
      status: SubscriptionStatus.ACTIVE
    });
  }

  /**
   * Deactivate a subscription
   */
  async deactivateSubscription(subscriptionId: string): Promise<void> {
    await this.updateSubscriptionStatus({
      subscriptionId,
      status: SubscriptionStatus.INACTIVE
    });
  }

  /**
   * Suspend a subscription
   */
  async suspendSubscription(subscriptionId: string): Promise<void> {
    await this.updateSubscriptionStatus({
      subscriptionId,
      status: SubscriptionStatus.SUSPENDED
    });
  }

  /**
   * Get subscription statistics for ArreglaYA Analytics
   */
  async getAnalyticsStats(): Promise<{ activeSubscriptions: number }> {
    try {
      logger.debug('Fetching analytics subscription stats');
      
      const count = await this.client.getSubscriptionStats('arreglaya-analytics');
      
      return { activeSubscriptions: count };

    } catch (error) {
      logger.error('Failed to get analytics stats:', error);
      throw new Error(`Failed to get analytics stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Health check for Core Hub connectivity
   */
  async checkCoreHubHealth(): Promise<boolean> {
    try {
      return await this.client.healthCheck();
    } catch (error) {
      logger.error('Core Hub health check failed:', error);
      return false;
    }
  }

  /**
   * Clear subscription cache
   */
  clearCache(): void {
    this.subscriptionCache.clear();
    logger.debug('Subscription cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.subscriptionCache.size,
      keys: Array.from(this.subscriptionCache.keys())
    };
  }

  // Private helper methods


  private validateWebhookUrl(url: string): void {
    try {
      new URL(url);
    } catch (error) {
      throw new Error('Invalid webhook URL format');
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('Webhook URL must use HTTP or HTTPS protocol');
    }
  }

  private cacheSubscription(subscription: SubscriptionResponse): void {
    if (subscription.subscriptionId) {
      // Create a cached version with timestamp
      const cachedSubscription = {
        ...subscription,
        _cachedAt: Date.now()
      };
      this.subscriptionCache.set(subscription.subscriptionId, cachedSubscription as SubscriptionResponse);
    }
  }

  private getCachedSubscription(subscriptionId: string): SubscriptionResponse | null {
    const cached = this.subscriptionCache.get(subscriptionId);
    
    if (!cached) {
      return null;
    }

    // Check if cache has expired
    const cachedAt = (cached as any)._cachedAt || 0;
    if (Date.now() - cachedAt > this.cacheTimeout) {
      this.subscriptionCache.delete(subscriptionId);
      return null;
    }

    return cached;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance for the application
let subscriptionServiceInstance: SubscriptionService | null = null;

/**
 * Get the singleton SubscriptionService instance
 */
export function getSubscriptionService(): SubscriptionService {
  if (!subscriptionServiceInstance) {
    subscriptionServiceInstance = new SubscriptionService();
  }
  return subscriptionServiceInstance;
}

/**
 * Initialize the SubscriptionService
 */
export function initializeSubscriptionService(): SubscriptionService {
  subscriptionServiceInstance = new SubscriptionService();
  return subscriptionServiceInstance;
}
