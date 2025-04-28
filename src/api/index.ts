import express, { Router } from 'express';
import knowledgeBaseRoutes from './routes/knowledgeBaseRoutes';
import sessionRoutes from './routes/sessionRoutes';
import authRoutes from './routes/authRoutes';
import diagnosticRoutes from './routes/diagnosticRoutes';
import { authMiddleware } from './middleware/jwtAuthMiddleware';
import logger from '../utils/logger';

/**
 * API 路由集中管理
 * 所有 API 路由都在这里注册
 */
const apiRouter = Router();

// 请求日志中间件
apiRouter.use((req, res, next) => {
  logger.info(`API请求: ${req.method} ${req.url}`);
  next();
});

// 认证路由（这些路由不需要提前验证）
apiRouter.use('/auth', authRoutes);

// API鉴权中间件（适用于除认证路由外的所有路由）
apiRouter.use((req, res, next) => {
  // 跳过 /api/auth 路由的认证
  if (req.path.startsWith('/auth/')) {
    return next();
  }
  authMiddleware(req, res, next);
});

// 用户相关路由和聊天相关路由已完全移除

// 知识库相关路由
apiRouter.use('/knowledge', knowledgeBaseRoutes);

// 会话管理路由
apiRouter.use('/sessions', sessionRoutes);

// 诊断路由
apiRouter.use('/diagnostic', diagnosticRoutes);

export default apiRouter;
