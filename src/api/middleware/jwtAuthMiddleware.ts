import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../../generated/prisma';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

// 扩展Express请求接口
export interface AuthRequest extends Request {
  user?: {
    id: number;
    username?: string | null;
    email?: string | null;
    role?: string | null;
    createdAt?: Date | null;
    updatedAt?: Date | null;
    lastLoginAt?: Date | null;
    isActive?: boolean | null;
  };
  token?: string;
}

/**
 * JWT认证中间件 - 验证JWT访问令牌
 * 适用于所有需要认证的API端点
 */
export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // 如果是健康检查、文档或静态资源请求，直接放行
  if (req.path === '/health' || 
      req.path === '/api-docs' || 
      req.path.startsWith('/api-docs/') || 
      req.path === '/api-docs.json' ||
      req.path.match(/\.(html|css|js|ico|png|jpg|jpeg|svg)$/)) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: '未授权访问', 
      message: '请提供有效的JWT令牌',
      details: { authHeader: authHeader ? '格式不正确' : '未提供' }
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    // 检查令牌是否在黑名单中
    const blacklistedToken = await prisma.blacklistedToken.findUnique({
      where: { token }
    });

    if (blacklistedToken) {
      logger.warn(`尝试使用已加入黑名单的令牌 [${req.method} ${req.path}]`);
      return res.status(401).json({ error: '令牌已失效，请重新登录' });
    }
    
    // 验证JWT令牌
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // 检查令牌类型
    if (decoded.type === 'refresh') {
      // 刷新令牌只能用于/api/auth/refresh端点
      if (req.path !== '/api/auth/refresh') {
        return res.status(401).json({ error: '刷新令牌不能用于访问API' });
      }
    }
    
    // 从数据库查找用户
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: '用户不存在或已被禁用' });
    }

    // 设置用户信息
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      isActive: user.isActive
    };
    req.token = token;
    
    logger.info(`JWT认证成功: ${user.username} [${req.method} ${req.path}]`);
    next();
  } catch (error: any) {
    logger.error(`JWT认证错误: ${error.message}`);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'JWT令牌已过期',
        message: '请使用刷新令牌获取新的访问令牌' 
      });
    }
    return res.status(401).json({ error: 'JWT认证失败' });
  }
};

/**
 * 检查用户角色
 */
export const checkRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }

    next();
  };
};
