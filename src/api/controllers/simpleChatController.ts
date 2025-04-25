import { Request, Response } from 'express';
import { openai } from '../../utils/openai';
import logger from '../../utils/logger';
import { withRetry } from '../../utils/retry';

/**
 * @openapi
 * /api/chat/simple:
 *   post:
 *     summary: 简单聊天接口
 *     description: 返回ChatGPT的非流式响应
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
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 reply:
 *                   type: string
 *                   example: "你好！我是一个AI助手，可以回答问题、提供信息和帮助完成各种任务。"
 *                 model:
 *                   type: string
 *                   example: "gpt-4o"
 *                 usage:
 *                   type: object
 *                   properties:
 *                     prompt_tokens:
 *                       type: integer
 *                       example: 10
 *                     completion_tokens:
 *                       type: integer
 *                       example: 30
 *                     total_tokens:
 *                       type: integer
 *                       example: 40
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
export const simpleChat = async (req: Request, res: Response) => {
  try {
    logger.info('收到简单聊天请求');
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      logger.warn('无效的消息格式');
      return res.status(400).json({ error: '请提供有效的消息' });
    }

    logger.info(`处理用户消息: ${message}`);

    try {
      // 创建一个简单的非流式聊天完成，使用改进的重试机制
      const completion = await withRetry(() => openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: message }],
        stream: false
      }));

      // 确保我们获取到的是非流式响应
      const reply = completion.choices[0]?.message?.content || '无回复';
      logger.info('收到ChatGPT回复');

      return res.status(200).json({
        success: true,
        reply,
        model: completion.model,
        usage: completion.usage
      });
    } catch (apiError: any) {
      // 更详细的错误信息记录
      logger.error(`API调用错误 [${apiError.code || apiError.status || '未知'}]: ${apiError.message}`);

      if (apiError.code === 'ECONNRESET') {
        return res.status(503).json({
          success: false,
          error: '与OpenAI API的连接被重置，请稍后再试',
          details: '可能是网络问题或API服务暂时不可用'
        });
      }

      return res.status(500).json({
        success: false,
        error: '调用ChatGPT API时出错',
        details: apiError.message
      });
    }
  } catch (error: any) {
    logger.error('处理请求时出错:', error);
    return res.status(500).json({
      success: false,
      error: '服务器内部错误',
      details: error.message
    });
  }
};
