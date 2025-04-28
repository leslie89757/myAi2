import { Router } from 'express';
import * as authController from '../controllers/authController';
import { authMiddleware } from '../middleware/jwtAuthMiddleware';

const router = Router();

// 用户登录 - 无需认证
router.post('/login', authController.login);

// 刷新令牌 - 直接传递给控制器处理，因为它有自己的令牌验证逻辑
router.post('/refresh', authController.refreshToken);

// 用户登出 - 需要认证
router.post('/logout', authMiddleware, authController.logout);

// 验证令牌 - 使用JWT认证
router.get('/validate', authMiddleware, authController.validateToken);

export default router;
