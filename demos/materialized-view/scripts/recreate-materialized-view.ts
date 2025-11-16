import { Sequelize, QueryTypes } from 'sequelize';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// 加载环境变量
const envLocalPath = resolve(process.cwd(), '.env.local');
const envPath = resolve(process.cwd(), '.env');

if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
} else if (existsSync(envPath)) {
  config({ path: envPath });
}

// 创建 Sequelize 实例
const sequelize = new Sequelize(
  process.env.OCEANBASE_DATABASE || 'test',
  process.env.OCEANBASE_USERNAME || 'root',
  process.env.OCEANBASE_PASSWORD || '',
  {
    host: process.env.OCEANBASE_HOST || '127.0.0.1',
    port: parseInt(process.env.OCEANBASE_PORT || '2883', 10),
    dialect: 'mysql',
    logging: false,
  }
);

async function main() {
  try {
    console.log('🔌 正在连接数据库...');
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功\n');

    // 读取物化视图定义
    const mvSqlPath = resolve(process.cwd(), 'sql/th_cluster_v3.sql');
    let mvSql: string;
    
    try {
      mvSql = readFileSync(mvSqlPath, 'utf-8');
      console.log('📄 读取物化视图定义文件\n');
    } catch {
      console.error('❌ 无法读取物化视图定义文件:', mvSqlPath);
      process.exit(1);
    }

    // 删除现有的物化视图（如果存在）
    console.log('🗑️  删除现有的物化视图（如果存在）...');
    try {
      await sequelize.query('DROP MATERIALIZED VIEW IF EXISTS th_cluster_v3', { type: QueryTypes.RAW });
      console.log('✅ 已删除现有物化视图\n');
    } catch {
      console.log('ℹ️  物化视图不存在或删除失败，继续创建\n');
    }

    // 设置查询改写相关的系统变量
    console.log('⚙️  设置查询改写系统变量...');
    try {
      // 设置全局变量（对所有会话生效）
      await sequelize.query("SET GLOBAL query_rewrite_enabled = 'force'", { type: QueryTypes.RAW });
      await sequelize.query("SET GLOBAL query_rewrite_integrity = 'stale_tolerated'", { type: QueryTypes.RAW });
      console.log('✅ 查询改写系统变量设置成功\n');
    } catch {
      console.log('⚠️  设置全局变量失败，尝试设置会话变量...');
      try {
        // 如果全局变量设置失败，尝试设置会话变量
        await sequelize.query("SET query_rewrite_enabled = 'force'", { type: QueryTypes.RAW });
        await sequelize.query("SET query_rewrite_integrity = 'stale_tolerated'", { type: QueryTypes.RAW });
        console.log('✅ 查询改写系统变量设置成功（会话级别）\n');
      } catch {
        console.log('⚠️  设置查询改写系统变量失败，但继续创建物化视图\n');
      }
    }

    // 创建物化视图
    console.log('🔨 创建物化视图...');
    try {
      // 设置 collation_connection 为 utf8mb4_general_ci（OceanBase 默认）
      await sequelize.query("SET collation_connection = 'utf8mb4_general_ci'", { type: QueryTypes.RAW });
      
      // 执行创建语句
      await sequelize.query(mvSql, { type: QueryTypes.RAW });
      console.log('✅ 物化视图创建成功\n');
    } catch (error) {
      console.error('❌ 创建物化视图失败:');
      if (error instanceof Error) {
        console.error(`错误: ${error.message}`);
      } else {
        console.error(error);
      }
      process.exit(1);
    }

    // 检查物化视图数据
    console.log('📊 检查物化视图数据:');
    try {
      const [mvCount] = await sequelize.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM th_cluster_v3',
        { type: QueryTypes.SELECT }
      );
      console.log(`  - th_cluster_v3: ${mvCount?.count || 0} 条\n`);
    } catch {
      console.log(`  - th_cluster_v3: 无法访问\n`);
    }

    console.log('✅ 完成！');
  } catch (error) {
    console.error('\n❌ 执行失败:');
    if (error instanceof Error) {
      console.error(`错误: ${error.message}`);
    } else {
      console.error(error);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();

