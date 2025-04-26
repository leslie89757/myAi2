const { PrismaClient } = require('./src/generated/prisma');
const bcrypt = require('bcrypt');
require('dotenv').config();

const prisma = new PrismaClient();

async function resetUserPassword() {
  try {
    // 查找测试用户
    const user = await prisma.user.findFirst({
      where: {
        username: 'testuser'
      }
    });
    
    if (!user) {
      console.log('用户不存在');
      return;
    }
    
    // 生成新的密码哈希
    const newPassword = 'password123';
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // 更新密码
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash }
    });
    
    console.log('密码已重置，用户信息:', {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      password: '已加密',
      role: updatedUser.role
    });
    console.log(`可以使用以下凭据登录:\n用户名: ${updatedUser.username}\n电子邮件: ${updatedUser.email}\n密码: ${newPassword}`);
  } catch (error) {
    console.error('重置密码失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetUserPassword();
