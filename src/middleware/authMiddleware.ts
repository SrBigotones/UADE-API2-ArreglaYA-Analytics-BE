import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthService';
import { logger } from '../config/logger';
import { featureFlagService, FEATURE_FLAGS } from '../services/FeatureFlagService';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'PRESTADOR' | 'CLIENTE' | 'ADMIN';
    active: boolean;
  };
}

/**
 * Middleware para verificar la autenticación mediante el servicio de usuarios
 * Si el feature flag 'bypass_auth_service' está activado, no requiere token y asigna usuario admin mock
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Verificar si el bypass está activado
    const bypassEnabled = await featureFlagService.isEnabled(FEATURE_FLAGS.BYPASS_AUTH_SERVICE);
    
    if (bypassEnabled) {
      // Modo bypass: No validar token, asignar usuario admin mock
      logger.warn('⚠️  BYPASS ACTIVADO: Acceso sin validación de token', {
        path: req.path,
        ip: req.ip
      });
      
      req.user = {
        id: '1',
        email: 'admin@bypass.com',
        firstName: 'Admin',
        lastName: 'Bypass',
        role: 'ADMIN',
        active: true
      };
      
      next();
      return;
    }

    // Modo normal: Validar token
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      logger.warn('Intento de acceso sin token', { 
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path
      });
      res.status(401).json({ 
        error: 'Token de acceso requerido',
        message: 'Debe proporcionar un token de autenticación válido'
      });
      return;
    }

    // Verificar el token con el servicio de usuarios
    const userInfo = await authService.verifyToken(token);

    // Verificar que el usuario esté activo
    if (!userInfo.active) {
      logger.warn('Intento de acceso con usuario inactivo', { 
        userId: userInfo.id,
        email: userInfo.email
      });
      res.status(403).json({ 
        error: 'Usuario inactivo',
        message: 'Su cuenta ha sido desactivada'
      });
      return;
    }

    // Verificar permisos (solo ADMIN puede acceder)
    if (!authService.hasAdminAccess(userInfo.role)) {
      logger.warn('Intento de acceso con usuario no admin', { 
        userId: userInfo.id,
        email: userInfo.email,
        role: userInfo.role
      });
      res.status(403).json({ 
        error: 'Acceso denegado',
        message: 'Solo usuarios con rol de administrador pueden acceder al sistema de analytics'
      });
      return;
    }

    // Agregar información del usuario a la request
    req.user = userInfo;

    logger.info('Usuario autenticado exitosamente', { 
      userId: userInfo.id,
      email: userInfo.email,
      role: userInfo.role,
      path: req.path
    });

    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    if (errorMessage.includes('Token inválido') || errorMessage.includes('expirado')) {
      logger.warn('Token inválido o expirado', { 
        ip: req.ip,
        path: req.path
      });
      res.status(401).json({ 
        error: 'Token inválido',
        message: errorMessage
      });
      return;
    }

    if (errorMessage.includes('Permisos insuficientes')) {
      logger.warn('Permisos insuficientes', { 
        ip: req.ip,
        path: req.path
      });
      res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: errorMessage
      });
      return;
    }

    if (errorMessage.includes('no disponible')) {
      logger.error('Servicio de autenticación no disponible', { 
        ip: req.ip,
        path: req.path
      });
      res.status(503).json({ 
        error: 'Servicio no disponible',
        message: 'El servicio de autenticación no está disponible temporalmente'
      });
      return;
    }

    logger.error('Error en middleware de autenticación', { 
      error: errorMessage,
      ip: req.ip,
      path: req.path
    });
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: 'Error al verificar la autenticación'
    });
  }
};

