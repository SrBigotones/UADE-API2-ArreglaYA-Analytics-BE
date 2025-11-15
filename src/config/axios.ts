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

  // Enmascarar tokens en el payload para el log
  let dataToLog = config.data;
  if (config.data && typeof config.data === 'object' && config.data.token) {
    const token = config.data.token;
    dataToLog = {
      ...config.data,
      token: token ? `${token.substring(0, 20)}...${token.substring(token.length - 10)}` : token
    };
  }

  logger.info(`→ HTTP Request: ${method} ${fullUrl}`, {
    method,
    url: fullUrl,
    data: dataToLog,
    params: config.params
  });
  return config;
};

/**
 * Request error interceptor
 */
const requestErrorInterceptor = (error: any) => {
  logger.error('→ HTTP Request Error', { error: error.message });
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

  logger.info(`← HTTP Response: ${method} ${fullUrl} - ${response.status}`, {
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

  logger.error(`← HTTP Response Error: ${method} ${fullUrl} - ${status}`, {
    method,
    url: fullUrl,
    status,
    statusText: error.response?.statusText,
    errorCode: error.code,
    errorMessage: error.message,
    data: error.response?.data
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
    minVersion: 'TLSv1.2', // Versión mínima de TLS
    maxVersion: 'TLSv1.3', // Versión máxima de TLS
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

  return instance;
}

// Crear una instancia configurada de axios
const axiosInstance = createAxiosInstance();

// Exportar la instancia configurada como default
export default axiosInstance;
