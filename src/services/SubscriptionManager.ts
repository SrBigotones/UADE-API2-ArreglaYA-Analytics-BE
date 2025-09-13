import { SubscriptionService, getSubscriptionService } from './SubscriptionService';
import { SubscriptionResponse, SubscriptionStatus } from '../types/subscription';
import  { logger } from '../config/logger';
import config from '../config';

/**
 * Manages Core Hub subscriptions automatically for the Analytics Backend
 * This service runs in the background and handles:
 * - Automatic subscription creation on startup
 * - Health monitoring and recovery
 * - Subscription lifecycle management
 */
export class SubscriptionManager {
  private subscriptionService: SubscriptionService;
  private isInitialized = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private subscriptions: SubscriptionResponse[] = [];

  constructor() {
    this.subscriptionService = getSubscriptionService();
  }

  /**
   * Initialize subscriptions on application startup
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.warn('SubscriptionManager already initialized');
      return;
    }

    logger.info('🚀 Initializing ArreglaYA Analytics subscriptions...');

    try {
      // 1. Check Core Hub connectivity
      await this.waitForCoreHub();

      // 2. Get webhook URL for this service
      const webhookUrl = this.getWebhookUrl();
      logger.info(`Using webhook URL: ${webhookUrl}`);

      // 3. Create or verify subscriptions
      await this.setupSubscriptions(webhookUrl);

      // 4. Start health monitoring
      this.startHealthMonitoring();

      this.isInitialized = true;
      logger.info('✅ SubscriptionManager initialized successfully');

    } catch (error) {
      logger.error('❌ Failed to initialize SubscriptionManager:', error);
      throw error;
    }
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    logger.info('🔄 Shutting down SubscriptionManager...');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Optionally deactivate subscriptions on shutdown
    if (config.nodeEnv === 'development') {
      await this.deactivateAllSubscriptions();
    }

    this.isInitialized = false;
    logger.info('✅ SubscriptionManager shutdown complete');
  }

  /**
   * Get current subscription status
   */
  getStatus(): {
    initialized: boolean;
    subscriptionCount: number;
    activeSubscriptions: number;
    lastHealthCheck?: Date;
  } {
    const activeCount = this.subscriptions.filter(
      sub => sub.status === SubscriptionStatus.ACTIVE
    ).length;

    return {
      initialized: this.isInitialized,
      subscriptionCount: this.subscriptions.length,
      activeSubscriptions: activeCount
    };
  }

  /**
   * Force refresh subscriptions
   */
  async refreshSubscriptions(): Promise<void> {
    logger.info('🔄 Refreshing subscriptions...');
    
    try {
      this.subscriptions = await this.subscriptionService.getAnalyticsSubscriptions();
      logger.info(`✅ Refreshed ${this.subscriptions.length} subscriptions`);
    } catch (error) {
      logger.error('❌ Failed to refresh subscriptions:', error);
      throw error;
    }
  }

  // Private methods

  private async waitForCoreHub(maxRetries = 10, retryDelay = 5000): Promise<void> {
    logger.info('⏳ Waiting for Core Hub to be available...');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const isHealthy = await this.subscriptionService.checkCoreHubHealth();
        
        if (isHealthy) {
          logger.info('✅ Core Hub is available');
          return;
        }
        
        logger.warn(`❌ Core Hub not available (attempt ${attempt}/${maxRetries})`);
        
        if (attempt < maxRetries) {
          logger.info(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
          await this.delay(retryDelay);
        }
        
      } catch (error) {
        logger.warn(`❌ Core Hub health check failed (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries) {
          await this.delay(retryDelay);
        }
      }
    }

    throw new Error(`Core Hub not available after ${maxRetries} attempts`);
  }

  private getWebhookUrl(): string {
    // Build webhook URL for this service
    const baseUrl = process.env.WEBHOOK_BASE_URL || 
                   process.env.PUBLIC_URL || 
                   `http://localhost:${config.port}`;
    
    return `${baseUrl}/api/webhooks/core-hub`;
  }

  private async setupSubscriptions(webhookUrl: string): Promise<void> {
    logger.info('🔧 Setting up ArreglaYA Analytics subscriptions...');

    try {
      // Check existing subscriptions
      const existingSubscriptions = await this.subscriptionService.getAnalyticsSubscriptions();
      logger.info(`Found ${existingSubscriptions.length} existing subscriptions`);

      if (existingSubscriptions.length > 0) {
        // Verify existing subscriptions are active and have correct webhook URL
        await this.verifyExistingSubscriptions(existingSubscriptions, webhookUrl);
      } else {
        // Create new subscriptions
        await this.createInitialSubscriptions(webhookUrl);
      }

      // Refresh our local cache
      await this.refreshSubscriptions();

    } catch (error) {
      logger.error('❌ Failed to setup subscriptions:', error);
      throw error;
    }
  }

  private async verifyExistingSubscriptions(
    existingSubscriptions: SubscriptionResponse[], 
    expectedWebhookUrl: string
  ): Promise<void> {
    logger.info('🔍 Verifying existing subscriptions...');

    let needsRefresh = false;

    for (const subscription of existingSubscriptions) {
      try {
        // Check if webhook URL matches
        if (subscription.webhookUrl !== expectedWebhookUrl) {
          logger.warn(`⚠️ Subscription ${subscription.subscriptionId} has different webhook URL`);
          logger.info(`   Expected: ${expectedWebhookUrl}`);
          logger.info(`   Current:  ${subscription.webhookUrl}`);
          // Note: Core Hub doesn't support updating webhook URL, would need to recreate
        }

        // Ensure subscription is active
        if (subscription.status !== SubscriptionStatus.ACTIVE) {
          logger.info(`🔄 Activating subscription ${subscription.subscriptionId}`);
          await this.subscriptionService.activateSubscription(subscription.subscriptionId!);
          needsRefresh = true;
        }

      } catch (error) {
        logger.error(`❌ Failed to verify subscription ${subscription.subscriptionId}:`, error);
      }
    }

    if (needsRefresh) {
      await this.delay(1000); // Give Core Hub time to update
    }
  }

  private async createInitialSubscriptions(webhookUrl: string): Promise<void> {
    logger.info('🆕 Creating initial subscriptions for ArreglaYA Analytics...');

    try {
      const subscriptions = await this.subscriptionService.subscribeToAllArreglaYAEvents(webhookUrl);
      
      logger.info(`✅ Created ${subscriptions.length} subscriptions:`);
      subscriptions.forEach((sub, index) => {
        logger.info(`   ${index + 1}. ${sub.topic} -> ${sub.eventName} (${sub.status})`);
      });

    } catch (error) {
      logger.error('❌ Failed to create initial subscriptions:', error);
      throw error;
    }
  }

  private startHealthMonitoring(): void {
    const healthCheckInterval = 5 * 60 * 1000; // 5 minutes
    
    logger.info(`🏥 Starting health monitoring (every ${healthCheckInterval / 1000}s)`);

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('❌ Health check failed:', error);
      }
    }, healthCheckInterval);
  }

  private async performHealthCheck(): Promise<void> {
    logger.debug('🏥 Performing subscription health check...');

    try {
      // Check Core Hub connectivity
      const isHealthy = await this.subscriptionService.checkCoreHubHealth();
      
      if (!isHealthy) {
        logger.warn('⚠️ Core Hub is not accessible during health check');
        return;
      }

      // Check subscription status
      const stats = await this.subscriptionService.getAnalyticsStats();
      logger.debug(`📊 Health check: ${stats.activeSubscriptions} active subscriptions`);

      // If no active subscriptions, try to recreate them
      if (stats.activeSubscriptions === 0) {
        logger.warn('⚠️ No active subscriptions found, attempting recovery...');
        await this.recoverSubscriptions();
      }

    } catch (error) {
      logger.error('❌ Health check error:', error);
    }
  }

  private async recoverSubscriptions(): Promise<void> {
    logger.info('🔄 Attempting to recover subscriptions...');

    try {
      const webhookUrl = this.getWebhookUrl();
      await this.createInitialSubscriptions(webhookUrl);
      await this.refreshSubscriptions();
      
      logger.info('✅ Subscription recovery completed');
    } catch (error) {
      logger.error('❌ Subscription recovery failed:', error);
    }
  }

  private async deactivateAllSubscriptions(): Promise<void> {
    logger.info('🔄 Deactivating all subscriptions...');

    try {
      for (const subscription of this.subscriptions) {
        if (subscription.status === SubscriptionStatus.ACTIVE && subscription.subscriptionId) {
          await this.subscriptionService.deactivateSubscription(subscription.subscriptionId);
          logger.debug(`   Deactivated: ${subscription.subscriptionId}`);
        }
      }
      
      logger.info('✅ All subscriptions deactivated');
    } catch (error) {
      logger.error('❌ Failed to deactivate subscriptions:', error);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let subscriptionManagerInstance: SubscriptionManager | null = null;

/**
 * Get the singleton SubscriptionManager instance
 */
export function getSubscriptionManager(): SubscriptionManager {
  if (!subscriptionManagerInstance) {
    subscriptionManagerInstance = new SubscriptionManager();
  }
  return subscriptionManagerInstance;
}

/**
 * Initialize subscriptions on application startup
 * Call this from your main application entry point
 */
export async function initializeSubscriptions(): Promise<void> {
  const manager = getSubscriptionManager();
  await manager.initialize();
}

/**
 * Shutdown subscriptions on application exit
 * Call this from your shutdown handlers
 */
export async function shutdownSubscriptions(): Promise<void> {
  if (subscriptionManagerInstance) {
    await subscriptionManagerInstance.shutdown();
  }
}
