// src/controllers/chatController.ts
import { Request, Response } from 'express';
import openai from '../utils/openai';
import logger from '../utils/logger';

// 重试函数
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries <= 0) throw error;
    
    logger.warn(`操作失败，${retries}次重试后重新尝试: ${error.message}`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return withRetry(fn, retries - 1, delay * 2); // 指数退避
  }
}

export const streamChat = async (req: Request, res: Response) => {
  try {
    logger.info('收到聊天请求: %j', { ip: req.ip, headers: req.headers['user-agent'] });
    
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      logger.warn('无效的消息格式: %j', req.body);
      return res.status(400).json({ error: 'Invalid messages format. Expected non-empty array.' });
    }

    logger.debug('处理聊天消息: %j', messages);

    // Set headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    logger.info('开始流式响应');
    
    try {
      // Create a streaming completion with retry
      const stream = await withRetry(() => 
        openai.chat.completions.create({
          model: 'gpt-4o',
          messages: messages,
          stream: true,
        }), 2, 1000);

      // Stream the response chunks to the client
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
          // 确保数据立即发送，但不使用不兼容的flush方法
          res.flushHeaders?.(); // 使用可选链，如果方法存在则调用
        }
      }

      // End the stream
      res.write('data: [DONE]\n\n');
      res.end();
      logger.info('流式响应完成');
    } catch (streamError: any) {
      logger.error('流处理错误: %o', streamError);
      
      // 如果是网络错误，尝试非流式响应
      if (streamError.code === 'ECONNRESET' || streamError.type === 'system') {
        logger.info('尝试使用非流式响应作为备选方案');
        try {
          // 非流式响应
          const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            stream: false,
          });
          
          const content = completion.choices[0]?.message?.content || '';
          if (content) {
            // 模拟流式响应
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
            res.write('data: [DONE]\n\n');
            res.end();
            logger.info('非流式响应完成');
            return;
          }
        } catch (nonStreamError) {
          logger.error('非流式响应也失败: %o', nonStreamError);
          // 继续到错误处理
        }
      }
      
      // 如果流已经开始，发送错误信息
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: '连接错误，请重试' })}\n\n`);
        res.end();
      } else {
        // 否则返回错误状态
        res.status(500).json({ error: '处理请求时出错，请重试' });
      }
    }
  } catch (error) {
    logger.error('流式聊天错误: %o', error);
    // If headers haven't been sent yet, send error response
    if (!res.headersSent) {
      res.status(500).json({ error: 'An error occurred while processing your request' });
    } else {
      // If headers have been sent (streaming started), send error in the stream
      res.write(`data: ${JSON.stringify({ error: 'Stream error occurred' })}\n\n`);
      res.end();
    }
  }
};
