import express from 'express';
import * as adminUserController from '../controllers/adminUserController';
import * as adminSystemController from '../controllers/adminSystemController';
import * as adminKnowledgeController from '../controllers/adminKnowledgeController';
import { adminAuthMiddleware } from '../middlewares/adminAuthMiddleware';
import { apiKeyAuth } from '../../api/middleware/auth';

const router = express.Router();

// 应用API密钥认证中间件
router.use(apiKeyAuth);

// 管理员认证
router.post('/login', adminUserController.login);

// 用户管理API
router.get('/users', adminAuthMiddleware, adminUserController.getUsers);
router.get('/users/:id', adminAuthMiddleware, adminUserController.getUserById);
router.post('/users', adminAuthMiddleware, adminUserController.createUser);
router.put('/users/:id', adminAuthMiddleware, adminUserController.updateUser);
router.put('/users/:id/status', adminAuthMiddleware, adminUserController.updateUserStatus);
router.delete('/users/:id', adminAuthMiddleware, adminUserController.deleteUser);

// 系统配置API
router.get('/config', adminAuthMiddleware, adminSystemController.getSystemConfig);
router.put('/config', adminAuthMiddleware, adminSystemController.updateSystemConfig);
router.get('/config/:key', adminAuthMiddleware, adminSystemController.getSystemConfigByKey);
router.put('/config/:key', adminAuthMiddleware, adminSystemController.updateSystemConfigByKey);

// 提示词模板API
router.get('/prompts', adminAuthMiddleware, adminKnowledgeController.getSystemPrompts);
router.get('/prompts/:id', adminAuthMiddleware, adminKnowledgeController.getSystemPromptById);
router.post('/prompts', adminAuthMiddleware, adminKnowledgeController.createSystemPrompt);
router.put('/prompts/:id', adminAuthMiddleware, adminKnowledgeController.updateSystemPrompt);
router.delete('/prompts/:id', adminAuthMiddleware, adminKnowledgeController.deleteSystemPrompt);

export default router;
