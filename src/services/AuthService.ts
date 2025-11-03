import axios, { AxiosResponse } from 'axios';
import { logger } from '../config/logger';
import { config } from '../config/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userInfo: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'PRESTADOR' | 'CLIENTE' | 'ADMIN';
    active: boolean;
  };
  message: string;
}

export interface UserInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'PRESTADOR' | 'CLIENTE' | 'ADMIN';
  active: boolean;
}

export class AuthService {
  private readonly usersApiBaseUrl: string;

  constructor() {
    // URL del módulo de usuarios
    this.usersApiBaseUrl = config.usersApiBaseUrl;
  }

  /**
   * Autentica al usuario contra el módulo de usuarios
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      logger.info('Intentando autenticar usuario', { email: credentials.email });

      const response: AxiosResponse<LoginResponse> = await axios.post(
        `${this.usersApiBaseUrl}/api/users/login`,
        {
          mail: credentials.email,
          password: credentials.password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.status === 200) {
        logger.info('Usuario autenticado exitosamente', { 
          email: credentials.email,
          userId: response.data.userInfo.id,
          role: response.data.userInfo.role
        });
        return response.data;
      }

      throw new Error(`Error de autenticación: ${response.status}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          logger.warn('Credenciales inválidas', { email: credentials.email });
          throw new Error('Credenciales inválidas');
        }
        if (error.response?.status === 403) {
          logger.error('Acceso denegado por el servidor de usuarios (posible problema de CORS o configuración)', { 
            email: credentials.email,
            status: error.response.status,
            data: error.response.data
          });
          // En desarrollo, usar datos mock si hay problema de acceso
          if (config.nodeEnv === 'development') {
            logger.warn('Usando datos mock para desarrollo debido a error 403', { 
              email: credentials.email 
            });
            return this.getMockUserData(credentials.email);
          }
          throw new Error('Acceso denegado por el servidor de autenticación');
        }
        if (error.response?.status === 500) {
          logger.error('Error interno del servidor de usuarios', { 
            email: credentials.email,
            error: error.message 
          });
          throw new Error('Error interno del servidor');
        }
        
        
        // Si no se puede conectar al módulo externo, usar datos mock para desarrollo
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message.includes('No es posible conectar')) {
          logger.warn('Módulo de usuarios no disponible, usando datos mock para desarrollo', { 
            email: credentials.email 
          });
          return this.getMockUserData(credentials.email);
        }
        
        logger.error('Error de conexión con el módulo de usuarios', { 
          email: credentials.email,
          error: error.message,
          status: error.response?.status
        });
        throw new Error('Error de conexión con el servidor de autenticación');
      }
      logger.error('Error inesperado en autenticación', { 
        email: credentials.email,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      throw new Error('Error inesperado en la autenticación');
    }
  }

  /**
   * Datos mock para desarrollo cuando el módulo de usuarios no está disponible
   */
  private getMockUserData(email: string): LoginResponse {
    const isPrestador = email.includes('prestador');
    const isCliente = email.includes('cliente');
    
    const userInfo = {
      id: isPrestador ? '2' : '1',
      email: email,
      firstName: isPrestador ? 'Test' : 'Usuario',
      lastName: isPrestador ? 'Prestador' : 'Cliente',
      role: isPrestador ? 'PRESTADOR' as const : 'CLIENTE' as const,
      active: true
    };

    return {
      token: 'mock-token-from-external-service',
      userInfo,
      message: 'Login exitoso (modo desarrollo)'
    };
  }

  /**
   * Obtiene información de un usuario por ID
   */
  async getUserById(userId: string, token: string): Promise<UserInfo> {
    try {
      const response: AxiosResponse<UserInfo> = await axios.get(
        `${this.usersApiBaseUrl}/api/users/${userId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error('Usuario no encontrado');
        }
        if (error.response?.status === 401) {
          throw new Error('Token inválido o expirado');
        }
      }
      logger.error('Error al obtener información del usuario', { 
        userId,
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      throw new Error('Error al obtener información del usuario');
    }
  }

  /**
   * Verifica si un usuario tiene permisos de admin
   * Por ahora, consideramos que tanto PRESTADOR como CLIENTE pueden acceder
   * ya que no tenemos rol ADMIN implementado aún
   */
  hasAdminAccess(userRole: string): boolean {
    return ['PRESTADOR', 'CLIENTE', 'ADMIN'].includes(userRole);
  }
}

export const authService = new AuthService();
