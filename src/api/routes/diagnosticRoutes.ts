import { Router } from 'express';
import * as diagnosticController from '../controllers/diagnosticController';
import { authMiddleware } from '../middleware/jwtAuthMiddleware';

const router = Router();

// 环境变量检查端点 - 需要JWT认证
router.get('/environment', authMiddleware, diagnosticController.checkEnvironment);

// 数据库连接检查端点 - 需要JWT认证
router.get('/database', authMiddleware, diagnosticController.checkDatabase);

export default router;
