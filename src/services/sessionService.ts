import { PrismaClient, Session, ChatMessage } from '../generated/prisma';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export class SessionService {
  /**
   * 创建新会话
   */
  static async createSession(userId: string, title: string, description?: string): Promise<Session> {
    try {
      // 尝试将 userId 转换为数字
      const userIdNumber = parseInt(userId, 10);
      
      if (isNaN(userIdNumber)) {
        logger.error(`创建会话失败: 无效的用户ID ${userId}`);
        throw new Error(`创建会话失败: 无效的用户ID`);
      }
      
      return await prisma.session.create({
        data: {
          title,
          description,
          userId: userIdNumber
        }
      });
    } catch (error: any) {
      logger.error(`创建会话失败: ${error.message}`);
      throw new Error(`创建会话失败: ${error.message}`);
    }
  }

  /**
   * 获取用户的所有会话
   */
  static async getUserSessions(userId: string): Promise<Session[]> {
    try {
      logger.info(`开始查询用户 ${userId} 的会话列表`);
      
      // 尝试将 userId 转换为数字
      const userIdNumber = parseInt(userId, 10);
      
      if (isNaN(userIdNumber)) {
        logger.warn(`无效的用户ID: ${userId}`);
        return []; // 返回空数组
      }
      
      return await prisma.session.findMany({
        where: { 
          userId: userIdNumber 
        },
        orderBy: { updatedAt: 'desc' }
      });
    } catch (error: any) {
      logger.error(`获取用户会话列表失败: ${error.message}`);
      throw new Error(`获取用户会话列表失败: ${error.message}`);
    }
  }

  /**
   * 获取会话详情，包括消息
   */
  static async getSessionWithMessages(sessionId: string, userId: string): Promise<Session | null> {
    try {
      // 尝试将 userId 转换为数字
      const userIdNumber = parseInt(userId, 10);
      
      if (isNaN(userIdNumber)) {
        logger.error(`获取会话详情失败: 无效的用户ID ${userId}`);
        throw new Error(`获取会话详情失败: 无效的用户ID`);
      }
      
      logger.info(`尝试获取会话详情: ${sessionId}, 用户ID: ${userIdNumber}`);
      return await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId: userIdNumber
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });
    } catch (error: any) {
      logger.error(`获取会话详情失败: ${error.message}`);
      throw new Error(`获取会话详情失败: ${error.message}`);
    }
  }

  /**
   * 更新会话信息
   */
  static async updateSession(sessionId: string, userId: string, data: { title?: string; description?: string; isActive?: boolean }): Promise<Session> {
    try {
      // 尝试将 userId 转换为数字
      const userIdNumber = parseInt(userId, 10);
      
      if (isNaN(userIdNumber)) {
        logger.error(`更新会话失败: 无效的用户ID ${userId}`);
        throw new Error(`更新会话失败: 无效的用户ID`);
      }
      
      // 先检查会话是否存在且属于该用户
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId: userIdNumber
        }
      });

      if (!session) {
        throw new Error('会话不存在或无权访问');
      }

      return await prisma.session.update({
        where: { id: sessionId },
        data
      });
    } catch (error: any) {
      logger.error(`更新会话失败: ${error.message}`);
      throw new Error(`更新会话失败: ${error.message}`);
    }
  }

  /**
   * 删除会话
   */
  static async deleteSession(sessionId: string, userId: string): Promise<boolean> {
    try {
      // 尝试将 userId 转换为数字
      const userIdNumber = parseInt(userId, 10);
      
      if (isNaN(userIdNumber)) {
        logger.error(`删除会话失败: 无效的用户ID ${userId}`);
        throw new Error(`删除会话失败: 无效的用户ID`);
      }
      
      // 先检查会话是否存在且属于该用户
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId: userIdNumber
        }
      });

      if (!session) {
        throw new Error('会话不存在或无权访问');
      }

      await prisma.session.delete({
        where: { id: sessionId }
      });

      return true;
    } catch (error: any) {
      logger.error(`删除会话失败: ${error.message}`);
      throw new Error(`删除会话失败: ${error.message}`);
    }
  }

  /**
   * 添加消息到会话
   */
  static async addMessage(sessionId: string, role: string, content: string, tokens: number = 0): Promise<ChatMessage> {
    try {
      // 更新会话的updatedAt时间
      await prisma.session.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() }
      });

      return await prisma.chatMessage.create({
        data: {
          sessionId,
          role,
          content,
          tokens
        }
      });
    } catch (error: any) {
      logger.error(`添加消息失败: ${error.message}`);
      throw new Error(`添加消息失败: ${error.message}`);
    }
  }

  /**
   * 获取会话的所有消息
   */
  static async getSessionMessages(sessionId: string, userId: string): Promise<ChatMessage[]> {
    try {
      // 尝试将 userId 转换为数字
      const userIdNumber = parseInt(userId, 10);
      
      if (isNaN(userIdNumber)) {
        logger.error(`获取会话消息失败: 无效的用户ID ${userId}`);
        throw new Error(`获取会话消息失败: 无效的用户ID`);
      }
      
      // 先检查会话是否存在且属于该用户
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId: userIdNumber
        }
      });

      if (!session) {
        throw new Error('会话不存在或无权访问');
      }

      return await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' }
      });
    } catch (error: any) {
      logger.error(`获取会话消息失败: ${error.message}`);
      throw new Error(`获取会话消息失败: ${error.message}`);
    }
  }

  /**
   * 清空会话消息
   */
  static async clearSessionMessages(sessionId: string, userId: string): Promise<boolean> {
    try {
      // 尝试将 userId 转换为数字
      const userIdNumber = parseInt(userId, 10);
      
      if (isNaN(userIdNumber)) {
        logger.error(`清空会话消息失败: 无效的用户ID ${userId}`);
        throw new Error(`清空会话消息失败: 无效的用户ID`);
      }
      
      // 先检查会话是否存在且属于该用户
      const session = await prisma.session.findFirst({
        where: {
          id: sessionId,
          userId: userIdNumber
        }
      });

      if (!session) {
        throw new Error('会话不存在或无权访问');
      }

      await prisma.chatMessage.deleteMany({
        where: { sessionId }
      });

      return true;
    } catch (error: any) {
      logger.error(`清空会话消息失败: ${error.message}`);
      throw new Error(`清空会话消息失败: ${error.message}`);
    }
  }
}
