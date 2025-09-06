import { DataSource } from 'typeorm';
import { config } from './index';
import { logger } from './logger';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: config.database.synchronize,
  logging: config.database.logging,
  entities: [__dirname + '/../models/*.ts'],
  migrations: [__dirname + '/../migrations/*.ts'],
  subscribers: [__dirname + '/../subscribers/*.ts'],
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.initialize();
    logger.info('Connected to MySQL database');
  } catch (error) {
    logger.error('MySQL connection error:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await AppDataSource.destroy();
    logger.info('Disconnected from MySQL database');
  } catch (error) {
    logger.error('MySQL disconnection error:', error);
    throw error;
  }
};
