#!/usr/bin/env tsx

/**
 * 数据库连接测试脚本
 * 用法: pnpm tsx scripts/test-connection.ts
 */

// 加载环境变量
import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';

const envLocalPath = resolve(process.cwd(), '.env.local');
const envPath = resolve(process.cwd(), '.env');

if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
} else if (existsSync(envPath)) {
  config({ path: envPath });
} else {
  config();
}

import { sequelize } from '../src/lib/db';

async function testConnection() {
  const host = process.env.OCEANBASE_HOST || '127.0.0.1';
  const port = process.env.OCEANBASE_PORT || '2883';
  const database = process.env.OCEANBASE_DATABASE || 'test';
  const username = process.env.OCEANBASE_USERNAME || 'root';
  
  console.log('📋 数据库连接配置:');
  console.log(`  - Host: ${host}`);
  console.log(`  - Port: ${port}`);
  console.log(`  - Database: ${database}`);
  console.log(`  - Username: ${username}`);
  console.log(`  - Password: ${process.env.OCEANBASE_PASSWORD ? '***' : '(未设置)'}\n`);
  
  console.log('🔌 正在测试连接...\n');
  
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功！\n');
    
    // 测试简单查询
    const [results] = await sequelize.query('SELECT 1 as test', { type: 'SELECT' });
    if (Array.isArray(results) && results.length > 0) {
      console.log('✅ 查询测试成功:', results);
    }
    
    // 显示数据库版本
    try {
      const [versionResults] = await sequelize.query('SELECT VERSION() as version', { type: 'SELECT' });
      if (Array.isArray(versionResults) && versionResults.length > 0) {
        const version = versionResults[0] as { version: string };
        console.log('📊 数据库版本:', version.version);
      }
    } catch {
      // 忽略版本查询错误
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ 数据库连接失败:\n');
    
    if (error instanceof Error) {
      console.error(`错误信息: ${error.message}\n`);
      
      if (error.message.includes('ECONNREFUSED')) {
        console.error('💡 连接被拒绝，请检查：');
        console.error('  1. 数据库服务是否正在运行');
        console.error('  2. 主机地址和端口是否正确');
        console.error('  3. 防火墙或安全组是否允许连接');
        console.error('  4. 如果是云数据库，检查白名单设置');
      } else if (error.message.includes('ENOTFOUND')) {
        console.error('💡 DNS 解析失败，请检查：');
        console.error('  1. 主机地址是否正确');
        console.error('  2. 网络连接是否正常');
        console.error('  3. DNS 解析是否正常');
      } else if (error.message.includes('Access denied') || error.message.includes('ER_ACCESS_DENIED')) {
        console.error('💡 访问被拒绝，请检查：');
        console.error('  1. 用户名和密码是否正确');
        console.error('  2. 用户是否有访问该数据库的权限');
        console.error('  3. 如果是云数据库，检查访问权限设置');
      } else if (error.message.includes('Unknown database')) {
        console.error('💡 数据库不存在，请检查：');
        console.error('  1. 数据库名称是否正确');
        console.error('  2. 数据库是否已创建');
      }
    } else {
      console.error(error);
    }
    
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

testConnection();

