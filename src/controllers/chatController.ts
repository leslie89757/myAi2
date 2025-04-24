// src/controllers/chatController.ts
import { Request, Response } from 'express';
import { openai } from '../utils/openai';
import logger from '../utils/logger';
import { withRetry } from '../utils/retry';

export const streamChat = async (req: Request, res: Response) => {
  try {
    logger.info('收到聊天请求: %j', { ip: req.ip, headers: req.headers['user-agent'] });
    
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: '请提供有效的消息' });
    }
    
    // 设置SSE头部
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();
    
    try {
      const stream = await withRetry(() =>
        openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: message }],
          stream: true
        })
      );
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
          res.flushHeaders?.();
        }
      }
      
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      logger.error(`API调用错误: ${error.message}`);
      
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: '处理请求时出错' })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: '处理请求时出错' });
      }
    }
  } catch (error: any) {
    logger.error(`聊天请求失败: ${error.message}`);
    
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: '服务器内部错误' })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: '服务器内部错误' });
    }
  }
};
