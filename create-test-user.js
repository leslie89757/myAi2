const { PrismaClient } = require('./src/generated/prisma');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // 生成密码哈希
    const passwordHash = await bcrypt.hash('testpassword', 10);
    
    // 检查用户是否已存在
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: 'testuser' },
          { email: 'testuser@example.com' }
        ]
      }
    });
    
    if (existingUser) {
      console.log('测试用户已存在:', existingUser);
      return existingUser;
    }
    
    // 创建新用户
    const user = await prisma.user.create({
      data: {
        username: 'testuser',
        email: 'testuser@example.com',
        password: passwordHash,
        role: 'user',
        isActive: true
      }
    });
    
    console.log('测试用户创建成功:', user);
    return user;
  } catch (error) {
    console.error('创建测试用户失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
