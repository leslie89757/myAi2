/**
 * 仿照Python代码实现的OpenAI API直接请求测试
 * 这个脚本省略了代理和复杂配置，直接通过Axios发送HTTP请求
 */
import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// 加载环境变量
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log(`加载环境变量文件: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log(`环境变量文件不存在: ${envPath}`);
  dotenv.config();
}

// 使用环境变量中的API密钥或命令行参数中的API密钥
const apiKey = process.env.OPENAI_API_KEY;

// 直接从您的示例中获取
console.log(`API密钥前几个字符: ${apiKey?.substring(0, 8)}...`);
console.log(`API密钥长度: ${apiKey?.length}`);

// 模拟Python代码中的请求
async function directRequestToOpenAI() {
  try {
    console.log('开始发送直接请求到OpenAI API...');
    
    const url = 'https://api.openai.com/v1/chat/completions';
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    
    const data = {
      "model": "gpt-3.5-turbo",
      "messages": [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello, this is a test."}
      ],
      "temperature": 0.7,
      "max_tokens": 150
    };
    
    console.log('发送请求到:', url);
    const response = await axios.post(url, data, { 
      headers,
      timeout: 30000,
    });
    
    console.log('请求成功! 状态码:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
    
    const content = response.data.choices[0].message.content;
    console.log('AI回复:', content);
    
    return true;
  } catch (error: any) {
    console.error('请求失败:', error.message);
    
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应头:', JSON.stringify(error.response.headers, null, 2));
      console.error('响应数据:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('未收到响应，请求失败。这通常表示网络连接问题。');
    }
    
    return false;
  }
}

// 执行测试
directRequestToOpenAI()
  .then(success => {
    if (success) {
      console.log('✅ 直接请求OpenAI API成功!');
    } else {
      console.log('❌ 直接请求OpenAI API失败!');
    }
  })
  .catch(err => {
    console.error('测试过程中发生错误:', err);
  });
