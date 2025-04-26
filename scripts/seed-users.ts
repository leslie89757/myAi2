import { PrismaClient } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';
import logger from '../src/utils/logger';

const prisma = new PrismaClient();

async function main() {
  try {
    logger.info('开始创建预设用户...');

    // 预设用户列表
    const users = [
      {
        username: 'user1',
        email: 'user1@example.com',
        password: 'password123',
        role: 'user',
      },
      {
        username: 'user2',
        email: 'user2@example.com',
        password: 'password123',
        role: 'user',
      },
      {
        username: 'admin',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin',
      }
    ];

    // 创建用户
    for (const user of users) {
      // 检查用户是否已存在
      const existingUser = await prisma.user.findUnique({
        where: { username: user.username }
      });

      if (existingUser) {
        logger.info(`用户 ${user.username} 已存在，跳过创建`);
        continue;
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(user.password, 10);

      // 创建用户
      const createdUser = await prisma.user.create({
        data: {
          username: user.username,
          email: user.email,
          password: hashedPassword,
          role: user.role === 'admin' ? 'admin' : 'user',
        }
      });

      logger.info(`创建用户成功: ${createdUser.username} (ID: ${createdUser.id})`);
    }

    logger.info('预设用户创建完成');
  } catch (error) {
    logger.error('创建预设用户失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch(e => {
    logger.error(e);
    process.exit(1);
  });
