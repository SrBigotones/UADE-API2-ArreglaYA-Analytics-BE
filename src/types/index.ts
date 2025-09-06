export interface EventMessage {
  squad: string;
  topico: string;
  evento: string;
  cuerpo: Record<string, any>;
  timestamp?: Date;
  id?: string;
}

export interface WebhookPayload {
  queue: string;
  event: EventMessage;
}

export interface MetricsData {
  id: string;
  eventType: string;
  squad: string;
  topico: string;
  evento: string;
  data: Record<string, any>;
  timestamp: Date;
  processed: boolean;
}

export interface KPIData {
  id: string;
  name: string;
  value: number;
  unit: string;
  period: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
}

export interface ServiceMetrics {
  totalServices: number;
  activeServices: number;
  servicesByCategory: Record<string, number>;
  averageRating: number;
}

export interface RequestMetrics {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  cancelledRequests: number;
  averageResponseTime: number;
}

export interface PaymentMetrics {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  totalRevenue: number;
  averagePaymentAmount: number;
}

export interface ProviderMetrics {
  totalProviders: number;
  activeProviders: number;
  averageProviderRating: number;
  topRatedProviders: Array<{
    providerId: string;
    rating: number;
    totalReviews: number;
  }>;
}
