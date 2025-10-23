import axios from 'axios';
import { logger } from './logger';

// Interceptor global para todas las requests
axios.interceptors.request.use(
  (config) => {
    const url = config.url || 'unknown';
    const method = config.method?.toUpperCase() || 'UNKNOWN';
    const baseURL = config.baseURL || '';
    const fullUrl = baseURL ? `${baseURL}${url}` : url;
    
    // Preparar información del payload
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

// Interceptor global para todas las responses
axios.interceptors.response.use(
  (response) => {
    const url = response.config.url || 'unknown';
    const method = response.config.method?.toUpperCase() || 'UNKNOWN';
    const baseURL = response.config.baseURL || '';
    const fullUrl = baseURL ? `${baseURL}${url}` : url;
    
    // Preparar información de la respuesta (limitada para no loguear demasiado)
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

export default axios;

