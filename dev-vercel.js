// 本地Vercel开发服务器
// 这个脚本允许您在本地使用与Vercel相同的入口文件运行应用

// 导入必要的模块
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 导入Vercel入口文件
const vercelApp = require('./api/vercel-entry');

// 设置端口
const PORT = process.env.PORT || 3000;

// 启动服务器
vercelApp.listen(PORT, () => {
  console.log(`
=======================================================
  MyAI 后端服务器 (Vercel模式)
  
  服务器运行在: http://localhost:${PORT}
  
  登录页面: http://localhost:${PORT}/login
  知识库聊天: http://localhost:${PORT}/knowledge-chat
  API文档: http://localhost:${PORT}/api-docs
  健康检查: http://localhost:${PORT}/health
=======================================================
  `);
});
