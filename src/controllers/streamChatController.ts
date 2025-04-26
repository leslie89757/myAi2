import { Request, Response } from 'express';
import logger from '../utils/logger';
import { openai, mockCompletionResponse } from '../utils/openai';
import { withRetry } from '../utils/retry';

/**
 * @openapi
 * /api/stream-chat:
 *   post:
 *     tags:
 *       - 聊天接口
 *     summary: 流式聊天接口
 *     description: 使用 Server-Sent Events (SSE) 实时返回 ChatGPT 回复
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
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
  // 在最外层保存用户消息，确保在所有作用域中都可以访问
  let userMessage: string = '用户消息无法获取';
  
  try {
    logger.info('收到流式聊天请求');
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      logger.warn('无效的消息格式');
      return res.status(400).json({ error: '请提供有效的消息' });
    }

    // 保存用户消息到外部变量
    userMessage = message;
    logger.info(`用户消息: ${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}`);

    // 设置SSE头部
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      const stream = await withRetry(() =>
        openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: userMessage }],
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
      
      // 使用模拟响应进行降级服务
      try {
        const mockResponse = mockCompletionResponse(userMessage);
        const mockReply = mockResponse.choices[0]?.message?.content || '系统当前无法连接到OpenAI API';
        
        // 模拟流式回复，将完整回复分为多个部分发送
        logger.info(`使用模拟流式回复: ${mockReply.substring(0, 50)}...`);
        
        // 发送错误提示
        res.write(`data: ${JSON.stringify({ content: '[系统通知] ' })}\n\n`);
        res.flushHeaders?.();
        res.write(`data: ${JSON.stringify({ content: 'OpenAI API连接失败，切换到本地模拟响应\n\n' })}\n\n`);
        res.flushHeaders?.();
        
        // 每次发送一小部分消息，模拟流式响应
        const chunks = mockReply.match(/.{1,15}/g) || [mockReply];
        for (const chunk of chunks) {
          res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
          res.flushHeaders?.();
          // 模拟小延迟，使流式效果更真实
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        // 发送结束标记
        res.write('data: [DONE]\n\n');
        res.end();
        logger.info('模拟流式聊天响应完成');
      } catch (mockError: any) {
        // 如果模拟响应也失败，发送错误消息
        logger.error(`模拟响应失败: ${mockError.message}`);
        res.write(`data: ${JSON.stringify({ error: '处理请求时出错，且降级服务也失败' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }
  } catch (error: any) {
    logger.error(`聊天请求失败: ${error.message}`);
    
    // 检查是否已经发送了头部
    if (res.headersSent) {
      // 尝试使用模拟响应作为备份
      try {
        const errorMessage = `服务器内部错误: ${error.message}`;
        res.write(`data: ${JSON.stringify({ content: `[系统错误] ${errorMessage}` })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } catch {
        // 最后的处理方式
        res.write(`data: ${JSON.stringify({ error: '服务器内部错误' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      }
    } else {
      // 如果头部还没发送，可以用JSON格式响应
      res.status(500).json({ 
        error: '服务器内部错误',
        errorDetail: error.message 
      });
    }
  }
};
