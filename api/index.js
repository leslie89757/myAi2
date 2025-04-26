// Vercel Serverless Function 入口点
// 这个文件将作为Vercel部署的入口点

// 使用require导入编译后的应用
const app = require('../dist/index.js');

// 导出处理函数给Vercel
module.exports = app;
