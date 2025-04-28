#!/bin/bash
# 临时环境设置脚本 - 使用远程阿里云RDS数据库

# 创建更新的环境配置
cat > .env << EOL
# Moonshot AI 配置
OPENAI_API_KEY=sk-XqYRhCWILPnf1hcqFpJmvlAvnnQ0S8NGt7pf3eXSfpxuCY7n
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=moonshot-v1-128k
API_KEYS=test_key:test_user

# 阿里云RDS数据库配置
DATABASE_URL="postgresql://myai:tUkkid-9pafme-mettom@pgm-bp150nm5m2hlgtk9yo.pg.rds.aliyuncs.com:5432/myai"

# JWT认证密钥
JWT_SECRET=your_jwt_secret_key
REFRESH_SECRET=your_refresh_secret_key
EOL

echo "已更新环境配置文件，使用阿里云RDS远程数据库"

# 启动服务
echo "正在启动服务..."
npm run dev
