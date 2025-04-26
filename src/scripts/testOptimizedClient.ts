/**
 * 测试优化后的OpenAI客户端
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { openaiDirectClient, validateOpenAIConnection } from '../utils/openaiDirectClient';

// 加载环境变量
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log(`加载环境变量文件: ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.log(`环境变量文件不存在: ${envPath}`);
  dotenv.config();
}

/**
 * 测试聊天请求
 */
async function testChatCompletion() {
  console.log('开始测试优化的OpenAI客户端...');
  
  try {
    // 先验证连接
    const isValid = await validateOpenAIConnection();
    if (!isValid) {
      console.error('OpenAI API连接验证失败，将尝试进行聊天测试...');
    } else {
      console.log('✅ OpenAI API连接验证成功!');
    }
    
    console.log('发送聊天请求...');
    const completion = await openaiDirectClient.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, this is a test message. Please reply with a short greeting.' }
      ],
      max_tokens: 100
    });
    
    console.log('请求成功!');
    console.log('模型:', completion.model);
    console.log('回复:', completion.choices[0].message.content);
    
    console.log('✅ 聊天测试成功!');
    return true;
  } catch (error: any) {
    console.error('测试失败:', error.message);
    
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('错误数据:', JSON.stringify(error.response.data));
    }
    
    console.error('❌ 聊天测试失败!');
    return false;
  }
}

// 执行测试
testChatCompletion()
  .then(success => {
    if (success) {
      console.log('测试完成，所有测试通过!');
      process.exit(0);
    } else {
      console.log('测试完成，测试失败!');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('测试过程发生错误:', err);
    process.exit(1);
  });
