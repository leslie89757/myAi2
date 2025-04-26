import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '../../generated/prisma';
import jwt from 'jsonwebtoken';
import logger from '../../utils/logger';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_ADMIN_SECRET || 'admin-jwt-secret-key';

// 扩展Express请求接口，添加管理员信息
export interface AdminRequest extends Request {
  admin?: {
    id: number;
    email: string;
    username: string;
    role: string;
  };
}

export const adminAuthMiddleware = async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    // 检查Authorization头信息
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // 验证JWT令牌
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // 检查用户是否存在且是管理员
      const admin = await prisma.user.findUnique({
        where: { id: decoded.id }
      });

      if (!admin || admin.role !== 'admin') {
        return res.status(403).json({ error: '无管理员权限' });
      }

      if (!admin.isActive) {
        return res.status(403).json({ error: '管理员账号已被禁用' });
      }

      // 将管理员信息附加到请求对象
      req.admin = {
        id: admin.id,
        email: admin.email,
        username: admin.username,
        role: admin.role
      };

      next();
    } catch (error) {
      const jwtError = error as Error;
      logger.error(`JWT验证失败: ${jwtError.message}`);
      return res.status(401).json({ error: '无效的认证令牌' });
    }
  } catch (error) {
    const err = error as Error;
    logger.error(`管理员认证中间件错误: ${err.message}`);
    return res.status(500).json({ error: '服务器内部错误' });
  }
};
