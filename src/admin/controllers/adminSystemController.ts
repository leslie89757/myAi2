import { Response } from 'express';
import { PrismaClient } from '../../generated/prisma';
import { AdminRequest } from '../middlewares/adminAuthMiddleware';
import logger from '../../utils/logger';

const prisma = new PrismaClient();

/**
 * 获取系统配置
 */
export const getSystemConfig = async (req: AdminRequest, res: Response) => {
  try {
    const configs = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' }
    });

    // 转换为前端易于使用的格式
    const configObject = configs.reduce((acc: Record<string, any>, config: { id: number; key: string; value: string; description: string | null }) => {
      acc[config.key] = {
        id: config.id,
        value: config.value,
        description: config.description || '',
        key: config.key
      };
      return acc;
    }, {} as Record<string, any>);

    res.json(configObject);
  } catch (error) {
    const err = error as Error;
    logger.error(`获取系统配置错误: ${err.message}`);
    res.status(500).json({ error: '获取系统配置失败' });
  }
};

/**
 * 更新系统配置
 */
export const updateSystemConfig = async (req: AdminRequest, res: Response) => {
  try {
    const updates = req.body;
    
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: '无效的配置数据' });
    }

    // 检查OpenAI API Key，如果有更新，需要验证其有效性
    if (updates.openai_api_key && updates.openai_api_key.value) {
      try {
        // TODO: 实现验证OpenAI API Key的逻辑
        logger.info('OpenAI API密钥已更新，需要进行验证');
      } catch (apiError) {
        return res.status(400).json({ error: '无效的OpenAI API密钥' });
      }
    }

    // 批量更新配置
    const updatePromises = Object.entries(updates).map(async ([key, data]: [string, any]) => {
      const { value, description } = data;
      
      // 检查配置是否存在
      const existingConfig = await prisma.systemConfig.findFirst({
        where: { key }
      });

      if (existingConfig) {
        // 更新现有配置
        return prisma.systemConfig.update({
          where: { id: existingConfig.id },
          data: {
            value,
            description: description || existingConfig.description
          }
        });
      } else {
        // 创建新配置
        return prisma.systemConfig.create({
          data: {
            key,
            value,
            description: description || null
          }
        });
      }
    });

    await Promise.all(updatePromises);

    // 重新获取所有配置
    const updatedConfigs = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' }
    });

    const configObject = updatedConfigs.reduce((acc: Record<string, any>, config: { id: number; key: string; value: string; description: string | null }) => {
      acc[config.key] = {
        id: config.id,
        value: config.value,
        description: config.description || '',
        key: config.key
      };
      return acc;
    }, {} as Record<string, any>);

    res.json(configObject);
  } catch (error) {
    const err = error as Error;
    logger.error(`更新系统配置错误: ${err.message}`);
    res.status(500).json({ error: '更新系统配置失败' });
  }
};

/**
 * 获取单个系统配置
 */
export const getSystemConfigByKey = async (req: AdminRequest, res: Response) => {
  try {
    const { key } = req.params;

    const config = await prisma.systemConfig.findFirst({
      where: { key }
    });

    if (!config) {
      return res.status(404).json({ error: '配置不存在' });
    }

    res.json({
      id: config.id,
      key: config.key,
      value: config.value,
      description: config.description
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`获取系统配置错误: ${err.message}`);
    res.status(500).json({ error: '获取系统配置失败' });
  }
};

/**
 * 更新单个系统配置
 */
export const updateSystemConfigByKey = async (req: AdminRequest, res: Response) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({ error: '配置值为必填项' });
    }

    // 检查配置是否存在
    const existingConfig = await prisma.systemConfig.findFirst({
      where: { key }
    });

    let updatedConfig;

    if (existingConfig) {
      // 更新现有配置
      updatedConfig = await prisma.systemConfig.update({
        where: { id: existingConfig.id },
        data: {
          value,
          description: description !== undefined ? description : existingConfig.description
        }
      });
    } else {
      // 创建新配置
      updatedConfig = await prisma.systemConfig.create({
        data: {
          key,
          value,
          description: description || null
        }
      });
    }

    res.json({
      id: updatedConfig.id,
      key: updatedConfig.key,
      value: updatedConfig.value,
      description: updatedConfig.description
    });
  } catch (error) {
    const err = error as Error;
    logger.error(`更新系统配置错误: ${err.message}`);
    res.status(500).json({ error: '更新系统配置失败' });
  }
};
