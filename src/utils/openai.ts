import { OpenAI } from 'openai';
import https from 'https';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import logger from './logger';

// 确保环境变量已加载
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  logger.info(`加载环境变量文件: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  logger.warn(`环境变量文件不存在: ${envPath}`);
  dotenv.config(); // 尝试默认加载
}

// 验证 API 密钥是否存在且有效
export const validateApiKey = (): boolean => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim().length < 20 || apiKey === 'your_openai_api_key_here') {
    logger.error(`OPENAI_API_KEY 环境变量未设置或无效: "${apiKey?.substring(0, 5)}..."`);
    return false;
  }
  logger.info(`OPENAI_API_KEY 环境变量已设置 (${apiKey.substring(0, 3)}...${apiKey.substring(apiKey.length - 3)})`);
  return true;
};

// 创建一个具有更好连接参数的OpenAI客户端
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-initialization',
  httpAgent: new https.Agent({
    keepAlive: true,
    timeout: 60000, // 增加超时时间到60秒
    rejectUnauthorized: true
  })
});

// 确保openai实例已正确初始化
if (!openai || !openai.chat) {
  logger.error('OpenAI客户端初始化失败，chat属性不存在');
}

// 获取 OpenAI 客户端实例
export const getOpenAIClient = (): OpenAI => {
  if (!validateApiKey()) {
    throw new Error('OPENAI_API_KEY 环境变量未设置或无效，无法创建 OpenAI 客户端');
  }
  
  return openai;
};

/**
 * 带有重试逻辑的API调用包装函数
 * @param fn 要执行的异步函数
 * @param maxRetries 最大重试次数
 * @param retryDelay 重试延迟（毫秒）
 * @returns 异步函数的结果
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // 如果是最后一次尝试，则抛出错误
      if (attempt > maxRetries) {
        logger.error(`API调用失败，已重试${maxRetries}次: ${error.message}`);
        throw error;
      }
      
      // 判断错误是否可重试
      const isRateLimitError = error.status === 429;
      const isServerError = error.status >= 500 && error.status < 600;
      const isNetworkError = !error.status || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT';
      
      if (isRateLimitError || isServerError || isNetworkError) {
        const delay = retryDelay * attempt;
        logger.warn(`API调用失败，${attempt}/${maxRetries}次重试，等待${delay}ms: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // 不可重试的错误直接抛出
        throw error;
      }
    }
  }
  
  // 这一行理论上不会执行，但TypeScript需要它
  throw lastError;
};

/**
 * 初始化OpenAI并验证连接
 * @returns 连接是否成功
 */
export const initializeOpenAI = async () => {
  try {
    logger.info('验证OpenAI API连接...');
    
    if (!validateApiKey()) {
      logger.warn('OPENAI_API_KEY 环境变量未设置或无效，OpenAI 功能将不可用');
      return false;
    }
    
    const models = await withRetry(() => openai.models.list());
    logger.info(`OpenAI API连接成功，可用${models.data.length}个模型`);
    return true;
  } catch (error: any) {
    logger.error(`OpenAI API连接失败: ${error.message}`);
    
    // 如果是 API 错误，记录更详细的信息
    if (error.response) {
      logger.error(`API错误详情: ${JSON.stringify({
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      })}`);
    }
    
    return false;
  }
};