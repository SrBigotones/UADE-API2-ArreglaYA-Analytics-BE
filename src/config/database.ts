import { DataSource } from 'typeorm';
import { config } from './index';
import { logger } from './logger';
import { getDBConfig, DBConfig } from '../utils/ssm-params';

export const createDataSource = async () => {
  let dbConfig: DBConfig;

  // Si estamos en producción, obtener los parámetros de SSM
  if (process.env.NODE_ENV === 'production') {
    try {
      dbConfig = await getDBConfig();
    } catch (error) {
      logger.error('Error getting database config from SSM:', error);
      throw error;
    }
  } else {
    dbConfig = config.database as DBConfig;
  }

  return new DataSource({
    ...dbConfig,
    entities: [__dirname + '/../models/*.ts'],
    migrations: [__dirname + '/../migrations/*.ts'],
    subscribers: [__dirname + '/../subscribers/*.ts'],
  });
};

export let AppDataSource: DataSource;

export const connectDatabase = async (): Promise<void> => {
  try {
    // Log database configuration details
    logger.info('Attempting to connect to PostgreSQL with configuration:');
    logger.info(`Host: ${config.database.host}`);
    logger.info(`Port: ${config.database.port}`);
    logger.info(`Username: ${config.database.username}`);
    logger.info(`Database: ${config.database.database}`);
    logger.info(`SSL: ${JSON.stringify(config.database.ssl)}`);
    logger.info(`Synchronize: ${config.database.synchronize}`);
    
    await AppDataSource.initialize();
    logger.info('✅ Successfully connected to PostgreSQL database');
  } catch (error) {
    logger.error('❌ PostgreSQL connection error:', error);
    logger.error('Connection failed with the following configuration:');
    logger.error(`Host: ${config.database.host}:${config.database.port}`);
    logger.error(`Database: ${config.database.database}`);
    logger.error(`Username: ${config.database.username}`);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.destroy();
    logger.info('Disconnected from PostgreSQL database');
  } catch (error) {
    logger.error('PostgreSQL disconnection error:', error);
    throw error;
  }
};
