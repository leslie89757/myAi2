/**
 * 知识库聊天流程测试脚本
 * 测试从用户登录到创建会话、上传知识库文件、发送消息及删除会话的完整流程
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// 配置
const API_BASE_URL = 'http://localhost:3001'; // 本地开发服务器地址
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123'
};
const TEST_DOCUMENT_PATH = path.join(__dirname, 'test_document.txt'); // 用作测试的知识库文件

// 存储测试过程中的数据
const testData = {
  accessToken: null,
  refreshToken: null,
  userId: null,
  username: null,
  sessionId: null
};

// 测试辅助函数
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

function logRequest(method, url, headers, data) {
  const headerStr = JSON.stringify(headers, null, 2);
  const dataStr = data ? JSON.stringify(data, null, 2) : '';
  log(`[REQUEST] ${method} ${url}`);
  log(`Headers: ${headerStr}`);
  if (data) log(`Data: ${dataStr}`);
}

function logResponse(response) {
  log(`[RESPONSE] Status: ${response.status}`);
  const headerStr = JSON.stringify(response.headers, null, 2);
  log(`Headers: ${headerStr}`);
  log(`Body: ${JSON.stringify(response.data, null, 2)}`);
}

function logError(error) {
  if (error.response) {
    log(`请求失败: ${error.message}`, 'error');
    log(`[RESPONSE] Status: ${error.response.status}`);
    const headerStr = JSON.stringify(error.response.headers, null, 2);
    log(`Headers: ${headerStr}`);
    log(`Body: ${JSON.stringify(error.response.data, null, 2)}`);
  } else {
    log(`请求错误: ${error.message}`, 'error');
  }
}

// 获取认证头
function getAuthHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(testData.accessToken ? { 'Authorization': `Bearer ${testData.accessToken}` } : {})
  };
}

// API调用函数
async function login() {
  log('\n=== 测试用户登录 ===');
  log(`尝试登录用户: ${TEST_USER.email}`);
  
  try {
    const url = `${API_BASE_URL}/api/auth/login`;
    const data = {
      login: TEST_USER.email,
      password: TEST_USER.password
    };
    
    logRequest('POST', url, getAuthHeaders(), data);
    
    const response = await axios.post(url, data, {
      headers: getAuthHeaders()
    });
    
    logResponse(response);
    
    if (response.data.accessToken) {
      testData.accessToken = response.data.accessToken;
      testData.refreshToken = response.data.refreshToken;
      testData.userId = response.data.user.id;
      testData.username = response.data.user.username || response.data.user.email;
      
      log(`登录成功! 用户ID: ${testData.userId}, 用户名: ${testData.username}`, 'success');
      return true;
    } else {
      log('登录响应中没有找到访问令牌', 'error');
      return false;
    }
  } catch (error) {
    logError(error);
    return false;
  }
}

async function createSession() {
  log('\n=== 创建新的会话 ===');
  
  try {
    const url = `${API_BASE_URL}/api/sessions?userId=${testData.userId}`;
    const data = {
      title: `测试会话 ${new Date().toLocaleString()}`,
      userId: testData.userId
    };
    
    logRequest('POST', url, getAuthHeaders(), data);
    
    const response = await axios.post(url, data, {
      headers: getAuthHeaders()
    });
    
    logResponse(response);
    
    if (response.data.session && response.data.session.id) {
      testData.sessionId = response.data.session.id;
      log(`会话创建成功! 会话ID: ${testData.sessionId}`, 'success');
      return true;
    } else {
      log('创建会话响应中没有找到会话ID', 'error');
      return false;
    }
  } catch (error) {
    logError(error);
    return false;
  }
}

async function uploadKnowledgeFile() {
  log('\n=== 上传知识库文件 ===');
  log(`上传文件: ${TEST_DOCUMENT_PATH}`);
  
  try {
    if (!fs.existsSync(TEST_DOCUMENT_PATH)) {
      log(`文件不存在: ${TEST_DOCUMENT_PATH}`, 'error');
      return false;
    }
    
    // 获取认证令牌
    const accessToken = testData.accessToken;
    if (!accessToken) {
      log('认证令牌不存在，请重新登录', 'error');
      return false;
    }
    
    const url = `${API_BASE_URL}/api/knowledge/upload`;
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_DOCUMENT_PATH));
    formData.append('documentName', 'Test Document');
    formData.append('userId', String(testData.userId));  // 确保传递为字符串
    
    const headers = {
      ...getAuthHeaders(),
      ...formData.getHeaders()
    };
    
    log(`[REQUEST] POST ${url}`);
    log(`Headers: ${JSON.stringify(headers, null, 2)}`);
    log(`FormData: { file: [Binary data], documentName: 'Test Document' }`);
    
    const response = await axios.post(url, formData, {
      headers: headers,
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    logResponse(response);
    
    if (response.data.success) {
      log('文件上传成功!', 'success');
      return true;
    } else {
      log('文件上传失败', 'error');
      return false;
    }
  } catch (error) {
    logError(error);
    return false;
  }
}

async function sendChatMessage() {
  log('\n=== 发送聊天消息 ===');
  
  if (!testData.sessionId) {
    log('没有有效的会话ID，无法发送消息', 'error');
    return false;
  }
  
  try {
    const url = `${API_BASE_URL}/api/knowledge/chat`;
    const data = {
      sessionId: testData.sessionId,
      message: '请使用知识库内容回答我一个问题：这个项目是做什么的？',
      userId: String(testData.userId),  // 确保传递为字符串
      model: 'moonshot-v1-128k'  // 使用Moonshot模型
    };
    
    logRequest('POST', url, getAuthHeaders(), data);
    
    const response = await axios.post(url, data, {
      headers: getAuthHeaders()
    });
    
    logResponse(response);
    
    if (response.data) {
      log('消息发送成功并收到回复!', 'success');
      if (response.data.answer) {
        log(`AI回复: ${response.data.answer}`);
      }
      return true;
    } else {
      log('发送消息失败', 'error');
      return false;
    }
  } catch (error) {
    logError(error);
    return false;
  }
}

async function deleteSession() {
  log('\n=== 删除会话 ===');
  
  if (!testData.sessionId) {
    log('没有有效的会话ID，无法删除会话', 'error');
    return false;
  }
  
  try {
    const url = `${API_BASE_URL}/api/sessions/${testData.sessionId}?userId=${testData.userId}`;
    
    logRequest('DELETE', url, getAuthHeaders());
    
    const response = await axios.delete(url, {
      headers: getAuthHeaders()
    });
    
    logResponse(response);
    
    if (response.data.success) {
      log('会话删除成功!', 'success');
      return true;
    } else {
      log('会话删除失败', 'error');
      return false;
    }
  } catch (error) {
    logError(error);
    return false;
  }
}

async function logout() {
  log('\n=== 退出登录 ===');
  
  try {
    const url = `${API_BASE_URL}/api/auth/logout`;
    const data = {
      refreshToken: testData.refreshToken
    };
    
    logRequest('POST', url, getAuthHeaders(), data);
    
    const response = await axios.post(url, data, {
      headers: getAuthHeaders()
    });
    
    logResponse(response);
    
    if (response.data.success) {
      log('退出登录成功!', 'success');
      // 清除测试数据
      testData.accessToken = null;
      testData.refreshToken = null;
      return true;
    } else {
      log('退出登录失败', 'error');
      return false;
    }
  } catch (error) {
    logError(error);
    return false;
  }
}

// 主测试流程
async function runTest() {
  log('=== 开始知识库聊天完整流程测试 ===');
  log(`API基础URL: ${API_BASE_URL}`);
  log('使用JWT认证');
  log(`测试用户: ${TEST_USER.email}`);
  
  // 步骤1: 登录
  const loginSuccess = await login();
  if (!loginSuccess) {
    log('登录失败，终止测试', 'error');
    return;
  }
  
  // 步骤2: 创建会话
  const createSessionSuccess = await createSession();
  if (!createSessionSuccess) {
    log('创建会话失败，终止测试', 'error');
    return;
  }
  
  // 步骤3: 上传知识库文件
  const uploadSuccess = await uploadKnowledgeFile();
  if (!uploadSuccess) {
    log('文件上传失败，但继续测试', 'error');
  }
  
  // 步骤4: 发送聊天消息
  const sendMessageSuccess = await sendChatMessage();
  if (!sendMessageSuccess) {
    log('发送消息失败，但继续测试', 'error');
  }
  
  // 步骤5: 删除会话
  const deleteSessionSuccess = await deleteSession();
  if (!deleteSessionSuccess) {
    log('删除会话失败，但继续测试', 'error');
  }
  
  // 步骤6: 退出登录
  const logoutSuccess = await logout();
  if (!logoutSuccess) {
    log('退出登录失败', 'error');
  }
  
  log('\n=== 知识库聊天完整流程测试完成 ===');
  log('测试摘要:');
  log(`- 登录: ${loginSuccess ? '成功' : '失败'}`);
  log(`- 创建会话: ${createSessionSuccess ? '成功' : '失败'}`);
  log(`- 上传知识库文件: ${uploadSuccess ? '成功' : '失败'}`);
  log(`- 发送聊天消息: ${sendMessageSuccess ? '成功' : '失败'}`);
  log(`- 删除会话: ${deleteSessionSuccess ? '成功' : '失败'}`);
  log(`- 退出登录: ${logoutSuccess ? '成功' : '失败'}`);
  
  // 测试结果
  const allSuccess = loginSuccess && createSessionSuccess && 
    uploadSuccess && sendMessageSuccess && deleteSessionSuccess && logoutSuccess;
  
  if (allSuccess) {
    log('所有测试都成功完成!', 'success');
  } else {
    log('部分测试失败，请检查日志', 'error');
  }
}

// 运行测试
runTest().catch(error => {
  log(`测试过程中发生未捕获的错误: ${error.message}`, 'error');
  console.error(error);
});
