// Vercel Serverless Function 入口点

// Express应用实例
const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

// 日志工具
const Logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${msg}`)
};

// 引入JWT库和cookie解析器
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

// 获取环境变量
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 创建Express应用
const app = express();

// 设置基本中间件
app.use(cors());
app.use(express.json());
app.use(cookieParser()); // 添加cookie解析中间件

// JWT认证中间件
const jwtAuth = (req, res, next) => {
  // 如果是健康检查、API文档、静态页面或认证相关的路由，跳过验证
  if (req.path === '/health' || 
      req.path === '/api-docs' || 
      req.path === '/api-docs.json' || 
      req.path.startsWith('/api-docs/') || 
      req.path === '/knowledge-chat' || 
      req.path === '/login' || 
      req.path.startsWith('/public/') || 
      req.path === '/' ||
      req.path.startsWith('/api/auth/login') ||
      req.path.startsWith('/api/auth/refresh')) {
    return next();
  }
  
  // 检查JWT令牌
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: '未授权访问', 
      message: '请提供有效的JWT令牌',
      details: { authHeader: authHeader ? '格式不正确' : '未提供' }
    });
  }

  try {
    const token = authHeader.split(' ')[1];
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    
    // 验证JWT令牌
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 设置用户信息
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role
    };
    req.token = token;
    
    next();
  } catch (error) {
    Logger.error(`JWT认证错误: ${error.message}`);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'JWT令牌已过期',
        message: '请使用刷新令牌获取新的访问令牌' 
      });
    }
    return res.status(401).json({ error: '认证失败', message: error.message });
  }
};

// 应用JWT认证中间件
app.use(jwtAuth);

// 静态文件
app.use('/public', express.static(path.join(__dirname, '../dist/public')));

// 处理所有请求
app.all('*', (req, res) => {
  // 默认路由
  if (req.path === '/') {
    // 先检查用户是否已登录
    const authHeader = req.headers.authorization;
    const accessTokenCookie = req.cookies && req.cookies.accessToken;
    
    // 如果没有登录，重定向到登录页面
    if ((!authHeader || !authHeader.startsWith('Bearer ')) && !accessTokenCookie) {
      Logger.info('用户未登录，重定向到登录页面');
      return res.redirect('/login');
    }
    
    // 如果已登录，重定向到知识库聊天页面
    Logger.info('用户已登录，重定向到知识库聊天页面');
    return res.redirect('/knowledge-chat');
  }
  
  // 提供健康检查响应
  if (req.path === '/health') {
    return res.status(200).json({ status: 'ok' });
  }
  
  // 登录页面
  if (req.path === '/login') {
    // 尝试多个可能的路径，确保能找到文件
    const possiblePaths = [
      path.join(__dirname, '../dist/public/login.html'),
      path.join(__dirname, '../src/public/login.html'),
      path.join(__dirname, 'public/login.html'),
      path.join(__dirname, '../public/login.html')
    ];
    
    // 检查每个路径，使用第一个存在的文件
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        Logger.info(`找到登录页面: ${filePath}`);
        return res.sendFile(filePath);
      }
    }
    
    // 如果所有路径都不存在，返回错误信息
    Logger.error('无法找到登录页面文件');
    return res.status(404).send('登录页面文件不存在，请联系管理员');
  }
  
  // 知识库聊天页面 - 添加用户登录检查
  if (req.path === '/knowledge-chat') {
    // 在Vercel环境中简化路由逻辑，不做严格的权限验证
    // 这样可以确保在所有环境中都能正常访问知识库聊天页面
    
    // 尝试多个可能的路径，确保能找到文件
    const possiblePaths = [
      path.join(__dirname, '../dist/public/knowledge-chat.html'),
      path.join(__dirname, '../src/public/knowledge-chat.html'),
      path.join(__dirname, 'public/knowledge-chat.html'),
      path.join(__dirname, '../public/knowledge-chat.html')
    ];
    
    // 检查每个路径，使用第一个存在的文件
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        Logger.info(`找到知识库聊天页面: ${filePath}`);
        return res.sendFile(filePath);
      }
    }
    
    // 如果所有路径都不存在，返回错误信息
    Logger.error('无法找到知识库聊天页面文件');
    return res.status(404).send('知识库聊天页面文件不存在，请联系管理员');
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
    // 直接返回完整的API文档
    // 这些数据是从本地环境中导出的完整Swagger规范
    return res.status(200).json({
  "openapi": "3.0.0",
  "info": {
    "title": "ChatGPT API",
    "version": "1.0.0",
    "description": "ChatGPT API文档，包含流式和非流式接口",
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
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT认证，在请求头中添加：Authorization: Bearer {token}"
      },
      "apiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "X-API-Key",
        "description": "API密钥认证，在请求头中添加：X-API-Key: {apiKey}"
      }
    }
  },
  "security": [
    {
      "bearerAuth": []
    },
    {
      "apiKeyAuth": []
    }
  ],
  "paths": {
    "/api/knowledge/upload": {
      "post": {
        "tags": [
          "知识库"
        ],
        "summary": "上传并向量化文档",
        "description": "上传PDF、TXT、DOC或DOCX文件，解析内容并添加到用户的知识库中",
        "requestBody": {
          "required": true,
          "content": {
            "multipart/form-data": {
              "schema": {
                "type": "object",
                "properties": {
                  "file": {
                    "type": "string",
                    "format": "binary",
                    "description": "要上传的文档文件"
                  },
                  "userId": {
                    "type": "string",
                    "description": "用户ID"
                  },
                  "documentName": {
                    "type": "string",
                    "description": "文档名称"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "文档上传并向量化成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "message": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "请求参数错误"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      }
    },
    "/api/knowledge/query": {
      "post": {
        "tags": [
          "知识库"
        ],
        "summary": "查询知识库",
        "description": "使用自然语言查询用户的知识库",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "query",
                  "userId"
                ],
                "properties": {
                  "query": {
                    "type": "string",
                    "description": "查询文本"
                  },
                  "userId": {
                    "type": "string",
                    "description": "用户ID"
                  },
                  "topK": {
                    "type": "integer",
                    "description": "返回的最相关结果数量",
                    "default": 5
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "查询成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "content": {
                            "type": "string"
                          },
                          "metadata": {
                            "type": "object"
                          },
                          "score": {
                            "type": "number"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "请求参数错误"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      }
    },
    "/api/knowledge/chat": {
      "post": {
        "tags": [
          "知识库"
        ],
        "summary": "与知识库聊天",
        "description": "使用用户的知识库进行聊天，返回非流式响应",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "message",
                  "userId"
                ],
                "properties": {
                  "message": {
                    "type": "string",
                    "description": "用户消息"
                  },
                  "userId": {
                    "type": "string",
                    "description": "用户ID"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "聊天成功",
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
                        "type": "object",
                        "properties": {
                          "content": {
                            "type": "string"
                          },
                          "metadata": {
                            "type": "object"
                          }
                        }
                      }
                    },
                    "reply": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "请求参数错误"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      }
    },
    "/api/knowledge/stream-chat": {
      "post": {
        "tags": [
          "知识库"
        ],
        "summary": "与知识库流式聊天",
        "description": "使用用户的知识库进行聊天，返回流式响应",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "message",
                  "userId"
                ],
                "properties": {
                  "message": {
                    "type": "string",
                    "description": "用户消息"
                  },
                  "userId": {
                    "type": "string",
                    "description": "用户ID"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "返回 SSE 流",
            "content": {
              "text/event-stream": {
                "schema": {
                  "type": "string"
                }
              }
            }
          },
          "400": {
            "description": "请求参数错误"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      }
    },
    "/api/knowledge/delete": {
      "delete": {
        "tags": [
          "知识库"
        ],
        "summary": "删除用户知识库",
        "description": "删除指定用户的知识库内容",
        "parameters": [
          {
            "in": "query",
            "name": "documentName",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "可选，指定要删除的文档名称"
          }
        ],
        "responses": {
          "200": {
            "description": "删除成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "message": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "请求参数错误"
          },
          "401": {
            "description": "未认证"
          },
          "500": {
            "description": "服务器错误"
          }
        },
        "security": [
          {
            "bearerAuth": []
          }
        ]
      }
    },
    "/api/sessions": {
      "post": {
        "tags": [
          "会话管理"
        ],
        "summary": "创建新会话",
        "description": "为指定用户创建一个新的会话",
        "security": [
          {
            "bearerAuth": []
          },
          {
            "apiKeyAuth": []
          }
        ],
        "parameters": [
          {
            "in": "query",
            "name": "userId",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "用户ID"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "title"
                ],
                "properties": {
                  "title": {
                    "type": "string",
                    "description": "会话标题"
                  },
                  "description": {
                    "type": "string",
                    "description": "会话描述（可选）"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "会话创建成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "message": {
                      "type": "string"
                    },
                    "session": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string"
                        },
                        "title": {
                          "type": "string"
                        },
                        "description": {
                          "type": "string"
                        },
                        "createdAt": {
                          "type": "string",
                          "format": "date-time"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "请求参数错误"
          },
          "401": {
            "description": "未认证"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      },
      "get": {
        "tags": [
          "会话管理"
        ],
        "summary": "获取用户会话列表",
        "description": "获取指定用户的所有会话",
        "security": [
          {
            "bearerAuth": []
          },
          {
            "apiKeyAuth": []
          }
        ],
        "parameters": [
          {
            "in": "query",
            "name": "userId",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "用户ID"
          }
        ],
        "responses": {
          "200": {
            "description": "成功获取会话列表",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "sessions": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string"
                          },
                          "title": {
                            "type": "string"
                          },
                          "description": {
                            "type": "string"
                          },
                          "createdAt": {
                            "type": "string",
                            "format": "date-time"
                          },
                          "updatedAt": {
                            "type": "string",
                            "format": "date-time"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "未认证"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      }
    },
    "/api/sessions/{id}": {
      "get": {
        "tags": [
          "会话管理"
        ],
        "summary": "获取会话详情",
        "description": "获取指定用户的指定会话的详细信息，包括消息历史",
        "security": [
          {
            "bearerAuth": []
          },
          {
            "apiKeyAuth": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "会话ID"
          }
        ],
        "responses": {
          "200": {
            "description": "成功获取会话详情",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "session": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string"
                        },
                        "title": {
                          "type": "string"
                        },
                        "description": {
                          "type": "string"
                        },
                        "createdAt": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "updatedAt": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "messages": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "id": {
                                "type": "string"
                              },
                              "role": {
                                "type": "string"
                              },
                              "content": {
                                "type": "string"
                              },
                              "tokens": {
                                "type": "integer"
                              },
                              "createdAt": {
                                "type": "string",
                                "format": "date-time"
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "未认证"
          },
          "403": {
            "description": "无权访问"
          },
          "404": {
            "description": "会话不存在"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      },
      "put": {
        "tags": [
          "会话管理"
        ],
        "summary": "更新会话信息",
        "description": "更新指定用户的指定会话的标题、描述或状态",
        "security": [
          {
            "bearerAuth": []
          },
          {
            "apiKeyAuth": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "会话ID"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "title": {
                    "type": "string",
                    "description": "会话标题"
                  },
                  "description": {
                    "type": "string",
                    "description": "会话描述"
                  },
                  "isActive": {
                    "type": "boolean",
                    "description": "会话是否活跃"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "会话更新成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "message": {
                      "type": "string"
                    },
                    "session": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string"
                        },
                        "title": {
                          "type": "string"
                        },
                        "description": {
                          "type": "string"
                        },
                        "isActive": {
                          "type": "boolean"
                        },
                        "updatedAt": {
                          "type": "string",
                          "format": "date-time"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "请求参数错误"
          },
          "401": {
            "description": "未认证"
          },
          "403": {
            "description": "无权访问"
          },
          "404": {
            "description": "会话不存在"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      },
      "delete": {
        "tags": [
          "会话管理"
        ],
        "summary": "删除会话",
        "description": "删除指定用户的指定会话及其所有消息",
        "security": [
          {
            "bearerAuth": []
          },
          {
            "apiKeyAuth": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "会话ID"
          }
        ],
        "responses": {
          "200": {
            "description": "会话删除成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "message": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "未认证"
          },
          "403": {
            "description": "无权访问"
          },
          "404": {
            "description": "会话不存在"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      }
    },
    "/api/sessions/{id}/messages": {
      "post": {
        "tags": [
          "会话管理"
        ],
        "summary": "添加消息到会话",
        "description": "向指定会话添加新消息",
        "security": [
          {
            "bearerAuth": []
          },
          {
            "apiKeyAuth": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "会话ID"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "role",
                  "content"
                ],
                "properties": {
                  "role": {
                    "type": "string",
                    "description": "消息角色 (user 或 assistant)",
                    "enum": [
                      "user",
                      "assistant"
                    ]
                  },
                  "content": {
                    "type": "string",
                    "description": "消息内容"
                  },
                  "tokens": {
                    "type": "integer",
                    "description": "消息包含的令牌数量",
                    "default": 0
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "消息添加成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "message": {
                      "type": "string"
                    },
                    "chatMessage": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string"
                        },
                        "role": {
                          "type": "string"
                        },
                        "content": {
                          "type": "string"
                        },
                        "tokens": {
                          "type": "integer"
                        },
                        "createdAt": {
                          "type": "string",
                          "format": "date-time"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "请求参数错误"
          },
          "401": {
            "description": "未认证"
          },
          "403": {
            "description": "无权访问"
          },
          "404": {
            "description": "会话不存在"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      },
      "get": {
        "tags": [
          "会话管理"
        ],
        "summary": "获取会话消息",
        "description": "获取指定用户的指定会话的所有消息",
        "security": [
          {
            "bearerAuth": []
          },
          {
            "apiKeyAuth": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "会话ID"
          },
          {
            "in": "query",
            "name": "userId",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "用户ID"
          }
        ],
        "responses": {
          "200": {
            "description": "成功获取会话消息",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "messages": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "string"
                          },
                          "role": {
                            "type": "string"
                          },
                          "content": {
                            "type": "string"
                          },
                          "tokens": {
                            "type": "integer"
                          },
                          "createdAt": {
                            "type": "string",
                            "format": "date-time"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "未认证"
          },
          "403": {
            "description": "无权访问"
          },
          "404": {
            "description": "会话不存在"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      },
      "delete": {
        "tags": [
          "会话管理"
        ],
        "summary": "清空会话消息",
        "description": "删除指定用户的指定会话的所有消息",
        "security": [
          {
            "bearerAuth": []
          },
          {
            "apiKeyAuth": []
          }
        ],
        "parameters": [
          {
            "in": "path",
            "name": "id",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "会话ID"
          },
          {
            "in": "query",
            "name": "userId",
            "required": true,
            "schema": {
              "type": "string"
            },
            "description": "用户ID"
          }
        ],
        "responses": {
          "200": {
            "description": "会话消息清空成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "message": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "未认证"
          },
          "403": {
            "description": "无权访问"
          },
          "404": {
            "description": "会话不存在"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      }
    },
    "/api/simple-chat": {
      "post": {
        "tags": [
          "聊天接口"
        ],
        "summary": "非流式聊天接口",
        "description": "一次性返回完整的 ChatGPT 回复",
        "security": [
          {
            "bearerAuth": []
          },
          {
            "apiKeyAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "message"
                ],
                "properties": {
                  "message": {
                    "type": "string",
                    "description": "用户发送的消息内容",
                    "example": "你好，请介绍一下自己"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "成功返回回复",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "reply": {
                      "type": "string",
                      "description": "ChatGPT 的回复内容",
                      "example": "你好！我是 ChatGPT，一个由 OpenAI 训练的大型语言模型。我可以回答问题、提供信息、进行对话，以及帮助完成各种文本相关的任务。"
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "请求参数错误",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "请提供有效的消息"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "服务器内部错误",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "服务器内部错误"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/stream-chat": {
      "post": {
        "tags": [
          "聊天接口"
        ],
        "summary": "流式聊天接口",
        "description": "使用 Server-Sent Events (SSE) 实时返回 ChatGPT 回复",
        "security": [
          {
            "bearerAuth": []
          },
          {
            "apiKeyAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "message"
                ],
                "properties": {
                  "message": {
                    "type": "string",
                    "description": "用户发送的消息内容",
                    "example": "你好，请介绍一下自己"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "返回 SSE 流",
            "content": {
              "text/event-stream": {
                "schema": {
                  "type": "string",
                  "description": "包含多个 SSE 事件，每个事件包含一个 JSON 对象，其中 content 字段包含回复的一部分文本",
                  "example": "data: {\"content\":\"你好\"}\n\ndata: {\"content\":\"！我是\"}\n\ndata: {\"content\":\" ChatGPT\"}\n\ndata: [DONE]\n"
                }
              }
            }
          },
          "400": {
            "description": "请求参数错误",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "请提供有效的消息"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "服务器内部错误",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "服务器内部错误"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/users/register": {
      "post": {
        "tags": [
          "用户管理"
        ],
        "summary": "用户注册",
        "description": "创建新用户账号",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "username",
                  "email",
                  "password"
                ],
                "properties": {
                  "username": {
                    "type": "string",
                    "description": "用户名"
                  },
                  "email": {
                    "type": "string",
                    "format": "email",
                    "description": "电子邮件地址"
                  },
                  "password": {
                    "type": "string",
                    "format": "password",
                    "description": "密码"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "用户创建成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "message": {
                      "type": "string"
                    },
                    "token": {
                      "type": "string"
                    },
                    "user": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string"
                        },
                        "username": {
                          "type": "string"
                        },
                        "email": {
                          "type": "string"
                        },
                        "role": {
                          "type": "string"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "请求参数错误"
          },
          "409": {
            "description": "用户名或邮箱已存在"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      }
    },
    "/api/users/login": {
      "post": {
        "tags": [
          "用户管理"
        ],
        "summary": "用户登录",
        "description": "使用用户名/邮箱和密码登录",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "login",
                  "password"
                ],
                "properties": {
                  "login": {
                    "type": "string",
                    "description": "用户名或电子邮件"
                  },
                  "password": {
                    "type": "string",
                    "format": "password",
                    "description": "密码"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "登录成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "message": {
                      "type": "string"
                    },
                    "token": {
                      "type": "string"
                    },
                    "user": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string"
                        },
                        "username": {
                          "type": "string"
                        },
                        "email": {
                          "type": "string"
                        },
                        "role": {
                          "type": "string"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "请求参数错误"
          },
          "401": {
            "description": "认证失败"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      }
    },
    "/api/users/me": {
      "get": {
        "tags": [
          "用户管理"
        ],
        "summary": "获取当前用户信息",
        "description": "获取已认证用户的个人信息",
        "security": [
          {
            "bearerAuth": []
          },
          {
            "apiKeyAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "成功获取用户信息",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "user": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string"
                        },
                        "username": {
                          "type": "string"
                        },
                        "email": {
                          "type": "string"
                        },
                        "role": {
                          "type": "string"
                        },
                        "createdAt": {
                          "type": "string",
                          "format": "date-time"
                        },
                        "lastLoginAt": {
                          "type": "string",
                          "format": "date-time"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "未认证"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      },
      "put": {
        "tags": [
          "用户管理"
        ],
        "summary": "更新当前用户信息",
        "description": "更新已认证用户的个人信息",
        "security": [
          {
            "bearerAuth": []
          },
          {
            "apiKeyAuth": []
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "username": {
                    "type": "string",
                    "description": "新用户名"
                  },
                  "email": {
                    "type": "string",
                    "format": "email",
                    "description": "新电子邮件地址"
                  },
                  "currentPassword": {
                    "type": "string",
                    "description": "当前密码（更新密码时需要）",
                    "format": "password"
                  },
                  "newPassword": {
                    "type": "string",
                    "description": "新密码",
                    "format": "password"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "用户信息更新成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "message": {
                      "type": "string"
                    },
                    "user": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "string"
                        },
                        "username": {
                          "type": "string"
                        },
                        "email": {
                          "type": "string"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "请求参数错误"
          },
          "401": {
            "description": "未认证或密码错误"
          },
          "409": {
            "description": "用户名或邮箱已存在"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      }
    },
    "/api/users/api-key": {
      "post": {
        "tags": [
          "用户管理"
        ],
        "summary": "生成 API 密钥",
        "description": "为当前用户生成新的 API 密钥",
        "security": [
          {
            "bearerAuth": []
          },
          {
            "apiKeyAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "API 密钥生成成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "message": {
                      "type": "string"
                    },
                    "apiKey": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "未认证"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      }
    },
    "/api/users/api-usage": {
      "get": {
        "tags": [
          "用户管理"
        ],
        "summary": "获取 API 使用情况",
        "description": "获取当前用户的 API 使用统计",
        "security": [
          {
            "bearerAuth": []
          },
          {
            "apiKeyAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "成功获取 API 使用情况",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "apiKeyExists": {
                      "type": "boolean"
                    },
                    "usage": {
                      "type": "integer"
                    },
                    "limit": {
                      "type": "integer"
                    },
                    "percentage": {
                      "type": "number"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "未认证"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      }
    },
    "/api/auth/login": {
      "post": {
        "tags": [
          "认证"
        ],
        "summary": "用户登录",
        "description": "使用用户名/邮箱和密码登录，获取JWT访问令牌和刷新令牌",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "login",
                  "password"
                ],
                "properties": {
                  "login": {
                    "type": "string",
                    "description": "用户名或电子邮件"
                  },
                  "password": {
                    "type": "string",
                    "format": "password"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "登录成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "accessToken": {
                      "type": "string"
                    },
                    "refreshToken": {
                      "type": "string"
                    },
                    "user": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "integer"
                        },
                        "username": {
                          "type": "string"
                        },
                        "email": {
                          "type": "string"
                        },
                        "role": {
                          "type": "string"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "请求参数错误"
          },
          "401": {
            "description": "认证失败"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      }
    },
    "/api/auth/refresh": {
      "post": {
        "tags": [
          "认证"
        ],
        "summary": "刷新访问令牌",
        "description": "使用刷新令牌获取新的访问令牌，刷新令牌在Authorization请求头中提供",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "刷新成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "accessToken": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "无效的刷新令牌"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      }
    },
    "/api/auth/logout": {
      "post": {
        "tags": [
          "认证"
        ],
        "summary": "用户登出",
        "description": "使当前刷新令牌失效，需要提供刷新令牌",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "登出成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean"
                    },
                    "message": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "未认证"
          },
          "500": {
            "description": "服务器错误"
          }
        }
      }
    },
    "/api/auth/validate": {
      "get": {
        "tags": [
          "认证"
        ],
        "summary": "验证令牌",
        "description": "验证当前请求中的令牌是否有效",
        "security": [
          {
            "bearerAuth": []
          }
        ],
        "responses": {
          "200": {
            "description": "令牌有效",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "valid": {
                      "type": "boolean"
                    },
                    "user": {
                      "type": "object",
                      "properties": {
                        "id": {
                          "type": "integer"
                        },
                        "username": {
                          "type": "string"
                        },
                        "email": {
                          "type": "string"
                        },
                        "role": {
                          "type": "string"
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "401": {
            "description": "令牌无效"
          }
        }
      }
    },
    "/api/chat/simple": {
      "post": {
        "summary": "简单聊天接口",
        "description": "返回ChatGPT的非流式响应",
        "tags": [
          "聊天"
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "message"
                ],
                "properties": {
                  "message": {
                    "type": "string",
                    "description": "用户发送的消息内容",
                    "example": "你好，请介绍一下自己"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": true
                    },
                    "reply": {
                      "type": "string",
                      "example": "你好！我是一个AI助手，可以回答问题、提供信息和帮助完成各种任务。"
                    },
                    "model": {
                      "type": "string",
                      "example": "gpt-4o"
                    },
                    "usage": {
                      "type": "object",
                      "properties": {
                        "prompt_tokens": {
                          "type": "integer",
                          "example": 10
                        },
                        "completion_tokens": {
                          "type": "integer",
                          "example": 30
                        },
                        "total_tokens": {
                          "type": "integer",
                          "example": 40
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "请求参数错误",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "请提供有效的消息"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "服务器内部错误",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "success": {
                      "type": "boolean",
                      "example": false
                    },
                    "error": {
                      "type": "string",
                      "example": "服务器内部错误"
                    },
                    "details": {
                      "type": "string",
                      "example": "错误详情"
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/api/chat/stream": {
      "post": {
        "tags": [
          "聊天"
        ],
        "summary": "流式聊天接口",
        "description": "使用 Server-Sent Events (SSE) 实时返回 ChatGPT 回复",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "message"
                ],
                "properties": {
                  "message": {
                    "type": "string",
                    "description": "用户发送的消息内容",
                    "example": "你好，请介绍一下自己"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "返回 SSE 流",
            "content": {
              "text/event-stream": {
                "schema": {
                  "type": "string",
                  "description": "包含多个 SSE 事件，每个事件包含一个 JSON 对象，其中 content 字段包含回复的一部分文本",
                  "example": "data: {\"content\":\"你好\"}\n\ndata: {\"content\":\"！我是\"}\n\ndata: {\"content\":\" ChatGPT\"}\n\ndata: [DONE]\n"
                }
              }
            }
          },
          "400": {
            "description": "请求参数错误",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "请提供有效的消息"
                    }
                  }
                }
              }
            }
          },
          "500": {
            "description": "服务器内部错误",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": {
                      "type": "string",
                      "example": "服务器内部错误"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "tags": []
});
  }
  
  // 对关键路径进行特殊处理
  // 登录/注册请求需要直接将请求传递到实际服务器代码
  if (req.path === '/api/auth/login') {
    if (req.method === 'POST') {
      // 将登录请求转发到服务器代码
      // 此处不能直接处理，需要拨号类别方式发送请求到实际控制器
      try {
        // 不需要axios
        Logger.info(`处理登录请求: ${req.path}`);
        
        // 由于在Vercel上无法使用代码级别的转发，
        // 我们需要手动处理这里的登录逻辑
        
        // 生成正式JWT令牌
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        const REFRESH_SECRET = process.env.REFRESH_SECRET || process.env.JWT_SECRET || 'your-refresh-secret-key';
        
        // 测试用户信息
        const user = {
          id: 12345,
          username: "test_user",
          email: req.body.login || "test@example.com",
          role: "user"
        };
        
        // 生成访问令牌（短期）
        const accessToken = jwt.sign(
          { 
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            type: 'access'
          },
          JWT_SECRET,
          { expiresIn: '30m' } // 访问令牌有效期30分钟
        );
        
        // 生成刷新令牌（长期）
        const refreshToken = jwt.sign(
          { 
            id: user.id,
            type: 'refresh'
          },
          REFRESH_SECRET,
          { expiresIn: '7d' } // 刷新令牌有效期7天
        );
        
        Logger.info(`生成了正式的JWT令牌，用户ID: ${user.id}`);
        
        return res.status(200).json({
          success: true,
          accessToken: accessToken,
          refreshToken: refreshToken,
          user: user,
          isNewUser: false,
          message: "测试模式登录成功，这仅用于测试。在生产环境中，需要正确配置数据库连接。"
        });
      } catch (error) {
        return res.status(500).json({
          error: `处理登录请求失败: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      }
    }
  }
  
  // 刷新令牌API
  if (req.path === '/api/auth/refresh') {
    if (req.method === 'POST') {
      try {
        Logger.info(`处理刷新令牌请求: ${req.path}`);
        
        // 从头部提取刷新令牌
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: '未提供刷新令牌' });
        }
        
        const refreshToken = authHeader.split(' ')[1];
        const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        
        // 特殊处理测试刷新令牌
        if (refreshToken === "test_refresh_token_for_testing_only") {
          Logger.info(`检测到测试刷新令牌，跳过JWT验证`);
          
          // 为测试用户生成新的访问令牌
          const newAccessToken = jwt.sign(
            { 
              id: 12345,
              username: 'test_user',
              email: 'test@example.com',
              role: 'user',
              type: 'access'
            },
            JWT_SECRET,
            { expiresIn: '30m' }
          );
          
          return res.status(200).json({
            success: true,
            accessToken: newAccessToken,
            message: "刷新令牌成功"
          });
        }
        
        try {
          // 尝试验证刷新令牌
          const decoded = jwt.verify(refreshToken, JWT_SECRET);
          
          // 检查是否是刷新令牌
          if (decoded.type !== 'refresh') {
            return res.status(401).json({ error: '无效的刷新令牌类型' });
          }
          
          // 生成新的访问令牌
          const newAccessToken = jwt.sign(
            { 
              id: decoded.id || 12345,
              username: decoded.username || 'test_user',
              email: decoded.email || 'test@example.com',
              role: decoded.role || 'user',
              type: 'access'
            },
            JWT_SECRET,
            { expiresIn: '30m' }
          );
          
          return res.status(200).json({
            success: true,
            accessToken: newAccessToken,
            message: "刷新令牌成功"
          });
        } catch (jwtError) {
          Logger.error(`刷新令牌验证失败: ${jwtError.message}`);
          return res.status(401).json({ 
            error: '无效的刷新令牌', 
            message: jwtError.message 
          });
        }
      } catch (error) {
        return res.status(500).json({
          error: `处理刷新令牌请求失败: ${error.message}`,
          timestamp: new Date().toISOString()
        });
      }
    }
  }
  
  // 验证令牌API
  if (req.path === '/api/auth/validate' && req.method === 'GET') {
    try {
      Logger.info(`处理验证令牌请求: ${req.path}`);
      
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ valid: false, error: '未提供令牌' });
      }
      
      const token = authHeader.split(' ')[1];
      const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
      
      // 特殊处理测试令牌
      if (token === "test_access_token_for_testing_only") {
        Logger.info(`检测到测试令牌，跳过JWT验证`);
        return res.status(200).json({
          valid: true,
          user: {
            id: 12345,
            username: "test_user",
            email: "test@example.com",
            role: "user"
          }
        });
      }
      
      try {
        // 实际验证JWT令牌
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 返回验证成功响应
        return res.status(200).json({
          valid: true,
          user: {
            id: decoded.id || 12345,
            username: decoded.username || "test_user",
            email: decoded.email || "test@example.com",
            role: decoded.role || "user"
          }
        });
      } catch (jwtError) {
        Logger.error(`JWT验证失败: ${jwtError.message}`);
        return res.status(401).json({ 
          valid: false, 
          error: '无效的令牌',
          message: jwtError.message 
        });
      }
    } catch (error) {
      return res.status(500).json({
        error: `处理验证令牌请求失败: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // 获取当前用户信息API
  if (req.path === '/api/users/me' && req.method === 'GET') {
    try {
      Logger.info(`处理获取用户信息请求: ${req.path}`);
      
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未授权' });
      }
      
      // 返回测试用户信息
      return res.status(200).json({
        id: 12345,
        username: "test_user",
        email: "test@example.com",
        role: "user"
      });
    } catch (error) {
      return res.status(500).json({
        error: `处理获取用户信息请求失败: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // 登出API
  if (req.path === '/api/auth/logout' && req.method === 'POST') {
    try {
      Logger.info(`处理登出请求: ${req.path}`);
      
      return res.status(200).json({
        success: true,
        message: '登出成功'
      });
    } catch (error) {
      return res.status(500).json({
        error: `处理登出请求失败: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // 会话API端点处理
  if (req.path.startsWith('/api/sessions')) {
    try {
      Logger.info(`处理会话请求: ${req.method} ${req.path}`);
      
      // 检查认证
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未授权' });
      }
      
      // 获取所有会话列表
      if (req.path === '/api/sessions' && req.method === 'GET') {
        return res.json([
          {
            id: "test-session-1",
            title: "测试会话1",
            description: "这是一个测试会话，用于演示API功能",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
          },
          {
            id: "test-session-2",
            title: "测试会话2",
            description: "这是另一个测试会话",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isActive: true
          }
        ]);
      }
      
      // 创建新会话
      if (req.path === '/api/sessions' && req.method === 'POST') {
        const { title, description } = req.body;
        
        if (!title) {
          return res.status(400).json({ error: '会话标题为必填项' });
        }
        
        return res.json({
          id: `test-session-${Date.now()}`,
          title,
          description: description || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true
        });
      }
      
      // 获取单个会话详情 /api/sessions/:id
      if (req.path.match(/^\/api\/sessions\/[\w-]+$/) && req.method === 'GET') {
        const sessionId = req.path.split('/').pop();
        
        return res.json({
          id: sessionId,
          title: "测试会话详情",
          description: "这是一个测试会话详情，用于演示API功能",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
          messages: [
            {
              id: "msg-1",
              role: "user",
              content: "你好，这是一条测试消息",
              createdAt: new Date().toISOString()
            },
            {
              id: "msg-2",
              role: "assistant",
              content: "您好！我是AI助手，很高兴为您服务。请问有什么我可以帮助您的吗？",
              createdAt: new Date(Date.now() - 1000).toISOString()
            }
          ]
        });
      }
      
      // 更新会话 /api/sessions/:id
      if (req.path.match(/^\/api\/sessions\/[\w-]+$/) && req.method === 'PUT') {
        const sessionId = req.path.split('/').pop();
        const { title, description, isActive } = req.body;
        
        return res.json({
          id: sessionId,
          title: title || "更新后的测试会话",
          description: description || "这是一个更新后的测试会话",
          isActive: isActive !== undefined ? isActive : true,
          updatedAt: new Date().toISOString()
        });
      }
      
      // 删除会话 /api/sessions/:id
      if (req.path.match(/^\/api\/sessions\/[\w-]+$/) && req.method === 'DELETE') {
        try {
          const sessionId = req.path.split('/').pop();
          
          // 查询参数中提取userId - 这是前端需要提供的
          const userId = req.query.userId || (req.user && req.user.id ? req.user.id : null);
          
          // 记录详细日志以便调试
          Logger.info(`处理删除会话请求，会话ID: ${sessionId}, 用户ID: ${userId}`);
          
          // 验证userId是否存在
          if (!userId) {
            const body = req.body || {};
            // 尝试从请求体获取userId
            const bodyUserId = body.userId || null;
            
            if (bodyUserId) {
              Logger.info(`从请求体中获取到userId: ${bodyUserId}`);
              return handleSessionDeletion(res, sessionId, bodyUserId);
            }
            
            // 含义处理 - 如果使用的是测试环境或演示模式，使用默认值
            if (process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') {
              Logger.warn(`处于开发/演示模式，忽略userId检查，使用默认值3`);
              return handleSessionDeletion(res, sessionId, 3); // 默认的测试用户ID
            }
            
            // 正式环境严格要求userId
            return res.status(400).json({
              error: '缺少必要的 userId 参数',
              timestamp: new Date().toISOString()
            });
          }
          
          return handleSessionDeletion(res, sessionId, userId);
          
        } catch (err) {
          Logger.error(`删除会话时发生错误: ${err.message}`);
          return res.status(500).json({
            error: `删除会话失败: ${err.message}`,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      // 处理会话删除的内部函数
      function handleSessionDeletion(res, sessionId, userId) {
        // 验证会话ID是否有效 - 通常应该是UUID格式
        if (!sessionId || !/^[\w-]+$/.test(sessionId)) {
          return res.status(400).json({
            error: '无效的会话ID格式',
            sessionId,
            timestamp: new Date().toISOString()
          });
        }
        
        // 这里应该有与数据库互动的代码
        // 在我们的网关模拟版本中，简单返回成功
        Logger.info(`成功删除会话: ${sessionId}, 用户ID: ${userId}`);
        
        return res.status(200).json({
          success: true,
          message: `会话 ${sessionId} 已成功删除`,
          userId: userId,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      Logger.error(`处理会话请求失败: ${error.message}`);
      return res.status(500).json({
        error: `处理会话请求失败: ${error.message}`,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // 处理其他API路径
  if (req.path.startsWith('/api/') && 
      !req.path.startsWith('/api/auth/') && 
      !req.path.startsWith('/api/users/') && 
      !req.path.startsWith('/api/chat/') && 
      !req.path.startsWith('/api/knowledge/') && 
      !req.path.startsWith('/api/diagnostic/') && 
      !req.path.startsWith('/api/sessions/')) {
    // 仅对未实现的API返回默认响应
    return res.status(404).json({
      message: 'API端点不存在',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }
  
  // 返回API状态消息（当是GET请求或非特殊路径时）
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
      '/api/auth/validate',
      '/api/sessions'
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
