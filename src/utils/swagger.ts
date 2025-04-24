import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

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
    servers: [
      {
        url: 'http://localhost:3000',
        description: '开发服务器'
      }
    ]
  },
  // 指定包含API注释的文件路径
  apis: ['./src/controllers/*.ts', './src/routes/*.ts', './src/models/*.ts']
};

// 初始化swagger-jsdoc
const specs = swaggerJsdoc(options);

// 设置Swagger UI
export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
};
