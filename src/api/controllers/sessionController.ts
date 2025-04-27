import { Request, Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import logger from '../../utils/logger';
import { DualAuthRequest } from '../middleware/dualAuthMiddleware';

const prisma = new PrismaClient();

/**
 * @openapi
 * /api/sessions:
 *   get:
 *     tags:
 *       - 会话
 *     summary: 获取用户会话列表
 *     description: 获取当前认证用户的所有聊天会话
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取会话列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
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

    // 在Vercel环境中模拟会话返回
    if (process.env.VERCEL) {
      logger.info(`[SESSIONS] 在Vercel环境中返回测试会话数据`);
      return res.json([
        {
          id: "test-session-1",
          title: "测试会话1",
          description: "这是一个测试会话，用于演示API功能",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true
        },
        {
          id: "test-session-2",
          title: "测试会话2",
          description: "这是另一个测试会话",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true
        }
      ]);
    }

    const sessions = await prisma.session.findMany({
      where: {
        userId: req.user.id,
        isActive: true
      },
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        isActive: true
      }
    });

    return res.json(sessions);
  } catch (error: any) {
    logger.error(`获取会话列表错误: ${error.message}`);
    return res.status(500).json({ error: `获取会话列表失败: ${error.message}` });
  }
};

/**
 * @openapi
 * /api/sessions/{id}:
 *   get:
 *     tags:
 *       - 会话
 *     summary: 获取单个会话详情
 *     description: 获取指定ID的会话详情，包括消息历史
 *     security:
 *       - bearerAuth: []
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
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
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
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 未认证
 *       403:
 *         description: 无权访问该会话
 *       404:
 *         description: 会话不存在
 *       500:
 *         description: 服务器错误
 */
export const getSessionById = async (req: DualAuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const { id } = req.params;

    // 在Vercel环境中模拟会话详情返回
    if (process.env.VERCEL) {
      logger.info(`[SESSIONS] 在Vercel环境中返回测试会话详情数据，会话ID: ${id}`);
      return res.json({
        id: id,
        title: "测试会话详情",
        description: "这是一个测试会话详情，用于演示API功能",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        messages: [
          {
            id: "msg-1",
            role: "user",
            content: "你好，这是一条测试消息",
            createdAt: new Date().toISOString()
          },
          {
            id: "msg-2",
            role: "assistant",
            content: "您好！我是AI助手，很高兴为您服务。请问有什么我可以帮助您的吗？",
            createdAt: new Date(Date.now() - 1000).toISOString()
          }
        ]
      });
    }

    // 查找会话并验证所有权
    const session = await prisma.session.findUnique({
      where: {
        id,
        userId: req.user.id,
        isActive: true
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ error: '会话不存在或您无权访问' });
    }

    return res.json(session);
  } catch (error: any) {
    logger.error(`获取会话详情错误: ${error.message}`);
    return res.status(500).json({ error: `获取会话详情失败: ${error.message}` });
  }
};

/**
 * @openapi
 * /api/sessions:
 *   post:
 *     tags:
 *       - 会话
 *     summary: 创建新会话
 *     description: 为当前认证用户创建新的聊天会话
 *     security:
 *       - bearerAuth: []
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
 *       200:
 *         description: 成功创建会话
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: 未认证
 *       400:
 *         description: 请求参数错误
 *       500:
 *         description: 服务器错误
 */
export const createSession = async (req: DualAuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '未认证' });
    }

    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: '会话标题为必填项' });
    }

    // 在Vercel环境中模拟会话创建
    if (process.env.VERCEL) {
      logger.info(`[SESSIONS] 在Vercel环境中模拟创建会话: ${title}`);
      const newSession = {
        id: `test-session-${Date.now()}`,
        title,
        description: description || '',
        userId: req.user.id,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      return res.json(newSession);
    }

    const newSession = await prisma.session.create({
      data: {
        title,
        description,
        userId: req.user.id,
        isActive: true
      }
    });

    return res.json(newSession);
  } catch (error: any) {
    logger.error(`创建会话错误: ${error.message}`);
    return res.status(500).json({ error: `创建会话失败: ${error.message}` });
  }
};

/**
 * @openapi
 * /api/sessions/{id}:
 *   put:
 *     tags:
 *       - 会话
 *     summary: 更新会话信息
 *     description: 更新指定ID的会话信息
 *     security:
 *       - bearerAuth: []
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
 *         description: 成功更新会话
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 isActive:
 *                   type: boolean
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: 未认证
 *       403:
 *         description: 无权更新该会话
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

    // 在Vercel环境中模拟会话更新
    if (process.env.VERCEL) {
      logger.info(`[SESSIONS] 在Vercel环境中模拟更新会话: ${id}`);
      const updatedSession = {
        id,
        title: title || "更新后的测试会话",
        description: description || "这是一个更新后的测试会话",
        isActive: isActive !== undefined ? isActive : true,
        updatedAt: new Date().toISOString()
      };
      return res.json(updatedSession);
    }

    // 查找会话并验证所有权
    const session = await prisma.session.findUnique({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({ error: '会话不存在或您无权更新' });
    }

    // 更新会话
    const updatedSession = await prisma.session.update({
      where: { id },
      data: {
        title: title !== undefined ? title : session.title,
        description: description !== undefined ? description : session.description,
        isActive: isActive !== undefined ? isActive : session.isActive
      }
    });

    return res.json(updatedSession);
  } catch (error: any) {
    logger.error(`更新会话错误: ${error.message}`);
    return res.status(500).json({ error: `更新会话失败: ${error.message}` });
  }
};

/**
 * @openapi
 * /api/sessions/{id}:
 *   delete:
 *     tags:
 *       - 会话
 *     summary: 删除会话
 *     description: 删除指定ID的会话（逻辑删除，将isActive设为false）
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 会话ID
 *     responses:
 *       200:
 *         description: 成功删除会话
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
 *         description: 无权删除该会话
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

    // 在Vercel环境中模拟会话删除
    if (process.env.VERCEL) {
      logger.info(`[SESSIONS] 在Vercel环境中模拟删除会话: ${id}`);
      return res.json({
        success: true,
        message: `会话 ${id} 已成功删除`
      });
    }

    // 查找会话并验证所有权
    const session = await prisma.session.findUnique({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!session) {
      return res.status(404).json({ error: '会话不存在或您无权删除' });
    }

    // 逻辑删除会话（将isActive设为false）
    await prisma.session.update({
      where: { id },
      data: { isActive: false }
    });

    return res.json({
      success: true,
      message: '会话已成功删除'
    });
  } catch (error: any) {
    logger.error(`删除会话错误: ${error.message}`);
    return res.status(500).json({ error: `删除会话失败: ${error.message}` });
  }
};
