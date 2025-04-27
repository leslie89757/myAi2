// 验证模拟API登录逻辑
const express = require('express');
const cors = require('cors');
const app = express();
const port = 3002;

// 开启JSON解析和CORS
app.use(express.json());
app.use(cors());

// 模拟API密钥中间件
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== 'test_key') {
    return res.status(401).json({ error: '未授权，缺少有效的API密钥' });
  }
  next();
};

// 应用API密钥验证
app.use(apiKeyAuth);

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 登录端点 - 模拟修复后的行为
app.post('/api/auth/login', (req, res) => {
  const { login, password } = req.body;
  
  console.log(`处理登录请求: ${login}`);
  
  if (!login || !password) {
    return res.status(400).json({ error: '用户名/邮箱和密码为必填项' });
  }
  
  // 模拟我们在api/index.js中添加的测试模式登录逻辑
  return res.status(200).json({
    success: true,
    accessToken: "test_access_token_for_testing_only",
    refreshToken: "test_refresh_token_for_testing_only",
    user: {
      id: 12345,
      username: "test_user",
      email: login,
      role: "user"
    },
    isNewUser: false,
    message: "测试模式登录成功，这仅用于测试。"
  });
});

// 令牌验证端点
app.get('/api/auth/validate', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, error: '未提供令牌' });
  }
  
  const token = authHeader.split(' ')[1];
  
  // 简单验证我们的测试令牌
  if (token === 'test_access_token_for_testing_only') {
    return res.json({
      valid: true,
      user: {
        id: 12345,
        username: "test_user",
        email: "test@example.com",
        role: "user",
        authMethod: "jwt"
      }
    });
  }
  
  return res.status(401).json({ valid: false, error: '无效的令牌' });
});

// 刷新令牌端点
app.post('/api/auth/refresh', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供刷新令牌' });
  }
  
  const token = authHeader.split(' ')[1];
  
  // 简单验证我们的测试刷新令牌
  if (token === 'test_refresh_token_for_testing_only') {
    return res.json({
      success: true,
      accessToken: "new_test_access_token_for_testing_only",
    });
  }
  
  return res.status(401).json({ error: '无效的刷新令牌' });
});

// 获取当前用户信息端点
app.get('/api/users/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未授权' });
  }
  
  const token = authHeader.split(' ')[1];
  
  // 简单验证我们的测试令牌
  if (token === 'test_access_token_for_testing_only' || token === 'new_test_access_token_for_testing_only') {
    return res.json({
      id: 12345,
      username: "test_user",
      email: "test@example.com",
      role: "user"
    });
  }
  
  return res.status(401).json({ error: '未授权' });
});

// 登出端点
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: '登出成功'
  });
});

// 通用API根路径响应
app.get('/', (req, res) => {
  res.json({
    message: 'API验证服务器正在运行',
    endpoints: [
      '/health', 
      '/api/auth/login',
      '/api/auth/validate',
      '/api/auth/refresh',
      '/api/users/me'
    ]
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`验证服务器运行在 http://localhost:${port}`);
  console.log(`使用以下命令测试: API_BASE_URL=http://localhost:${port} python3 test_auth_flow.py`);
});
