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
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  httpAgent: new https.Agent({
    keepAlive: true,
    timeout: 60000, // 增加超时时间到60秒
    rejectUnauthorized: true
  }),
  timeout: 60000, // 客户端整体超时
  maxRetries: 3, // OpenAI客户端内置的重试次数
});

// 导出初始化函数以便在应用启动时确认连接
export const initializeOpenAI = async () => {
  try {
    logger.info('验证OpenAI API连接...');
    const response = await openai.models.list();
    logger.info(`OpenAI API连接成功，可用${response.data.length}个模型`);
    return true;
  } catch (error: any) {
    logger.error('OpenAI API连接验证失败:', error.message);
    if (error.code === 'ECONNRESET') {
      logger.error('网络连接被重置，请检查网络连接或防火墙设置');
    }
    return false;
  }
};

export default openai;