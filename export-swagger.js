// 导出Swagger规范的临时脚本
require('dotenv').config();
const swagger = require('./dist/utils/swagger');

// 获取完整的Swagger规范
const specs = swagger.getSwaggerSpecs();

// 输出为JSON字符串
console.log(JSON.stringify(specs, null, 2));
