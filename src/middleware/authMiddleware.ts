import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authService } from '../services/AuthService';
import { logger } from '../config/logger';
import { config } from '../config/environment';

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

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Middleware para verificar la autenticación JWT
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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

    // Verificar el token JWT
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;

    // Crear información del usuario basada en el token decodificado
    // No necesitamos hacer una llamada adicional al módulo de usuarios
    const userInfo = {
      id: decoded.userId.toString(),
      email: decoded.email,
      firstName: 'Usuario', // Información básica del token
      lastName: 'Sistema',
      role: decoded.role as 'PRESTADOR' | 'CLIENTE' | 'ADMIN',
      active: true // Asumimos activo si el token es válido
    };

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

    // Verificar permisos de admin (por ahora permitimos PRESTADOR y CLIENTE)
    if (!authService.hasAdminAccess(userInfo.role)) {
      logger.warn('Intento de acceso sin permisos suficientes', { 
        userId: userInfo.id,
        email: userInfo.email,
        role: userInfo.role
      });
      res.status(403).json({ 
        error: 'Permisos insuficientes',
        message: 'No tiene permisos para acceder a esta funcionalidad'
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
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('Token JWT inválido', { 
        error: error.message,
        ip: req.ip,
        path: req.path
      });
      res.status(401).json({ 
        error: 'Token inválido',
        message: 'El token proporcionado no es válido'
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      logger.warn('Token JWT expirado', { 
        ip: req.ip,
        path: req.path
      });
      res.status(401).json({ 
        error: 'Token expirado',
        message: 'El token ha expirado, por favor inicie sesión nuevamente'
      });
      return;
    }

    logger.error('Error en middleware de autenticación', { 
      error: error instanceof Error ? error.message : 'Error desconocido',
      ip: req.ip,
      path: req.path
    });
    res.status(500).json({ 
      error: 'Error interno del servidor',
      message: 'Error al verificar la autenticación'
    });
  }
};

/**
 * Middleware opcional para verificar autenticación (no falla si no hay token)
 */
export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      const userInfo = {
        id: decoded.userId.toString(),
        email: decoded.email,
        firstName: 'Usuario',
        lastName: 'Sistema',
        role: decoded.role as 'PRESTADOR' | 'CLIENTE' | 'ADMIN',
        active: true
      };
      
      if (userInfo.active && authService.hasAdminAccess(userInfo.role)) {
        req.user = userInfo;
      }
    }
  } catch (error) {
    // En caso de error, simplemente continuamos sin usuario autenticado
    logger.debug('Error en autenticación opcional', { 
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }

  next();
};
