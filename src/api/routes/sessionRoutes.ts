import { Router } from 'express';
import { 
  getUserSessions, 
  getSessionById, 
  createSession, 
  updateSession, 
  deleteSession,
  addSessionMessage,
  clearSessionMessages
} from '../controllers/sessionController';
import { authMiddleware } from '../middleware/jwtAuthMiddleware';

const router = Router();

// 获取用户会话列表
router.get('/', authMiddleware, getUserSessions);

// 获取单个会话详情
router.get('/:id', authMiddleware, getSessionById);

// 创建新会话
router.post('/', authMiddleware, createSession);

// 更新会话信息
router.put('/:id', authMiddleware, updateSession);

// 删除会话
router.delete('/:id', authMiddleware, deleteSession);

// 添加消息到会话
router.post('/:id/messages', authMiddleware, addSessionMessage);

// 清空会话消息
router.delete('/:id/messages', authMiddleware, clearSessionMessages);

export default router;
