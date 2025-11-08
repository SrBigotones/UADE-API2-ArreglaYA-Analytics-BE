import 'reflect-metadata';
import serverlessExpress from '@vendia/serverless-express';
import { Handler, Context, APIGatewayProxyEvent } from 'aws-lambda';
import { createDataSource, AppDataSource, connectDatabase } from './config/database';
import { loadCoreHubConfig } from './config';
import app from './app';

let serverlessHandler: Handler;
let dbInitialized = false;
let coreHubConfigInitialized = false;

// Track pending async operations
const pendingOperations = new Set<Promise<any>>();

export function registerPendingOperation(promise: Promise<any>): void {
  pendingOperations.add(promise);
  promise.finally(() => {
    pendingOperations.delete(promise);
  });
}

async function initDB() {
  if (!dbInitialized) {
    try {
      console.info('Creating DataSource...');
      await createDataSource();
      
      console.info('Attempting DB connection...');
      await Promise.race([
        connectDatabase(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB connection timeout after 20s')), 20000))
      ]);
      console.info('DB connected successfully');
      dbInitialized = true;
    } catch (error: any) {
      console.error('DB connection failed:', error);
      if (error?.message === 'DB connection timeout after 20s') {
        console.warn('DB connection timed out - app will continue without DB access');
      }
      throw error;
    }
  } else {
    console.info('DB already initialized');
  }
}

async function setupServerless() {
  if (!serverlessHandler) {
    serverlessHandler = serverlessExpress({ app });
  }
  return serverlessHandler;
}


export const handler = async (event: APIGatewayProxyEvent, context: Context) => {
  console.info('Lambda handler started');
  context.callbackWaitsForEmptyEventLoop = false; // Let Lambda manage the lifecycle

  try {
    // Load Core Hub config from SSM if in Lambda (first time only)
    if (!coreHubConfigInitialized) {
      await loadCoreHubConfig();
      coreHubConfigInitialized = true;
    }

    // Initialize database if needed
    if (!dbInitialized || (AppDataSource && !AppDataSource.isInitialized)) {
      await initDB();
    }

    // Setup serverless handler if needed
    const handler = await setupServerless();
    console.info('Request received:', event.httpMethod, event.path);

    // Execute the serverless handler and get response
    const response = await handler(event, context, () => {});

    // CRITICAL: Wait for pending operations AFTER getting response but BEFORE returning
    if (pendingOperations.size > 0) {
      console.info(`⏳ Waiting for ${pendingOperations.size} pending operations to complete...`);
      await Promise.allSettled(Array.from(pendingOperations));
      console.info('✅ All pending operations completed');
    }

    return response;
  } catch (error: any) {
    console.error('Error in handler:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      }),
    };
  }
};