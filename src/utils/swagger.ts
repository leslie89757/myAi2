import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import express, { Express } from 'express';
import path from 'path';
import fs from 'fs';

// 检测是否在 Vercel 环境中运行
const isVercelEnvironment = process.env.VERCEL || process.env.NOW_REGION;

// 动态确定服务器 URL
const getServerUrl = () => {
  if (isVercelEnvironment) {
    return { 
      url: 'https://myai-backend.vercel.app', 
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
    servers: [getServerUrl()],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT认证，在请求头中添加：Authorization: Bearer {token}'
        }
      }
    },
    security: [
      { bearerAuth: [] }
    ]
  },
  // 使用简化的方式指定所有API文件
  apis: [
    // 优先使用源代码路径，因为注释更回空格更清晰
    path.resolve(process.cwd(), 'src/api/**/*.ts'),
    path.resolve(process.cwd(), 'src/admin/**/*.ts'),
    
    // 编译后的路径作为备用
    path.resolve(process.cwd(), 'dist/api/**/*.js'),
    path.resolve(process.cwd(), 'dist/admin/**/*.js')
  ]
};

// 初始化swagger-jsdoc - 不再静态生成
// 改用函数在请求时生成最新文档
function generateSwaggerSpecs() {
  // 确保每次都构建新的Swagger规范
  return swaggerJsdoc(options);
}

// 导出Swagger规格生成器
export const getSwaggerSpecs = generateSwaggerSpecs;

// 在每次请求时动态生成最新的API文档
export function setupSwagger(app: Express) {
  // 提供OpenAPI规范JSON
  app.get('/api-docs.json', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // 在每次请求时重新生成API文档
    // 这确保了文档始终是最新的
    const latestSpecs = generateSwaggerSpecs();
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(latestSpecs);
  });

  // 设置Swagger UI
  const swaggerSetup = swaggerUi.setup(generateSwaggerSpecs(), {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
      persistAuthorization: true
    }
  });
  
  // 采用推荐的模式，避免类型问题
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // 每次动态生成新文档
    const latestSpecs = generateSwaggerSpecs();
    // 使用一个新的swagger setup实例，确保文档为最新
    const updatedSetup = swaggerUi.setup(latestSpecs, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      swaggerOptions: {
        docExpansion: 'list',
        filter: true,
        showRequestDuration: true,
        persistAuthorization: true
      }
    });
    return updatedSetup(req, res, next);
  });

  // 防止404错误
  app.get('/api-docs/', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.redirect('/api-docs');
  });

  app.get('/api-docs/index.html', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.redirect('/api-docs');
  });
}
