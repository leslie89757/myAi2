# MyAI Backend 部署说明

## 项目结构说明

本项目已经完成重构，统一使用TypeScript实现，彻底移除了冗余代码。主要变更如下：

1. **完全使用`src/api`中的TypeScript实现**：
   - 所有业务逻辑都在`src/api`文件夹中实现
   - 使用TypeScript提供类型安全和更好的开发体验
   - 已删除`/api`文件夹中的JavaScript实现

2. **修改了Vercel部署配置**：
   - 修改了`vercel.json`，使其使用编译后的TypeScript代码
   - 所有路由都指向`/dist/index.js`（编译后的入口文件）
   - 构建过程会自动编译TypeScript代码为JavaScript

## 开发流程

1. **本地开发**：
   ```bash
   npm run dev
   ```
   这将启动TypeScript开发服务器，监视文件变化并自动重新编译。

2. **构建项目**：
   ```bash
   npm run build
   ```
   这将编译TypeScript代码为JavaScript，输出到`dist`文件夹。

3. **启动生产服务器**：
   ```bash
   npm start
   ```
   这将启动编译后的JavaScript代码。

## 部署流程

1. **Vercel部署**：
   - 推送代码到GitHub仓库
   - Vercel会自动触发部署
   - 部署过程会执行`vercel-build.js`脚本，编译TypeScript代码
   - 所有请求都会路由到编译后的`dist/index.js`文件

2. **环境变量**：
   - 确保在Vercel控制台中设置了所有必要的环境变量
   - 特别是`DATABASE_URL`、`JWT_SECRET`和`OPENAI_API_KEY`

## 注意事项

1. **所有代码都在`src`目录中**：
   - `/api`文件夹已被删除，所有代码都在`src`目录中
   - 所有更改应该在`src/api`文件夹中进行

2. **保持TypeScript类型定义更新**：
   - 确保所有新功能都有正确的类型定义
   - 使用接口和类型别名提高代码可读性和可维护性

3. **测试部署**：
   - 在推送重要更改前，先在本地测试构建过程
   - 使用`npm run build`确保TypeScript编译成功

## 故障排除

如果遇到部署问题，请检查：

1. TypeScript编译错误
2. 缺少环境变量
3. Vercel构建日志中的错误信息

时间戳: 2025-04-30T11:30:00+08:00
