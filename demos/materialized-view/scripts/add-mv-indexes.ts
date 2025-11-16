import { Sequelize, QueryTypes } from "sequelize";
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

// 加载环境变量
const envLocalPath = resolve(process.cwd(), ".env.local");
const envPath = resolve(process.cwd(), ".env");

if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
} else if (existsSync(envPath)) {
  config({ path: envPath });
}

// 创建 Sequelize 实例
const sequelize = new Sequelize(
  process.env.OCEANBASE_DATABASE || "test",
  process.env.OCEANBASE_USERNAME || "root",
  process.env.OCEANBASE_PASSWORD || "",
  {
    host: process.env.OCEANBASE_HOST || "127.0.0.1",
    port: parseInt(process.env.OCEANBASE_PORT || "2883", 10),
    dialect: "mysql",
    logging: false,
  }
);

async function main() {
  try {
    console.log("🔌 正在连接数据库...");
    await sequelize.authenticate();
    console.log("✅ 数据库连接成功\n");

    // 检查物化视图是否存在
    console.log("📊 检查物化视图...");
    try {
      const [mvCount] = await sequelize.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM th_cluster_v3",
        { type: QueryTypes.SELECT }
      );
      console.log(`  - th_cluster_v3: ${mvCount?.count || 0} 条数据\n`);
    } catch (error) {
      console.error("❌ 物化视图 th_cluster_v3 不存在或无法访问");
      if (error instanceof Error) {
        console.error(`错误: ${error.message}`);
      }
      process.exit(1);
    }

    // 检查现有索引
    console.log("🔍 检查现有索引...");
    try {
      const indexes = await sequelize.query<{
        Key_name: string;
        Column_name: string;
      }>(
        "SHOW INDEX FROM th_cluster_v3",
        { type: QueryTypes.SELECT }
      );
      const existingIndexNames = new Set(
        indexes.map((idx) => idx.Key_name)
      );
      console.log(
        `  - 现有索引: ${Array.from(existingIndexNames).join(", ") || "无"}\n`
      );
    } catch (error) {
      console.log("  ⚠️  无法检查现有索引，继续创建\n");
    }

    // 为物化视图添加索引以优化查询性能
    console.log("🔍 为物化视图添加索引...");
    const indexes = [
      {
        name: "idx_pool_id",
        sql: "CREATE INDEX idx_pool_id ON th_cluster_v3(pool_id)",
      },
      {
        name: "idx_ind_level1_id",
        sql: "CREATE INDEX idx_ind_level1_id ON th_cluster_v3(ind_level1_id)",
      },
      {
        name: "idx_pool_ind",
        sql: "CREATE INDEX idx_pool_ind ON th_cluster_v3(pool_id, ind_level1_id)",
      },
      {
        name: "idx_brand_name",
        sql: "CREATE INDEX idx_brand_name ON th_cluster_v3(brand_name)",
      },
      {
        name: "idx_market_code",
        sql: "CREATE INDEX idx_market_code ON th_cluster_v3(market_code)",
      },
      {
        name: "idx_grp_id",
        sql: "CREATE INDEX idx_grp_id ON th_cluster_v3(grp_id)",
      },
    ];

    let createdCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const index of indexes) {
      try {
        await sequelize.query(index.sql, { type: QueryTypes.RAW });
        console.log(`  ✅ 索引 ${index.name} 创建成功`);
        createdCount++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (
          errorMsg.includes("Duplicate key") ||
          errorMsg.includes("already exists") ||
          errorMsg.includes("Duplicate index")
        ) {
          console.log(`  ℹ️  索引 ${index.name} 已存在，跳过`);
          skippedCount++;
        } else {
          console.log(`  ⚠️  索引 ${index.name} 创建失败: ${errorMsg}`);
          failedCount++;
        }
      }
    }
    console.log("");

    // 总结
    console.log("📊 索引创建总结:");
    console.log(`  - 成功创建: ${createdCount} 个`);
    console.log(`  - 已存在（跳过）: ${skippedCount} 个`);
    console.log(`  - 创建失败: ${failedCount} 个\n`);

    // 再次检查索引
    if (createdCount > 0) {
      console.log("🔍 验证索引创建结果...");
      try {
        const indexes = await sequelize.query<{
          Key_name: string;
          Column_name: string;
        }>("SHOW INDEX FROM th_cluster_v3", { type: QueryTypes.SELECT });
        const indexNames = Array.from(
          new Set(indexes.map((idx) => idx.Key_name))
        );
        console.log(`  - 当前索引: ${indexNames.join(", ")}\n`);
      } catch (error) {
        console.log("  ⚠️  无法验证索引\n");
      }
    }

    console.log("✅ 完成！");
  } catch (error) {
    console.error("\n❌ 执行失败:");
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

