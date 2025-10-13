import 'reflect-metadata';
import app from './app';
import { config } from './config';
import { logger } from './config/logger';
import { connectDatabase } from './config/database';
import { initializeSubscriptions, shutdownSubscriptions } from './services/SubscriptionManager';

const startServer = async () => {
  try {
    // 🔧 conexión (si local querés levantar DB siempre)
    await connectDatabase();

    // 🔊 ——— TUS LOGS (conservados) ———
    logger.info('🚀 Starting ArreglaYA Analytics Backend...');
    logger.info('📋 Environment Configuration:');
    logger.info(`NODE_ENV: ${config.nodeEnv}`);
    logger.info(`PORT: ${config.port}`);
    logger.info(`CORE_HUB_URL: ${config.coreHub.url}`);

    logger.info('🔧 Database Environment Variables:');
    logger.info(`DB_HOST: ${process.env.DB_HOST || 'undefined (using default: localhost)'}`);
    logger.info(`DB_PORT: ${process.env.DB_PORT || 'undefined (using default: 5432)'}`);
    logger.info(`DB_USERNAME: ${process.env.DB_USERNAME || 'undefined (using default: postgres)'}`);
    logger.info(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '***SET***' : 'undefined (using default: empty)'}`);
    logger.info(`DB_NAME: ${process.env.DB_NAME || 'undefined (using default: arregla_ya_metrics)'}`);

    // ▶️ listen
    const port = Number(config.port) || 3000;
    const server = app.listen(port, async () => {
      logger.info(`✅ Server running on http://localhost:${port}`);
      logger.info(`💚 Health: http://localhost:${port}/health`);
      logger.info(`📖 Docs:   http://localhost:${port}/api-docs`);
      
      // 🔗 Initialize Core Hub subscriptions after server starts
      try {
        logger.info('🔗 Initializing Core Hub subscriptions...');
        await initializeSubscriptions();
        logger.info('✅ Core Hub subscriptions initialized successfully');
      } catch (error) {
        logger.error('❌ Failed to initialize Core Hub subscriptions:', error);
        // Don't exit - the server can still function without subscriptions
      }
    });

    // 🛑 Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`🛑 Received ${signal}, starting graceful shutdown...`);
      
      try {
        // Shutdown subscriptions first
        await shutdownSubscriptions();
        
        // Close server
        server.close(() => {
          logger.info('✅ Server closed successfully');
          process.exit(0);
        });
        
        // Force close after timeout
        setTimeout(() => {
          logger.error('❌ Forced shutdown after timeout');
          process.exit(1);
        }, 10000);
        
      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (err) {
    logger.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
