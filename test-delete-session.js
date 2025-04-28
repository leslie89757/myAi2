/**
 * 会话删除接口测试脚本
 * 用于测试和诊断删除会话功能
 */
const axios = require('axios');

// 配置参数
const API_BASE_URL = 'http://localhost:3001';
const API_KEY = 'test_key';

// 测试会话ID - 替换为实际ID
const TEST_SESSION_ID = '709e2666-a90b-4ee8-86a2-94c99e41ac9a';

// 获取请求头
const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY
  };
};

// 控制台日志颜色
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// 记录请求头和正文信息
const logRequestDetails = (method, url, headers, data = null) => {
  console.log(`${colors.blue}[REQUEST] ${method} ${url}${colors.reset}`);
  console.log(`${colors.blue}Headers:${colors.reset}`, JSON.stringify(headers, null, 2));
  if (data) {
    console.log(`${colors.blue}Body:${colors.reset}`, JSON.stringify(data, null, 2));
  }
};

// 记录响应信息
const logResponseDetails = (status, data, headers) => {
  const color = status >= 200 && status < 300 ? colors.green : colors.red;
  console.log(`${color}[RESPONSE] Status: ${status}${colors.reset}`);
  console.log(`${color}Headers:${colors.reset}`, JSON.stringify(headers, null, 2));
  console.log(`${color}Body:${colors.reset}`, JSON.stringify(data, null, 2));
};

// 测试创建会话
async function testCreateSession() {
  console.log(`\n${colors.magenta}=== 测试创建会话 ===${colors.reset}`);
  
  try {
    const url = `${API_BASE_URL}/api/sessions`;
    const data = {
      title: `测试会话 ${new Date().toISOString()}`,
      description: "用于测试会话删除功能"
    };
    const headers = getHeaders();
    
    logRequestDetails('POST', url, headers, data);
    
    const response = await axios.post(url, data, { headers });
    
    logResponseDetails(response.status, response.data, response.headers);
    
    if (response.data && response.data.id) {
      console.log(`${colors.green}✅ 创建会话成功，ID: ${response.data.id}${colors.reset}`);
      return response.data.id;
    } else {
      console.log(`${colors.red}❌ 创建会话失败: 响应中缺少ID${colors.reset}`);
      return null;
    }
  } catch (error) {
    console.error(`${colors.red}❌ 创建会话请求失败:${colors.reset}`, error.message);
    if (error.response) {
      logResponseDetails(error.response.status, error.response.data, error.response.headers);
    }
    return null;
  }
}

// 测试会话删除API接口
async function testDeleteSession(sessionId) {
  console.log(`\n${colors.magenta}=== 测试删除会话 ===${colors.reset}`);
  console.log(`${colors.yellow}会话ID: ${sessionId}${colors.reset}`);
  
  try {
    const url = `${API_BASE_URL}/api/sessions/${sessionId}`;
    const headers = getHeaders();
    
    logRequestDetails('DELETE', url, headers);
    
    const response = await axios.delete(url, { headers });
    
    logResponseDetails(response.status, response.data, response.headers);
    
    if (response.data && response.data.success) {
      console.log(`${colors.green}✅ 会话删除成功${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}❌ 会话删除响应格式不正确${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.error(`${colors.red}❌ 删除会话请求失败:${colors.reset}`, error.message);
    if (error.response) {
      logResponseDetails(error.response.status, error.response.data, error.response.headers);
    }
    return false;
  }
}

// 测试多种请求方式尝试删除会话
async function testMultipleDeleteApproaches(sessionId) {
  console.log(`\n${colors.magenta}=== 测试多种删除方式 ===${colors.reset}`);
  
  // 方式1: 直接使用DELETE请求
  try {
    console.log(`${colors.yellow}方式1: 标准DELETE请求${colors.reset}`);
    const url = `${API_BASE_URL}/api/sessions/${sessionId}`;
    const headers = getHeaders();
    
    logRequestDetails('DELETE', url, headers);
    
    const response = await axios.delete(url, { headers });
    logResponseDetails(response.status, response.data, response.headers);
    console.log(`${colors.green}✅ 方式1成功${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}❌ 方式1失败:${colors.reset}`, error.message);
    if (error.response) {
      logResponseDetails(error.response.status, error.response.data, error.response.headers);
    }
  }
  
  // 方式2: 使用POST带_method=DELETE参数
  try {
    console.log(`\n${colors.yellow}方式2: POST请求带_method参数${colors.reset}`);
    const url = `${API_BASE_URL}/api/sessions/${sessionId}`;
    const headers = {
      ...getHeaders(),
      'X-HTTP-Method-Override': 'DELETE'
    };
    
    logRequestDetails('POST', url, headers, { _method: 'DELETE' });
    
    const response = await axios.post(url, { _method: 'DELETE' }, { headers });
    logResponseDetails(response.status, response.data, response.headers);
    console.log(`${colors.green}✅ 方式2成功${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}❌ 方式2失败:${colors.reset}`, error.message);
    if (error.response) {
      logResponseDetails(error.response.status, error.response.data, error.response.headers);
    }
  }
  
  // 方式3: 使用PUT进行逻辑删除
  try {
    console.log(`\n${colors.yellow}方式3: PUT请求进行逻辑删除${colors.reset}`);
    const url = `${API_BASE_URL}/api/sessions/${sessionId}`;
    const headers = getHeaders();
    const data = { isActive: false };
    
    logRequestDetails('PUT', url, headers, data);
    
    const response = await axios.put(url, data, { headers });
    logResponseDetails(response.status, response.data, response.headers);
    console.log(`${colors.green}✅ 方式3成功${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}❌ 方式3失败:${colors.reset}`, error.message);
    if (error.response) {
      logResponseDetails(error.response.status, error.response.data, error.response.headers);
    }
  }
}

// 主函数
async function main() {
  console.log(`${colors.magenta}=== 会话删除功能测试开始 ===${colors.reset}`);
  console.log(`${colors.blue}API基础URL: ${API_BASE_URL}${colors.reset}`);
  console.log(`${colors.blue}API密钥: ${API_KEY}${colors.reset}`);
  
  let sessionId = TEST_SESSION_ID;
  
  // 如果没有提供会话ID，则先创建一个
  if (!sessionId) {
    console.log(`${colors.yellow}未提供测试会话ID，将创建新会话${colors.reset}`);
    sessionId = await testCreateSession();
    
    if (!sessionId) {
      console.error(`${colors.red}无法创建测试会话，测试终止${colors.reset}`);
      return;
    }
  }
  
  console.log(`${colors.yellow}将使用会话ID: ${sessionId} 进行测试${colors.reset}`);
  
  // 测试标准删除方法
  const deleteResult = await testDeleteSession(sessionId);
  
  // 如果标准方法失败，尝试其他方法
  if (!deleteResult) {
    console.log(`${colors.yellow}\n标准删除方法失败，尝试多种方法进行删除...${colors.reset}`);
    await testMultipleDeleteApproaches(sessionId);
  }
  
  console.log(`\n${colors.magenta}=== 会话删除功能测试完成 ===${colors.reset}`);
}

// 运行测试
main().catch(error => {
  console.error(`${colors.red}测试过程中发生错误:${colors.reset}`, error);
});
