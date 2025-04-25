import logger from '../utils/logger';
import dotenv from 'dotenv';
import path from 'path';
import prisma from '../lib/prisma';

// 确保环境变量已加载
const envPath = path.resolve(process.cwd(), '.env');
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: envPath });
  logger.info(`加载环境变量文件: ${envPath}`);
}

// 数据库连接函数
export const connectDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info('成功连接到 PostgreSQL 数据库');
    logger.info('使用 Prisma ORM 进行数据库操作');
  } catch (error: any) {
    logger.error(`PostgreSQL 数据库连接失败: ${error.message}`);
    throw error;
  }
};

export default prisma;
