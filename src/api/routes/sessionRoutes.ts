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

// 添加消息到会话
router.post('/:id/messages', authenticate, addSessionMessage);

// 清空会话消息
router.delete('/:id/messages', authenticate, clearSessionMessages);

export default router;
