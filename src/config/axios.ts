import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { logger } from './logger';

/**
 * Request interceptor para logging
 * Extrae la lógica común de logging de requests
 */
const requestInterceptor = (config: InternalAxiosRequestConfig) => {
  const url = config.url || 'unknown';
  const method = config.method?.toUpperCase() || 'UNKNOWN';
  const baseURL = config.baseURL || '';
  const fullUrl = baseURL ? `${baseURL}${url}` : url;
  const payload = config.data ? JSON.stringify(config.data) : 'N/A';

  logger.info(`🔗 HTTP REQUEST: ${method} ${fullUrl} | Payload: ${payload}`, {
    method,
    url: fullUrl,
    headers: config.headers, // Log todos los headers
    payload: config.data,
    params: config.params
  });
  return config;
};

/**
 * Request error interceptor
 */
const requestErrorInterceptor = (error: any) => {
  logger.error('❌ HTTP REQUEST ERROR', { error: error.message });
  return Promise.reject(error);
};

/**
 * Response interceptor para logging
 * Extrae la lógica común de logging de responses
 */
const responseInterceptor = (response: AxiosResponse) => {
  const url = response.config.url || 'unknown';
  const method = response.config.method?.toUpperCase() || 'UNKNOWN';
  const baseURL = response.config.baseURL || '';
  const fullUrl = baseURL ? `${baseURL}${url}` : url;
  const responseData = response.data 
    ? (typeof response.data === 'string' 
        ? response.data.substring(0, 200) 
        : JSON.stringify(response.data).substring(0, 200)) 
    : 'N/A';

  logger.info(`✅ HTTP RESPONSE: ${method} ${fullUrl} - Status: ${response.status} | Data: ${responseData}`, {
    method,
    url: fullUrl,
    requestHeaders: response.config.headers, // Headers enviados
    responseHeaders: response.headers,       // Headers recibidos
    status: response.status,
    statusText: response.statusText,
    data: response.data
  });
  return response;
};

/**
 * Response error interceptor para logging
 */
const responseErrorInterceptor = (error: AxiosError) => {
  const url = error.config?.url || 'unknown';
  const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
  const baseURL = error.config?.baseURL || '';
  const fullUrl = baseURL ? `${baseURL}${url}` : url;
  const status = error.response?.status || 'N/A';
  const errorData = error.response?.data 
    ? JSON.stringify(error.response.data).substring(0, 200) 
    : 'N/A';
    
  // Log detallado para errores de TLS/SSL
  if (error.code === 'ECONNRESET' || error.message.includes('TLS') || error.message.includes('SSL')) {
    logger.error('SSL/TLS Connection Error Details:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
      url: fullUrl,
      protocol: url.startsWith('https') ? 'HTTPS' : 'HTTP',
      nodeEnv: process.env.NODE_ENV
    });
  }

  logger.error(`❌ HTTP RESPONSE ERROR: ${method} ${fullUrl} - Status: ${status} | Error: ${errorData}`, {
    method,
    url: fullUrl,
    status,
    requestHeaders: error.config?.headers,   // Headers que enviamos
    responseHeaders: error.response?.headers, // Headers que recibimos
    errorCode: error.code,
    message: error.message,
    errorData: error.response?.data
  });
  return Promise.reject(error);
};

/**
 * Aplica los interceptores de logging a una instancia de axios
 */
function applyLoggingInterceptors(instance: AxiosInstance): void {
  instance.interceptors.request.use(requestInterceptor, requestErrorInterceptor);
  instance.interceptors.response.use(responseInterceptor, responseErrorInterceptor);
}

/**
 * Configura interceptores globales para la instancia por defecto de axios
 */
applyLoggingInterceptors(axios);

/**
 * Crea una instancia de axios con interceptores de logging configurados
 * Usar esta función cuando necesites crear una instancia separada (ej: con baseURL diferente)
 * pero manteniendo el mismo logging
 */
export function createAxiosInstance(config?: any): AxiosInstance {
  const https = require('https');
  
  // Configuración avanzada del agente HTTPS
  const httpsAgent = new https.Agent({
    rejectUnauthorized: false, // Deshabilitado para permitir certificados autofirmados en stage y desarrollo
    secureProtocol: 'TLSv1_2_method', // Forzar TLS 1.2
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3',
    keepAlive: true,
    keepAliveMsecs: 1000,
    timeout: 60000, // 60 segundos de timeout
    maxCachedSessions: 100,
    handshakeTimeout: 30000, // 30 segundos para handshake
    ciphers: 'HIGH:!aNULL:!MD5:!RC4', // Cifrados seguros
    honorCipherOrder: true
  });

  // Merge default config with provided config
  const mergedConfig = {
    ...config,
    httpsAgent,
    timeout: 30000, // 30 segundos de timeout para la petición completa
    maxRedirects: 5,
    validateStatus: function (status: number) {
      return status >= 200 && status < 500; // No rechazar en errores 4xx
    }
  };

  const instance = axios.create(mergedConfig);
  applyLoggingInterceptors(instance);
  
  // Log HTTPS configuration
  logger.info('Creating Axios instance with enhanced HTTPS config:', {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
    environment: process.env.NODE_ENV,
    secureProtocol: 'TLSv1_2_method',
    timeout: mergedConfig.timeout,
    keepAlive: true
  });

  return instance;
}

// Crear una instancia configurada de axios
const axiosInstance = createAxiosInstance();

// Exportar la instancia configurada como default
export default axiosInstance;
