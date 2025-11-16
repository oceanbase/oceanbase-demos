import { Sequelize, QueryTypes } from 'sequelize';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

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

    // 检查基础表数据
    console.log('📊 检查基础表数据:');
    const [itemPoolCount] = await sequelize.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM item_pool',
      { type: QueryTypes.SELECT }
    );
    const [skuBaseCount] = await sequelize.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM sku_base',
      { type: QueryTypes.SELECT }
    );
    const [skuGrpCount] = await sequelize.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM sku_grp',
      { type: QueryTypes.SELECT }
    );
    
    console.log(`  - item_pool: ${itemPoolCount?.count || 0} 条`);
    console.log(`  - sku_base: ${skuBaseCount?.count || 0} 条`);
    console.log(`  - sku_grp: ${skuGrpCount?.count || 0} 条\n`);

    // 检查物化视图当前数据
    console.log('📊 检查物化视图数据:');
    try {
      const [mvCount] = await sequelize.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM th_cluster_v3',
        { type: QueryTypes.SELECT }
      );
      console.log(`  - th_cluster_v3: ${mvCount?.count || 0} 条\n`);
    } catch (error) {
      console.log(`  - th_cluster_v3: 无法访问\n`);
    }

    // 测试物化视图的查询逻辑
    console.log('🔍 测试物化视图查询逻辑:');
    try {
      const testQuery = `
        SELECT
          COUNT(*) as count
        FROM item_pool
        LEFT JOIN sku_base a ON item_pool.item_id = a.item_id AND item_pool.market_code = a.market_code
        LEFT JOIN sku_grp b ON a.market_code = b.market_code AND a.item_id = b.item_id AND a.sku_id = b.sku_id AND b.market_code <> 'TX'
        LEFT JOIN sku_grp c ON b.grp_id = c.grp_id AND c.market_code = 'TX'
        LEFT JOIN sku_base d ON c.item_id = d.item_id AND c.sku_id = d.sku_id AND c.market_code = d.market_code
      `;
      const [testResult] = await sequelize.query<{ count: string }>(
        testQuery,
        { type: QueryTypes.SELECT }
      );
      console.log(`  - 查询结果应该返回: ${testResult?.count || 0} 条\n`);
    } catch (error) {
      console.error('  - 查询测试失败:', error instanceof Error ? error.message : error);
    }

    // 尝试刷新物化视图
    console.log('🔄 刷新物化视图...');
    const refreshMethods = [
      { name: 'ALTER TABLE ... REFRESH', sql: 'ALTER TABLE th_cluster_v3 REFRESH' },
      { name: 'DBMS_MVIEW.REFRESH', sql: 'CALL DBMS_MVIEW.REFRESH(\'th_cluster_v3\')' },
      { name: 'REFRESH MATERIALIZED VIEW', sql: 'REFRESH MATERIALIZED VIEW th_cluster_v3' },
    ];

    let refreshed = false;
    for (const method of refreshMethods) {
      try {
        console.log(`  尝试方法: ${method.name}...`);
        await sequelize.query(method.sql, { type: QueryTypes.RAW });
        console.log(`  ✅ 使用 ${method.name} 刷新成功\n`);
        refreshed = true;
        break;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`  ❌ ${method.name} 失败: ${errorMsg}`);
      }
    }

    if (!refreshed) {
      console.log('\n⚠️  所有刷新方法都失败了，可能需要手动刷新');
      console.log('💡 提示：可以尝试在数据库中手动执行刷新命令\n');
    }

    // 再次检查物化视图数据
    if (refreshed) {
      console.log('📊 刷新后检查物化视图数据:');
      try {
        const [mvCount] = await sequelize.query<{ count: string }>(
          'SELECT COUNT(*) as count FROM th_cluster_v3',
          { type: QueryTypes.SELECT }
        );
        console.log(`  - th_cluster_v3: ${mvCount?.count || 0} 条\n`);
      } catch (error) {
        console.log(`  - th_cluster_v3: 无法访问\n`);
      }
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

