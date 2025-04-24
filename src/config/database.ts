import { Sequelize } from 'sequelize';
import logger from '../utils/logger';
import dotenv from 'dotenv';
import path from 'path';

// 确保环境变量已加载
const envPath = path.resolve(process.cwd(), '.env');
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: envPath });
  logger.info(`加载环境变量文件: ${envPath}`);
}

// 数据库配置
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'guzhenqiang',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'chatgpt_api',
  logging: (msg) => logger.debug(msg)
});

// 数据库连接函数
export const connectDB = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('成功连接到 PostgreSQL 数据库');
    
    // 同步模型到数据库（开发环境可以使用 force: true 重建表）
    await sequelize.sync({ alter: process.env.NODE_ENV !== 'production' });
    logger.info('数据库模型同步完成');
  } catch (error: any) {
    logger.error(`PostgreSQL 数据库连接失败: ${error.message}`);
    throw error;
  }
};

export default sequelize;
