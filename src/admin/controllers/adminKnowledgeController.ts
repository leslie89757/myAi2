import { Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import { AdminRequest } from '../middlewares/adminAuthMiddleware';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

/**
 * 获取所有系统提示词模板
 */
export const getSystemPrompts = async (req: AdminRequest, res: Response) => {
  try {
    // 获取查询参数
    const { _sort, _order, _start, _end, ...filter } = req.query as any;
    const sortField = _sort || 'updatedAt';
    const sortOrder = _order === 'DESC' ? 'desc' : 'asc';
    const start = parseInt(_start || '0', 10);
    const end = parseInt(_end || '10', 10);
    const limit = end - start;

    // 构建过滤条件
    const where: any = {};
    if (filter.q) {
      where.OR = [
        { name: { contains: filter.q, mode: 'insensitive' } },
        { content: { contains: filter.q, mode: 'insensitive' } }
      ];
    }
    if (filter.type) {
      where.type = filter.type;
    }
    if (filter.isDefault !== undefined) {
      where.isDefault = filter.isDefault === 'true';
    }

    // 查询提示词模板并分页
    const prompts = await prisma.systemPrompt.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: start,
      take: limit
    });

    // 获取总数
    const total = await prisma.systemPrompt.count({ where });

    // 设置Content-Range头部
    res.set('Content-Range', `prompts ${start}-${Math.min(end, total)}/${total}`);
    res.json(prompts);
  } catch (error) {
    const err = error as Error;
    logger.error(`获取提示词模板列表错误: ${err.message}`);
    res.status(500).json({ error: '获取提示词模板列表失败' });
  }
};

/**
 * 获取单个系统提示词模板
 */
export const getSystemPromptById = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const promptId = parseInt(id, 10);

    if (isNaN(promptId)) {
      return res.status(400).json({ error: '无效的提示词模板ID' });
    }

    const prompt = await prisma.systemPrompt.findUnique({
      where: { id: promptId }
    });

    if (!prompt) {
      return res.status(404).json({ error: '提示词模板不存在' });
    }

    res.json(prompt);
  } catch (error) {
    const err = error as Error;
    logger.error(`获取提示词模板详情错误: ${err.message}`);
    res.status(500).json({ error: '获取提示词模板详情失败' });
  }
};

/**
 * 创建系统提示词模板
 */
export const createSystemPrompt = async (req: AdminRequest, res: Response) => {
  try {
    const { name, content, type, isDefault = false } = req.body;

    if (!name || !content || !type) {
      return res.status(400).json({ error: '名称、内容和类型为必填项' });
    }

    // 如果设置为默认模板，需要将同类型的其他模板设置为非默认
    if (isDefault) {
      await prisma.systemPrompt.updateMany({
        where: { type, isDefault: true },
        data: { isDefault: false }
      });
    }

    // 创建提示词模板
    const newPrompt = await prisma.systemPrompt.create({
      data: {
        name,
        content,
        type,
        isDefault
      }
    });

    res.status(201).json(newPrompt);
  } catch (error) {
    const err = error as Error;
    logger.error(`创建提示词模板错误: ${err.message}`);
    res.status(500).json({ error: '创建提示词模板失败' });
  }
};

/**
 * 更新系统提示词模板
 */
export const updateSystemPrompt = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const promptId = parseInt(id, 10);

    if (isNaN(promptId)) {
      return res.status(400).json({ error: '无效的提示词模板ID' });
    }

    const { name, content, type, isDefault } = req.body;
    
    // 检查提示词模板是否存在
    const existingPrompt = await prisma.systemPrompt.findUnique({
      where: { id: promptId }
    });

    if (!existingPrompt) {
      return res.status(404).json({ error: '提示词模板不存在' });
    }

    // 准备更新数据
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (content !== undefined) updateData.content = content;
    if (type !== undefined) updateData.type = type;
    if (isDefault !== undefined) updateData.isDefault = isDefault;

    // 如果设置为默认模板，需要将同类型的其他模板设置为非默认
    if (isDefault) {
      await prisma.systemPrompt.updateMany({
        where: { 
          type: type || existingPrompt.type, 
          isDefault: true,
          id: { not: promptId }
        },
        data: { isDefault: false }
      });
    }

    // 更新提示词模板
    const updatedPrompt = await prisma.systemPrompt.update({
      where: { id: promptId },
      data: updateData
    });

    res.json(updatedPrompt);
  } catch (error) {
    const err = error as Error;
    logger.error(`更新提示词模板错误: ${err.message}`);
    res.status(500).json({ error: '更新提示词模板失败' });
  }
};

/**
 * 删除系统提示词模板
 */
export const deleteSystemPrompt = async (req: AdminRequest, res: Response) => {
  try {
    const { id } = req.params;
    const promptId = parseInt(id, 10);

    if (isNaN(promptId)) {
      return res.status(400).json({ error: '无效的提示词模板ID' });
    }

    // 检查提示词模板是否存在
    const existingPrompt = await prisma.systemPrompt.findUnique({
      where: { id: promptId }
    });

    if (!existingPrompt) {
      return res.status(404).json({ error: '提示词模板不存在' });
    }

    // 不允许删除默认模板
    if (existingPrompt.isDefault) {
      return res.status(403).json({ error: '不能删除默认模板，请先设置其他模板为默认' });
    }

    // 删除提示词模板
    await prisma.systemPrompt.delete({
      where: { id: promptId }
    });

    res.json({ success: true });
  } catch (error) {
    const err = error as Error;
    logger.error(`删除提示词模板错误: ${err.message}`);
    res.status(500).json({ error: '删除提示词模板失败' });
  }
};
