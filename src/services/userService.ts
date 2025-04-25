import prisma from '../lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';
import { User, UserRole } from '../generated/prisma';

/**
 * 用户服务类 - 处理用户相关的业务逻辑
 */
export class UserService {
  /**
   * 通过ID查找用户
   */
  static async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id }
    });
  }

  /**
   * 通过用户名或邮箱查找用户
   */
  static async findByUsernameOrEmail(login: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        OR: [
          { username: login },
          { email: login.toLowerCase() }
        ]
      }
    });
  }

  /**
   * 通过API密钥查找用户
   */
  static async findByApiKey(apiKey: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        apiKey,
        isActive: true
      }
    });
  }

  /**
   * 创建新用户
   */
  static async createUser(userData: {
    username: string;
    email: string;
    password: string;
    role?: UserRole;
  }): Promise<User> {
    // 密码哈希
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);

    return prisma.user.create({
      data: {
        username: userData.username,
        email: userData.email.toLowerCase(),
        password: hashedPassword,
        role: userData.role || 'user'
      }
    });
  }

  /**
   * 更新用户信息
   */
  static async updateUser(id: number, userData: Partial<User>): Promise<User> {
    // 如果包含密码，需要哈希处理
    if (userData.password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);
    }

    return prisma.user.update({
      where: { id },
      data: userData
    });
  }

  /**
   * 生成JWT令牌
   */
  static generateAuthToken(user: User): string {
    const token = jwt.sign(
      { 
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    return token;
  }

  /**
   * 生成API密钥
   */
  static async generateApiKey(userId: number): Promise<string> {
    const apiKey = jwt.sign(
      { id: userId },
      process.env.API_KEY_SECRET || 'your-api-key-secret',
      { expiresIn: '365d' }
    );

    await prisma.user.update({
      where: { id: userId },
      data: { 
        apiKey,
        apiKeyUsage: 0
      }
    });

    return apiKey;
  }

  /**
   * 验证密码
   */
  static async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error: any) {
      logger.error(`密码比较错误: ${error.message}`);
      return false;
    }
  }

  /**
   * 增加API使用次数
   */
  static async incrementApiUsage(userId: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        apiKeyUsage: {
          increment: 1
        }
      }
    });
  }
}
