#!/bin/bash

# 清理旧的构建文件
echo "清理旧的构建文件..."
rm -rf dist

# 编译 TypeScript 文件
echo "编译 TypeScript 文件..."
npx tsc

# 复制非 TypeScript 文件到 dist 目录
echo "复制静态文件..."
if [ -d "src/public" ]; then
  mkdir -p dist/public
  cp -r src/public/* dist/public/
fi

echo "构建完成!"
