import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

export const config = {
  // Configuración del servidor
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Configuración JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

  // URL del módulo de usuarios
  usersApiBaseUrl: process.env.USERS_API_BASE_URL || 'https://dev.desarrollo2-usuarios.shop:8081',

  // Configuración de logging
  logLevel: process.env.LOG_LEVEL || 'info',
} as const;

// Validar configuración crítica
if (!config.jwtSecret || config.jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
  console.warn('⚠️  ADVERTENCIA: JWT_SECRET no está configurado o usa el valor por defecto. Esto es inseguro en producción.');
}

if (config.nodeEnv === 'production' && config.jwtSecret === 'your-super-secret-jwt-key-change-this-in-production') {
  throw new Error('❌ JWT_SECRET debe ser configurado en producción');
}

export default config;
