import OpenAI from 'openai';
import https from 'https';
import dotenv from 'dotenv';
import logger from './logger';

// 确保环境变量已加载
dotenv.config();

// 检查API密钥是否存在
if (!process.env.OPENAI_API_KEY) {
  logger.error('缺少OPENAI_API_KEY环境变量，请确保.env文件中包含有效的API密钥');
  throw new Error('缺少OPENAI_API_KEY环境变量');
}

// 创建一个具有更好连接参数的OpenAI客户端
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  httpAgent: new https.Agent({
    keepAlive: true,
    timeout: 60000, // 增加超时时间到60秒
    rejectUnauthorized: true
  })
});

// 验证OpenAI API连接
export const initializeOpenAI = async () => {
  try {
    logger.info('验证OpenAI API连接...');
    const models = await openai.models.list();
    logger.info(`OpenAI API连接成功，可用${models.data.length}个模型`);
    return true;
  } catch (error: any) {
    logger.error(`OpenAI API连接失败: ${error.message}`);
    throw new Error(`无法连接到OpenAI API: ${error.message}`);
  }
};