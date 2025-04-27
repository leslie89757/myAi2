# Vercel 部署指南

## 前置准备

1. **确保数据库已正确配置**
   - PostgreSQL 数据库已在阿里云 RDS 创建
   - 数据库用户具有足够权限
   - 数据库允许外部访问（已设置适当的安全组规则）

2. **准备环境变量**
   - 已在 `.env.production` 文件中配置生产环境变量
   - 敏感信息（如数据库密码）应在 Vercel 项目设置中添加

## 部署步骤

### 1. 构建项目

确保在部署前项目能够正确构建：

```bash
npm run build
```

### 2. 部署到 Vercel

使用 Vercel CLI 部署（推荐，可以保留本地环境变量）：

```bash
# 安装 Vercel CLI（如果尚未安装）
npm install -g vercel

# 部署
vercel
```

或通过 Git 集成部署：

1. 将代码推送到 Git 仓库
2. 在 Vercel 仪表板中连接仓库
3. 按照提示配置部署选项

### 3. 配置 Vercel 环境变量

在 Vercel 项目设置中，确保添加以下环境变量：

- `DATABASE_URL`: 已在 `.env.production` 中配置
- `NODE_ENV`: production
- `API_KEYS`: test_key:test_user
- `JWT_SECRET`: 你的JWT密钥
- `REFRESH_SECRET`: 你的刷新令牌密钥
- `API_KEY_SECRET`: 你的API密钥生成密钥
- `OPENAI_API_KEY`: 你的OpenAI API密钥（如果使用）

### 4. 初始化数据库

首次部署到新数据库时，需要初始化数据库结构：

```bash
# 使用 Prisma 迁移命令初始化生产数据库
npx prisma migrate deploy
```

也可以通过 Vercel 的部署钩子来自动执行此命令。

### 5. 验证部署

部署完成后，验证应用程序运行状况：

- 访问健康检查端点: `https://[YOUR_DOMAIN]/api/health`
- 尝试基本 API 交互，如登录/注册

## 常见问题解决

### 数据库连接问题

如果遇到数据库连接问题，检查以下几点：

1. 确认 RDS 实例的安全组是否允许来自 Vercel 服务器的访问
2. 验证数据库凭据是否正确
3. 检查 Vercel 日志以获取详细错误信息

### Prisma 相关问题

确保部署过程中包含 Prisma 生成步骤。在 `package.json` 中应有如下配置：

```json
"scripts": {
  "postinstall": "prisma generate",
  // ...其他脚本
}
```

### 环境变量问题

如果怀疑环境变量配置有问题，可以在应用程序代码中添加日志记录，打印环境变量（注意不要泄露敏感信息）。
