import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { OpenAI } from 'openai';
import https from 'https';

// 加载环境变量
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log(`加载环境变量文件: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log(`环境变量文件不存在: ${envPath}`);
  dotenv.config();
}

// 检查API密钥
const apiKey = process.env.OPENAI_API_KEY;
console.log(`API密钥状态: ${apiKey ? '已设置' : '未设置'}`);
if (apiKey) {
  console.log(`API密钥前几个字符: ${apiKey.substring(0, 5)}...`);
}

// 创建OpenAI实例但使用直接的HTTP客户端（非Node.js内置）
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-initialization',
  httpAgent: new https.Agent({
    keepAlive: true,
    timeout: 30000,
    // 关闭SSL验证，用于测试网络连接问题
    rejectUnauthorized: false
  })
});

// 测试连接
async function testConnection() {
  console.log('开始测试OpenAI API连接...');
  try {
    // 使用简单的模型列表API作为测试
    const models = await openai.models.list();
    console.log(`连接成功! 共有${models.data.length}个可用模型`);
    return true;
  } catch (error: any) {
    console.error('连接失败:', error.message);
    // 检查是否为代理或网络问题
    if (error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      console.error('网络错误: 可能是代理配置问题或网络连接问题');
    }
    // 检查是否为TLS/SSL问题
    else if (error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.code === 'CERT_HAS_EXPIRED') {
      console.error('SSL/TLS错误: 证书验证问题');
    }
    // 检查是否为API密钥问题
    else if (error.status === 401) {
      console.error('认证错误: API密钥可能无效或已过期');
    }
    
    return false;
  }
}

// 立即执行测试
testConnection().then(success => {
  console.log('测试完成', success ? '成功' : '失败');
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('测试过程出错:', err);
  process.exit(1);
});
