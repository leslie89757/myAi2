// Vercel Serverless Function 入口点

// Express应用实例
const express = require('express');
const path = require('path');
const cors = require('cors');

// 获取环境变量
const API_KEYS = process.env.API_KEYS || 'test_key:test_user';

// 创建Express应用
const app = express();

// 设置基本中间件
app.use(cors());
app.use(express.json());

// API密钥验证中间件
const apiKeyAuth = (req, res, next) => {
  // 如果是健康检查或API文档，跳过验证
  if (req.path === '/health' || 
      req.path === '/api-docs' || 
      req.path === '/api-docs.json' || 
      req.path.startsWith('/api-docs/') || 
      req.path === '/') {
    return next();
  }
  
  // 检查API密钥
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({
      error: '未授权',
      message: '缺少API密钥'
    });
  }
  
  // 验证API密钥
  const keyPairs = API_KEYS.split(',');
  let isValid = false;
  
  for (const pair of keyPairs) {
    const [key, name] = pair.trim().split(':');
    if (key && key === apiKey) {
      req.user = {
        id: 0,
        username: name || 'system_user',
        apiKeyId: key
      };
      isValid = true;
      break;
    }
  }
  
  if (!isValid) {
    return res.status(401).json({
      error: '未授权',
      message: 'API密钥无效'
    });
  }
  
  next();
};

// 使用API密钥验证
app.use(apiKeyAuth);

// 静态文件
app.use('/public', express.static(path.join(__dirname, '../dist/public')));

// 处理所有请求
app.all('*', (req, res) => {
  // 提供健康检查响应
  if (req.path === '/health') {
    return res.status(200).json({ status: 'ok' });
  }
  
  // 如果是API文档请求
  if (req.path === '/api-docs' || req.path === '/api-docs/') {
    return res.sendFile(path.join(__dirname, '../dist/public/api-docs.html'));
  }
  
  // 如果是API JSON规格请求
  if (req.path === '/api-docs.json') {
    return res.status(200).json({
      openapi: '3.0.0',
      info: {
        title: 'MyAI API',
        version: '1.0.0',
        description: 'MyAI后端 API文档'
      },
      paths: {
        '/health': {
          get: {
            summary: '健康检查',
            responses: {
              '200': {
                description: '服务正常运行'
              }
            }
          }
        }
      }
    });
  }
  
  // 如果是API请求路径
  if (req.path.startsWith('/api/')) {
    return res.status(200).json({
      message: '请求成功',
      path: req.path,
      method: req.method,
      user: req.user,
      timestamp: new Date().toISOString()
    });
  }
  
  // 返回API状态消息
  return res.status(200).json({
    message: 'MyAI Backend API 正在运行',
    documentation: '/api-docs',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    status: 'online',
    endpoints: [
      '/health', 
      '/api-docs',
      '/api/chat/simple',
      '/api/chat/stream',
      '/api/knowledge/query',
      '/api/auth/validate'
    ],
    auth: {
      required: true,
      method: 'API Key',
      header: 'X-API-Key'
    }
  });
});

// 导出Serverless函数
module.exports = app;
