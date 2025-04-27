import { Router } from 'express';
import { 
  getUserSessions, 
  getSessionById, 
  createSession, 
  updateSession, 
  deleteSession 
} from '../controllers/sessionController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// 获取用户会话列表
router.get('/', authenticate, getUserSessions);

// 获取单个会话详情
router.get('/:id', authenticate, getSessionById);

// 创建新会话
router.post('/', authenticate, createSession);

// 更新会话信息
router.put('/:id', authenticate, updateSession);

// 删除会话
router.delete('/:id', authenticate, deleteSession);

export default router;
