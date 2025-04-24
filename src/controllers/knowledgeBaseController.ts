import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { cleanupFile } from '../middleware/fileUpload';
import { DocumentParser } from '../utils/documentParser';
import { VectorStore } from '../utils/vectorStore';
import logger from '../utils/logger';
import { OpenAI } from 'openai';
import https from 'https';

// 定义向量搜索结果类型
interface SearchResult {
  content: string;
  metadata: Record<string, any>;
  score: number;
}

// 扩展 Request 类型以包含文件
interface FileRequest extends Request {
  file?: Express.Multer.File;
}

// 验证 OpenAI API 密钥
function validateApiKey(): boolean {
  const apiKey = process.env.OPENAI_API_KEY;
  return !!apiKey && apiKey.trim().length > 0 && apiKey !== 'your_openai_api_key_here';
}

// 创建OpenAI客户端
function createOpenAIClient(): OpenAI {
  if (!validateApiKey()) {
    throw new Error('OPENAI_API_KEY 环境变量未设置或无效');
  }
  
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    httpAgent: new https.Agent({
      keepAlive: true,
      timeout: 60000,
      rejectUnauthorized: true
    })
  });
}

// 带有重试逻辑的API调用包装函数
async function withRetry<T>(apiCall: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error: any) {
      lastError = error;
      logger.error(`API调用失败 (尝试 ${attempt}/${maxRetries}): ${error.message}`);
      
      if (attempt < maxRetries) {
        // 指数退避重试
        const delay = Math.pow(2, attempt) * 1000;
        logger.info(`等待 ${delay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * 上传并向量化文档
 * @openapi
 * /api/knowledge/upload:
 *   post:
 *     tags:
 *       - 知识库
 *     summary: 上传并向量化文档
 *     description: 上传PDF、TXT、DOC或DOCX文件，解析内容并添加到用户的知识库中
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: 要上传的文档文件
 *               userId:
 *                 type: string
 *                 description: 用户ID
 *               documentName:
 *                 type: string
 *                 description: 文档名称
 *     responses:
 *       200:
 *         description: 文档上传并向量化成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
export const uploadDocument = async (req: FileRequest, res: Response) => {
  try {
    if (!req.file) {
      logger.error('文件上传失败: 未提供文件');
      return res.status(400).json({ error: '未提供文件' });
    }

    // 从URL查询参数或请求体中获取userId和documentName
    const userId = req.query.userId as string || req.body.userId;
    const documentName = req.body.documentName;
    
    if (!userId) {
      logger.error('文件上传失败: 未提供用户ID');
      return res.status(400).json({ error: '未提供用户ID' });
    }

    const filePath = req.file.path;
    const fileName = documentName || path.basename(req.file.originalname);
    
    logger.info(`处理文件: ${fileName}, 用户ID: ${userId}, 文件路径: ${filePath}`);

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      logger.error(`文件上传失败: 文件不存在于路径 ${filePath}`);
      return res.status(400).json({ error: '文件不存在' });
    }

    // 检查 OpenAI API 密钥是否有效
    if (!validateApiKey()) {
      logger.error('文件上传失败: OPENAI_API_KEY 环境变量未设置或无效');
      return res.status(500).json({ 
        error: 'OpenAI API 密钥未设置或无效，无法处理文档',
        phase: 'api_validation',
        suggestion: '请联系管理员配置有效的 OpenAI API 密钥'
      });
    }

    // 解析文档
    try {
      const text = await DocumentParser.parseDocument(filePath);
      if (!text || text.trim().length === 0) {
        logger.error(`文件解析失败: 文档内容为空 (${filePath})`);
        cleanupFile(filePath);
        return res.status(400).json({ error: '文档内容为空或解析失败' });
      }
      
      logger.info(`文件解析成功: ${fileName}, 内容长度: ${text.length}`);

      // 向量化并存储
      try {
        const vectorStore = new VectorStore(userId);
        await vectorStore.initialize();
        
        await vectorStore.addDocument(text, {
          fileName: fileName,
          fileType: path.extname(filePath).substring(1),
          uploadDate: new Date().toISOString(),
          filePath: filePath
        });
        
        logger.info(`文档向量化成功: ${fileName}, 用户ID: ${userId}`);
        
        return res.status(200).json({
          success: true,
          message: '文档已成功上传并向量化',
          fileName: fileName,
          contentLength: text.length
        });
      } catch (vectorError: any) {
        logger.error(`文档向量化错误: ${vectorError.message}, 文件: ${fileName}, 用户ID: ${userId}`);
        // 不删除文件，因为解析成功了，可能只是向量化失败
        return res.status(500).json({ 
          error: `文档向量化失败: ${vectorError.message}`,
          phase: 'vectorization'
        });
      }
    } catch (parseError: any) {
      logger.error(`文档解析错误: ${parseError.message}, 文件路径: ${filePath}`);
      cleanupFile(filePath);
      return res.status(500).json({ 
        error: `文档解析失败: ${parseError.message}`,
        phase: 'parsing'
      });
    }
  } catch (error: any) {
    logger.error(`文档处理错误: ${error.message}`);
    
    // 确保返回响应，防止请求挂起
    res.status(500).json({ 
      error: `文档处理失败: ${error.message}`,
      phase: 'processing'
    });
    
    // 确保清理临时文件
    if (req.file && req.file.path) {
      cleanupFile(req.file.path);
    }
  }
};

/**
 * 查询知识库
 * @openapi
 * /api/knowledge/query:
 *   post:
 *     tags:
 *       - 知识库
 *     summary: 查询知识库
 *     description: 根据查询文本从用户知识库中检索相关信息
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *               - userId
 *             properties:
 *               query:
 *                 type: string
 *                 description: 查询文本
 *               userId:
 *                 type: string
 *                 description: 用户ID
 *               topK:
 *                 type: integer
 *                 description: 返回的最相关结果数量
 *                 default: 5
 *     responses:
 *       200:
 *         description: 查询成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       content:
 *                         type: string
 *                       metadata:
 *                         type: object
 *                       score:
 *                         type: number
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
export const queryKnowledgeBase = async (req: Request, res: Response) => {
  try {
    const { query, userId, topK = 5 } = req.body;
    
    if (!query || !userId) {
      return res.status(400).json({ error: '查询文本和用户ID为必填项' });
    }

    const vectorStore = new VectorStore(userId);
    await vectorStore.initialize();
    
    const results = await vectorStore.similaritySearch(query, topK);
    
    res.status(200).json({
      results: results
    });
  } catch (error: any) {
    logger.error(`知识库查询错误: ${error.message}`);
    res.status(500).json({ error: `知识库查询失败: ${error.message}` });
  }
};

/**
 * 与知识库聊天
 * @openapi
 * /api/knowledge/chat:
 *   post:
 *     tags:
 *       - 知识库
 *     summary: 与知识库聊天
 *     description: 结合用户知识库进行聊天，返回基于知识库内容的回答
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *               - userId
 *             properties:
 *               message:
 *                 type: string
 *                 description: 用户消息
 *               userId:
 *                 type: string
 *                 description: 用户ID
 *     responses:
 *       200:
 *         description: 聊天成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 answer:
 *                   type: string
 *                 sources:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
export const chatWithKnowledgeBase = async (req: Request, res: Response) => {
  try {
    const { message, userId } = req.body;
    
    if (!message || !userId) {
      return res.status(400).json({ error: '消息和用户ID为必填项' });
    }

    // 从知识库检索相关内容
    const vectorStore = new VectorStore(userId);
    await vectorStore.initialize();
    
    const results = await vectorStore.similaritySearch(message, 5);
    
    // 如果没有找到相关内容，则直接使用普通聊天
    if (results.length === 0) {
      const openai = createOpenAIClient();
      const completion = await withRetry(() => 
        openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: message }]
        })
      );
      
      return res.status(200).json({
        answer: completion.choices[0].message.content,
        sources: []
      });
    }
    
    // 构建包含知识库内容的提示
    const contextText = results.map((r: SearchResult) => r.content).join('\n\n');
    
    const systemPrompt = `你是一个基于用户个人知识库的AI助手。请使用以下知识库内容回答用户的问题。
如果知识库中没有相关信息，请明确告知用户你不知道，而不是编造答案。
回答时，请引用知识库中的相关内容，并保持专业、简洁和有帮助。

知识库内容:
${contextText}`;

    // 调用OpenAI API
    const openai = createOpenAIClient();
    const completion = await withRetry(() => 
      openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ]
      })
    );
    
    res.status(200).json({
      answer: completion.choices[0].message.content,
      sources: results.map((r: SearchResult) => ({
        content: r.content.substring(0, 200) + '...',
        metadata: r.metadata,
        score: r.score
      }))
    });
  } catch (error: any) {
    logger.error(`知识库聊天错误: ${error.message}`);
    res.status(500).json({ error: `知识库聊天失败: ${error.message}` });
  }
};

/**
 * 流式与知识库聊天
 * @openapi
 * /api/knowledge/stream-chat:
 *   post:
 *     tags:
 *       - 知识库
 *     summary: 流式与知识库聊天
 *     description: 结合用户知识库进行流式聊天，实时返回基于知识库内容的回答
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *               - userId
 *             properties:
 *               message:
 *                 type: string
 *                 description: 用户消息
 *               userId:
 *                 type: string
 *                 description: 用户ID
 *     responses:
 *       200:
 *         description: 流式聊天响应
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
export const streamChatWithKnowledgeBase = async (req: Request, res: Response) => {
  const { message, userId } = req.body;
  
  if (!message || !userId) {
    return res.status(400).json({ error: '消息和用户ID为必填项' });
  }
  
  // 设置SSE头部
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();
  
  try {
    // 从知识库检索相关内容
    const vectorStore = new VectorStore(userId);
    await vectorStore.initialize();
    
    const results = await vectorStore.similaritySearch(message, 5);
    
    // 发送检索到的源文档信息
    if (results.length > 0) {
      const sources = results.map((r: SearchResult) => ({
        content: r.content.substring(0, 200) + '...',
        metadata: r.metadata,
        score: r.score
      }));
      
      res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);
    }
    
    // 构建包含知识库内容的提示
    let systemPrompt = '你是一个有帮助的AI助手。';
    
    if (results.length > 0) {
      const contextText = results.map((r: SearchResult) => r.content).join('\n\n');
      systemPrompt = `你是一个基于用户个人知识库的AI助手。请使用以下知识库内容回答用户的问题。
如果知识库中没有相关信息，请明确告知用户你不知道，而不是编造答案。
回答时，请引用知识库中的相关内容，并保持专业、简洁和有帮助。

知识库内容:
${contextText}`;
    }
    
    // 流式调用OpenAI API
    const openai = createOpenAIClient();
    const stream = await withRetry(() =>
      openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        stream: true
      })
    );
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        res.write(`data: ${JSON.stringify({ type: 'content', content })}\n\n`);
        res.flushHeaders?.();
      }
    }
    
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    logger.error(`流式知识库聊天错误: ${error.message}`);
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
};

/**
 * 删除用户知识库
 * @openapi
 * /api/knowledge/delete:
 *   delete:
 *     tags:
 *       - 知识库
 *     summary: 删除用户知识库
 *     description: 删除指定用户的所有知识库内容
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
export const deleteUserKnowledgeBase = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: '用户ID为必填项' });
    }

    const vectorStore = new VectorStore(userId as string);
    await vectorStore.initialize();
    await vectorStore.deleteUserData();
    
    // 删除用户上传的文件
    const userDir = path.join(process.cwd(), 'uploads', userId as string);
    if (fs.existsSync(userDir)) {
      fs.rmSync(userDir, { recursive: true, force: true });
    }
    
    res.status(200).json({
      success: true,
      message: `用户 ${userId} 的知识库已成功删除`
    });
  } catch (error: any) {
    logger.error(`删除知识库错误: ${error.message}`);
    res.status(500).json({ error: `删除知识库失败: ${error.message}` });
  }
};
