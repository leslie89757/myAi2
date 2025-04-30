# MyAI 后端项目结构说明

本文档详细说明 MyAI 后端项目的结构和组织方式，帮助开发者快速理解项目架构。

## 项目概述

MyAI 后端是一个基于 TypeScript 和 Express 的 API 服务器，提供用户认证、会话管理和知识库聊天等功能。项目使用 Prisma ORM 连接 PostgreSQL 数据库，并集成了 OpenAI API 进行知识库聊天。

## 目录结构

```
myai-backend/
├── dist/                   # TypeScript 编译输出目录
├── node_modules/           # 依赖包
├── prisma/                 # Prisma 数据库模型和迁移
├── src/                    # 源代码目录
│   ├── admin/              # 管理后台相关代码
│   │   ├── controllers/    # 管理后台控制器
│   │   └── routes/         # 管理后台路由
│   ├── api/                # API 实现
│   │   ├── controllers/    # API 控制器
│   │   ├── middleware/     # API 中间件
│   │   └── routes/         # API 路由
│   ├── generated/          # 生成的代码（如 Prisma 客户端）
│   ├── lib/                # 库和工具函数
│   ├── middleware/         # 全局中间件
│   ├── public/             # 静态文件
│   ├── utils/              # 工具函数
│   └── index.ts            # 应用程序入口点
├── .env                    # 环境变量
├── package.json            # 项目依赖和脚本
├── tsconfig.json           # TypeScript 配置
└── vercel.json             # Vercel 部署配置
```

## 核心组件

### 1. 入口文件 (src/index.ts)

应用程序的主入口点，负责：
- 设置 Express 服务器和中间件
- 配置路由
- 连接数据库
- 启动服务器

### 2. API 实现 (src/api/)

所有 API 功能都在 `src/api` 目录中实现，采用控制器-路由分离的架构：

#### 控制器 (src/api/controllers/)

- **authController.ts**: 处理用户认证（登录、令牌验证、刷新令牌、登出）
- **knowledgeBaseController.ts**: 处理知识库操作（上传、查询、聊天）
- **sessionController.ts**: 处理会话管理（创建、获取、更新、删除会话）
- **diagnosticController.ts**: 提供系统诊断信息

#### 路由 (src/api/routes/)

- **authRoutes.ts**: 认证相关路由
- **knowledgeBaseRoutes.ts**: 知识库相关路由
- **sessionRoutes.ts**: 会话管理路由
- **diagnosticRoutes.ts**: 诊断相关路由

#### 中间件 (src/api/middleware/)

- **jwtAuthMiddleware.ts**: JWT 认证中间件
- **errorHandlingMiddleware.ts**: 错误处理中间件

### 3. 管理后台 (src/admin/)

管理员专用 API，用于系统管理和监控：

- **adminUserController.ts**: 用户管理
- **adminKnowledgeController.ts**: 知识库管理
- **adminSystemController.ts**: 系统设置和监控

### 4. 中间件 (src/middleware/)

全局中间件，应用于所有或特定路由：

- **pageAuthMiddleware.ts**: 页面认证中间件，保护需要登录才能访问的页面

### 5. 工具函数 (src/utils/)

通用工具和辅助函数：

- **logger.ts**: 日志记录工具
- **openai.ts**: OpenAI API 集成
- **swagger.ts**: API 文档生成

## 数据库模型

项目使用 Prisma ORM 和 PostgreSQL 数据库，主要模型包括：

- **User**: 用户信息
- **Session**: 用户会话
- **Message**: 会话消息
- **KnowledgeBase**: 知识库文档
- **BlacklistedToken**: 已失效的令牌
- **RefreshToken**: 刷新令牌

## API 路由

所有 API 路由都以 `/api` 为前缀：

- **/api/auth/**: 认证相关 API
- **/api/sessions/**: 会话管理 API
- **/api/knowledge/**: 知识库相关 API
- **/api/diagnostic/**: 系统诊断 API
- **/api/admin/**: 管理后台 API

## 部署配置

项目配置为在 Vercel 上部署：

- **vercel.json**: 定义构建和路由规则
- **vercel-build.js**: 自定义构建脚本，负责编译 TypeScript 和准备部署文件

## 开发与构建

### 开发环境

```bash
npm run dev
```

启动开发服务器，使用 nodemon 监视文件变化并自动重启。

### 构建生产版本

```bash
npm run build
```

编译 TypeScript 代码并复制静态文件到 dist 目录。

### 启动生产服务器

```bash
npm start
```

启动编译后的生产版本。

## 重要说明

1. 项目已完成重构，所有代码都使用 TypeScript 实现，并且已删除冗余的 `/api` 文件夹。
2. 所有 API 实现都位于 `src/api` 目录中，确保代码的一致性和可维护性。
3. 在 Vercel 环境中，所有请求都会路由到编译后的 `dist/index.js` 文件。

## 时间戳

最后更新: 2025-04-30T11:40:00+08:00
