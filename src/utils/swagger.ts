import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';
import path from 'path';
import redoc from 'redoc-express';

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
    path.resolve(__dirname, '../controllers/*.js')
  ]
};

// 初始化swagger-jsdoc
const specs = swaggerJsdoc(options);

// 导出Swagger规格
export const getSwaggerSpecs = () => specs;

// 设置Redoc
export const setupApiDocs = (app: Express) => {
  // 提供OpenAPI规范JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(specs);
  });

  // 设置Redoc UI
  app.use('/api-docs', redoc({
    title: 'ChatGPT API 文档',
    specUrl: '/api-docs.json',
    redocOptions: {
      theme: {
        colors: {
          primary: {
            main: '#3498db'
          }
        },
        typography: {
          fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`,
          fontSize: '16px',
          headings: {
            fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`,
          }
        }
      },
      hideDownloadButton: false,
      expandResponses: '200,201',
      jsonSampleExpandLevel: 3,
      requiredPropsFirst: true,
      sortPropsAlphabetically: false
    }
  }));
};
