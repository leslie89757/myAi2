import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import logger from './utils/logger';
import { initializeOpenAI } from './utils/openai';
import { simpleChat } from './controllers/simpleChatController';
import { streamChat } from './controllers/streamChatController';
import { setupApiDocs } from './utils/swagger';
import { apiKeyAuth, loadApiKeys } from './middleware/auth';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: false // 禁用CSP以允许内联脚本
}));
app.use(express.json());

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 请求日志中间件
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// 设置API文档
setupApiDocs(app);

// API 鉴权中间件
app.use(apiKeyAuth);

// API路由
app.post('/api/simple-chat', simpleChat);
app.post('/api/stream-chat', streamChat);

// 页面路由
app.get('/stream-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stream-test.html'));
});

app.get('/simple-test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'simple-test.html'));
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 默认路由
app.get('/', (req, res) => {
  res.redirect('/stream-test');
});

// 404处理
app.use((req, res, next) => {
  logger.warn(`404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: '请求的资源不存在' });
});

// 错误处理中间件
app.use((err: any, req: any, res: any, next: any) => {
  logger.error(`服务器错误: ${err.message}`);
  res.status(500).json({ error: '服务器内部错误' });
});

// 启动服务器
const startServer = async () => {
  try {
    // 加载 API 密钥
    loadApiKeys();
    
    // 初始化OpenAI客户端并验证连接
    await initializeOpenAI();
    
    app.listen(PORT, () => {
      logger.info(`服务器启动在 http://localhost:${PORT}`);
      logger.info(`API文档可在 http://localhost:${PORT}/api-docs 访问`);
    });
  } catch (error: any) {
    logger.error('服务器启动失败:', error.message);
    process.exit(1);
  }
};

startServer();