import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';

/**
 * Configura interceptores globales para logging de todas las peticiones HTTP
 * Esta configuración se aplica a la instancia por defecto de axios
 */
axios.interceptors.request.use(
  (config) => {
    const url = config.url || 'unknown';
    const method = config.method?.toUpperCase() || 'UNKNOWN';
    const baseURL = config.baseURL || '';
    const fullUrl = baseURL ? `${baseURL}${url}` : url;
    const payload = config.data ? JSON.stringify(config.data) : 'N/A';

    logger.info(`🔗 HTTP REQUEST: ${method} ${fullUrl} | Payload: ${payload}`, {
      method,
      url: fullUrl,
      hasAuth: !!config.headers?.Authorization,
      payload: config.data
    });
    return config;
  },
  (error) => {
    logger.error('❌ HTTP REQUEST ERROR', { error: error.message });
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    const url = response.config.url || 'unknown';
    const method = response.config.method?.toUpperCase() || 'UNKNOWN';
    const baseURL = response.config.baseURL || '';
    const fullUrl = baseURL ? `${baseURL}${url}` : url;
    const responseData = response.data ? (typeof response.data === 'string' ? response.data.substring(0, 200) : JSON.stringify(response.data).substring(0, 200)) : 'N/A';

    logger.info(`✅ HTTP RESPONSE: ${method} ${fullUrl} - Status: ${response.status} | Data: ${responseData}`, {
      method,
      url: fullUrl,
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });
    return response;
  },
  (error) => {
    const url = error.config?.url || 'unknown';
    const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
    const baseURL = error.config?.baseURL || '';
    const fullUrl = baseURL ? `${baseURL}${url}` : url;
    const status = error.response?.status || 'N/A';
    const errorData = error.response?.data ? JSON.stringify(error.response.data).substring(0, 200) : 'N/A';

    logger.error(`❌ HTTP RESPONSE ERROR: ${method} ${fullUrl} - Status: ${status} | Error: ${errorData}`, {
      method,
      url: fullUrl,
      status,
      errorCode: error.code,
      message: error.message,
      errorData: error.response?.data
    });
    return Promise.reject(error);
  }
);

/**
 * Crea una instancia de axios con interceptores de logging configurados
 * Usar esta función cuando necesites crear una instancia separada (ej: con baseURL diferente)
 * pero manteniendo el mismo logging
 */
export function createAxiosInstance(config?: any): AxiosInstance {
  const instance = axios.create(config);
  
  // Aplicar los mismos interceptores a la instancia creada
  instance.interceptors.request.use(
    (config) => {
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
    },
    (error) => {
      logger.error('❌ HTTP REQUEST ERROR', { error: error.message });
      return Promise.reject(error);
    }
  );

  instance.interceptors.response.use(
    (response) => {
      const url = response.config.url || 'unknown';
      const method = response.config.method?.toUpperCase() || 'UNKNOWN';
      const baseURL = response.config.baseURL || '';
      const fullUrl = baseURL ? `${baseURL}${url}` : url;
      const responseData = response.data ? (typeof response.data === 'string' ? response.data.substring(0, 200) : JSON.stringify(response.data).substring(0, 200)) : 'N/A';

      logger.info(`✅ HTTP RESPONSE: ${method} ${fullUrl} - Status: ${response.status} | Data: ${responseData}`, {
        method,
        url: fullUrl,
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      return response;
    },
    (error) => {
      const url = error.config?.url || 'unknown';
      const method = error.config?.method?.toUpperCase() || 'UNKNOWN';
      const baseURL = error.config?.baseURL || '';
      const fullUrl = baseURL ? `${baseURL}${url}` : url;
      const status = error.response?.status || 'N/A';
      const errorData = error.response?.data ? JSON.stringify(error.response.data).substring(0, 200) : 'N/A';

      logger.error(`❌ HTTP RESPONSE ERROR: ${method} ${fullUrl} - Status: ${status} | Error: ${errorData}`, {
        method,
        url: fullUrl,
        status,
        errorCode: error.code,
        message: error.message,
        errorData: error.response?.data
      });
      return Promise.reject(error);
    }
  );

  return instance;
}

// Exportar la instancia por defecto configurada
export default axios;
