import { Request, Response } from 'express';
import logger from '../utils/logger';
import { openai, mockCompletionResponse } from '../utils/openai';
import { withRetry } from '../utils/retry';

/**
 * @openapi
 * /api/simple-chat:
 *   post:
 *     tags:
 *       - 聊天接口
 *     summary: 非流式聊天接口
 *     description: 一次性返回完整的 ChatGPT 回复
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
 *         description: 成功返回回复
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reply:
 *                   type: string
 *                   description: ChatGPT 的回复内容
 *                   example: "你好！我是 ChatGPT，一个由 OpenAI 训练的大型语言模型。我可以回答问题、提供信息、进行对话，以及帮助完成各种文本相关的任务。"
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
export const simpleChat = async (req: Request, res: Response) => {
  // 在最外层保存用户消息，确保在所有作用域中都可以访问
  let userMessage: string = '用户消息无法获取';
  
  try {
    logger.info('收到简单聊天请求');
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      logger.warn('无效的消息格式');
      return res.status(400).json({ error: '请提供有效的消息' });
    }
    
    // 保存消息到外部变量
    userMessage = message;
    logger.info(`用户消息: ${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}`);

    try {
      // 尝试使用OpenAI API
      const completion = await withRetry(() =>
        openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: userMessage }],
          stream: false
        })
      );

      const reply = completion.choices[0]?.message?.content || '无回复';
      logger.info(`AI回复: ${reply.substring(0, 100)}${reply.length > 100 ? '...' : ''}`);
      
      return res.json({ reply });
    } catch (apiError: any) {
      logger.warn(`OpenAI API调用失败，尝试使用模拟响应: ${apiError.message}`);
      
      // 使用模拟响应
      const mockResponse = mockCompletionResponse(userMessage);
      const mockReply = mockResponse.choices[0]?.message?.content || '系统当前无法连接到OpenAI API';
      
      logger.info(`使用模拟回复: ${mockReply.substring(0, 100)}${mockReply.length > 100 ? '...' : ''}`);
      return res.json({ 
        reply: mockReply,
        mock: true, 
        error: apiError.message 
      });
    }
  } catch (error: any) {
    logger.error(`聊天请求失败: ${error.message}`);
    
    // 提供更具体的错误信息
    const errorDetail = error.code ? `${error.message} (代码: ${error.code})` : error.message;
    
    // 如果连用户消息都无法获取，则使用默认消息
    if (!userMessage) {
      userMessage = '用户消息无法获取';
    }
    
    // 使用模拟响应作为备份
    try {
      const mockResponse = mockCompletionResponse(userMessage);
      const mockReply = mockResponse.choices[0]?.message?.content;
      
      logger.info(`服务器错误，使用模拟回复: ${mockReply?.substring(0, 100)}`);
      return res.status(207).json({ 
        reply: mockReply,
        mock: true, 
        error: errorDetail,
        errorDetail: '服务器遇到内部错误，此为降级服务响应'
      });
    } catch (mockError) {
      // 如果连模拟响应都失败了
      return res.status(500).json({ 
        error: '处理请求时出错', 
        errorDetail: errorDetail 
      });
    }
  }
};