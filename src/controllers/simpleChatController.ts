import { Request, Response } from 'express';
import logger from '../utils/logger';
import { openai } from '../utils/openai';
import { withRetry } from '../utils/retry';

/**
 * @openapi
 * /api/simple-chat:
 *   post:
 *     tags:
 *       - 聊天接口
 *     summary: 非流式聊天接口
 *     description: 一次性返回完整的 ChatGPT 回复
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
  try {
    logger.info('收到简单聊天请求');
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      logger.warn('无效的消息格式');
      return res.status(400).json({ error: '请提供有效的消息' });
    }

    logger.info(`用户消息: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);

    const completion = await withRetry(() =>
      openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: message }],
        stream: false
      })
    );

    const reply = completion.choices[0]?.message?.content || '无回复';
    logger.info(`AI回复: ${reply.substring(0, 100)}${reply.length > 100 ? '...' : ''}`);
    
    return res.json({ reply });
  } catch (error: any) {
    logger.error(`聊天请求失败: ${error.message}`);
    return res.status(500).json({ error: '处理请求时出错' });
  }
};