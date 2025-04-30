import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../../utils/logger';
import { PrismaClient } from '../../generated/prisma';

const prisma = new PrismaClient();

// 扩展Express请求接口
export interface JwtAuthRequest extends Request {
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
  authMethod?: 'jwt';
  token?: string;
}

/**
 * JWT认证中间件 - 只支持JWT令牌认证
 */
export const jwtAuthMiddleware = async (req: JwtAuthRequest, res: Response, next: NextFunction) => {
  // 如果是健康检查、文档或静态资源请求，直接放行
  if (req.path === '/health' || 
      req.path === '/api-docs' || 
      req.path.startsWith('/api-docs/') || 
      req.path.startsWith('/static/') ||
      req.path === '/') {
    return next();
  }

  // 获取认证头
  const authHeader = req.headers.authorization;
  
  // 如果没有提供JWT令牌，返回401错误
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供JWT令牌' });
  }

  try {
    // 解析JWT令牌
    const token = authHeader.split(' ')[1];
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // 设置用户信息
    req.user = {
      id: parseInt(decoded.id),
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
    req.authMethod = 'jwt';
    req.token = token;
    
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
 * 适用于用户特定操作（如更新个人信息）
 */
export const userAuthMiddleware = async (req: JwtAuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供JWT令牌' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id: parseInt(decoded.id) }
    });
    
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
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
    req.authMethod = 'jwt';
    req.token = token;
    
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
  return (req: JwtAuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }

    next();
  };
};
