import 'reflect-metadata';
import express from 'express';
import serverless from '@vendia/serverless-express';
import { connectDatabase, createDataSource, AppDataSource } from './config/database';
import { Context, APIGatewayProxyEvent } from 'aws-lambda';

// Variable global para el estado de la DB
let dbInitialized = false;

// Función para inicializar la DB de forma segura
async function initDB() {
  if (!dbInitialized) {
    try {
      console.log('Creating DataSource...');
      await createDataSource();
      
      console.log('Attempting DB connection...');
      await Promise.race([
        connectDatabase(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB connection timeout after 20s')), 20000))
      ]);
      console.log('DB connected successfully');
      dbInitialized = true;
    } catch (error: any) {
      console.error('DB connection failed:', error);
      // Marcamos el error pero permitimos que la app siga funcionando
      if (error?.message === 'DB connection timeout after 20s') {
        console.warn('DB connection timed out - app will continue without DB access');
      }
      throw error; // Propagar el error para mejor manejo
    }
  } else {
    console.log('DB already initialized');
  }
}

// App Express con estado de DB
const app = express();

// Log middleware
app.use((req, res, next) => {
  console.log('Request received:', req.method, req.url);
  next();
});

// Ruta health con estado de DB
app.get('/health', (_req, res) => {
  console.log('Health check called');
  res.json({ 
    ok: true, 
    ts: Date.now(),
    dbStatus: dbInitialized ? 'connected' : 'not initialized',
    dbInitialized: AppDataSource.isInitialized
  });
});

// Handler con inicialización segura de DB
export const handler = async (event: any, context: any) => {
  console.log('Lambda handler started');
  
  // Configurar el contexto de Lambda para esperar por la conexión
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    if (!dbInitialized || (AppDataSource && !AppDataSource.isInitialized)) {
      console.log('DB not initialized, attempting initialization...');
      await initDB();
    }
    
    const serverlessHandler = serverless({ app });
    console.log('Serverless handler created');
    return serverlessHandler(event, context, () => {});
  } catch (error: any) {
    console.error('Error in handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};
