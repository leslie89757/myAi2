import express, { Router } from 'express';
import userRoutes from './routes/userRoutes';
import chatRoutes from './routes/chatRoutes';
import knowledgeBaseRoutes from './routes/knowledgeBaseRoutes';
import { apiKeyAuth } from './middleware/auth';
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

// API鉴权中间件
apiRouter.use(apiKeyAuth);

// 用户相关路由
apiRouter.use('/users', userRoutes);

// 聊天相关路由
apiRouter.use('/chat', chatRoutes);

// 知识库相关路由
apiRouter.use('/knowledge', knowledgeBaseRoutes);

export default apiRouter;
