// 用于更新API文档的脚本
const fs = require('fs');
const path = require('path');

// 读取生产环境Swagger规范
const swaggerSpecs = require('./swagger-prod.json');

// 读取当前API代码
const apiFilePath = './api/index.js';
let apiCode = fs.readFileSync(apiFilePath, 'utf8');

// 准备替换的内容
const placeholder = `  // 如果是API JSON规格请求
  if (req.path === '/api-docs.json') {
    // 直接返回完整的API文档
    // 这些数据是从本地环境中导出的完整Swagger规范
    return res.status(200).json(`;

// 找到json对象的开始位置
const jsonStartIndex = apiCode.indexOf(placeholder) + placeholder.length;

// 找到json对象的结束位置 (从开始位置搜索下一个);)
let braceCount = 0;
let jsonEndIndex = jsonStartIndex;

for (let i = jsonStartIndex; i < apiCode.length; i++) {
  if (apiCode[i] === '{') braceCount++;
  if (apiCode[i] === '}') braceCount--;
  
  if (braceCount === 0 && apiCode[i] === '}') {
    jsonEndIndex = i + 1;
    break;
  }
}

// 替换JSON部分
const newApiCode = 
  apiCode.substring(0, jsonStartIndex) + 
  JSON.stringify(swaggerSpecs, null, 2) +
  apiCode.substring(jsonEndIndex);

// 写回文件
fs.writeFileSync(apiFilePath, newApiCode);

console.log('成功更新API文档规范');
