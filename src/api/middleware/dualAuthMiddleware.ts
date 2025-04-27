import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../../utils/logger';
import { PrismaClient } from '../../generated/prisma';

const prisma = new PrismaClient();

// 扩展Express请求接口
export interface DualAuthRequest extends Request {
  user?: {
    id: number;
    username?: string | null;
    email?: string | null;
    role?: string | null;
    apiKeyId?: string;
    password?: string | null;
    apiKey?: string | null;
    apiKeyUsage?: number | null;
    apiKeyLimit?: number | null;
    createdAt?: Date | null;
    updatedAt?: Date | null;
    lastLoginAt?: Date | null;
    isActive?: boolean | null;
  };
  authMethod?: 'jwt' | 'apiKey';
  token?: string;
}

/**
 * 双路径认证中间件 - 同时支持JWT令牌和API密钥
 * 优先尝试JWT认证，如果失败则尝试API密钥认证
 */
export const dualAuthMiddleware = async (req: DualAuthRequest, res: Response, next: NextFunction) => {
  // 如果是健康检查、文档或静态资源请求，直接放行
  if (req.path === '/health' || 
      req.path === '/api-docs' || 
      req.path.startsWith('/api-docs/') || 
      req.path === '/api-docs.json' ||
      req.path.match(/\.(html|css|js|ico|png|jpg|jpeg|svg)$/)) {
    return next();
  }

  // 检查Authorization头（JWT认证）
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
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
      
      // 检查是否是刷新令牌
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

      // 设置用户信息和认证方法
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        apiKey: user.apiKey,
        apiKeyUsage: user.apiKeyUsage,
        apiKeyLimit: user.apiKeyLimit,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        isActive: user.isActive
      };
      req.authMethod = 'jwt';
      req.token = token;
      
      logger.info(`JWT认证成功: ${user.username} [${req.method} ${req.path}]`);
      return next();
    } catch (error: any) {
      logger.warn(`JWT认证失败: ${error.message}`);
      // 不立即返回错误，继续尝试API密钥认证
    }
  }

  // 检查X-API-Key头（API密钥认证）
  const apiKey = req.headers['x-api-key'] as string;
  if (apiKey) {
    try {
      // 首先检查用户API密钥
      const user = await prisma.user.findFirst({
        where: {
          apiKey,
          isActive: true
        }
      });

      if (user) {
        // 增加用户API使用次数
        await prisma.user.update({
          where: { id: user.id },
          data: { apiKeyUsage: { increment: 1 } }
        });

        req.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          apiKey: user.apiKey,
          apiKeyUsage: user.apiKeyUsage,
          apiKeyLimit: user.apiKeyLimit,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          lastLoginAt: user.lastLoginAt,
          isActive: user.isActive
        };
        req.authMethod = 'apiKey';
        
        logger.info(`用户API密钥认证成功: ${user.username} [${req.method} ${req.path}]`);
        return next();
      }

      // 检查全局API密钥
      const apiKeysStr = process.env.API_KEYS;
      if (apiKeysStr) {
        const keyPairs = apiKeysStr.split(',');
        for (const pair of keyPairs) {
          const [key, name] = pair.trim().split(':');
          if (key && key === apiKey) {
            req.user = {
              id: 0, // 系统用户ID为0
              username: name || 'system_user',
              apiKeyId: key
            };
            req.authMethod = 'apiKey';
            
            logger.info(`全局API密钥认证成功: ${name} [${req.method} ${req.path}]`);
            return next();
          }
        }
      }
    } catch (error: any) {
      logger.error(`API密钥认证错误: ${error.message}`);
    }
  }

  // 如果两种认证方式都失败，返回未授权错误
  return res.status(401).json({ 
    error: '未授权访问', 
    message: '请提供有效的JWT令牌或API密钥',
    details: {
      authHeader: authHeader ? '已提供但无效' : '未提供',
      apiKey: apiKey ? '已提供但无效' : '未提供'
    }
  });
};

/**
 * 仅JWT认证中间件 - 只允许通过JWT令牌认证
 * 适用于用户特定操作（如更新个人信息）
 */
export const jwtAuthMiddleware = async (req: DualAuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供JWT令牌' });
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
      return res.status(401).json({ error: '不能使用刷新令牌访问此资源' });
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
      apiKey: user.apiKey,
      apiKeyUsage: user.apiKeyUsage,
      apiKeyLimit: user.apiKeyLimit,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      isActive: user.isActive,
      password: user.password
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
  return (req: DualAuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' });
    }

    next();
  };
};
