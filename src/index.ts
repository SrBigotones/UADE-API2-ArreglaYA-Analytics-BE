import 'reflect-metadata';
import app from './app';
import { config } from './config';
import { logger } from './config/logger';
import { connectDatabase } from './config/database';

const startServer = async () => {
  try {
    // 🔧 conexión (si local querés levantar DB siempre)
    await connectDatabase();

    // 🔊 ——— TUS LOGS (conservados) ———
    logger.info('🚀 Starting ArreglaYA Analytics Backend...');
    logger.info('📋 Environment Configuration:');
    logger.info(`NODE_ENV: ${config.nodeEnv}`);
    logger.info(`PORT: ${config.port}`);
    logger.info(`URL_FRONT: ${config.urlFront}`);
    logger.info(`CORE_HUB_URL: ${config.coreHubUrl}`);

    logger.info('🔧 Database Environment Variables:');
    logger.info(`DB_HOST: ${process.env.DB_HOST || 'undefined (using default: localhost)'}`);
    logger.info(`DB_PORT: ${process.env.DB_PORT || 'undefined (using default: 5432)'}`);
    logger.info(`DB_USERNAME: ${process.env.DB_USERNAME || 'undefined (using default: postgres)'}`);
    logger.info(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '***SET***' : 'undefined (using default: empty)'}`);
    logger.info(`DB_NAME: ${process.env.DB_NAME || 'undefined (using default: arregla_ya_metrics)'}`);

    // ▶️ listen
    const port = Number(config.port) || 3000;
    app.listen(port, () => {
      logger.info(`✅ Server running on http://localhost:${port}`);
      logger.info(`💚 Health: http://localhost:${port}/health`);
      logger.info(`📖 Docs:   http://localhost:${port}/api-docs`);
    });
  } catch (err) {
    logger.error('❌ Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
