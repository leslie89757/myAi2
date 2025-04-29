// 简化版Vercel入口点 - 用于排查部署问题
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// 创建Express应用
const app = express();

// 设置基本中间件
app.use(cors());
app.use(express.json());
app.use(cookieParser());

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

// API健康检查端点 - 不需要认证
app.get('/api/health', (req, res) => {
  return res.status(200).json({
    status: 'ok',
    message: 'API service is healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production'
  });
});

// API版本端点 - 不需要认证
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

// JWT认证中间件 - 只应用于需要认证的路由
const jwtAuth = (req, res, next) => {
  // 如果是健康检查、API文档、静态页面或认证相关的路由，跳过验证
  if (req.path === '/health' || 
      req.path === '/api/health' || 
      req.path === '/api/version' || 
      req.path === '/api-docs' || 
      req.path === '/api-docs.json' || 
      req.path.startsWith('/api-docs/') || 
      req.path === '/knowledge-chat' || 
      req.path === '/login' || 
      req.path.startsWith('/public/') || 
      req.path === '/' ||
      req.path.startsWith('/api/auth/login') ||
      req.path.startsWith('/api/auth/refresh')) {
    return next();
  }
  
  // 检查JWT令牌
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: '未授权访问', 
      message: '请提供有效的JWT令牌',
      details: { authHeader: authHeader ? '格式不正确' : '未提供' }
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    // 验证JWT令牌
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 设置用户信息
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
    req.token = token;
    
    next();
  } catch (error) {
    console.error(`JWT认证错误: ${error.message}`);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'JWT令牌已过期',
        message: '请使用刷新令牌获取新的访问令牌' 
      });
    }
    return res.status(401).json({ error: '认证失败', message: error.message });
  }
};

// 捕获所有其他路由
app.all('*', (req, res) => {
  // 如果是需要认证的API路由，先进行认证
  if (req.path.startsWith('/api/') && 
      req.path !== '/api/health' && 
      req.path !== '/api/version' && 
      !req.path.startsWith('/api/auth/')) {
    jwtAuth(req, res, () => {
      return res.status(200).json({
        message: `接收到已认证的请求: ${req.method} ${req.path}`,
        user: req.user,
        query: req.query,
        body: req.body,
        timestamp: new Date().toISOString()
      });
    });
  } else {
    // 其他路由不需要认证
    return res.status(200).json({
      message: `接收到请求: ${req.method} ${req.path}`,
      headers: req.headers,
      query: req.query,
      body: req.body,
      timestamp: new Date().toISOString()
    });
  }
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
