import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  try {
    // 查询用户表
    const users = await prisma.user.findMany();
    console.log('用户表数据:');
    console.log(JSON.stringify(users, null, 2));
    console.log(`总共 ${users.length} 条记录`);
    
    // 获取数据库中的所有表
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('\n数据库中的表:');
    console.log(tables);
  } catch (error) {
    console.error('查询数据库出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
