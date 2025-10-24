import 'reflect-metadata';
import serverlessExpress from '@vendia/serverless-express';
import { Handler, Context, APIGatewayProxyEvent } from 'aws-lambda';
import { createDataSource, AppDataSource, connectDatabase } from './config/database';
import app from './app';
import { initializeSubscriptions } from './services/SubscriptionManager';

let serverlessHandler: Handler;
let dbInitialized = false;

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

async function setupCoreSubscriptions() {
  // 🔗 Initialize Core Hub subscriptions after server starts
  try {
    console.log('🔗 Initializing Core Hub subscriptions...');
    await initializeSubscriptions();
    console.log('✅ Core Hub subscriptions initialized successfully');
  } catch (error) {
    console.log('❌ Failed to initialize Core Hub subscriptions:', error);
    // Don't exit - the server can still function without subscriptions
  }
}

export const handler = async (event: APIGatewayProxyEvent, context: Context) => {
  console.info('Lambda handler started');
  context.callbackWaitsForEmptyEventLoop = false;

  try {
    // Initialize database if needed
    if (!dbInitialized || (AppDataSource && !AppDataSource.isInitialized)) {
      await initDB();
    }

    setupCoreSubscriptions()

    // Setup serverless handler if needed
    const handler = await setupServerless();
    console.info('Request received:', event.httpMethod, event.path);
    
    return handler(event, context, () => {});
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