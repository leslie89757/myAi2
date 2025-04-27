import { Router } from 'express';
import * as diagnosticController from '../controllers/diagnosticController';
import { dualAuthMiddleware } from '../middleware/dualAuthMiddleware';

const router = Router();

// 环境变量检查端点 - 需要API密钥认证
router.get('/environment', dualAuthMiddleware, diagnosticController.checkEnvironment);

// 数据库连接检查端点 - 需要API密钥认证
router.get('/database', dualAuthMiddleware, diagnosticController.checkDatabase);

export default router;
