const axios = require('axios');

// 配置
const API_BASE_URL = 'https://myai-backend.vercel.app'; // 正式服务器地址
const API_KEY = 'test_key'; // 根据记忆中的API认证设置
const TEST_USER = {
  login: `test${Math.floor(Math.random() * 10000)}@example.com`, // 随机邮箱确保每次测试都创建新用户
  password: 'Test@123456'
};

// 存储令牌和用户信息
let accessToken = null;
let refreshToken = null;
let userId = null;
let isNewUser = false;

// 彩色日志函数
const log = {
  info: (msg) => console.log('\x1b[36m%s\x1b[0m', `[INFO] ${msg}`),
  success: (msg) => console.log('\x1b[32m%s\x1b[0m', `[SUCCESS] ${msg}`),
  error: (msg) => console.log('\x1b[31m%s\x1b[0m', `[ERROR] ${msg}`),
  warn: (msg) => console.log('\x1b[33m%s\x1b[0m', `[WARNING] ${msg}`),
  debug: (obj) => console.log('\x1b[35m%s\x1b[0m', `[DEBUG] ${JSON.stringify(obj, null, 2)}`)
};

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY  // 添加全局API密钥认证头
  }
});

// 测试 1: 登录或注册
async function testLoginOrRegister() {
  log.info(`测试登录/注册 API，使用账号: ${TEST_USER.login}`);
  
  try {
    const response = await api.post('/api/auth/login', TEST_USER);
    
    accessToken = response.data.accessToken;
    refreshToken = response.data.refreshToken;
    userId = response.data.user.id;
    isNewUser = response.data.isNewUser;
    
    log.success(`登录${isNewUser ? '/注册' : ''}成功!`);
    log.info(`用户ID: ${userId}`);
    log.info(`是否新用户: ${isNewUser ? '是' : '否'}`);
    log.info(`Access Token: ${accessToken.substring(0, 20)}...`);
    log.info(`Refresh Token: ${refreshToken.substring(0, 20)}...`);
    
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log.error(`无法连接到服务器: ${error.message}`);
      return false;
    }
    
    log.error(`登录/注册失败: ${error.response?.data?.error || error.message}`);
    if (error.response) {
      log.info(`状态码: ${error.response.status}`);
      log.debug(error.response.data);
    } else if (error.request) {
      log.error('无响应从服务器返回');
    } else {
      log.error(`请求配置错误: ${error.message}`);
    }
    return false;
  }
}

// 测试 2: 验证令牌有效性
async function testTokenValidation() {
  log.info('测试令牌验证 API');
  
  try {
    const response = await api.get('/api/auth/validate', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    log.success('令牌验证成功!');
    log.debug(response.data);
    
    return true;
  } catch (error) {
    log.error(`令牌验证失败: ${error.response?.data?.error || error.message}`);
    if (error.response) {
      log.debug(error.response.data);
    }
    return false;
  }
}

// 测试 3: 调用需要认证的API (获取当前用户信息)
async function testGetCurrentUser() {
  log.info('测试获取当前用户信息 API (需要认证)');
  
  try {
    const response = await api.get('/api/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    log.success('获取用户信息成功!');
    log.debug(response.data);
    
    return true;
  } catch (error) {
    log.error(`获取用户信息失败: ${error.response?.data?.error || error.message}`);
    if (error.response) {
      log.debug(error.response.data);
    }
    return false;
  }
}

// 测试 4: 刷新令牌
async function testRefreshToken() {
  log.info('测试刷新令牌 API');
  
  try {
    const response = await api.post('/api/auth/refresh', {}, {
      headers: {
        'Authorization': `Bearer ${refreshToken}`
      }
    });
    
    const oldToken = accessToken;
    accessToken = response.data.accessToken;
    
    log.success('令牌刷新成功!');
    log.info(`旧Token: ${oldToken.substring(0, 15)}...`);
    log.info(`新Token: ${accessToken.substring(0, 15)}...`);
    
    return true;
  } catch (error) {
    log.error(`刷新令牌失败: ${error.response?.data?.error || error.message}`);
    if (error.response) {
      log.debug(error.response.data);
    }
    return false;
  }
}

// 测试 5: 使用新令牌再次验证
async function testWithNewToken() {
  log.info('使用新令牌再次调用需要认证的API');
  
  try {
    const response = await api.get('/api/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    log.success('使用新令牌调用API成功!');
    log.debug(response.data);
    
    return true;
  } catch (error) {
    log.error(`使用新令牌调用API失败: ${error.response?.data?.error || error.message}`);
    if (error.response) {
      log.debug(error.response.data);
    }
    return false;
  }
}

// 测试 6: 登出
async function testLogout() {
  log.info('测试登出 API');
  
  try {
    const response = await api.post('/api/auth/logout', {}, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    log.success('登出成功!');
    log.debug(response.data);
    
    return true;
  } catch (error) {
    log.error(`登出失败: ${error.response?.data?.error || error.message}`);
    if (error.response) {
      log.debug(error.response.data);
    }
    return false;
  }
}

// 测试 7: 验证登出后令牌失效
async function testTokenInvalidation() {
  log.info('验证登出后令牌是否失效');
  
  try {
    const response = await api.get('/api/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    log.warn('令牌仍然有效，这可能是个问题!');
    log.debug(response.data);
    
    return false;
  } catch (error) {
    if (error.response && error.response.status === 401) {
      log.success('登出后令牌已失效，验证成功!');
      return true;
    } else {
      log.error(`预期之外的错误: ${error.response?.data?.error || error.message}`);
      if (error.response) {
        log.debug(error.response.data);
      }
      return false;
    }
  }
}

// 检查服务器是否在运行
async function checkServerRunning() {
  log.info('检查服务器是否在运行...');
  try {
    // 尝试访问一个简单端点，不需要认证的端点
    await api.get('/');
    log.success('服务器已启动');
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      log.error('无法连接到服务器。请确保后端服务已启动，并监听正确的端口。');
      return false;
    }
    // 如果是404等其他错误，服务器可能在运行，但路径不正确
    log.warn('服务器可能在运行，但测试端点不可用。将继续测试...');
    return true;
  }
}

// 运行所有测试
async function runTests() {
  log.info('=== 开始认证流程测试 ===');
  
  // 首先检查服务器是否在运行
  if (!await checkServerRunning()) {
    log.error('服务器检查失败，终止测试');
    return;
  }
  
  // 测试1: 登录/注册
  if (!await testLoginOrRegister()) {
    log.error('登录/注册测试失败，终止后续测试');
    return;
  }
  
  // 测试2: 验证令牌
  await testTokenValidation();
  
  // 测试3: 调用需要认证的API
  await testGetCurrentUser();
  
  // 测试4: 刷新令牌
  if (!await testRefreshToken()) {
    log.error('刷新令牌测试失败，终止后续测试');
    return;
  }
  
  // 测试5: 使用新令牌
  await testWithNewToken();
  
  // 测试6: 登出
  if (!await testLogout()) {
    log.error('登出测试失败，终止后续测试');
    return;
  }
  
  // 测试7: 验证令牌失效
  await testTokenInvalidation();
  
  log.info('=== 认证流程测试完成 ===');
}

// 启动测试
runTests().catch(error => {
  log.error(`未处理的错误: ${error.message}`);
  console.error(error);
});
