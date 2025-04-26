// Vercel Serverless Function 入口点

// Express应用实例
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

// 获取环境变量
const API_KEYS = process.env.API_KEYS || 'test_key:test_user';

// 创建Express应用
const app = express();

// 设置基本中间件
app.use(cors());
app.use(express.json());

// API密钥验证中间件
const apiKeyAuth = (req, res, next) => {
  // 如果是健康检查、API文档或静态页面，跳过验证
  if (req.path === '/health' || 
      req.path === '/api-docs' || 
      req.path === '/api-docs.json' || 
      req.path.startsWith('/api-docs/') || 
      req.path === '/knowledge-chat' || 
      req.path.startsWith('/public/') || 
      req.path === '/') {
    return next();
  }
  
  // 检查API密钥
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({
      error: '未授权',
      message: '缺少API密钥'
    });
  }
  
  // 验证API密钥
  const keyPairs = API_KEYS.split(',');
  let isValid = false;
  
  for (const pair of keyPairs) {
    const [key, name] = pair.trim().split(':');
    if (key && key === apiKey) {
      req.user = {
        id: 0,
        username: name || 'system_user',
        apiKeyId: key
      };
      isValid = true;
      break;
    }
  }
  
  if (!isValid) {
    return res.status(401).json({
      error: '未授权',
      message: 'API密钥无效'
    });
  }
  
  next();
};

// 使用API密钥验证
app.use(apiKeyAuth);

// 静态文件
app.use('/public', express.static(path.join(__dirname, '../dist/public')));

// 处理所有请求
app.all('*', (req, res) => {
  // 提供健康检查响应
  if (req.path === '/health') {
    return res.status(200).json({ status: 'ok' });
  }
  
  // 知识库聊天页面
  if (req.path === '/knowledge-chat') {
    return res.sendFile(path.join(__dirname, '../dist/public/knowledge-chat.html'));
  }
  
  // 简单聊天测试页面
  if (req.path === '/simple-test') {
    return res.sendFile(path.join(__dirname, '../dist/public/simple-test.html'));
  }
  
  // 流式聊天测试页面
  if (req.path === '/stream-test') {
    return res.sendFile(path.join(__dirname, '../dist/public/stream-test.html'));
  }
  
  // 文件上传测试页面
  if (req.path === '/test-upload') {
    return res.sendFile(path.join(__dirname, '../dist/public/test-upload.html'));
  }
  
  // 如果是API文档请求
  if (req.path === '/api-docs' || req.path === '/api-docs/') {
    return res.sendFile(path.join(__dirname, '../dist/public/api-docs.html'));
  }
  
  // 如果是API JSON规格请求
  if (req.path === '/api-docs.json') {
    try {
      // 动态导入已编译的swagger规范
      const swaggerSpecsPath = path.join(__dirname, '../dist/utils/swagger.js');
      
      // 检查文件是否存在
      if (fs.existsSync(swaggerSpecsPath)) {
        // 清除缓存，确保导入最新版本
        delete require.cache[require.resolve(swaggerSpecsPath)];
        
        // 导入swagger模块
        const swagger = require(swaggerSpecsPath);
        
        // 获取完整的swagger规范
        const fullSpecs = swagger.getSwaggerSpecs ? swagger.getSwaggerSpecs() : null;
        
        // 如果成功获取规范，返回完整文档
        if (fullSpecs) {
          // 更新服务器URL为生产环境
          if (fullSpecs.servers && fullSpecs.servers.length > 0) {
            fullSpecs.servers[0].url = 'https://myai-backend.vercel.app';
          }
          
          return res.status(200).json(fullSpecs);
        }
      }
      
      // 如果动态导入失败，默认使用硬编码的API文档
      console.log('动态导入swagger规范失败，使用预定义文档');
    } catch (error) {
      console.error('动态导入swagger规范时出错:', error);
    }
    
    // 无论是否出错，都返回默认API文档
    return res.status(200).json({
      "openapi": "3.0.0",
      "info": {
        "title": "MyAI Backend API",
        "version": "1.0.0",
        "description": "MyAI后端 API文档",
        "contact": {
          "name": "开发团队"
        }
      },
      "servers": [
        {
          "url": "https://myai-backend.vercel.app",
          "description": "生产服务器"
        }
      ],
      "components": {
        "securitySchemes": {
          "apiKeyAuth": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key",
            "description": "API密钥认证，在请求头中添加：X-API-Key: {apiKey}"
          }
        },
        "schemas": {
          "ChatMessage": {
            "type": "object",
            "properties": {
              "role": {
                "type": "string",
                "enum": ["system", "user", "assistant"],
                "description": "消息角色"
              },
              "content": {
                "type": "string",
                "description": "消息内容"
              }
            }
          },
          "Error": {
            "type": "object",
            "properties": {
              "error": {
                "type": "string"
              },
              "message": {
                "type": "string"
              }
            }
          }
        }
      },
      "security": [
        { "apiKeyAuth": [] }
      ],
      "paths": {
        "/health": {
          "get": {
            "summary": "健康检查",
            "tags": ["System"],
            "security": [],
            "responses": {
              "200": {
                "description": "服务正常运行",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "status": {
                          "type": "string",
                          "example": "ok"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        "/api/chat/simple": {
          "post": {
            "summary": "简单非流式对话",
            "tags": ["Chat"],
            "requestBody": {
              "required": true,
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "required": ["messages"],
                    "properties": {
                      "messages": {
                        "type": "array",
                        "items": {
                          "$ref": "#/components/schemas/ChatMessage"
                        }
                      },
                      "model": {
                        "type": "string",
                        "default": "gpt-3.5-turbo"
                      }
                    }
                  }
                }
              }
            },
            "responses": {
              "200": {
                "description": "请求成功",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "message": {
                          "$ref": "#/components/schemas/ChatMessage"
                        }
                      }
                    }
                  }
                }
              },
              "401": {
                "description": "未授权",
                "content": {
                  "application/json": {
                    "schema": {
                      "$ref": "#/components/schemas/Error"
                    }
                  }
                }
              }
            }
          }
        },
        "/api/chat/stream": {
          "post": {
            "summary": "流式对话",
            "tags": ["Chat"],
            "requestBody": {
              "required": true,
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "required": ["messages"],
                    "properties": {
                      "messages": {
                        "type": "array",
                        "items": {
                          "$ref": "#/components/schemas/ChatMessage"
                        }
                      },
                      "model": {
                        "type": "string",
                        "default": "gpt-3.5-turbo"
                      }
                    }
                  }
                }
              }
            },
            "responses": {
              "200": {
                "description": "流式响应",
                "content": {
                  "text/event-stream": {
                    "schema": {
                      "type": "string"
                    }
                  }
                }
              },
              "401": {
                "description": "未授权",
                "content": {
                  "application/json": {
                    "schema": {
                      "$ref": "#/components/schemas/Error"
                    }
                  }
                }
              }
            }
          }
        },
        "/api/knowledge/query": {
          "post": {
            "summary": "知识库查询",
            "tags": ["Knowledge"],
            "requestBody": {
              "required": true,
              "content": {
                "application/json": {
                  "schema": {
                    "type": "object",
                    "required": ["query"],
                    "properties": {
                      "query": {
                        "type": "string",
                        "description": "查询内容"
                      }
                    }
                  }
                }
              }
            },
            "responses": {
              "200": {
                "description": "请求成功",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "answer": {
                          "type": "string"
                        },
                        "sources": {
                          "type": "array",
                          "items": {
                            "type": "object"
                          }
                        }
                      }
                    }
                  }
                }
              },
              "401": {
                "description": "未授权",
                "content": {
                  "application/json": {
                    "schema": {
                      "$ref": "#/components/schemas/Error"
                    }
                  }
                }
              }
            }
          }
        }
      }
    });
  }
  
  // 如果是API请求路径
  if (req.path.startsWith('/api/')) {
    return res.status(200).json({
      message: '请求成功',
      path: req.path,
      method: req.method,
      user: req.user,
      timestamp: new Date().toISOString()
    });
  }
  
  // 返回API状态消息
  return res.status(200).json({
    message: 'MyAI Backend API 正在运行',
    documentation: '/api-docs',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    status: 'online',
    endpoints: [
      '/health', 
      '/api-docs',
      '/api/chat/simple',
      '/api/chat/stream',
      '/api/knowledge/query',
      '/api/auth/validate'
    ],
    auth: {
      required: true,
      method: 'API Key',
      header: 'X-API-Key'
    }
  });
});

// 导出Serverless函数
module.exports = app;
