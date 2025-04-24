import { Request, Response } from 'express';
import logger from '../utils/logger';
import { openai } from '../utils/openai';
import { withRetry } from '../utils/retry';

/**
 * @openapi
 * /api/stream-chat:
 *   post:
 *     tags:
 *       - 聊天接口
 *     summary: 流式聊天接口
 *     description: 使用 Server-Sent Events (SSE) 实时返回 ChatGPT 回复
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
 *         description: 返回 SSE 流
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: 包含多个 SSE 事件，每个事件包含一个 JSON 对象，其中 content 字段包含回复的一部分文本
 *               example: |
 *                 data: {"content":"你好"}
 *                 
 *                 data: {"content":"！我是"}
 *                 
 *                 data: {"content":" ChatGPT"}
 *                 
 *                 data: [DONE]
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
 *                 error:
 *                   type: string
 *                   example: "服务器内部错误"
 */
/**
 * 处理流式聊天请求
 * 
 * @param req Express 请求对象
 * @param res Express 响应对象
 */
export const streamChat = async (req: Request, res: Response) => {
  try {
    logger.info('收到流式聊天请求');
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      logger.warn('无效的消息格式');
      return res.status(400).json({ error: '请提供有效的消息' });
    }

    logger.info(`用户消息: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);

    // 设置SSE头部
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
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
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
          res.flushHeaders?.();
        }
      }

      // 发送结束标记
      res.write('data: [DONE]\n\n');
      res.end();
      logger.info('流式聊天响应完成');
    } catch (apiError: any) {
      logger.error(`API调用错误: ${apiError.message}`);
      
      // 如果已经开始发送SSE，则以SSE格式发送错误
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: '处理请求时出错' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        // 否则以JSON格式发送错误
        res.status(500).json({ error: '处理请求时出错' });
      }
    }
  } catch (error: any) {
    logger.error(`聊天请求失败: ${error.message}`);
    
    // 检查是否已经发送了头部
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: '服务器内部错误' })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      res.status(500).json({ error: '服务器内部错误' });
    }
  }
};
