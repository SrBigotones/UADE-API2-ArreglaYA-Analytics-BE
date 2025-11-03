import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Event } from '../models/Event';
import { EventMessage } from '../types';
import { logger } from '../config/logger';
import { EventNormalizationService } from '../services/EventNormalizationService';

export class WebhookController {
  private normalizationService: EventNormalizationService;

  constructor() {
    this.normalizationService = new EventNormalizationService();
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

      // Normalize event to specialized tables
      try {
        await this.normalizationService.normalizeEvent(newEvent);
      } catch (normalizationError) {
        logger.error(`Error normalizing event ${newEvent.id}:`, normalizationError);
        // Continue even if normalization fails - event is still saved
      }

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
   * 
   * Flow:
   * 1. Immediately return 200 OK to Core Hub
   * 2. Process event asynchronously (save to DB)
   * 3. Send ACK to Core Hub after successful processing
   */
  public async handleCoreHubWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Extract Core Hub event data
      const coreHubEvent = req.body;
      logger.info('📨 Received Core Hub webhook event:', {
        messageId: coreHubEvent.messageId,
        destination: coreHubEvent.destination,
        timestamp: coreHubEvent.timestamp
      });

      // IMMEDIATELY return 200 OK to Core Hub
      res.status(200).json({ 
        success: true, 
        message: 'Event received, processing asynchronously',
        messageId: coreHubEvent.messageId
      });

      // Process event asynchronously (don't await - fire and forget)
      this.processEventAsync(coreHubEvent).catch(error => {
        logger.error(`❌ Async processing failed for message ${coreHubEvent.messageId}:`, error);
      });

    } catch (error) {
      logger.error('Error handling Core Hub webhook:', error);
      
      // Only return error if we haven't sent response yet
      if (!res.headersSent) {
        res.status(500).json({ 
          success: false, 
          message: 'Error receiving Core Hub event',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Process Core Hub event asynchronously
   * This runs after the 200 OK has been returned to Core Hub
   */
  private async processEventAsync(coreHubEvent: any): Promise<void> {
    const messageId = coreHubEvent.messageId;
    const subscriptionId = coreHubEvent.subscriptionId;

    try {
      logger.info(`⚙️ Processing event ${messageId} asynchronously...`);

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
      logger.info(`💾 Event ${messageId} saved to database (id: ${newEvent.id})`);

      // Normalize event to specialized tables
      try {
        await this.normalizationService.normalizeEvent(newEvent);
        logger.info(`📊 Event ${messageId} normalized to specialized tables`);
      } catch (normalizationError) {
        logger.error(`Error normalizing event ${messageId}:`, normalizationError);
        // Continue even if normalization fails - event is still saved
      }

      // Mark event as processed
      newEvent.processed = true;
      await eventRepository.save(newEvent);

      // Send ACK to Core Hub to confirm successful processing
      await this.sendAckToCoreHub(messageId, subscriptionId);

      logger.info(`✅ Successfully processed and ACKed Core Hub event ${messageId}`);

    } catch (error) {
      logger.error(`❌ Failed to process Core Hub event ${messageId}:`, error);
      // Don't throw - let the error be caught by the caller
    }
  }

  /**
   * Send ACK to Core Hub after successful event processing
   */
  private async sendAckToCoreHub(messageId: string, subscriptionId?: string): Promise<void> {
    try {
      const { getSubscriptionService } = await import('../services/SubscriptionService');
      const subscriptionService = getSubscriptionService();
      
      await subscriptionService.acknowledgeMessage(messageId, subscriptionId);
      
      logger.info(`✓ ACK sent to Core Hub for message ${messageId}`);
    } catch (error) {
      logger.error(`Failed to send ACK for message ${messageId}:`, error);
      // Log but don't throw - event is already processed successfully
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
