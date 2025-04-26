import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../generated/prisma';
import { UserService } from '../services/userService';
import logger from '../utils/logger';

// 扩展 Request 接口以包含用户信息
export interface AuthRequest extends Request {
  user?: User;
  token?: string;
}

// JWT 认证中间件
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 从请求头获取 token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: '无效的认证令牌格式' });
    }

    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // 查找用户
    const user = await UserService.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: '用户不存在或已被禁用' });
    }

    // 将用户信息附加到请求对象
    req.user = user;
    req.token = token;
    next();
  } catch (error: any) {
    logger.error(`认证错误: ${error.message}`);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '认证令牌已过期' });
    }
    return res.status(401).json({ error: '认证失败' });
  }
};

// 角色授权中间件
export const authorize = (roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    if (!roles.includes(req.user.role as UserRole)) {
      return res.status(403).json({ error: '权限不足' });
    }

    next();
  };
};

// API 密钥认证中间件
export const authenticateApiKey = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      return res.status(401).json({ error: '未提供 API 密钥' });
    }

    // 从环境变量中加载预定义的 API 密钥
    const apiKeysStr = process.env.API_KEYS;
    if (!apiKeysStr) {
      logger.warn('未配置 API_KEYS 环境变量，无法验证 API 密钥');
      return res.status(401).json({ error: '服务器未配置 API 密钥' });
    }

    // 验证 API 密钥
    const keyPairs = apiKeysStr.split(',');
    let isValidKey = false;
    let userName = '';

    for (const pair of keyPairs) {
      const [key, name] = pair.trim().split(':');
      if (key && key === apiKey) {
        isValidKey = true;
        userName = name || 'unknown';
        break;
      }
    }

    if (!isValidKey) {
      logger.warn(`无效的 API 密钥尝试: ${apiKey}`);
      return res.status(401).json({ error: '无效的 API 密钥' });
    }

    // 将用户信息附加到请求对象
    req.user = { id: apiKey, name: userName } as any;
    next();
  } catch (error: any) {
    logger.error(`API 密钥认证错误: ${error.message}`);
    return res.status(401).json({ error: 'API 密钥认证失败' });
  }
};
