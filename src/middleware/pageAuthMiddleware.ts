import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

/**
 * 页面认证中间件 - 用于保护需要登录才能访问的页面
 * 如果用户未登录，将重定向到登录页面
 */
export const pageAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // 从多个位置检查认证令牌
  // 1. 从cookie中获取
  // 2. 从查询参数中获取
  // 3. 从Authorization头中获取
  const authHeader = req.headers.authorization;
  const token = 
    req.cookies?.accessToken || 
    req.query?.token as string || 
    (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null);
  
  if (!token) {
    logger.info(`未认证访问页面: ${req.path}，重定向到登录页面`);
    // 将当前URL作为参数传递给登录页面，以便登录后重定向回来
    return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
  }
  
  try {
    // 验证令牌
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    jwt.verify(token, JWT_SECRET);
    
    // 令牌有效，允许访问
    next();
  } catch (error) {
    logger.warn(`无效的令牌访问页面: ${req.path}，重定向到登录页面`);
    return res.redirect(`/login?redirect=${encodeURIComponent(req.originalUrl)}`);
  }
};
