import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

// 存储 API 密钥和对应的速率限制信息
interface RateLimitInfo {
  lastRequest: number;
  requestCount: number;
  resetTime: number;
}

// 简单的内存存储，生产环境应使用 Redis 等持久化存储
const apiKeys: Record<string, { name: string; isActive: boolean }> = {};
const rateLimits: Record<string, RateLimitInfo> = {};

// 从环境变量加载预定义的 API 密钥
export const loadApiKeys = (): void => {
  const apiKeysStr = process.env.API_KEYS;
  if (!apiKeysStr) {
    logger.warn('未配置 API_KEYS 环境变量，API 将不受保护');
    return;
  }

  try {
    // 格式: key1:name1,key2:name2
    const keyPairs = apiKeysStr.split(',');
    keyPairs.forEach(pair => {
      const [key, name] = pair.trim().split(':');
      if (key && name) {
        apiKeys[key] = { name, isActive: true };
        logger.info(`已加载 API 密钥: ${name}`);
      }
    });
    logger.info(`共加载 ${Object.keys(apiKeys).length} 个 API 密钥`);
  } catch (error) {
    logger.error(`加载 API 密钥失败: ${error}`);
  }
};

// 验证 API 密钥中间件
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  // 健康检查和文档端点不需要鉴权
  if (req.path === '/health' || req.path === '/api-docs' || req.path.startsWith('/api-docs/') || req.path === '/api-docs.json') {
    next();
    return;
  }

  // 静态文件不需要鉴权
  if (req.path.match(/\.(html|css|js|ico|png|jpg|jpeg|svg)$/)) {
    next();
    return;
  }

  // 如果没有配置 API 密钥，则跳过鉴权（开发环境）
  if (Object.keys(apiKeys).length === 0) {
    logger.warn('API 鉴权已禁用，因为没有配置 API 密钥');
    next();
    return;
  }

  // 从请求头获取 API 密钥
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    logger.warn(`API 请求被拒绝: 缺少 API 密钥 [${req.ip}]`);
    res.status(401).json({ error: '未提供 API 密钥' });
    return;
  }

  // 验证 API 密钥
  const keyInfo = apiKeys[apiKey];
  if (!keyInfo) {
    logger.warn(`API 请求被拒绝: 无效的 API 密钥 [${req.ip}]`);
    res.status(401).json({ error: '无效的 API 密钥' });
    return;
  }

  if (!keyInfo.isActive) {
    logger.warn(`API 请求被拒绝: API 密钥已禁用 [${keyInfo.name}]`);
    res.status(403).json({ error: 'API 密钥已禁用' });
    return;
  }

  // 速率限制检查
  if (!checkRateLimit(apiKey, req, res)) {
    // 如果超过速率限制，checkRateLimit 函数内部会发送响应
    return;
  }

  // 记录请求信息
  logger.info(`API 请求已授权: ${keyInfo.name} [${req.method} ${req.path}]`);
  
  // 将 API 密钥信息添加到请求对象，便于后续使用
  (req as any).apiKeyInfo = keyInfo;
  
  next();
};

// 速率限制检查
const checkRateLimit = (apiKey: string, req: Request, res: Response): boolean => {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1分钟窗口
  const maxRequests = 60; // 每分钟最多60个请求
  
  // 初始化速率限制信息
  if (!rateLimits[apiKey]) {
    rateLimits[apiKey] = {
      lastRequest: now,
      requestCount: 0,
      resetTime: now + windowMs
    };
  }
  
  const rateInfo = rateLimits[apiKey];
  
  // 重置计数器
  if (now > rateInfo.resetTime) {
    rateInfo.requestCount = 0;
    rateInfo.resetTime = now + windowMs;
  }
  
  // 增加请求计数
  rateInfo.requestCount++;
  rateInfo.lastRequest = now;
  
  // 检查是否超过限制
  if (rateInfo.requestCount > maxRequests) {
    const resetInSeconds = Math.ceil((rateInfo.resetTime - now) / 1000);
    
    // 设置速率限制响应头
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', '0');
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateInfo.resetTime / 1000).toString());
    res.setHeader('Retry-After', resetInSeconds.toString());
    
    logger.warn(`API 请求被限制: 超过速率限制 [${apiKeys[apiKey].name}]`);
    res.status(429).json({ 
      error: '请求过于频繁，请稍后再试',
      retryAfter: resetInSeconds
    });
    
    return false;
  }
  
  // 设置速率限制响应头
  res.setHeader('X-RateLimit-Limit', maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', (maxRequests - rateInfo.requestCount).toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(rateInfo.resetTime / 1000).toString());
  
  return true;
};
