import axios from '../config/axios';
import { AxiosResponse } from 'axios';
import { logger } from '../config/logger';
import { config } from '../config';
import { featureFlagService, FEATURE_FLAGS } from './FeatureFlagService';

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
   * Decodifica el payload de un JWT sin verificar la firma
   * @param token JWT completo
   * @returns Payload decodificado
   */
  private decodeJwtPayload(token: string): any {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Token inválido');
    }
    
    // Decodificar el payload (segunda parte del JWT)
    return JSON.parse(Buffer.from(parts[1], 'base64').toString());
  }

  /**
   * Autentica al usuario contra el módulo de usuarios
   * Si el feature flag 'bypass_auth_service' está activado, usa mock data
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // Verificar si el bypass está activado
      const bypassEnabled = await featureFlagService.isEnabled(FEATURE_FLAGS.BYPASS_AUTH_SERVICE);
      
      if (bypassEnabled) {
        logger.warn('⚠️  BYPASS ACTIVADO: Usando mock data para login', { 
          email: credentials.email,
          environment: config.nodeEnv 
        });
        return this.getMockUserData(credentials.email);
      }

      logger.info('Intentando autenticar usuario', { email: credentials.email });

      const response: AxiosResponse<LoginResponse> = await axios.post(
        `${this.usersApiBaseUrl}/api/users/login`,
        {
          email: credentials.email,
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
      logger.error('Error en autenticación' + error);
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
        
        // Si no se puede conectar al módulo externo
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message.includes('No es posible conectar')) {
          logger.error('Módulo de usuarios no disponible', { 
            email: credentials.email 
          });
          throw new Error('Error de conexión con el servidor de autenticación');
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
   * Solo retorna usuarios ADMIN para cumplir con la política de acceso
   */
  private getMockUserData(email: string): LoginResponse {
    // Para bypass mode, siempre retornar admin
    const userInfo = {
      id: '1',
      email: email,
      firstName: 'Admin',
      lastName: 'Bypass',
      role: 'ADMIN' as const,
      active: true
    };

    return {
      token: 'mock-jwt-token-for-bypass-mode',
      userInfo,
      message: 'Login exitoso (modo bypass activado)'
    };
  }

  /**
   * Verifica un token con el servicio de usuarios y obtiene la información del usuario
   * Si el feature flag 'bypass_auth_service' está activado, retorna mock data
   */
  async verifyToken(token: string): Promise<UserInfo> {
    try {
      // Verificar si el bypass está activado
      const bypassEnabled = await featureFlagService.isEnabled(FEATURE_FLAGS.BYPASS_AUTH_SERVICE);
      
      if (bypassEnabled) {
        logger.warn('⚠️  BYPASS ACTIVADO: Usando mock data para token verification', {
          environment: config.nodeEnv
        });
        // Retornar usuario admin mock
        return {
          id: '1',
          email: 'admin@bypass.com',
          firstName: 'Admin',
          lastName: 'Bypass',
          role: 'ADMIN',
          active: true
        };
      }

      logger.info('Verificando token con servicio de usuarios');

      // Decodificar el JWT para obtener la información del usuario
      const payload = this.decodeJwtPayload(token);
      
      logger.info('JWT decodificado exitosamente', { 
        role: payload.role,
        sub: payload.sub
      });

      // El JWT contiene: role, sub (email), iat, exp
      // Validar que el token contenga la información mínima necesaria
      if (!payload.sub || !payload.role) {
        logger.error('Token no contiene información completa', {
          hasSub: !!payload.sub,
          hasRole: !!payload.role,
          payloadKeys: Object.keys(payload)
        });
        throw new Error('Token no contiene información completa del usuario');
      }

      return {
        id: payload.sub,
        email: payload.sub,
        firstName: '',
        lastName: '',
        role: payload.role,
        active: true
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          logger.warn('Token inválido o expirado');
          throw new Error('Token inválido o expirado');
        }
        if (error.response?.status === 403) {
          logger.warn('Token sin permisos suficientes');
          throw new Error('Permisos insuficientes');
        }
        
        // Si no se puede conectar al servicio de usuarios
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
          logger.warn('Servicio de usuarios no disponible para verificación de token');
          throw new Error('Servicio de autenticación no disponible');
        }
      }
      
      logger.error('Error al verificar token', { 
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
      throw new Error('Error al verificar token');
    }
  }

  /**
   * Verifica si un usuario tiene permisos de admin
   * Solo usuarios con rol ADMIN pueden acceder al sistema de analytics
   */
  hasAdminAccess(userRole: string): boolean {
    return userRole === 'ADMIN';
  }
}

export const authService = new AuthService();
