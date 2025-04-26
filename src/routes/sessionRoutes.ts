import express from 'express';
import { 
  createSession, 
  getUserSessions, 
  getSessionDetails, 
  updateSession, 
  deleteSession, 
  addMessage, 
  getSessionMessages, 
  clearSessionMessages 
} from '../controllers/sessionController';
import { dualAuthMiddleware } from '../api/middleware/dualAuthMiddleware';

const router = express.Router();

// 所有会话路由都需要认证（支持JWT和API密钥）
router.use(dualAuthMiddleware);

// 会话管理路由
router.post('/', createSession);
router.get('/', getUserSessions);
router.get('/:id', getSessionDetails);
router.put('/:id', updateSession);
router.delete('/:id', deleteSession);

// 会话消息路由
router.post('/:id/messages', addMessage);
router.get('/:id/messages', getSessionMessages);
router.delete('/:id/messages', clearSessionMessages);

export default router;
