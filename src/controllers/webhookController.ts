import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Event } from '../models/Event';
import { EventMessage } from '../types';
import { logger } from '../config/logger';
import { MetricsService } from '../services/MetricsService';
import crypto from 'crypto';
import config from '../config';

export class WebhookController {
  private metricsService: MetricsService;

  constructor() {
    this.metricsService = new MetricsService();
  }

  public async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const { queue, event, correlationId }: { queue: string; event: EventMessage; correlationId?: string } = req.body;

      logger.info(`Received webhook for queue: ${queue}`, { event });

      // Save event to database
      const eventRepository = AppDataSource.getRepository(Event);
      const newEvent = eventRepository.create({
        squad: event.squad,
        topico: event.topico,
        evento: event.evento,
        cuerpo: event.cuerpo,
        timestamp: event.timestamp || new Date(),
        processed: false,
        correlationId: correlationId,
        source: 'direct-webhook'
      });

      await eventRepository.save(newEvent);

      // Process event for metrics calculation
      await this.metricsService.processEvent(newEvent);

      // Mark event as processed
      newEvent.processed = true;
      await eventRepository.save(newEvent);

      res.status(200).json({ 
        success: true, 
        message: 'Event processed successfully',
        eventId: newEvent.id
      });

    } catch (error) {
      logger.error('Error processing webhook:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error processing event',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle Core Hub webhook events
   * This endpoint receives events from the Core Hub subscription system
   */
  public async handleCoreHubWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Verify webhook signature if configured (disabled for testing)
      if (config.webhookSecret && process.env.NODE_ENV === 'production') {
        const isValid = this.verifyWebhookSignature(req);
        if (!isValid) {
          logger.warn('Invalid webhook signature from Core Hub');
          res.status(401).json({ 
            success: false, 
            message: 'Invalid webhook signature' 
          });
          return;
        }
      }

      // Extract Core Hub event data
      const coreHubEvent = req.body;
      logger.info('Received Core Hub webhook event:', {
        messageId: coreHubEvent.messageId,
        destination: coreHubEvent.destination,
        timestamp: coreHubEvent.timestamp
      });

      // Transform Core Hub event to internal format
      const eventMessage: EventMessage = this.transformCoreHubEvent(coreHubEvent);

      // Save event to database
      const eventRepository = AppDataSource.getRepository(Event);
      const newEvent = eventRepository.create({
        squad: eventMessage.squad,
        topico: eventMessage.topico,
        evento: eventMessage.evento,
        cuerpo: eventMessage.cuerpo,
        timestamp: eventMessage.timestamp || new Date(),
        processed: false,
        // Core Hub specific fields for tracking and correlation
        messageId: coreHubEvent.messageId,
        correlationId: coreHubEvent.correlationId,
        source: 'core-hub'
      });

      await eventRepository.save(newEvent);

      // Process event for metrics calculation
      await this.metricsService.processEvent(newEvent);

      // Mark event as processed
      newEvent.processed = true;
      await eventRepository.save(newEvent);

      logger.info(`Successfully processed Core Hub event ${coreHubEvent.messageId}`);

      res.status(200).json({ 
        success: true, 
        message: 'Core Hub event processed successfully',
        eventId: newEvent.id,
        messageId: coreHubEvent.messageId
      });

    } catch (error) {
      logger.error('Error processing Core Hub webhook:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error processing Core Hub event',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const { 
        page = 1, 
        limit = 10, 
        squad, 
        topico, 
        evento, 
        processed, 
        source, 
        messageId, 
        correlationId 
      } = req.query;
      
      const eventRepository = AppDataSource.getRepository(Event);
      const queryBuilder = eventRepository.createQueryBuilder('event');

      if (squad) queryBuilder.andWhere('event.squad = :squad', { squad });
      if (topico) queryBuilder.andWhere('event.topico = :topico', { topico });
      if (evento) queryBuilder.andWhere('event.evento = :evento', { evento });
      if (processed !== undefined) queryBuilder.andWhere('event.processed = :processed', { processed: processed === 'true' });
      if (source) queryBuilder.andWhere('event.source = :source', { source });
      if (messageId) queryBuilder.andWhere('event.messageId = :messageId', { messageId });
      if (correlationId) queryBuilder.andWhere('event.correlationId = :correlationId', { correlationId });

      const [events, total] = await queryBuilder
        .orderBy('event.timestamp', 'DESC')
        .skip((Number(page) - 1) * Number(limit))
        .take(Number(limit))
        .getManyAndCount();

      res.status(200).json({
        success: true,
        data: events,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });

    } catch (error) {
      logger.error('Error fetching events:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching events',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Verify webhook signature for security
   */
  private verifyWebhookSignature(req: Request): boolean {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      if (!signature) {
        return false;
      }

      const payload = JSON.stringify(req.body);
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', config.webhookSecret)
        .update(payload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  /**
   * Transform Core Hub event format to internal EventMessage format
   */
  private transformCoreHubEvent(coreHubEvent: any): EventMessage {
    // Core Hub event structure based on MessageEnvelope from uade-core-backend
    const { destination, payload, messageId, timestamp } = coreHubEvent;
    
    // Extract squad from destination channel or use default
    const squad = this.extractSquadFromChannel(destination?.channel) || 'unknown';
    
    // Extract topic and event from destination
    const topico = destination?.channel || 'unknown';
    const evento = destination?.routingKey || 'unknown';

    return {
      squad,
      topico,
      evento,
      cuerpo: {
        messageId,
        timestamp,
        payload,
        destination,
        // Preserve original Core Hub structure
        originalEvent: coreHubEvent
      },
      timestamp: timestamp ? new Date(timestamp) : new Date()
    };
  }

  /**
   * Extract squad name from channel name
   * Examples: 
   * - "orders.created" -> "orders"
   * - "payments.payment.processed" -> "payments"
   */
  private extractSquadFromChannel(channel: string): string | null {
    if (!channel) return null;
    
    const parts = channel.split('.');
    return parts[0] || null;
  }

  /**
   * Get subscription status and health information
   * This can be used by monitoring systems
   */
  public async getSubscriptionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { getSubscriptionManager } = await import('../services/SubscriptionManager');
      const manager = getSubscriptionManager();
      const status = manager.getStatus();

      res.status(200).json({
        success: true,
        data: {
          ...status,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error getting subscription status:', error);
      res.status(500).json({
        success: false,
        message: 'Error getting subscription status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
