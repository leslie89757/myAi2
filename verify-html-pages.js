/**
 * 验证HTML页面的脚本
 * 检查Vercel部署的HTML页面是否正确返回
 */

const axios = require('axios');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// Vercel部署的URL
const VERCEL_URL = 'https://myai-backend.vercel.app';

// 要检查的HTML页面
const HTML_PAGES = [
  { path: '/login', name: '登录页面' },
  { path: '/knowledge-chat', name: '知识库聊天页面' }
];

// 超时设置（毫秒）
const TIMEOUT = 15000;

// 结果日志文件
const LOG_FILE = path.join(__dirname, 'vercel-html-check.log');

/**
 * 记录日志到文件
 * @param {string} message 日志消息
 */
function logToFile(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logMessage);
}

/**
 * 检查单个HTML页面
 * @param {Object} page 页面信息
 * @returns {Promise<Object>} 检查结果
 */
async function checkHtmlPage(page) {
  const url = `${VERCEL_URL}${page.path}`;
  console.log(chalk.blue(`正在检查 ${page.name} (${url})...`));
  logToFile(`检查页面: ${page.name} (${url})`);
  
  try {
    const startTime = Date.now();
    const response = await axios.get(url, { 
      timeout: TIMEOUT,
      validateStatus: null, // 允许任何状态码
      headers: {
        'User-Agent': 'Vercel-HTML-Validator/1.0',
        'Cache-Control': 'no-cache',
        'Accept': 'text/html'
      }
    });
    const responseTime = Date.now() - startTime;
    
    // 判断是否成功 - 状态码200且内容类型包含HTML
    const contentType = response.headers['content-type'] || '';
    const isHtml = contentType.includes('text/html') || 
                  (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html>'));
    const isSuccess = response.status === 200 && isHtml;
    
    const result = {
      page: page.name,
      url,
      status: response.status,
      contentType,
      isHtml,
      responseTime,
      success: isSuccess,
      contentLength: typeof response.data === 'string' ? response.data.length : 0
    };
    
    logToFile(`结果: 状态=${result.status}, 内容类型=${contentType}, 是HTML=${isHtml}, 成功=${result.success}, 响应时间=${result.responseTime}ms`);
    logToFile(`内容长度: ${result.contentLength} 字节`);
    
    return result;
  } catch (error) {
    const result = {
      page: page.name,
      url,
      status: error.response?.status || 'Error',
      error: error.message,
      success: false
    };
    
    logToFile(`错误: ${error.message}`);
    if (error.response) {
      logToFile(`响应状态: ${error.response.status}`);
      logToFile(`响应头: ${JSON.stringify(error.response.headers)}`);
    }
    
    return result;
  }
}

/**
 * 主函数 - 验证所有HTML页面
 */
async function verifyHtmlPages() {
  // 初始化日志文件
  fs.writeFileSync(LOG_FILE, `===== Vercel HTML页面验证 - ${new Date().toISOString()} =====\n`);
  
  console.log(chalk.green('===== 开始验证Vercel HTML页面 ====='));
  console.log(chalk.yellow(`目标服务: ${VERCEL_URL}`));
  console.log(chalk.yellow(`当前时间: ${new Date().toISOString()}`));
  console.log(chalk.yellow(`日志文件: ${LOG_FILE}`));
  console.log('');
  
  const results = [];
  
  // 检查所有HTML页面
  for (const page of HTML_PAGES) {
    const result = await checkHtmlPage(page);
    results.push(result);
    
    // 打印结果
    if (result.success) {
      console.log(chalk.green(`✓ ${result.page} 可用 (${result.status}, ${result.responseTime}ms, HTML长度: ${result.contentLength}字节)`));
    } else {
      console.log(chalk.red(`✗ ${result.page} 不可用 (${result.status})`));
      if (result.error) {
        console.log(chalk.red(`  错误: ${result.error}`));
      }
    }
    console.log('');
  }
  
  // 总结
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  const successRate = (successCount / totalCount) * 100;
  
  console.log(chalk.yellow('===== 验证结果摘要 ====='));
  console.log(`检查的页面总数: ${totalCount}`);
  console.log(`成功的页面数量: ${successCount}`);
  console.log(`成功率: ${successRate.toFixed(2)}%`);
  
  if (successRate === 100) {
    console.log(chalk.green('✓ Vercel HTML页面验证成功! 所有页面都可用。'));
    logToFile('验证结果: 成功 (100%)');
  } else if (successRate >= 50) {
    console.log(chalk.yellow('⚠ Vercel HTML页面部分可用。某些页面可能存在问题。'));
    logToFile(`验证结果: 部分成功 (${successRate.toFixed(2)}%)`);
  } else {
    console.log(chalk.red('✗ Vercel HTML页面验证失败! 大多数页面不可用。'));
    logToFile(`验证结果: 失败 (${successRate.toFixed(2)}%)`);
  }
  
  console.log(chalk.blue(`详细日志已保存到: ${LOG_FILE}`));
}

// 执行验证
verifyHtmlPages().catch(error => {
  console.error(chalk.red('验证过程中发生错误:'), error);
  logToFile(`验证过程中发生错误: ${error.message}\n${error.stack}`);
  process.exit(1);
});
