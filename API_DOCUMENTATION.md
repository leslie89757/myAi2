# MyAI 后端 API 文档

本文档详细描述了 MyAI 后端所有 API 的调用逻辑、参数和响应格式，按照功能模块和使用流程进行结构化组织。

## 目录

- [1. 系统基础 API](#1-系统基础-api)
- [2. 用户认证流程](#2-用户认证流程)
- [3. 会话管理](#3-会话管理)
- [4. 知识库管理](#4-知识库管理)
- [5. 诊断 API](#5-诊断-api)

## 1. 系统基础 API

### 1.1 健康检查

- **端点**: `GET /health`
- **描述**: 检查服务器是否正常运行
- **认证**: 不需要
- **请求参数**: 无
- **响应**: 
  ```json
  {
    "status": "ok"
  }
  ```
- **状态码**:
  - `200 OK`: 服务器正常运行

## 2. 用户认证流程

### 2.1 用户注册/登录

- **端点**: `POST /api/auth/login`
- **描述**: 用户登录或自动注册（如果用户不存在）
- **认证**: 不需要
- **请求体**: 
  ```json
  {
    "login": "email@example.com", 
    "password": "password"
  }
  ```
- **响应**: 
  ```json
  {
    "success": true,
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "user": {
      "id": 1,
      "username": "user",
      "email": "email@example.com",
      "role": "user"
    },
    "isNewUser": true,
    "processTime": "123ms",
    "timestamp": "2025-04-28T12:00:00.000Z"
  }
  ```
- **状态码**:
  - `200 OK`: 登录或注册成功
  - `401 Unauthorized`: 登录失败，凭据无效

### 2.2 验证令牌

- **端点**: `GET /api/auth/validate`
- **描述**: 验证访问令牌是否有效
- **认证**: Bearer Token
- **请求参数**: 无
- **响应**: 
  ```json
  {
    "valid": true,
    "user": {
      "id": 1,
      "username": "user",
      "email": "email@example.com",
      "role": "user"
    }
  }
  ```
- **状态码**:
  - `200 OK`: 令牌有效
  - `401 Unauthorized`: 令牌无效或已过期

### 2.3 刷新令牌

- **端点**: `POST /api/auth/refresh`
- **描述**: 使用刷新令牌获取新的访问令牌
- **认证**: Bearer Token (刷新令牌)
- **请求体**: 无
- **响应**: 
  ```json
  {
    "success": true,
    "accessToken": "new_jwt_token"
  }
  ```
- **状态码**:
  - `200 OK`: 刷新成功
  - `401 Unauthorized`: 刷新令牌无效或已过期

### 2.4 用户登出

- **端点**: `POST /api/auth/logout`
- **描述**: 使当前用户的令牌失效
- **认证**: Bearer Token
- **请求体**: 无
- **响应**: 
  ```json
  {
    "success": true,
    "message": "登出成功"
  }
  ```
- **状态码**:
  - `200 OK`: 登出成功
  - `401 Unauthorized`: 令牌无效或已过期

### 2.5 获取当前用户信息

- **端点**: `GET /api/auth/me`
- **描述**: 获取当前登录用户的详细信息
- **认证**: Bearer Token
- **请求参数**: 无
- **响应**: 
  ```json
  {
    "user": {
      "id": 1,
      "username": "user",
      "email": "email@example.com",
      "role": "user",
      "createdAt": "2025-04-28T12:00:00.000Z",
      "updatedAt": "2025-04-28T12:00:00.000Z"
    }
  }
  ```
- **状态码**:
  - `200 OK`: 获取成功
  - `401 Unauthorized`: 令牌无效或已过期
- **注意**: 此端点可能尚未实现

## 3. 会话管理

### 3.1 获取会话列表

- **端点**: `GET /api/sessions`
- **描述**: 获取当前用户的所有会话
- **认证**: Bearer Token
- **请求参数**: 无
- **响应**: 
  ```json
  [
    {
      "id": "session-uuid",
      "title": "会话标题",
      "description": "会话描述",
      "userId": 1,
      "adminId": null,
      "isActive": true,
      "createdAt": "2025-04-28T12:00:00.000Z",
      "updatedAt": "2025-04-28T12:00:00.000Z"
    }
  ]
  ```
- **状态码**:
  - `200 OK`: 获取成功
  - `401 Unauthorized`: 令牌无效或已过期

### 3.2 创建新会话

- **端点**: `POST /api/sessions`
- **描述**: 创建一个新的会话
- **认证**: Bearer Token
- **请求体**: 
  ```json
  {
    "title": "会话标题",
    "description": "会话描述（可选）"
  }
  ```
- **响应**: 
  ```json
  {
    "id": "session-uuid",
    "title": "会话标题",
    "description": "会话描述",
    "userId": 1,
    "adminId": null,
    "isActive": true,
    "createdAt": "2025-04-28T12:00:00.000Z",
    "updatedAt": "2025-04-28T12:00:00.000Z"
  }
  ```
- **状态码**:
  - `200 OK`: 创建成功
  - `401 Unauthorized`: 令牌无效或已过期
  - `400 Bad Request`: 请求参数无效

### 3.3 获取单个会话

- **端点**: `GET /api/sessions/{id}`
- **描述**: 获取指定会话的详细信息
- **认证**: Bearer Token
- **路径参数**:
  - `id`: 会话ID
- **响应**: 
  ```json
  {
    "id": "session-uuid",
    "title": "会话标题",
    "description": "会话描述",
    "userId": 1,
    "adminId": null,
    "isActive": true,
    "createdAt": "2025-04-28T12:00:00.000Z",
    "updatedAt": "2025-04-28T12:00:00.000Z",
    "messages": [
      {
        "id": "message-uuid",
        "sessionId": "session-uuid",
        "role": "user",
        "content": "消息内容",
        "tokens": 10,
        "createdAt": "2025-04-28T12:00:00.000Z",
        "updatedAt": "2025-04-28T12:00:00.000Z"
      }
    ]
  }
  ```
- **状态码**:
  - `200 OK`: 获取成功
  - `401 Unauthorized`: 令牌无效或已过期
  - `404 Not Found`: 会话不存在

### 3.4 更新会话

- **端点**: `PUT /api/sessions/{id}`
- **描述**: 更新指定会话的信息
- **认证**: Bearer Token
- **路径参数**:
  - `id`: 会话ID
- **请求体**: 
  ```json
  {
    "title": "新会话标题",
    "description": "新会话描述（可选）",
    "isActive": true
  }
  ```
- **响应**: 
  ```json
  {
    "id": "session-uuid",
    "title": "新会话标题",
    "description": "新会话描述",
    "userId": 1,
    "adminId": null,
    "isActive": true,
    "createdAt": "2025-04-28T12:00:00.000Z",
    "updatedAt": "2025-04-28T12:00:00.000Z"
  }
  ```
- **状态码**:
  - `200 OK`: 更新成功
  - `401 Unauthorized`: 令牌无效或已过期
  - `404 Not Found`: 会话不存在
  - `400 Bad Request`: 请求参数无效

### 3.5 删除会话

- **端点**: `DELETE /api/sessions/{id}`
- **描述**: 删除指定会话
- **认证**: Bearer Token
- **路径参数**:
  - `id`: 会话ID
- **响应**: 
  ```json
  {
    "success": true,
    "message": "会话已成功删除"
  }
  ```
- **状态码**:
  - `200 OK`: 删除成功
  - `401 Unauthorized`: 令牌无效或已过期
  - `404 Not Found`: 会话不存在

### 3.6 添加会话消息

- **端点**: `POST /api/sessions/{id}/messages`
- **描述**: 向指定会话添加新消息
- **认证**: Bearer Token
- **路径参数**:
  - `id`: 会话ID
- **请求体**: 
  ```json
  {
    "role": "user",
    "content": "消息内容"
  }
  ```
- **响应**: 
  ```json
  {
    "success": true,
    "message": "消息添加成功",
    "chatMessage": {
      "id": "message-uuid",
      "sessionId": "session-uuid",
      "role": "user",
      "content": "消息内容",
      "tokens": 0,
      "createdAt": "2025-04-28T12:00:00.000Z",
      "updatedAt": "2025-04-28T12:00:00.000Z"
    }
  }
  ```
- **状态码**:
  - `201 Created`: 添加成功
  - `401 Unauthorized`: 令牌无效或已过期
  - `404 Not Found`: 会话不存在
  - `400 Bad Request`: 请求参数无效

### 3.7 清空会话消息

- **端点**: `DELETE /api/sessions/{id}/messages`
- **描述**: 清空指定会话的所有消息
- **认证**: Bearer Token
- **路径参数**:
  - `id`: 会话ID
- **响应**: 
  ```json
  {
    "success": true,
    "message": "已清空会话消息，共删除 N 条消息",
    "deletedCount": 5
  }
  ```
- **状态码**:
  - `200 OK`: 清空成功
  - `401 Unauthorized`: 令牌无效或已过期
  - `404 Not Found`: 会话不存在

## 4. 知识库管理

### 4.1 上传知识库文件

- **端点**: `POST /api/knowledge/upload`
- **描述**: 上传文件到知识库
- **认证**: Bearer Token
- **请求体**: `multipart/form-data`
  - `file`: 文件数据
  - `userId`: 用户ID
  - `description`: 文件描述
- **响应**: 
  ```json
  {
    "success": true,
    "message": "文档已成功上传并添加到知识库"
  }
  ```
- **状态码**:
  - `200 OK`: 上传成功
  - `401 Unauthorized`: 令牌无效或已过期
  - `400 Bad Request`: 请求参数无效或文件格式不支持

### 4.2 查询知识库

- **端点**: `POST /api/knowledge/query`
- **描述**: 根据查询内容搜索知识库
- **认证**: Bearer Token
- **请求体**: 
  ```json
  {
    "query": "查询内容",
    "userId": 1
  }
  ```
- **响应**: 
  ```json
  {
    "results": [
      {
        "pageContent": "匹配的内容片段",
        "metadata": {
          "source": "文档来源",
          "page": 1
        },
        "score": 0.95
      }
    ]
  }
  ```
- **状态码**:
  - `200 OK`: 查询成功
  - `401 Unauthorized`: 令牌无效或已过期
  - `400 Bad Request`: 请求参数无效

### 4.3 知识库聊天

- **端点**: `POST /api/knowledge/chat`
- **描述**: 与知识库进行对话
- **认证**: Bearer Token
- **请求体**: 
  ```json
  {
    "message": "用户消息",
    "userId": 1
  }
  ```
- **响应**: 
  ```json
  {
    "reply": "AI回复内容",
    "sources": [
      {
        "pageContent": "引用的内容片段",
        "metadata": {
          "source": "文档来源",
          "page": 1
        }
      }
    ]
  }
  ```
- **状态码**:
  - `200 OK`: 聊天成功
  - `401 Unauthorized`: 令牌无效或已过期
  - `400 Bad Request`: 请求参数无效

### 4.4 知识库流式聊天

- **端点**: `POST /api/knowledge/stream-chat`
- **描述**: 与知识库进行流式对话，使用Server-Sent Events (SSE)
- **认证**: Bearer Token
- **请求体**: 
  ```json
  {
    "message": "用户消息",
    "userId": 1
  }
  ```
- **响应**: Server-Sent Events 流
  - 事件: `message`
  - 数据格式:
    ```json
    {
      "type": "content",
      "content": "AI回复的一部分"
    }
    ```
    或
    ```json
    {
      "type": "sources",
      "sources": [
        {
          "pageContent": "引用的内容片段",
          "metadata": {
            "source": "文档来源",
            "page": 1
          }
        }
      ]
    }
    ```
    或
    ```json
    {
      "type": "end"
    }
    ```
- **状态码**:
  - `200 OK`: 流式聊天成功
  - `401 Unauthorized`: 令牌无效或已过期
  - `400 Bad Request`: 请求参数无效

### 4.5 删除知识库

- **端点**: `DELETE /api/knowledge/delete`
- **描述**: 删除用户的知识库
- **认证**: Bearer Token
- **请求体**: 
  ```json
  {
    "userId": 1
  }
  ```
- **响应**: 
  ```json
  {
    "success": true,
    "message": "知识库已成功删除"
  }
  ```
- **状态码**:
  - `200 OK`: 删除成功
  - `401 Unauthorized`: 令牌无效或已过期
  - `404 Not Found`: 知识库不存在

## 5. 诊断 API

### 5.1 系统信息

- **端点**: `GET /api/diagnostic/system`
- **描述**: 获取系统诊断信息
- **认证**: Bearer Token
- **请求参数**: 无
- **响应**: 
  ```json
  {
    "version": "1.0.0",
    "uptime": "10d 5h 30m",
    "memory": {
      "total": "16GB",
      "used": "8GB",
      "free": "8GB"
    },
    "cpu": {
      "cores": 8,
      "load": "25%"
    }
  }
  ```
- **状态码**:
  - `200 OK`: 获取成功
  - `401 Unauthorized`: 令牌无效或已过期
- **注意**: 此端点可能尚未实现

## API 调用流程示例

### 用户认证流程

1. 用户登录/注册：`POST /api/auth/login`
2. 验证令牌：`GET /api/auth/validate`
3. 使用服务期间定期刷新令牌：`POST /api/auth/refresh`
4. 用户登出：`POST /api/auth/logout`

### 会话管理流程

1. 获取会话列表：`GET /api/sessions`
2. 创建新会话：`POST /api/sessions`
3. 向会话添加消息：`POST /api/sessions/{id}/messages`
4. 获取单个会话详情：`GET /api/sessions/{id}`
5. 清空会话消息：`DELETE /api/sessions/{id}/messages`
6. 更新会话信息：`PUT /api/sessions/{id}`
7. 删除会话：`DELETE /api/sessions/{id}`

### 知识库使用流程

1. 上传知识库文件：`POST /api/knowledge/upload`
2. 查询知识库：`POST /api/knowledge/query`
3. 与知识库聊天：`POST /api/knowledge/chat` 或 `POST /api/knowledge/stream-chat`
4. 删除知识库：`DELETE /api/knowledge/delete`

## 错误处理

所有 API 在发生错误时将返回适当的 HTTP 状态码和 JSON 格式的错误信息：

```json
{
  "error": "错误描述信息"
}
```

常见错误状态码：
- `400 Bad Request`: 请求参数无效
- `401 Unauthorized`: 认证失败或令牌无效
- `403 Forbidden`: 权限不足
- `404 Not Found`: 资源不存在
- `500 Internal Server Error`: 服务器内部错误

## 认证说明

大多数 API 需要通过 Bearer Token 认证。在请求头中添加：

```
Authorization: Bearer <access_token>
```

其中 `<access_token>` 是通过登录 API 获取的 JWT 令牌。
