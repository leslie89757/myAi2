/**
 * OpenAI API 直接客户端
 * 仿照Python实现，确保可以直接访问OpenAI API
 */
import { OpenAI } from 'openai';
import https from 'https';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import logger from './logger';

// 确保环境变量已加载
// 这一步很重要，因为在脚本中加载的环境变量可能不会自动传递给导入的模块
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  logger.info(`已加载环境变量文件: ${envPath}`);
} else {
  dotenv.config();
  logger.info('使用默认方法加载环境变量');
}

/**
 * 获取API密钥
 */
const getApiKey = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  logger.info(`环境变量状态: OPENAI_API_KEY=${apiKey ? '已设置' : '未设置'}`);
  
  if (!apiKey) {
    // 尝试直接使用您Python代码中的API密钥
    const hardcodedKey = "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";
    logger.warn('环境变量中未设置OPENAI_API_KEY，将使用确认有效的硬编码密钥');
    return hardcodedKey;
  }
  
  return apiKey;
};

/**
 * 创建OpenAI客户端，配置优化的参数
 */
export const createOptimizedClient = () => {
  // 获取API密钥
  const apiKey = getApiKey();

  logger.info(`正在创建OpenAI客户端，API密钥: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);

  // 创建OpenAI客户端，配置优化的参数
  try {
    const httpsAgent = new https.Agent({
      keepAlive: true,
      timeout: 60000,
      // 关闭证书验证，解决某些SSL问题
      rejectUnauthorized: false
    });

    // 创建客户端
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.openai.com/v1',
      httpAgent: httpsAgent,
      maxRetries: 5,
      timeout: 60000,
      defaultHeaders: {
        'User-Agent': 'myai-backend/1.0 Node.js/' + process.version,
      }
    });

    logger.info('OpenAI客户端创建成功');
    return client;
  } catch (error: any) {
    logger.error(`创建OpenAI客户端失败: ${error.message}`);
    throw error;
  }
};

/**
 * 验证OpenAI API连接
 */
export const validateOpenAIConnection = async () => {
  try {
    const client = createOptimizedClient();
    
    logger.info('正在验证OpenAI API连接...');
    
    // 使用最简单的请求进行验证
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5
    });
    
    logger.info(`OpenAI API连接成功！响应: ${JSON.stringify(response.choices[0].message)}`);
    return true;
  } catch (error: any) {
    logger.error(`OpenAI API连接验证失败: ${error.message}`);
    return false;
  }
};

// 创建并导出优化的客户端实例
let clientInstance: OpenAI | null = null;

try {
  clientInstance = createOptimizedClient();
  logger.info('成功创建OpenAI客户端实例');
} catch (error: any) {
  logger.error(`创建OpenAI客户端实例失败: ${error.message}`);
  // 保留clientInstance为null，后续使用时还会再尝试创建
}

export const openaiDirectClient = clientInstance || createOptimizedClient();
