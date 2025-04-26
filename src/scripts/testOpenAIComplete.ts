/**
 * OpenAI API连接完整测试工具
 * 
 * 这个脚本将:
 * 1. 加载您的环境变量
 * 2. 分析您的API密钥和配置
 * 3. 尝试不同类型的API调用
 * 4. 提供详细的错误报告和建议
 * 5. 测试不同模型的可用性
 */
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import https from 'https';
import http from 'http';
import { URL } from 'url';

// 颜色格式化输出
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m"
};

// 打印彩色信息
function log(type: 'info' | 'success' | 'error' | 'warn' | 'debug', message: string) {
  const timestamp = new Date().toISOString();
  let prefix = '';
  
  switch (type) {
    case 'info':
      prefix = `${colors.blue}[INFO]${colors.reset}`;
      break;
    case 'success':
      prefix = `${colors.green}[SUCCESS]${colors.reset}`;
      break;
    case 'error':
      prefix = `${colors.red}[ERROR]${colors.reset}`;
      break;
    case 'warn':
      prefix = `${colors.yellow}[WARNING]${colors.reset}`;
      break;
    case 'debug':
      prefix = `${colors.magenta}[DEBUG]${colors.reset}`;
      break;
  }
  
  console.log(`${prefix} ${message}`);
}

// 加载环境变量
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  
  log('info', `尝试加载环境变量文件: ${envPath}`);
  
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    log('success', `成功加载环境变量文件: ${envPath}`);
  } else {
    log('warn', `环境变量文件不存在: ${envPath}, 将使用默认dotenv加载机制`);
    dotenv.config();
  }
  
  return {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL,
    httpProxy: process.env.HTTP_PROXY || process.env.http_proxy,
    httpsProxy: process.env.HTTPS_PROXY || process.env.https_proxy,
    timeout: process.env.OPENAI_TIMEOUT || '60000',
    mockEnabled: process.env.MOCK_OPENAI === 'true'
  };
}

// 分析API密钥
function analyzeApiKey(apiKey: string | undefined) {
  if (!apiKey) {
    log('error', '未设置API密钥');
    return false;
  }
  
  log('info', `API密钥长度: ${apiKey.length} 字符`);
  log('info', `API密钥前缀: ${apiKey.substring(0, 8)}...`);
  log('info', `API密钥后缀: ...${apiKey.substring(apiKey.length - 4)}`);
  
  if (apiKey.startsWith('sk-')) {
    if (apiKey.startsWith('sk-org-')) {
      log('info', '检测到组织密钥格式 (sk-org-...)');
    } else if (apiKey.startsWith('sk-proj-')) {
      log('info', '检测到项目密钥格式 (sk-proj-...)');
    } else {
      log('info', '检测到标准密钥格式 (sk-...)');
    }
    return true;
  } else {
    log('warn', `API密钥格式可能不正确，OpenAI密钥通常以"sk-"开头`);
    return false;
  }
}

// 测试网络连接
async function testNetworkConnection(baseUrl: string | undefined) {
  const url = baseUrl || 'https://api.openai.com/v1';
  log('info', `测试网络连接至: ${url}`);
  
  try {
    const urlObj = new URL(url);
    const protocol = urlObj.protocol === 'https:' ? https : http;
    const port = urlObj.port ? parseInt(urlObj.port, 10) : (urlObj.protocol === 'https:' ? 443 : 80);
    
    // 创建适当的Agent
    const agent = urlObj.protocol === 'https:' ? 
      new https.Agent({ 
        keepAlive: true, 
        timeout: 10000,
        rejectUnauthorized: false // 允许自签名证书
      }) : 
      new http.Agent({ 
        keepAlive: true, 
        timeout: 10000 
      });
    
    // 执行简单的HEAD请求
    const statusCode = await new Promise<number>((resolve, reject) => {
      const req = protocol.request({
        hostname: urlObj.hostname,
        port: port,
        path: '/',
        method: 'HEAD',
        timeout: 10000,
        agent: agent
      }, (res) => {
        resolve(res.statusCode || 0);
      });
      
      req.on('error', (err) => {
        reject(err);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('连接超时 (10秒)'));
      });
      
      req.end();
    });
    
    log('success', `网络连接成功，状态码: ${statusCode}`);
    return true;
  } catch (error: any) {
    log('error', `网络连接失败: ${error.message}`);
    
    // 分析错误
    if (error.code === 'ENOTFOUND') {
      log('error', `DNS解析失败，无法找到主机: ${error.hostname || '未知'}`);
    } else if (error.code === 'ECONNREFUSED') {
      log('error', '连接被拒绝，目标服务器拒绝连接');
    } else if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
      log('error', '连接超时，可能是网络问题或防火墙拦截');
    }
    
    return false;
  }
}

// 创建OpenAI客户端
function createOpenAIClient(config: ReturnType<typeof loadEnv>) {
  const { apiKey, baseUrl, timeout } = config;
  
  if (!apiKey) {
    log('error', '未提供API密钥，无法创建客户端');
    return null;
  }
  
  // 创建https代理
  const agent = new https.Agent({
    keepAlive: true,
    timeout: parseInt(timeout, 10),
    rejectUnauthorized: false // 允许自签名证书，解决SSL问题
  });
  
  // 创建客户端
  try {
    log('info', `创建OpenAI客户端，baseURL: ${baseUrl || 'https://api.openai.com/v1'}`);
    
    const client = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
      httpAgent: agent,
      timeout: parseInt(timeout, 10),
      maxRetries: 2
    });
    
    log('success', '客户端创建成功');
    return client;
  } catch (error: any) {
    log('error', `创建客户端失败: ${error.message}`);
    return null;
  }
}

// 测试模型列表
async function testModelsList(client: OpenAI) {
  log('info', '正在获取模型列表...');
  
  try {
    const startTime = Date.now();
    const models = await client.models.list();
    const duration = Date.now() - startTime;
    
    log('success', `成功获取模型列表，用时: ${duration}ms`);
    log('info', `可用模型数量: ${models.data.length}`);
    
    // 显示前5个模型
    if (models.data.length > 0) {
      log('info', '前5个可用模型:');
      models.data.slice(0, 5).forEach((model, index) => {
        log('info', `  ${index + 1}. ${model.id}`);
      });
    }
    
    return true;
  } catch (error: any) {
    log('error', `获取模型列表失败: ${error.message}`);
    
    if (error.response) {
      log('error', `HTTP状态码: ${error.response.status}`);
      log('error', `错误详情: ${JSON.stringify(error.response.data)}`);
    }
    
    return false;
  }
}

// 测试简单聊天完成
async function testChatCompletion(client: OpenAI) {
  log('info', '正在测试聊天完成API...');
  
  try {
    const startTime = Date.now();
    
    // 尝试使用gpt-3.5-turbo，因为这个模型通常可用性更高
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: '你好，这是一个API测试' }],
      max_tokens: 50
    });
    
    const duration = Date.now() - startTime;
    
    log('success', `聊天完成API测试成功，用时: ${duration}ms`);
    log('info', `模型: ${completion.model}`);
    log('info', `响应内容: "${completion.choices[0]?.message?.content?.substring(0, 100)}${completion.choices[0]?.message?.content && completion.choices[0]?.message?.content.length > 100 ? '...' : ''}"`);
    
    return true;
  } catch (error: any) {
    log('error', `聊天完成API测试失败: ${error.message}`);
    
    if (error.response) {
      log('error', `HTTP状态码: ${error.response.status}`);
      log('error', `错误详情: ${JSON.stringify(error.response.data)}`);
    }
    
    return false;
  }
}

// 主测试流程
async function runTests() {
  log('info', '开始OpenAI API连接测试');
  log('info', `当前时间: ${new Date().toISOString()}`);
  log('info', `Node.js版本: ${process.version}`);
  log('info', '-------------------------');
  
  // 步骤1: 加载环境变量
  const config = loadEnv();
  log('info', '-------------------------');
  
  // 步骤2: 分析API密钥
  const isValidKeyFormat = analyzeApiKey(config.apiKey);
  
  // 显示代理配置
  if (config.httpProxy || config.httpsProxy) {
    log('info', `HTTP代理: ${config.httpProxy || '未设置'}`);
    log('info', `HTTPS代理: ${config.httpsProxy || '未设置'}`);
  } else {
    log('info', '未配置HTTP/HTTPS代理');
  }
  
  // 显示基础URL
  log('info', `API基础URL: ${config.baseUrl || 'https://api.openai.com/v1 (默认)'}`);
  log('info', `超时设置: ${config.timeout}ms`);
  
  if (config.mockEnabled) {
    log('warn', '模拟模式已启用，将不会进行实际API调用');
    return;
  }
  
  log('info', '-------------------------');
  
  // 步骤3: 测试网络连接
  const isNetworkConnected = await testNetworkConnection(config.baseUrl);
  
  if (!isNetworkConnected) {
    log('warn', '网络连接测试失败，但将继续尝试API调用');
  }
  
  log('info', '-------------------------');
  
  // 步骤4: 创建客户端并测试API
  const client = createOpenAIClient(config);
  
  if (client) {
    // 步骤5: 测试模型列表
    const isModelsListSuccessful = await testModelsList(client);
    log('info', '-------------------------');
    
    // 步骤6: 测试聊天完成
    const isChatCompletionSuccessful = await testChatCompletion(client);
    log('info', '-------------------------');
    
    // 总结
    log('info', '测试结果总结:');
    log(isValidKeyFormat ? 'success' : 'error', `API密钥格式: ${isValidKeyFormat ? '有效' : '无效'}`);
    log(isNetworkConnected ? 'success' : 'error', `网络连接: ${isNetworkConnected ? '成功' : '失败'}`);
    log(isModelsListSuccessful ? 'success' : 'error', `模型列表: ${isModelsListSuccessful ? '成功' : '失败'}`);
    log(isChatCompletionSuccessful ? 'success' : 'error', `聊天完成: ${isChatCompletionSuccessful ? '成功' : '失败'}`);
    
    // 最终结论
    if (isModelsListSuccessful && isChatCompletionSuccessful) {
      log('success', '🎉 API连接测试全部通过，您的OpenAI API配置正常工作！');
    } else if (isChatCompletionSuccessful) {
      log('success', '✅ 聊天完成API测试通过，这表明您的API配置基本可用');
    } else {
      log('error', '❌ API连接测试失败，请检查您的配置');
      
      // 给出建议
      log('info', '建议:');
      if (!isValidKeyFormat) {
        log('info', '- 检查您的API密钥格式是否正确');
      }
      if (!isNetworkConnected) {
        log('info', '- 检查您的网络连接和防火墙设置');
        log('info', '- 如果您在中国，请考虑配置HTTP_PROXY和HTTPS_PROXY环境变量');
      }
      if (!isModelsListSuccessful || !isChatCompletionSuccessful) {
        log('info', '- 确认您的API密钥仍然有效且未过期');
        log('info', '- 检查您的账户余额和配额');
        log('info', '- 考虑使用其它地区的API端点或替代服务');
      }
    }
  } else {
    log('error', '无法创建OpenAI客户端，测试中止');
  }
}

// 执行测试
runTests().catch(error => {
  log('error', `测试过程出错: ${error.message}`);
  process.exit(1);
});
