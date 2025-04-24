import { Request, Response } from 'express';
import openai from '../utils/openai';
import logger from '../utils/logger';
import { withRetry } from '../utils/retry';

/**
 * @swagger
 * /api/stream-chat:
 *   post:
 *     summary: 流式聊天接口
 *     description: 使用Server-Sent Events (SSE)格式返回ChatGPT的流式响应
 *     tags:
 *       - 聊天
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 description: 用户发送的消息内容
 *                 example: "你好，请介绍一下自己"
 *     responses:
 *       200:
 *         description: 成功，开始流式响应
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               example: "data: {\"content\":\"你好！\"}\n\ndata: {\"content\":\"我是一个AI助手\"}\n\ndata: [DONE]"
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "请提供有效的消息"
 *       500:
 *         description: 服务器内部错误
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "服务器内部错误"
 *                 details:
 *                   type: string
 *                   example: "错误详情"
 */
export const streamChat = async (req: Request, res: Response) => {
  try {
    logger.info('收到流式聊天请求');
    
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      logger.warn('无效的消息格式');
      return res.status(400).json({ error: '请提供有效的消息' });
    }

    logger.info(`处理用户消息: ${message}`);

    // 设置SSE头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    try {
      // 创建流式聊天完成
      logger.info('开始流式响应');
      
      const stream = await withRetry(() => 
        openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: message }],
          stream: true
        })
      );

      // 处理流式响应
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          // 发送SSE格式的数据
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
          // 确保数据立即发送
          res.flushHeaders?.();
        }
      }

      // 结束流
      res.write('data: [DONE]\n\n');
      res.end();
      logger.info('流式响应完成');
    } catch (apiError: any) {
      logger.error(`流式API调用错误 [${apiError.code || apiError.status || '未知'}]: ${apiError.message}`);
      
      // 如果已经发送了头信息，则通过SSE发送错误
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: '处理请求时出错，请重试' })}\n\n`);
        res.end();
      } else {
        // 否则返回常规错误响应
        return res.status(500).json({ 
          success: false, 
          error: '调用ChatGPT API时出错',
          details: apiError.message
        });
      }
    }
  } catch (error: any) {
    logger.error('处理流式请求时出错:', error);
    
    // 如果已经发送了头信息，则通过SSE发送错误
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: '服务器内部错误' })}\n\n`);
      res.end();
    } else {
      // 否则返回常规错误响应
      return res.status(500).json({ 
        success: false, 
        error: '服务器内部错误',
        details: error.message
      });
    }
  }
};
