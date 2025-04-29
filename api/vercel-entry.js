// 简化版Vercel入口点 - 用于排查部署问题
const express = require('express');
const cors = require('cors');

// 创建Express应用
const app = express();

// 设置基本中间件
app.use(cors());
app.use(express.json());

// 健康检查端点
app.get('/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    message: 'Service is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    vercel: process.env.VERCEL === 'true' ? true : false
  });
});

// API版本端点
app.get('/api/version', (req, res) => {
  return res.status(200).json({
    version: '1.0.0',
    name: 'MyAI Backend',
    timestamp: new Date().toISOString()
  });
});

// 根路径
app.get('/', (req, res) => {
  return res.status(200).json({
    message: 'MyAI Backend API is running',
    documentation: '/api-docs',
    healthCheck: '/health',
    version: '/api/version'
  });
});

// API文档路径
app.get('/api-docs', (req, res) => {
  return res.status(200).json({
    message: 'API文档将在此显示',
    version: '1.0.0'
  });
});

// 捕获所有其他路由
app.all('*', (req, res) => {
  return res.status(200).json({
    message: `接收到请求: ${req.method} ${req.path}`,
    headers: req.headers,
    query: req.query,
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  return res.status(500).json({
    error: '服务器内部错误',
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// 导出应用实例
module.exports = app;

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}
