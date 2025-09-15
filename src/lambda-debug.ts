import 'reflect-metadata';
import serverless from '@vendia/serverless-express';
import express from 'express';
import { logger } from './config/logger';
import { connectDatabase, AppDataSource } from './config/database';

// Crear una app Express básica para debug
const app = express();

// Ruta health que siempre responde, sin importar el estado de la DB
app.get('/health', (_req, res) => {
  res.json({ 
    ok: true, 
    ts: Date.now(),
    dbStatus: AppDataSource.isInitialized ? 'connected' : 'not connected'
  });
});

// Inicialización lazy de la base de datos
let dbInitialized = false;
async function initDB() {
  console.log('Lambda: Attempting DB init...');
  
  if (!dbInitialized && !AppDataSource.isInitialized) {
    try {
      await Promise.race([
        connectDatabase(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('DB init timeout')), 5000)
        )
      ]);
      dbInitialized = true;
      console.log('Lambda: DB initialized successfully');
    } catch (err) {
      console.error('Lambda: DB init failed:', err);
      // No lanzamos el error, dejamos que la app siga funcionando
    }
  }
}

// Handler para Lambda
export const handler = async (event: any, context: any) => {
  console.log('Lambda: Handler started');
  
  // Intentar inicializar DB pero no bloquear si falla
  await initDB().catch(err => console.error('Lambda: DB init error caught:', err));
  
  console.log('Lambda: Creating serverless handler');
  const serverlessHandler = serverless({ app });
  
  console.log('Lambda: Processing request');
  return serverlessHandler(event, context, () => {});
};
