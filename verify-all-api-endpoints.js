/**
 * MyAI Backend API 端点全面验证脚本
 * 
 * 此脚本用于验证所有实际API端点是否正常工作，包括：
 * - 认证API（登录、验证令牌等）
 * - 知识库API（查询、聊天等）
 * - 会话API（创建、获取、删除等）
 * - 其他核心API
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// 配置
const config = {
  baseUrl: process.env.API_BASE_URL || 'https://myai-backend.vercel.app',
  apiKey: process.env.API_KEY || 'test_key',
  timeout: 30000, // 请求超时时间（毫秒）
  logFile: path.join(__dirname, 'api-endpoints-verification.log')
};

// 测试用户
const testUser = {
  username: `test${Math.floor(Math.random() * 9000) + 1000}@example.com`,
  password: 'Test@123456'
};

// 会话状态
const session = {
  accessToken: null,
  refreshToken: null,
  userId: null,
  chatSessionId: null,
  knowledgeFileId: null
};

// 日志工具
const logger = {
  log: [],
  
  // 添加日志
  add(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    console.log(logEntry);
    this.log.push(logEntry);
  },
  
  // 信息日志
  info(message) {
    this.add('INFO', message);
  },
  
  // 成功日志
  success(message) {
    this.add('SUCCESS', message);
  },
  
  // 警告日志
  warn(message) {
    this.add('WARNING', message);
  },
  
  // 错误日志
  error(message) {
    this.add('ERROR', message);
  },
  
  // 调试日志
  debug(data) {
    let content = data;
    if (typeof data !== 'string') {
      try {
        content = JSON.stringify(data, null, 2);
      } catch (e) {
        content = String(data);
      }
    }
    this.add('DEBUG', content);
  },
  
  // 保存日志到文件
  saveToFile() {
    fs.writeFileSync(config.logFile, this.log.join('\n'));
    console.log(`日志已保存到: ${config.logFile}`);
  }
};

// 测试结果
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [],
  
  // 添加成功结果
  addSuccess(endpoint) {
    this.total++;
    this.passed++;
    logger.success(`✓ 测试通过: ${endpoint}`);
  },
  
  // 添加失败结果
  addFailure(endpoint, error) {
    this.total++;
    this.failed++;
    this.errors.push({ endpoint, error });
    logger.error(`✗ 测试失败: ${endpoint} - ${error}`);
  },
  
  // 获取测试摘要
  getSummary() {
    const successRate = this.total > 0 ? ((this.passed / this.total) * 100).toFixed(2) : 0;
    return `总端点: ${this.total}, 成功: ${this.passed}, 失败: ${this.failed}, 成功率: ${successRate}%`;
  },
  
  // 获取失败详情
  getFailures() {
    if (this.errors.length === 0) {
      return '无失败测试';
    }
    
    return '失败的端点:\n' + this.errors.map((err, i) => 
      `${i + 1}. ${err.endpoint}: ${err.error}`
    ).join('\n');
  }
};

// 获取HTTP请求头
function getHeaders(withToken = false) {
  const headers = {
    'Content-Type': 'application/json'
  };
  
  if (withToken && session.accessToken) {
    headers['Authorization'] = `Bearer ${session.accessToken}`;
  }
  
  return headers;
}

// 记录请求详情
function logRequestDetails(method, url, data = null, headers = {}) {
  logger.info(`请求: ${method.toUpperCase()} ${url}`);
  
  // 隐藏敏感信息
  const sanitizedHeaders = { ...headers };
  if (sanitizedHeaders['Authorization']) {
    sanitizedHeaders['Authorization'] = 'Bearer [REDACTED]';
  }
  
  logger.debug({ 
    method: method.toUpperCase(), 
    url, 
    headers: sanitizedHeaders,
    data: data || 'No data'
  });
}

// 记录响应详情
function logResponseDetails(response) {
  const { status, statusText, headers, data } = response;
  logger.debug({
    status,
    statusText,
    headers: headers || {},
    data: data || 'No data'
  });
}

// API测试类
class APITester {
  constructor() {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout;
  }
  
  // 通用请求处理
  async makeRequest(method, endpoint, data = null, withToken = false, expectedStatus = 200) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = getHeaders(withToken);
    const options = {
      method,
      url,
      headers,
      timeout: this.timeout
    };
    
    if (data) {
      options.data = data;
    }
    
    logRequestDetails(method, url, data, headers);
    
    try {
      const response = await axios(options);
      logResponseDetails(response);
      
      if (response.status === expectedStatus) {
        testResults.addSuccess(endpoint);
        return { success: true, data: response.data, response };
      } else {
        const error = `状态码不匹配, 期望: ${expectedStatus}, 实际: ${response.status}`;
        testResults.addFailure(endpoint, error);
        return { success: false, error, response };
      }
    } catch (error) {
      let errorMessage = error.message;
      
      // 处理响应错误
      if (error.response) {
        logResponseDetails(error.response);
        errorMessage = `状态码: ${error.response.status}, 消息: ${error.response.statusText}`;
        
        // 特殊情况: 401状态码对于需要认证的端点是预期的
        if (withToken && error.response.status === 401 && expectedStatus === 401) {
          testResults.addSuccess(endpoint);
          return { 
            success: true, 
            data: error.response.data, 
            response: error.response 
          };
        }
      }
      
      testResults.addFailure(endpoint, errorMessage);
      return { success: false, error: errorMessage };
    }
  }
  
  // 测试健康检查端点
  async testHealth() {
    logger.info('测试健康检查端点...');
    
    const { success } = await this.makeRequest('get', '/health');
    return success;
  }
  
  // 测试API版本端点
  async testVersion() {
    logger.info('测试API版本端点...');
    
    const { success } = await this.makeRequest('get', '/api/version');
    return success;
  }
  
  // 测试登录API
  async testLogin() {
    logger.info('测试登录API...');
    
    const { success, data } = await this.makeRequest(
      'post', 
      '/api/auth/login', 
      testUser
    );
    
    if (success && data && data.accessToken) {
      session.accessToken = data.accessToken;
      session.refreshToken = data.refreshToken || null;
      session.userId = data.userId || null;
      
      logger.info(`登录成功, 用户ID: ${session.userId || 'unknown'}`);
      logger.info(`访问令牌: ${session.accessToken.substring(0, 10)}...`);
      
      if (session.refreshToken) {
        logger.info(`刷新令牌: ${session.refreshToken.substring(0, 10)}...`);
      }
      
      return true;
    }
    
    return false;
  }
  
  // 测试令牌验证API
  async testValidateToken() {
    logger.info('测试令牌验证API...');
    
    if (!session.accessToken) {
      logger.warn('没有访问令牌，跳过令牌验证测试');
      return false;
    }
    
    const { success } = await this.makeRequest(
      'get', 
      '/api/auth/validate', 
      null, 
      true
    );
    
    return success;
  }
  
  // 测试获取当前用户API
  async testGetCurrentUser() {
    logger.info('测试获取当前用户API...');
    
    if (!session.accessToken) {
      logger.warn('没有访问令牌，跳过获取用户测试');
      return false;
    }
    
    const { success, data } = await this.makeRequest(
      'get', 
      '/api/users/me', 
      null, 
      true
    );
    
    if (success && data && data.id) {
      session.userId = data.id;
      logger.info(`获取用户成功, ID: ${session.userId}`);
      return true;
    }
    
    return false;
  }
  
  // 测试聊天API
  async testChatAPIs() {
    logger.info('测试聊天API...');
    
    // 测试简单聊天API
    const simpleChatResult = await this.makeRequest(
      'post', 
      '/api/chat/simple', 
      {
        message: '你好，这是一个测试消息',
        userId: session.userId || '1'
      }, 
      true
    );
    
    // 测试流式聊天API
    const streamChatResult = await this.makeRequest(
      'post', 
      '/api/chat/stream', 
      {
        message: '你好，这是一个测试消息',
        userId: session.userId || '1'
      }, 
      true
    );
    
    return simpleChatResult.success || streamChatResult.success;
  }
  
  // 测试知识库API
  async testKnowledgeBaseAPIs() {
    logger.info('测试知识库API...');
    
    // 测试知识库查询API
    const queryResult = await this.makeRequest(
      'post', 
      '/api/knowledge/query', 
      {
        query: '这是一个测试查询',
        userId: session.userId || '1'
      }, 
      true
    );
    
    // 测试知识库聊天API
    const chatResult = await this.makeRequest(
      'post', 
      '/api/knowledge/chat', 
      {
        message: '这是一个测试消息',
        userId: session.userId || '1'
      }, 
      true
    );
    
    // 测试知识库流式聊天API
    const streamChatResult = await this.makeRequest(
      'post', 
      '/api/knowledge/stream-chat', 
      {
        message: '这是一个测试消息',
        userId: session.userId || '1'
      }, 
      true
    );
    
    return queryResult.success || chatResult.success || streamChatResult.success;
  }
  
  // 测试会话API
  async testSessionsAPIs() {
    logger.info('测试会话API...');
    
    // 测试获取会话列表
    const listResult = await this.makeRequest(
      'get', 
      '/api/sessions', 
      null, 
      true
    );
    
    if (listResult.success && listResult.data && Array.isArray(listResult.data)) {
      logger.info(`获取到 ${listResult.data.length} 个会话`);
      
      // 如果有会话，保存第一个会话ID
      if (listResult.data.length > 0) {
        session.chatSessionId = listResult.data[0].id;
        logger.info(`使用会话ID: ${session.chatSessionId}`);
      } else {
        // 如果没有会话，创建一个新会话
        const createResult = await this.makeRequest(
          'post', 
          '/api/sessions', 
          {
            title: '测试会话',
            userId: session.userId || '1'
          }, 
          true
        );
        
        if (createResult.success && createResult.data && createResult.data.id) {
          session.chatSessionId = createResult.data.id;
          logger.info(`创建新会话, ID: ${session.chatSessionId}`);
        }
      }
    }
    
    // 如果有会话ID，测试获取单个会话
    if (session.chatSessionId) {
      const getResult = await this.makeRequest(
        'get', 
        `/api/sessions/${session.chatSessionId}`, 
        null, 
        true
      );
      
      // 测试删除会话
      const deleteResult = await this.makeRequest(
        'delete', 
        `/api/sessions/${session.chatSessionId}`, 
        null, 
        true
      );
      
      return getResult.success || deleteResult.success;
    }
    
    return listResult.success;
  }
  
  // 测试刷新令牌API
  async testRefreshToken() {
    logger.info('测试刷新令牌API...');
    
    if (!session.refreshToken) {
      logger.warn('没有刷新令牌，跳过刷新令牌测试');
      return false;
    }
    
    const { success, data } = await this.makeRequest(
      'post', 
      '/api/auth/refresh', 
      {
        refreshToken: session.refreshToken
      }
    );
    
    if (success && data && data.accessToken) {
      const oldToken = session.accessToken;
      session.accessToken = data.accessToken;
      logger.info(`令牌刷新成功，新令牌: ${session.accessToken.substring(0, 10)}...`);
      
      // 验证新令牌
      const validateResult = await this.testValidateToken();
      if (!validateResult) {
        session.accessToken = oldToken;
        logger.warn('新令牌验证失败，恢复使用旧令牌');
        return false;
      }
      
      return true;
    }
    
    return false;
  }
  
  // 测试登出API
  async testLogout() {
    logger.info('测试登出API...');
    
    if (!session.accessToken) {
      logger.warn('没有访问令牌，跳过登出测试');
      return false;
    }
    
    const { success } = await this.makeRequest(
      'post', 
      '/api/auth/logout', 
      null, 
      true
    );
    
    if (success) {
      // 验证令牌是否已失效
      const validateResult = await this.makeRequest(
        'get', 
        '/api/auth/validate', 
        null, 
        true,
        401 // 期望401未授权状态码
      );
      
      if (validateResult.success) {
        logger.info('登出成功，令牌已失效');
        session.accessToken = null;
        session.refreshToken = null;
        return true;
      } else {
        logger.warn('登出后令牌仍然有效，可能存在问题');
      }
    }
    
    return false;
  }
  
  // 运行完整测试套件
  async runCompleteTestSuite() {
    logger.info('开始全面API测试...');
    
    // 测试基础健康状态
    if (!await this.testHealth()) {
      logger.error('服务器健康检查失败，终止后续测试');
      return;
    }
    
    // 测试API版本
    await this.testVersion();
    
    // 测试认证流程
    if (!await this.testLogin()) {
      logger.error('登录测试失败，终止后续测试');
      return;
    }
    
    // 测试令牌验证
    await this.testValidateToken();
    
    // 测试获取当前用户
    await this.testGetCurrentUser();
    
    // 测试聊天API
    await this.testChatAPIs();
    
    // 测试知识库API
    await this.testKnowledgeBaseAPIs();
    
    // 测试会话API
    await this.testSessionsAPIs();
    
    // 测试刷新令牌
    await this.testRefreshToken();
    
    // 测试登出
    await this.testLogout();
    
    // 测试结果总结
    logger.info('测试结果总结:');
    logger.info(testResults.getSummary());
    
    if (testResults.failed > 0) {
      logger.warn(testResults.getFailures());
    } else {
      logger.success('所有测试都通过了!');
    }
  }
}

// 主函数
async function main() {
  logger.info('===== 开始验证所有API端点 =====');
  logger.info(`目标服务: ${config.baseUrl}`);
  logger.info(`当前时间: ${new Date().toISOString()}`);
  
  try {
    const tester = new APITester();
    await tester.runCompleteTestSuite();
  } catch (error) {
    logger.error(`测试过程中发生未捕获的错误: ${error.message}`);
    logger.debug(error.stack);
  }
  
  logger.info('===== API端点验证完成 =====');
  logger.saveToFile();
}

// 执行主函数
main().catch(error => {
  console.error('程序执行失败:', error);
  process.exit(1);
});
