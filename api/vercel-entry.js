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
  // 检查用户是否已登录
  const authHeader = req.headers.authorization;
  const accessTokenCookie = req.cookies && req.cookies.accessToken;
  
  // 如果没有登录，重定向到登录页面
  if ((!authHeader || !authHeader.startsWith('Bearer ')) && !accessTokenCookie) {
    return res.redirect('/login');
  }
  
  return res.status(200).json({
    message: 'MyAI Backend API is running',
    documentation: '/api-docs',
    healthCheck: '/health',
    version: '/api/version'
  });
});

// 登录页面
app.get('/login', (req, res) => {
  // 返回简单的登录页面HTML
  const loginHtml = `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyAI - 登录</title>
    <style>
      body {
        font-family: 'Arial', sans-serif;
        background-color: #f5f5f5;
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
      }
      .login-container {
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        padding: 30px;
        width: 350px;
        max-width: 100%;
      }
      h1 {
        text-align: center;
        color: #333;
        margin-bottom: 24px;
      }
      .form-group {
        margin-bottom: 20px;
      }
      label {
        display: block;
        margin-bottom: 8px;
        color: #555;
      }
      input {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 16px;
        box-sizing: border-box;
      }
      button {
        width: 100%;
        padding: 12px;
        background-color: #4285f4;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 16px;
        cursor: pointer;
        transition: background-color 0.3s;
      }
      button:hover {
        background-color: #3367d6;
      }
      .error-message {
        color: #d93025;
        font-size: 14px;
        margin-top: 20px;
        text-align: center;
        display: none;
      }
    </style>
  </head>
  <body>
    <div class="login-container">
      <h1>MyAI 登录</h1>
      <div id="error-message" class="error-message"></div>
      <form id="login-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input type="text" id="username" name="username" required>
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input type="password" id="password" name="password" required>
        </div>
        <button type="submit">登录</button>
      </form>
    </div>

    <script>
      document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('error-message');
        
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
          });
          
          const data = await response.json();
          
          if (response.ok && data.accessToken) {
            // 存储令牌到cookie
            document.cookie = `accessToken=${data.accessToken}; path=/; max-age=7200`;
            // 重定向到知识库聊天页面
            window.location.href = '/knowledge-chat';
          } else {
            errorMessage.textContent = data.error || '登录失败，请检查用户名和密码';
            errorMessage.style.display = 'block';
          }
        } catch (error) {
          errorMessage.textContent = '登录请求失败，请稍后再试';
          errorMessage.style.display = 'block';
          console.error('Login error:', error);
        }
      });
    </script>
  </body>
  </html>
  `;
  
  return res.status(200).send(loginHtml);
});

// 知识库聊天页面
app.get('/knowledge-chat', (req, res) => {
  // 返回简单的知识库聊天页面HTML
  const chatHtml = `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MyAI - 知识库聊天</title>
    <style>
      body {
        font-family: 'Arial', sans-serif;
        background-color: #f5f5f5;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        height: 100vh;
      }
      .header {
        background-color: #4285f4;
        color: white;
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .header h1 {
        margin: 0;
        font-size: 20px;
      }
      .logout-btn {
        background-color: transparent;
        color: white;
        border: 1px solid white;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
      }
      .chat-container {
        display: flex;
        flex: 1;
        overflow: hidden;
      }
      .sidebar {
        width: 250px;
        background-color: white;
        border-right: 1px solid #ddd;
        padding: 16px;
        overflow-y: auto;
      }
      .chat-area {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: 16px;
      }
      .messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        background-color: white;
        border-radius: 8px;
        margin-bottom: 16px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      .message {
        margin-bottom: 16px;
        padding: 12px;
        border-radius: 8px;
        max-width: 80%;
      }
      .user-message {
        background-color: #e3f2fd;
        margin-left: auto;
        color: #333;
      }
      .ai-message {
        background-color: #f1f1f1;
        margin-right: auto;
        color: #333;
      }
      .input-area {
        display: flex;
        gap: 8px;
      }
      .message-input {
        flex: 1;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 16px;
      }
      .send-btn {
        padding: 12px 24px;
        background-color: #4285f4;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 16px;
        cursor: pointer;
      }
      .placeholder-text {
        text-align: center;
        color: #888;
        margin-top: 40%;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>MyAI 知识库聊天</h1>
      <button class="logout-btn" id="logout-btn">退出登录</button>
    </div>
    
    <div class="chat-container">
      <div class="sidebar">
        <h3>聊天历史</h3>
        <p>暂无聊天历史</p>
      </div>
      
      <div class="chat-area">
        <div class="messages" id="messages">
          <div class="ai-message message">您好！我是MyAI知识库助手。请问有什么可以帮助您的？</div>
        </div>
        
        <div class="input-area">
          <input type="text" class="message-input" id="message-input" placeholder="输入您的问题...">
          <button class="send-btn" id="send-btn">发送</button>
        </div>
      </div>
    </div>

    <script>
      const messagesContainer = document.getElementById('messages');
      const messageInput = document.getElementById('message-input');
      const sendButton = document.getElementById('send-btn');
      const logoutButton = document.getElementById('logout-btn');
      
      // 发送消息
      function sendMessage() {
        const message = messageInput.value.trim();
        if (!message) return;
        
        // 添加用户消息到聊天区域
        const userMessageElement = document.createElement('div');
        userMessageElement.classList.add('message', 'user-message');
        userMessageElement.textContent = message;
        messagesContainer.appendChild(userMessageElement);
        
        // 清空输入框
        messageInput.value = '';
        
        // 滚动到最新消息
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // 模拟发送到服务器并获取回复
        setTimeout(() => {
          const aiMessageElement = document.createElement('div');
          aiMessageElement.classList.add('message', 'ai-message');
          aiMessageElement.textContent = '这是一个演示版本，实际API调用需要有效的JWT认证。在完整版本中，我会连接到知识库并回答您的问题。';
          messagesContainer.appendChild(aiMessageElement);
          
          // 滚动到最新消息
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 1000);
      }
      
      // 绑定发送按钮事件
      sendButton.addEventListener('click', sendMessage);
      
      // 绑定回车键发送
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          sendMessage();
        }
      });
      
      // 退出登录
      logoutButton.addEventListener('click', () => {
        // 清除cookie
        document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        // 重定向到登录页面
        window.location.href = '/login';
      });
    </script>
  </body>
  </html>
  `;
  
  return res.status(200).send(chatHtml);
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
