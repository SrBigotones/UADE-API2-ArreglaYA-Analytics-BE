/**
 * TypeScript interfaces for Core Hub Subscription API
 * Based on the Java DTOs from uade-core-backend
 */

export interface SubscriptionRequest {
  webhookUrl: string;
  squadName: string;
  topic: string;
  eventName: string;
}

export interface SubscriptionResponse {
  subscriptionId: string | null;
  webhookUrl: string | null;
  squadName: string | null;
  topic: string | null;
  eventName: string | null;
  status: SubscriptionStatus;
  createdAt: string;
  message: string;
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  ERROR = 'ERROR'
}

export interface SubscriptionStats {
  squadName: string;
  activeSubscriptions: number;
}

export interface CreateSubscriptionOptions {
  webhookUrl: string;
  squadName: string;
  topic: string;
  eventName: string;
}

export interface UpdateSubscriptionStatusOptions {
  subscriptionId: string;
  status: SubscriptionStatus;
}

export interface CoreHubApiError {
  message: string;
  status: number;
  timestamp: string;
}

