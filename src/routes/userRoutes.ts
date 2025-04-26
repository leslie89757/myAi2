import express from 'express';
import { 
  registerUser, 
  loginUser, 
  getCurrentUser, 
  updateCurrentUser, 
  generateApiKey,
  getApiUsage
} from '../controllers/userController';
import { dualAuthMiddleware, jwtAuthMiddleware } from '../api/middleware/dualAuthMiddleware';

const router = express.Router();

// 公共路由
router.post('/register', registerUser);
router.post('/login', loginUser);

// 需要认证的路由 - 使用JWT认证保护用户特定操作
router.get('/me', jwtAuthMiddleware, getCurrentUser);
router.put('/me', jwtAuthMiddleware, updateCurrentUser);
router.post('/api-key', jwtAuthMiddleware, generateApiKey);
router.get('/api-usage', jwtAuthMiddleware, getApiUsage);

export default router;
