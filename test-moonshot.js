/**
 * Moonshot API 测试脚本
 * 用于验证Moonshot API的连接和基本功能
 */
const { OpenAI } = require('openai');
const fs = require('fs');

// Moonshot API配置
const MOONSHOT_API_KEY = 'sk-XqYRhCWILPnf1hcqFpJmvlAvnnQ0S8NGt7pf3eXSfpxuCY7n';
const MOONSHOT_BASE_URL = 'https://api.moonshot.cn/v1';
const MOONSHOT_MODEL = 'moonshot-v1-128k';

// 创建Moonshot客户端
const moonshot = new OpenAI({
  apiKey: MOONSHOT_API_KEY,
  baseURL: MOONSHOT_BASE_URL
});

console.log('创建Moonshot客户端实例...');

// 测试聊天完成
async function testChatCompletion() {
  console.log(`\n正在测试Moonshot API聊天功能，使用模型: ${MOONSHOT_MODEL}`);
  
  try {
    console.log('发送测试请求...');
    
    const startTime = Date.now();
    const completion = await moonshot.chat.completions.create({
      model: MOONSHOT_MODEL,
      messages: [
        { role: 'system', content: '你是由Moonshot AI提供支持的智能助手。' },
        { role: 'user', content: '请简要介绍一下你自己和你的功能。' }
      ],
      max_tokens: 500
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ 测试成功! 响应时间: ${responseTime}ms`);
    console.log('\n回复内容:');
    console.log('----------------------------------------');
    console.log(completion.choices[0].message.content);
    console.log('----------------------------------------');
    
    console.log('\n响应详情:');
    console.log(`- 模型: ${completion.model}`);
    console.log(`- 完成原因: ${completion.choices[0].finish_reason}`);
    console.log(`- 提示词tokens: ${completion.usage.prompt_tokens}`);
    console.log(`- 完成tokens: ${completion.usage.completion_tokens}`);
    console.log(`- 总tokens: ${completion.usage.total_tokens}`);
    
    return true;
  } catch (error) {
    console.error('❌ 测试失败!');
    console.error(`错误信息: ${error.message}`);
    
    if (error.response) {
      console.error(`状态码: ${error.response.status}`);
      console.error('响应详情:', error.response.data);
    }
    
    return false;
  }
}

// 测试Knowledge Chat功能
async function testKnowledgeChat() {
  console.log('\n正在测试Moonshot知识库问答功能');
  
  try {
    // 创建一个简单的知识库文件
    const knowledgeContent = `
    MyAI Backend API 用户指南
    
    本API提供以下功能:
    1. 用户认证: 支持登录、注册、令牌验证和刷新
    2. 聊天功能: 支持简单聊天和流式聊天
    3. 知识库管理: 支持上传、查询和基于知识库的聊天
    4. 会话管理: 支持创建、获取、更新和删除会话
    
    所有API调用都需要API密钥认证。
    `;
    
    const knowledgeFile = '/tmp/moonshot_test_knowledge.txt';
    fs.writeFileSync(knowledgeFile, knowledgeContent);
    
    console.log(`已创建测试知识库文件: ${knowledgeFile}`);
    console.log('发送知识库问答请求...');
    
    const startTime = Date.now();
    const messages = [
      { role: 'system', content: '你是一个知识库问答助手，请回答用户提出的问题，回答仅基于知识库内容。' },
      { role: 'user', content: '这个API提供了哪些功能？' }
    ];
    
    // 模拟知识库问答
    const completion = await moonshot.chat.completions.create({
      model: MOONSHOT_MODEL,
      messages: messages,
      max_tokens: 500,
      temperature: 0.1
    });
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ 测试成功! 响应时间: ${responseTime}ms`);
    console.log('\n回复内容:');
    console.log('----------------------------------------');
    console.log(completion.choices[0].message.content);
    console.log('----------------------------------------');
    
    // 清理测试文件
    fs.unlinkSync(knowledgeFile);
    console.log(`已删除测试知识库文件: ${knowledgeFile}`);
    
    return true;
  } catch (error) {
    console.error('❌ 测试失败!');
    console.error(`错误信息: ${error.message}`);
    
    if (error.response) {
      console.error(`状态码: ${error.response.status}`);
      console.error('响应详情:', error.response.data);
    }
    
    return false;
  }
}

// 主函数
async function main() {
  console.log('=== Moonshot API 测试开始 ===');
  console.log(`API密钥: ${MOONSHOT_API_KEY.substring(0, 8)}...${MOONSHOT_API_KEY.substring(MOONSHOT_API_KEY.length - 4)}`);
  console.log(`基础URL: ${MOONSHOT_BASE_URL}`);
  console.log(`模型: ${MOONSHOT_MODEL}`);
  
  // 测试聊天功能
  const chatSuccess = await testChatCompletion();
  
  // 测试知识库问答功能（如果聊天测试成功）
  let knowledgeSuccess = false;
  if (chatSuccess) {
    knowledgeSuccess = await testKnowledgeChat();
  }
  
  // 测试结果总结
  console.log('\n=== Moonshot API 测试结果 ===');
  console.log(`聊天功能: ${chatSuccess ? '✅ 成功' : '❌ 失败'}`);
  console.log(`知识库问答: ${knowledgeSuccess ? '✅ 成功' : '❌ 失败'}`);
  console.log(`总体评估: ${(chatSuccess && knowledgeSuccess) ? '✅ 所有测试通过' : '⚠️ 部分测试失败'}`);
  
  if (chatSuccess && knowledgeSuccess) {
    console.log('\n✅ Moonshot API配置有效，可以正常使用。');
  } else {
    console.log('\n⚠️ Moonshot API测试存在问题，请检查配置和网络连接。');
  }
}

// 运行测试
main().catch(error => {
  console.error('测试过程中发生错误:', error);
  process.exit(1);
});
