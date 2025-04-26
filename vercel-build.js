// vercel-build.js - 专用于Vercel部署的启动脚本
const { execSync } = require('child_process');

// 打印Node.js版本
console.log(`Node.js version: ${process.version}`);
console.log('Running Vercel build script...');

try {
  // 运行TypeScript编译
  console.log('Compiling TypeScript...');
  execSync('npx tsc', { stdio: 'inherit' });
  
  // 复制静态文件
  console.log('Copying static files...');
  execSync('mkdir -p dist/public && cp -r src/public/* dist/public/ || true', { stdio: 'inherit' });
  
  console.log('Build completed successfully.');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
