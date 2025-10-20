import { Router } from 'express';
import { AuthController, loginValidation } from '../controllers/AuthController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
const authController = new AuthController();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         email:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         role:
 *           type: string
 *           enum: [PRESTADOR, CLIENTE, ADMIN]
 *         active:
 *           type: boolean
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *         password:
 *           type: string
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         token:
 *           type: string
 *         user:
 *           $ref: '#/components/schemas/User'
 */

// POST /api/auth/login - Autenticar usuario
router.post('/login', loginValidation, authController.login.bind(authController));

// GET /api/auth/me - Obtener información del usuario actual
router.get('/me', authenticateToken, authController.getCurrentUser.bind(authController));

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', authenticateToken, authController.logout.bind(authController));

export default router;
