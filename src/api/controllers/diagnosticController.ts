import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import logger from '../../utils/logger';
import { DualAuthRequest } from '../middleware/dualAuthMiddleware';

const prisma = new PrismaClient();

/**
 * 环境变量诊断 - 检查关键环境变量是否配置（不返回敏感值）
 */
export const checkEnvironment = async (req: DualAuthRequest, res: Response) => {
  try {
    // 检查用户认证信息
    const userInfo = req.user ? {
      id: req.user.id,
      username: req.user.username,
      authMethod: req.authMethod
    } : 'Not authenticated';

    // 检查环境变量（只显示是否存在，不显示值）
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV || 'Not set',
      DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
      JWT_SECRET: process.env.JWT_SECRET ? 'Set' : 'Not set',
      REFRESH_SECRET: process.env.REFRESH_SECRET ? 'Set' : 'Not set',
      API_KEYS: process.env.API_KEYS ? 'Set' : 'Not set',
      VERCEL: process.env.VERCEL || 'Not set'
    };

    logger.info(`环境诊断: ${JSON.stringify(envCheck)}`);

    res.json({
      success: true,
      environment: envCheck,
      user: userInfo,
      timestamp: new Date().toISOString(),
      deploymentPlatform: process.env.VERCEL ? 'Vercel' : 'Other'
    });
  } catch (error: any) {
    logger.error(`环境诊断错误: ${error.message}`);
    res.status(500).json({ error: `环境诊断失败: ${error.message}` });
  }
};

/**
 * 数据库诊断 - 测试数据库连接并返回基本统计信息
 */
export const checkDatabase = async (req: DualAuthRequest, res: Response) => {
  try {
    logger.info('开始数据库诊断...');
    const startTime = Date.now();

    // 测试数据库连接
    let connectionStatus = 'Failed';
    let error = null;
    let dbStats = null;

    try {
      // 尝试简单的数据库查询
      const userCount = await prisma.user.count();
      const sessionCount = await prisma.session.count();
      const refreshTokenCount = await prisma.refreshToken.count();
      
      dbStats = {
        userCount,
        sessionCount, 
        refreshTokenCount,
        queryTime: `${Date.now() - startTime}ms`
      };
      
      connectionStatus = 'Connected';
      logger.info(`数据库连接成功: 发现 ${userCount} 个用户记录`);
    } catch (dbError: any) {
      connectionStatus = 'Failed';
      error = dbError.message;
      logger.error(`数据库连接失败: ${dbError.message}`);
    }

    res.json({
      success: connectionStatus === 'Connected',
      connectionStatus,
      error,
      stats: dbStats,
      databaseUrl: process.env.DATABASE_URL ? 
        `${process.env.DATABASE_URL.split('@')[1].split('/')[0]} (Host/DB masked)` : 
        'Not configured',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error(`数据库诊断错误: ${error.message}`);
    res.status(500).json({ error: `数据库诊断失败: ${error.message}` });
  }
};
