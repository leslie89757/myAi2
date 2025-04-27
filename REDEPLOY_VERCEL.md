# MyAI-Backend Vercel 重新部署指南

## 发现的问题

经过诊断测试，我们发现Vercel部署存在以下关键问题：

1. **路由配置错误**：`vercel.json`中的路由配置指向了错误的文件路径（`api/index.js`），但实际编译后的入口文件位于`dist/index.js`。

2. **缺少Prisma生成步骤**：部署过程中没有执行`prisma generate`命令，导致数据库模型无法正常工作。

3. **API请求未到达控制器**：所有API请求只能通过API密钥认证，但无法执行实际的控制器逻辑。

## 已修复的文件

1. **vercel.json**：
   - 更新了`builds`部分，指向正确的入口文件`dist/index.js`
   - 修正了`routes`配置，所有路由现在指向`dist/index.js`

2. **vercel-build.js**：
   - 添加了`prisma generate`命令确保数据库模型生成
   - 增加了文件验证检查，确保编译输出正确
   - 添加了详细的环境信息日志

## 重新部署步骤

1. **提交更改**：
```bash
git add vercel.json vercel-build.js
git commit -m "修复Vercel部署配置和构建脚本"
```

2. **推送到您的仓库**：
```bash
git push origin main  # 或您使用的分支名
```

3. **部署到Vercel**：
   - 等待自动部署触发，或在Vercel控制台手动触发新的部署
   - 仔细观察构建日志，确认所有步骤都正确执行

4. **验证环境变量**：
   - 确保在Vercel项目设置中配置了以下环境变量：
     - `DATABASE_URL`: 您的PostgreSQL数据库连接字符串
     - `JWT_SECRET`: JWT令牌加密密钥
     - `REFRESH_SECRET`: 刷新令牌加密密钥
     - `API_KEYS`: API密钥列表

## 部署后测试

部署完成后，使用测试脚本验证API功能：

```bash
python3 test_diagnostics.py  # 先运行诊断测试
python3 test_auth_flow.py    # 测试完整的认证流程
```

如果诊断测试通过但认证流程测试失败，请检查数据库连接权限设置。

## 数据库连接问题排查

如果遇到数据库连接问题，请检查：

1. **阿里云RDS安全组设置**：
   - 确保允许来自Vercel IP范围的连接
   - 可以临时设置为允许所有IP (0.0.0.0/0) 进行测试

2. **数据库URL格式**：
   - 确认URL格式为 `postgresql://用户名:密码@主机:端口/数据库名`
   - 检查密码中是否包含特殊字符，需要正确URL编码

3. **数据库权限**：
   - 确认用户有足够权限创建和修改表

## 备用解决方案

如果以上步骤仍无法解决问题，可以考虑：

1. 使用Supabase或Railway托管PostgreSQL，它们对Vercel有更好的兼容性
2. 考虑使用其他无服务器部署平台，如Render或Railway

## 联系支持

如果问题仍然存在，可以联系Vercel支持或提供更多日志信息进行进一步诊断。
