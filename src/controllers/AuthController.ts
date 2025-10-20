import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { authService, LoginRequest } from '../services/AuthService';
import { logger } from '../config/logger';
import { config } from '../config/environment';

export class AuthController {
  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Autentica un usuario
   *     tags: [Auth]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: "prestador_test@gmail.com"
   *               password:
   *                 type: string
   *                 example: "123456"
   *     responses:
   *       200:
   *         description: Login exitoso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 token:
   *                   type: string
   *                 user:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     email:
   *                       type: string
   *                     firstName:
   *                       type: string
   *                     lastName:
   *                       type: string
   *                     role:
   *                       type: string
   *                       enum: [PRESTADOR, CLIENTE, ADMIN]
   *                     active:
   *                       type: boolean
   *       400:
   *         description: Datos inválidos
   *       401:
   *         description: Credenciales inválidas
   *       500:
   *         description: Error interno del servidor
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      // Validar datos de entrada
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Datos de login inválidos', { errors: errors.array() });
        res.status(400).json({
          success: false,
          error: 'Datos inválidos',
          message: 'Por favor, verifique los datos ingresados',
          details: errors.array()
        });
        return;
      }

      const { email, password }: LoginRequest = req.body;

      // Autenticar con el módulo de usuarios
      const loginResponse = await authService.login({ email, password });

      // Generar JWT propio para nuestro sistema
      const jwtPayload = {
        userId: loginResponse.userInfo.id,
        email: loginResponse.userInfo.email,
        role: loginResponse.userInfo.role
      };

      const token = jwt.sign(jwtPayload, config.jwtSecret, {
        expiresIn: '24h'
      });

      logger.info('Login exitoso', {
        userId: loginResponse.userInfo.id,
        email: loginResponse.userInfo.email,
        role: loginResponse.userInfo.role
      });

      res.status(200).json({
        success: true,
        message: 'Login exitoso',
        token,
        user: {
          id: loginResponse.userInfo.id,
          email: loginResponse.userInfo.email,
          firstName: loginResponse.userInfo.firstName,
          lastName: loginResponse.userInfo.lastName,
          role: loginResponse.userInfo.role,
          active: loginResponse.userInfo.active
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      logger.error('Error en login', {
        error: errorMessage,
        email: req.body?.email
      });

      if (errorMessage === 'Credenciales inválidas') {
        res.status(401).json({
          success: false,
          error: 'Credenciales inválidas',
          message: 'El email o contraseña son incorrectos'
        });
        return;
      }

      if (errorMessage.includes('conexión') || errorMessage.includes('servidor')) {
        res.status(503).json({
          success: false,
          error: 'Servicio no disponible',
          message: 'El servicio de autenticación no está disponible temporalmente'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'Ocurrió un error inesperado durante el login'
      });
    }
  }

  /**
   * @swagger
   * /api/auth/me:
   *   get:
   *     summary: Obtiene información del usuario autenticado
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Información del usuario
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 user:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     email:
   *                       type: string
   *                     firstName:
   *                       type: string
   *                     lastName:
   *                       type: string
   *                     role:
   *                       type: string
   *                     active:
   *                       type: boolean
   *       401:
   *         description: No autenticado
   *       403:
   *         description: Sin permisos
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      // Este endpoint requiere autenticación, por lo que req.user ya estará disponible
      const user = (req as any).user;

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'No autenticado',
          message: 'Debe estar autenticado para acceder a esta información'
        });
        return;
      }

      res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          active: user.active
        }
      });
    } catch (error) {
      logger.error('Error al obtener información del usuario actual', {
        error: error instanceof Error ? error.message : 'Error desconocido'
      });

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'Error al obtener información del usuario'
      });
    }
  }

  /**
   * @swagger
   * /api/auth/logout:
   *   post:
   *     summary: Cierra la sesión del usuario
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Logout exitoso
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      if (user) {
        logger.info('Usuario cerró sesión', {
          userId: user.id,
          email: user.email
        });
      }

      // En un sistema JWT stateless, el logout se maneja en el cliente
      // eliminando el token. Aquí solo confirmamos la acción.
      res.status(200).json({
        success: true,
        message: 'Sesión cerrada exitosamente'
      });
    } catch (error) {
      logger.error('Error en logout', {
        error: error instanceof Error ? error.message : 'Error desconocido'
      });

      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: 'Error al cerrar la sesión'
      });
    }
  }
}

// Validaciones para el endpoint de login
export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Debe proporcionar un email válido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 1 })
    .withMessage('La contraseña es requerida')
];
