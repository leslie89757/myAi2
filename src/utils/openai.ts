/**
 * OpenAI API 连接工具
 * 优化后的实现，确保可以直接访问OpenAI API
 */
import { OpenAI } from 'openai';
import https from 'https';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import logger from './logger';

// 确保环境变量已加载
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  logger.info(`已加载环境变量文件: ${envPath}`);
} else {
  dotenv.config();
  logger.info('使用默认方法加载环境变量');
}

// 获取API密钥
const getApiKey = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey || apiKey.trim() === '') {
    logger.warn('环境变量中未设置OPENAI_API_KEY，请确保设置有效的API密钥');
    return '';
  }
  
  return apiKey;
};

// 检查API密钥是否有效
export const validateApiKey = () => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    logger.error('未设置有效的OPENAI_API_KEY');
    return false;
  }
  
  // 支持多种OpenAI密钥格式
  if (apiKey.startsWith('sk-')) {
    if (apiKey.startsWith('sk-org-')) {
      logger.info('检测到组织密钥格式');
    } else if (apiKey.startsWith('sk-proj-')) {
      logger.info('检测到项目密钥格式');
    } else {
      logger.info('检测到标准密钥格式');
    }
    logger.info(`使用API密钥: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
    return true;
  }
  
  logger.warn(`API密钥格式不正确，通常应以'sk-'开头: ${apiKey.substring(0, 5)}...`);
  return false;
};

// 创建HTTPS Agent
const createHttpsAgent = () => {
  return new https.Agent({
    keepAlive: true,
    timeout: 60000,
    // 关闭证书验证，解决某些SSL问题
    rejectUnauthorized: false
  });
};

// 创建OpenAI客户端
export const openai = new OpenAI({
  apiKey: getApiKey(),
  baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  httpAgent: createHttpsAgent(),
  maxRetries: 5,
  timeout: 60000,
  defaultHeaders: {
    'User-Agent': 'myai-backend/1.0 Node.js/' + process.version,
  }
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
 * 模拟OpenAI响应的函数，用于在OpenAI不可用时提供替代功能
 */
export const mockCompletionResponse = (message: string) => {
  const timestamp = new Date().toISOString();
  return {
    id: `mock-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'gpt-3.5-turbo-mock',
    choices: [{
      index: 0,
      message: {
        role: 'assistant',
        content: `[模拟响应 ${timestamp}] 我是一个模拟的AI助手。OpenAI API连接当前不可用，这是一个本地生成的响应。您的消息是: "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"`
      },
      finish_reason: 'stop'
    }],
    usage: {
      prompt_tokens: message.length,
      completion_tokens: 50,
      total_tokens: message.length + 50
    }
  };
};

/**
 * 初始化OpenAI并验证连接
 * @returns 连接是否成功
 */
export const initializeOpenAI = async () => {
  try {
    logger.info('验证OpenAI API连接...');
    
    // 检查是否启用了模拟模式
    if (process.env.MOCK_OPENAI === 'true') {
      logger.warn('OpenAI API模拟模式已启用，将使用本地模拟响应');
      return true;
    }
    
    if (!validateApiKey()) {
      logger.warn('OPENAI_API_KEY 环境变量未设置或无效，OpenAI 功能将不可用');
      return false;
    }
    
    // 测试API连接
    logger.info('测试OpenAI API连接...');
    
    try {
      // 使用简单的聊天完成请求测试API连接
      const completionTest = await withRetry(() => 
        openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'Test connection' }],
          max_tokens: 5
        }), 
        2,  // 最多重试2次
        2000 // 每次重试间隔2秒
      );
      
      const message = completionTest.choices[0]?.message?.content || '';
      logger.info(`OpenAI API连接成功! 响应: "${message}"`);
      return true;
    } catch (apiError: any) {
      logger.error(`OpenAI API连接测试失败: ${apiError.message}`);
      
      if (apiError.response) {
        logger.error(`API错误详情: 状态码=${apiError.response.status}, 数据=${JSON.stringify(apiError.response.data)}`);
      }
      
      logger.warn('系统将继续运行，但可能会在聊天功能中使用模拟响应');
      return false;
    }
  } catch (error: any) {
    logger.error(`OpenAI初始化过程中出错: ${error.message}`);
    return false;
  }
};
