import { DataSource } from 'typeorm';
import { config } from './index';
import { logger } from './logger';
import { getDBConfig, DBConfig } from '../utils/ssm-params';

export const createDataSource = async () => {
  let dbConfig: DBConfig;

  // Debug environment variables
  logger.info('Environment check:', {
    AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
    NODE_ENV: process.env.NODE_ENV
  });

  // En AWS Lambda siempre usar SSM
  if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production') {
    try {
      logger.info('Running in AWS Lambda or production, getting config from SSM...');
      dbConfig = await getDBConfig();
      logger.info(`Database host from SSM: ${dbConfig.host}:${dbConfig.port}`);
    } catch (error) {
      logger.error('Error getting database config from SSM:', error);
      logger.info('Falling back to local config due to SSM error...');
      dbConfig = config.database as DBConfig;
    }
  } else {
    logger.info('Running in development mode, using local config');
    dbConfig = config.database as DBConfig;
    logger.info(`Local database config: ${dbConfig.host}:${dbConfig.port}`);
  }

  // Crear una nueva instancia de DataSource
  AppDataSource = new DataSource({
    ...dbConfig,
    entities: [__dirname + '/../models/*.{ts,js}'],
    migrations: [__dirname + '/../migrations/*.{ts,js}'],
    subscribers: [__dirname + '/../subscribers/*.{ts,js}'],
  });

  // Verificar la configuración final
  const finalConfig = AppDataSource.options as DBConfig;
  logger.info('DataSource configuration:', {
    host: finalConfig.host,
    port: finalConfig.port,
    database: finalConfig.database,
    username: finalConfig.username,
    ssl: finalConfig.ssl
  });

  return AppDataSource;
};

export let AppDataSource: DataSource;

export const connectDatabase = async (): Promise<void> => {
  try {
    if (!AppDataSource) {
      logger.info('DataSource not created yet, creating it now...');
      await createDataSource();
    }

    const options = AppDataSource.options as DBConfig;
    
    // Log database configuration details
    logger.info('Attempting to connect to PostgreSQL with configuration:');
    logger.info(`Host: ${options.host}`);
    logger.info(`Port: ${options.port}`);
    logger.info(`Username: ${options.username}`);
    logger.info(`Database: ${options.database}`);
    logger.info(`SSL: ${JSON.stringify(options.ssl)}`);
    logger.info(`Synchronize: ${options.synchronize}`);
    
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
