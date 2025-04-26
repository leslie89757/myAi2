import { PrismaClient } from './src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('Admin123!', SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        username: 'superadmin',
        email: 'superadmin@example.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      }
    });
    console.log('管理员用户创建成功:', user);
  } catch (error) {
    console.error('创建管理员用户失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
