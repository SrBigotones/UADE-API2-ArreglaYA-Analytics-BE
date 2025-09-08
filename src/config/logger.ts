import winston from 'winston';
import { config } from './index';
import * as fs from 'fs';

// In Lambda, use /tmp for writable directory
const logDir = process.env.AWS_LAMBDA_FUNCTION_NAME ? '/tmp/logs' : 'logs';

// Ensure log directory exists
try {
  fs.mkdirSync(logDir, { recursive: true });
} catch (error) {
  console.warn(`Failed to create log directory: ${error}`);
}

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'arregla-ya-metrics-backend' },
  transports: [],
});

// Always add console transport for Lambda environment
logger.add(new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  )
}));

// Always add console transport
logger.add(new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple()
  )
}));

// Add file transports with appropriate directory
try {
  logger.add(new winston.transports.File({ filename: `${logDir}/error.log`, level: 'error' }));
  logger.add(new winston.transports.File({ filename: `${logDir}/combined.log` }));
} catch (error) {
  console.warn(`Failed to add file transports: ${error}`);
}

export { logger };
