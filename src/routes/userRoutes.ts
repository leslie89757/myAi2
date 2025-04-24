import express from 'express';
import { 
  registerUser, 
  loginUser, 
  getCurrentUser, 
  updateCurrentUser, 
  generateApiKey,
  getApiUsage
} from '../controllers/userController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

// 公共路由
router.post('/register', registerUser);
router.post('/login', loginUser);

// 需要认证的路由
router.get('/me', authenticate, getCurrentUser);
router.put('/me', authenticate, updateCurrentUser);
router.post('/api-key', authenticate, generateApiKey);
router.get('/api-usage', authenticate, getApiUsage);

export default router;
