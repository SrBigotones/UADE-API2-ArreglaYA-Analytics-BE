import { SubscriptionService, getSubscriptionService } from './SubscriptionService';
import { SubscriptionResponse } from '../types/subscription';
import { logger } from '../config/logger';
import config from '../config';

/**
 * Manages Core Hub subscriptions for the Analytics Backend
 */
export class SubscriptionManager {
  private subscriptionService: SubscriptionService;
  private subscriptions: SubscriptionResponse[] = [];

  constructor() {
    this.subscriptionService = getSubscriptionService();
  }

  /**
   * Get webhook URL for this service
   */
  private getWebhookUrl(): string {
    return process.env.WEBHOOK_BASE_URL || 
           process.env.PUBLIC_URL || 
           `http://localhost:${config.port}/api/webhooks/core-hub`;
  }


  /**
   * Create a new subscription
   */
  async createSubscription(squadName: string, topic: string = '*', eventName: string = '*'): Promise<SubscriptionResponse> {
    const webhookUrl = this.getWebhookUrl();
    
    logger.info(`Creating subscription for squad: ${squadName}`);
    
    const subscription = await this.subscriptionService.createAnalyticsSubscription({
      squadName,
      topic,
      eventName,
      webhookUrl
    });

    this.subscriptions.push(subscription);
    return subscription;
  }

  /**
   * Get all current subscriptions
   */
  async getSubscriptions(): Promise<SubscriptionResponse[]> {
    return await this.subscriptionService.getAnalyticsSubscriptions();
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


