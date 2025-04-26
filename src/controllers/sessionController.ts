import { Request, Response } from 'express';
import { SessionService } from '../services/sessionService';
import logger from '../utils/logger';
import { DualAuthRequest } from '../api/middleware/dualAuthMiddleware';

/**
 * 创建新会话
 * @openapi
 * /api/sessions:
 *   post:
 *     tags:
 *       - 会话管理
 *     summary: 创建新会话
 *     description: 为指定用户创建一个新的会话
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 description: 会话标题
 *               description:
 *                 type: string
 *                 description: 会话描述（可选）
 *     responses:
 *       201:
 *         description: 会话创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 session:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未认证
 *       500:
 *         description: 服务器错误
 */
export const createSession = async (req: DualAuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const { title, description, userId } = req.body;

    if (!title) {
      return res.status(400).json({ error: '会话标题为必填项' });
    }

    if (!userId) {
      return res.status(400).json({ error: '缺少必要的 userId 参数' });
    }

    logger.info(`尝试创建用户 ${userId} 的新会话: ${title}`);
    const session = await SessionService.createSession(userId, title, description);

    logger.info(`用户 ${userId} 创建了新会话: ${title}`);
    res.status(201).json({
      success: true,
      message: '会话创建成功',
      session
    });
  } catch (error: any) {
    logger.error(`创建会话错误: ${error.message}`);
    res.status(500).json({ error: `创建会话失败: ${error.message}` });
  }
};

/**
 * 获取用户的所有会话
 * @openapi
 * /api/sessions:
 *   get:
 *     tags:
 *       - 会话管理
 *     summary: 获取用户会话列表
 *     description: 获取指定用户的所有会话
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 成功获取会话列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sessions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 未认证
 *       500:
 *         description: 服务器错误
 */
export const getUserSessions = async (req: DualAuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    // 从查询参数中获取 userId
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: '缺少必要的 userId 参数' });
    }

    logger.info(`获取用户 ${userId} 的会话列表`);
    const sessions = await SessionService.getUserSessions(userId);

    res.status(200).json({
      sessions
    });
  } catch (error: any) {
    logger.error(`获取用户会话列表错误: ${error.message}`);
    res.status(500).json({ error: `获取用户会话列表失败: ${error.message}` });
  }
};

/**
 * 获取会话详情
 * @openapi
 * /api/sessions/{id}:
 *   get:
 *     tags:
 *       - 会话管理
 *     summary: 获取会话详情
 *     description: 获取指定用户的指定会话的详细信息，包括消息历史
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 会话ID
 *     responses:
 *       200:
 *         description: 成功获取会话详情
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 session:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                     messages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           role:
 *                             type: string
 *                           content:
 *                             type: string
 *                           tokens:
 *                             type: integer
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: 未认证
 *       403:
 *         description: 无权访问
 *       404:
 *         description: 会话不存在
 *       500:
 *         description: 服务器错误
 */
export const getSessionDetails = async (req: DualAuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const { id } = req.params;
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: '缺少必要的 userId 参数' });
    }
    
    logger.info(`获取会话详情: ${id}, 用户ID: ${userId}`);
    const session = await SessionService.getSessionWithMessages(id, userId);

    if (!session) {
      return res.status(404).json({ error: '会话不存在或无权访问' });
    }

    res.status(200).json({
      session
    });
  } catch (error: any) {
    logger.error(`获取会话详情错误: ${error.message}`);
    res.status(500).json({ error: `获取会话详情失败: ${error.message}` });
  }
};

/**
 * 更新会话信息
 * @openapi
 * /api/sessions/{id}:
 *   put:
 *     tags:
 *       - 会话管理
 *     summary: 更新会话信息
 *     description: 更新指定用户的指定会话的标题、描述或状态
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 会话ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: 会话标题
 *               description:
 *                 type: string
 *                 description: 会话描述
 *               isActive:
 *                 type: boolean
 *                 description: 会话是否活跃
 *     responses:
 *       200:
 *         description: 会话更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 session:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     isActive:
 *                       type: boolean
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未认证
 *       403:
 *         description: 无权访问
 *       404:
 *         description: 会话不存在
 *       500:
 *         description: 服务器错误
 */
export const updateSession = async (req: DualAuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const { id } = req.params;
    const { title, description, isActive } = req.body;
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: '缺少必要的 userId 参数' });
    }
    
    // 构建更新数据
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: '没有提供要更新的数据' });
    }

    logger.info(`尝试更新会话: ${id}, 用户ID: ${userId}`);
    const updatedSession = await SessionService.updateSession(id, userId, updateData);

    logger.info(`用户 ${userId} 更新了会话 ${id}`);
    res.status(200).json({
      success: true,
      message: '会话更新成功',
      session: updatedSession
    });
  } catch (error: any) {
    logger.error(`更新会话错误: ${error.message}`);
    res.status(500).json({ error: `更新会话失败: ${error.message}` });
  }
};

/**
 * 删除会话
 * @openapi
 * /api/sessions/{id}:
 *   delete:
 *     tags:
 *       - 会话管理
 *     summary: 删除会话
 *     description: 删除指定用户的指定会话及其所有消息
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 会话ID
 *     responses:
 *       200:
 *         description: 会话删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: 未认证
 *       403:
 *         description: 无权访问
 *       404:
 *         description: 会话不存在
 *       500:
 *         description: 服务器错误
 */
export const deleteSession = async (req: DualAuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const { id } = req.params;
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: '缺少必要的 userId 参数' });
    }
    
    logger.info(`尝试删除会话: ${id}, 用户ID: ${userId}`);
    await SessionService.deleteSession(id, userId);

    logger.info(`用户 ${userId} 删除了会话 ${id}`);
    res.status(200).json({
      success: true,
      message: '会话删除成功'
    });
  } catch (error: any) {
    logger.error(`删除会话错误: ${error.message}`);
    res.status(500).json({ error: `删除会话失败: ${error.message}` });
  }
};

/**
 * 添加消息到会话
 * @openapi
 * /api/sessions/{id}/messages:
 *   post:
 *     tags:
 *       - 会话管理
 *     summary: 添加消息到会话
 *     description: 向指定会话添加新消息
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 会话ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - content
 *             properties:
 *               role:
 *                 type: string
 *                 description: 消息角色 (user 或 assistant)
 *                 enum: [user, assistant]
 *               content:
 *                 type: string
 *                 description: 消息内容
 *               tokens:
 *                 type: integer
 *                 description: 消息包含的令牌数量
 *                 default: 0
 *     responses:
 *       201:
 *         description: 消息添加成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 chatMessage:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     role:
 *                       type: string
 *                     content:
 *                       type: string
 *                     tokens:
 *                       type: integer
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未认证
 *       403:
 *         description: 无权访问
 *       404:
 *         description: 会话不存在
 *       500:
 *         description: 服务器错误
 */
export const addMessage = async (req: DualAuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const { id } = req.params;
    const { role, content, tokens = 0 } = req.body;
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: '缺少必要的 userId 参数' });
    }
    
    if (!role || !content) {
      return res.status(400).json({ error: '角色和内容为必填项' });
    }
    
    if (role !== 'user' && role !== 'assistant') {
      return res.status(400).json({ error: '角色必须为 user 或 assistant' });
    }

    // 验证会话存在性和所有权
    logger.info(`尝试获取会话详情用于添加消息: ${id}, 用户ID: ${userId}`);
    const session = await SessionService.getSessionWithMessages(id, userId);
    
    if (!session) {
      return res.status(404).json({ error: '会话不存在或无权访问' });
    }

    const chatMessage = await SessionService.addMessage(id, role, content, tokens);

    res.status(201).json({
      success: true,
      message: '消息添加成功',
      chatMessage
    });
  } catch (error: any) {
    logger.error(`添加消息错误: ${error.message}`);
    res.status(500).json({ error: `添加消息失败: ${error.message}` });
  }
};

/**
 * 获取会话的所有消息
 * @openapi
 * /api/sessions/{id}/messages:
 *   get:
 *     tags:
 *       - 会话管理
 *     summary: 获取会话消息
 *     description: 获取指定用户的指定会话的所有消息
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 会话ID
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 成功获取会话消息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       role:
 *                         type: string
 *                       content:
 *                         type: string
 *                       tokens:
 *                         type: integer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 未认证
 *       403:
 *         description: 无权访问
 *       404:
 *         description: 会话不存在
 *       500:
 *         description: 服务器错误
 */
export const getSessionMessages = async (req: DualAuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const { id } = req.params;
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: '缺少必要的 userId 参数' });
    }
    
    logger.info(`尝试获取会话消息: ${id}, 用户ID: ${userId}`);
    const messages = await SessionService.getSessionMessages(id, userId);

    res.status(200).json({
      messages
    });
  } catch (error: any) {
    logger.error(`获取会话消息错误: ${error.message}`);
    res.status(500).json({ error: `获取会话消息失败: ${error.message}` });
  }
};

/**
 * 清空会话消息
 * @openapi
 * /api/sessions/{id}/messages:
 *   delete:
 *     tags:
 *       - 会话管理
 *     summary: 清空会话消息
 *     description: 删除指定用户的指定会话的所有消息
 *     security:
 *       - bearerAuth: []
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 会话ID
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: 用户ID
 *     responses:
 *       200:
 *         description: 会话消息清空成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: 未认证
 *       403:
 *         description: 无权访问
 *       404:
 *         description: 会话不存在
 *       500:
 *         description: 服务器错误
 */
export const clearSessionMessages = async (req: DualAuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const { id } = req.params;
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: '缺少必要的 userId 参数' });
    }
    
    logger.info(`尝试清空会话消息: ${id}, 用户ID: ${userId}`);
    await SessionService.clearSessionMessages(id, userId);

    logger.info(`用户 ${userId} 清空了会话 ${id} 的消息`);
    res.status(200).json({
      success: true,
      message: '会话消息清空成功'
    });
  } catch (error: any) {
    logger.error(`清空会话消息错误: ${error.message}`);
    res.status(500).json({ error: `清空会话消息失败: ${error.message}` });
  }
};
