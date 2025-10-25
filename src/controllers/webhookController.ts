import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Event } from '../models/Event';
import { EventMessage } from '../types';
import { logger } from '../config/logger';

export class WebhookController {
  constructor() {
    // WebhookController initialization
  }

  /**
   * Handle Core Hub webhook events
   * 
   * Simple flow:
   * 1. Receive event
   * 2. Save to database (processed: true, no ACK needed)
   * 3. Return 200 OK
   */
  public async handleCoreHubWebhook(req: Request, res: Response): Promise<void> {
    const coreHubEvent = req.body;
    
    logger.info('📨 Received Core Hub webhook event:', {
      messageId: coreHubEvent.messageId,
      destination: coreHubEvent.destination,
      timestamp: coreHubEvent.timestamp
    });

    try {
      // Transform event
      const eventMessage: EventMessage = this.transformCoreHubEvent(coreHubEvent);

      // Save to database (mark as processed since no ACK needed)
      const eventRepository = AppDataSource.getRepository(Event);
      const newEvent = eventRepository.create({
        squad: eventMessage.squad,
        topico: eventMessage.topico,
        evento: eventMessage.evento,
        cuerpo: eventMessage.cuerpo,
        timestamp: eventMessage.timestamp || new Date(),
        processed: true, // Mark as processed immediately
        messageId: coreHubEvent.messageId,
        correlationId: coreHubEvent.correlationId,
        source: 'core-hub'
      });

      await eventRepository.save(newEvent);
      logger.info(`✅ Event ${coreHubEvent.messageId} saved to database (id: ${newEvent.id})`);

      // Return 200 OK
      res.status(200).json({ 
        success: true, 
        message: 'Event received and saved',
        messageId: coreHubEvent.messageId,
        eventId: newEvent.id
      });

    } catch (error) {
      logger.error('❌ Failed to save event:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to save event',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
      logger.debug(`📦 Raw Core Hub event:`, JSON.stringify(coreHubEvent, null, 2));

      // Transform Core Hub event to internal format
      logger.info(`🔄 Transforming Core Hub event ${messageId}...`);
      const eventMessage: EventMessage = this.transformCoreHubEvent(coreHubEvent);
      logger.debug(`✨ Transformed event:`, JSON.stringify(eventMessage, null, 2));

      // Save event to database
      logger.info(`💾 Saving event ${messageId} to database...`);
      const eventRepository = AppDataSource.getRepository(Event);
      
      logger.debug(`🏗️ Creating event entity for ${messageId}...`);
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

      logger.debug(`💽 Persisting event ${messageId} to database...`);
      const savedEvent = await eventRepository.save(newEvent);
      logger.info(`✅ Event ${messageId} saved to database (id: ${savedEvent.id})`);
      logger.debug(`💾 Saved event details:`, JSON.stringify(savedEvent, null, 2));

      // Mark event as processed
      logger.info(`🏷️ Marking event ${messageId} as processed...`);
      savedEvent.processed = true;
      const updatedEvent = await eventRepository.save(savedEvent);
      logger.info(`✅ Event ${messageId} marked as processed`);
      logger.debug(`✔️ Updated event:`, JSON.stringify(updatedEvent, null, 2));

      // Send ACK to Core Hub to confirm successful processing
      logger.info(`📤 Sending ACK to Core Hub for message ${messageId}...`);
      await this.sendAckToCoreHub(messageId, subscriptionId);

      logger.info(`✅ Successfully processed and ACKed Core Hub event ${messageId}`);

    } catch (error) {
      logger.error(`❌ Failed to process Core Hub event ${messageId}:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        messageId,
        subscriptionId
      });
      throw error; // Re-throw so Core Hub can retry
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
      const subscriptions = await manager.getSubscriptions();

      res.status(200).json({
        success: true,
        data: {
          subscriptionCount: subscriptions.length,
          activeSubscriptions: subscriptions.filter(sub => sub.status === 'ACTIVE').length,
          subscriptions: subscriptions,
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
