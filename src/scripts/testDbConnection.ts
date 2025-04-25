import prisma from '../lib/prisma';
import logger from '../utils/logger';

/**
 * 测试数据库连接并执行基本操作
 */
async function testDbConnection() {
  try {
    logger.info('开始测试数据库连接...');
    
    // 测试连接
    await prisma.$connect();
    logger.info('数据库连接成功！');
    
    // 测试查询 - 获取用户数量
    const userCount = await prisma.user.count();
    logger.info(`当前数据库中有 ${userCount} 个用户`);
    
    // 测试创建用户
    const testUser = await prisma.user.create({
      data: {
        username: `test_user_${Date.now()}`,
        email: `test_${Date.now()}@example.com`,
        password: 'password123',
        role: 'user'
      }
    });
    logger.info(`成功创建测试用户: ${testUser.username} (ID: ${testUser.id})`);
    
    // 测试查询用户
    const foundUser = await prisma.user.findUnique({
      where: { id: testUser.id }
    });
    logger.info(`成功查询到用户: ${foundUser?.username}`);
    
    // 测试更新用户
    const updatedUser = await prisma.user.update({
      where: { id: testUser.id },
      data: { apiKeyUsage: 5 }
    });
    logger.info(`成功更新用户 API 使用次数: ${updatedUser.apiKeyUsage}`);
    
    // 测试删除用户
    await prisma.user.delete({
      where: { id: testUser.id }
    });
    logger.info(`成功删除测试用户`);
    
    logger.info('数据库连接和基本操作测试成功！');
  } catch (error: any) {
    logger.error(`数据库测试失败: ${error.message}`);
    logger.error(error.stack);
  } finally {
    // 关闭连接
    await prisma.$disconnect();
    logger.info('数据库连接已关闭');
  }
}

// 执行测试
testDbConnection()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error(`执行测试时发生错误: ${error.message}`);
    process.exit(1);
  });
