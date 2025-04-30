// vercel-build.js - 专用于Vercel部署的启动脚本
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 打印Node.js版本和环境信息
console.log(`Node.js version: ${process.version}`);
console.log(`Platform: ${process.platform}`);
console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);
console.log(`Database URL configured: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
console.log('Running Vercel build script...');

try {
  // 运行Prisma生成 - 确保数据库模型同步
  console.log('Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  // 运行TypeScript编译
  console.log('Compiling TypeScript...');
  execSync('npx tsc', { stdio: 'inherit' });
  
  // 复制静态文件 - 使用更可靠的方式确保所有文件都被复制
  console.log('Copying static files...');
  execSync('mkdir -p dist/public', { stdio: 'inherit' });
  execSync('cp -r src/public/* dist/public/', { stdio: 'inherit' });
  
  // 验证关键页面是否存在
  const loginPath = path.join(__dirname, 'dist', 'public', 'login.html');
  if (!fs.existsSync(loginPath)) {
    console.error('错误: dist/public/login.html 不存在！静态文件可能未正确复制。');
    // 尝试单独复制登录页面文件
    console.log('尝试单独复制登录文件...');
    execSync(`cp ${path.join(__dirname, 'src', 'public', 'login.html')} ${loginPath}`, { stdio: 'inherit' });
  } else {
    console.log(`登录页面文件验证成功: ${loginPath}`);
  }
  
  // 验证编译后入口点文件存在
  const indexPath = path.join(__dirname, 'dist', 'index.js');
  if (!fs.existsSync(indexPath)) {
    console.error('错误: dist/index.js 不存在！需要检查编译设置。');
    process.exit(1);
  }
  console.log(`编译成功: ${indexPath} 文件已创建`);
  
  // 验证src/api是否成功编译
  const apiDirPath = path.join(__dirname, 'dist', 'api');
  if (!fs.existsSync(apiDirPath)) {
    console.warn('警告: dist/api 目录不存在，这可能会导致API路由问题');
  } else {
    console.log(`API路由目录编译成功: ${apiDirPath}`);
  }
  
  console.log('Build completed successfully.');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
