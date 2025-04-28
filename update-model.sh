#!/bin/bash
# 替换所有代码文件中的模型名称，从gpt-4o切换到moonshot-v1-128k

# 定义模型名称
OLD_MODEL="gpt-4o"
NEW_MODEL="moonshot-v1-128k"

echo "开始将模型从 $OLD_MODEL 更改为 $NEW_MODEL..."

# 找到所有TypeScript和JavaScript文件并替换模型名称
find ./src -type f \( -name "*.ts" -o -name "*.js" \) -exec grep -l "$OLD_MODEL" {} \; | while read file; do
    echo "处理文件: $file"
    # 在模型引用处进行替换
    sed -i '' "s/model: '$OLD_MODEL'/model: '$NEW_MODEL'/g" "$file"
    sed -i '' "s/model: \"$OLD_MODEL\"/model: \"$NEW_MODEL\"/g" "$file"
    # 替换示例中的引用
    sed -i '' "s/example: \"$OLD_MODEL\"/example: \"$NEW_MODEL\"/g" "$file"
done

# 更新环境配置，确保指定正确的模型
cat > .env << EOL
# Moonshot AI 配置
OPENAI_API_KEY=sk-XqYRhCWILPnf1hcqFpJmvlAvnnQ0S8NGt7pf3eXSfpxuCY7n
OPENAI_BASE_URL=https://api.moonshot.cn/v1
OPENAI_MODEL=$NEW_MODEL
API_KEYS=test_key:test_user

# 阿里云RDS数据库配置
DATABASE_URL="postgresql://myai:tUkkid-9pafme-mettom@pgm-bp150nm5m2hlgtk9yo.pg.rds.aliyuncs.com:5432/myai"

# JWT认证密钥
JWT_SECRET=your_jwt_secret_key
REFRESH_SECRET=your_refresh_secret_key
EOL

echo "已完成模型名称替换和环境变量更新"
echo "现在需要重启服务以应用更改..."
