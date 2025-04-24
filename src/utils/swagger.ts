import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import path from 'path';

// 检测是否在 Vercel 环境中运行
const isVercelEnvironment = process.env.VERCEL || process.env.NOW_REGION;

// 动态确定服务器 URL
const getServerUrl = () => {
  if (isVercelEnvironment) {
    return { 
      url: '/', 
      description: '生产服务器'
    };
  }
  
  return {
    url: `http://localhost:${process.env.PORT || 3001}`,
    description: '开发服务器'
  };
};

// Swagger定义
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ChatGPT API',
      version: '1.0.0',
      description: 'ChatGPT API文档，包含流式和非流式接口',
      contact: {
        name: '开发团队'
      }
    },
    servers: [getServerUrl()]
  },
  // 使用绝对路径指定API文件
  apis: [
    path.resolve(__dirname, '../controllers/*.js'),
    path.resolve(__dirname, '../routes/*.js'),
    path.resolve(__dirname, '../models/*.js')
  ]
};

// 初始化swagger-jsdoc
const specs = swaggerJsdoc(options);

// 导出Swagger规格
export const getSwaggerSpecs = () => specs;

// 设置Swagger UI
export const setupSwagger = (app: Express) => {
  // 添加CORS头，确保Swagger UI能正确加载资源
  const swaggerUiOptions = {
    explorer: true,
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true
    }
  };
  
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(specs);
  });
};
