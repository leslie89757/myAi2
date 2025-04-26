import { Router } from 'express';
import * as authController from '../controllers/authController';
import { dualAuthMiddleware, jwtAuthMiddleware } from '../middleware/dualAuthMiddleware';

const router = Router();

// 用户登录 - 无需认证
router.post('/login', authController.login);

// 刷新令牌 - 直接传递给控制器处理，因为它有自己的令牌验证逻辑
router.post('/refresh', authController.refreshToken);

// 用户登出 - 需要认证
router.post('/logout', jwtAuthMiddleware, authController.logout);

// 验证令牌 - 使用双路径认证（JWT或API密钥都可以）
router.get('/validate', dualAuthMiddleware, authController.validateToken);

export default router;
