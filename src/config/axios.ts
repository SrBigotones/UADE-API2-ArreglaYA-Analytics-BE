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
    hasAuth: !!config.headers?.Authorization,
    hasApiKey: !!config.headers?.['X-API-KEY'],
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

  logger.error(`❌ HTTP RESPONSE ERROR: ${method} ${fullUrl} - Status: ${status} | Error: ${errorData}`, {
    method,
    url: fullUrl,
    status,
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
  // Merge default config with provided config
  const mergedConfig = {
    ...config,
    httpsAgent: new (require('https').Agent)({
      rejectUnauthorized: process.env.NODE_ENV === 'production'
    })
  };

  const instance = axios.create(mergedConfig);
  applyLoggingInterceptors(instance);
  
  // Log HTTPS configuration
  logger.info('Creating Axios instance with HTTPS config:', {
    rejectUnauthorized: process.env.NODE_ENV === 'production',
    environment: process.env.NODE_ENV
  });

  return instance;
}

// Exportar la instancia por defecto configurada
export default axios;
