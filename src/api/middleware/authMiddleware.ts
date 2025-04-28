import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../../generated/prisma';
import logger from '../../utils/logger';
import { PrismaClient } from '../../generated/prisma';

// 初始化Prisma客户端
const prisma = new PrismaClient();

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

    // 检查令牌是否在黑名单中
    const blacklistedToken = await prisma.blacklistedToken.findUnique({
      where: { token }
    });

    if (blacklistedToken) {
      logger.warn(`尝试使用已被列入黑名单的令牌`);
      return res.status(401).json({ error: '令牌已失效，请重新登录' });
    }

    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
    
    // 直接从数据库查找用户
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    
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

// JWT 认证中间件别名
export const authMiddleware = authenticate;
