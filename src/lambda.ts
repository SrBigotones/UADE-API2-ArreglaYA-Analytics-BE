import 'reflect-metadata';
import serverless from '@vendia/serverless-express';
import express from 'express';
import { connectDatabase, AppDataSource } from './config/database';

// Variable global para el estado de la DB
let dbInitialized = false;

// Función para inicializar la DB de forma segura
async function initDB() {
  if (!dbInitialized && !AppDataSource.isInitialized) {
    try {
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
      if (error?.message === 'DB connection timeout after 10s') {
        console.warn('DB connection timed out - app will continue without DB access');
      }
    }
  } else if (dbInitialized) {
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
  try {
    // Intentar inicializar DB pero no bloquear si falla
    await initDB();
    
    const serverlessHandler = serverless({ app });
    console.log('Serverless handler created');
    return serverlessHandler(event, context);
  } catch (error) {
    console.error('Error in handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};
