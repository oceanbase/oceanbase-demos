import { Sequelize, QueryTypes } from "sequelize";
import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";
import { readFileSync } from "fs";

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

// SQL文件执行顺序
const sqlFiles = [
  // 1. 创建表
  "orders.sql",
  "order_items.sql",
  "products.sql",
  "users.sql",
  // 2. 创建物化视图日志（用于FAST REFRESH）
  "mv_logs.sql",
  // 3. 创建物化视图（先尝试FAST REFRESH，如果失败再使用COMPLETE）
  "sales_summary_mv.sql",
];

async function executeSQLFile(filePath: string, description: string) {
  try {
    const sql = readFileSync(filePath, "utf-8");

    // 移除注释行（以 -- 开头的行）
    const lines = sql.split("\n");
    const cleanedLines = lines
      .map((line) => {
        const trimmed = line.trim();
        // 保留包含 SQL 关键字的行，即使有注释
        if (
          trimmed.startsWith("--") &&
          !trimmed.includes("CREATE") &&
          !trimmed.includes("SELECT")
        ) {
          return "";
        }
        return line;
      })
      .filter((line) => line.length > 0);

    const cleanedSQL = cleanedLines.join("\n");

    // 按分号分割SQL语句，但要注意字符串中的分号
    const statements = cleanedSQL
      .split(";")
      .map((s) => s.trim())
      .filter((s) => {
        const trimmed = s.trim();
        return (
          trimmed.length > 0 &&
          !trimmed.startsWith("--") &&
          !trimmed.match(/^\s*$/)
        );
      });

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await sequelize.query(statement, { type: QueryTypes.RAW });
        } catch (stmtError) {
          const stmtErrorMsg =
            stmtError instanceof Error ? stmtError.message : String(stmtError);
          // 如果是"表已存在"或"索引已存在"的错误，可以忽略
          if (
            stmtErrorMsg.includes("already exists") ||
            stmtErrorMsg.includes("Duplicate") ||
            stmtErrorMsg.includes("已存在")
          ) {
            console.log(`    ℹ️  跳过已存在的对象`);
          } else {
            throw stmtError;
          }
        }
      }
    }
    console.log(`  ✅ ${description} 执行成功`);
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`  ⚠️  ${description} 执行失败: ${errorMsg}`);
    return false;
  }
}

async function main() {
  try {
    console.log("🔌 正在连接数据库...");
    await sequelize.authenticate();
    console.log("✅ 数据库连接成功\n");

    const sqlDir = resolve(process.cwd(), "sql");
    let successCount = 0;
    let failCount = 0;

    // 执行SQL文件
    for (const sqlFile of sqlFiles) {
      const filePath = resolve(sqlDir, sqlFile);

      if (!existsSync(filePath)) {
        console.log(`  ⚠️  文件不存在: ${sqlFile}，跳过`);
        failCount++;
        continue;
      }

      console.log(`📄 执行 ${sqlFile}...`);
      const success = await executeSQLFile(filePath, sqlFile);

      if (success) {
        successCount++;
      } else {
        failCount++;
        // 如果是物化视图创建失败，尝试使用COMPLETE版本
        if (sqlFile === "sales_summary_mv.sql") {
          console.log("\n🔄 尝试使用 COMPLETE REFRESH 版本...");
          const completePath = resolve(sqlDir, "sales_summary_mv_complete.sql");
          if (existsSync(completePath)) {
            const completeSuccess = await executeSQLFile(
              completePath,
              "sales_summary_mv_complete.sql"
            );
            if (completeSuccess) {
              successCount++;
              failCount--;
            }
          }
        }
      }
      console.log("");
    }

    // 检查创建的表
    console.log("📊 检查创建的表:");
    const tables = ["orders", "order_items", "products", "users"];
    for (const table of tables) {
      try {
        const [result] = await sequelize.query<{ count: string }>(
          `SELECT COUNT(*) as count FROM ${table}`,
          { type: QueryTypes.SELECT }
        );
        console.log(`  - ${table}: ${result?.count || 0} 条数据`);
      } catch (error) {
        console.log(`  - ${table}: 表不存在或无法访问`);
      }
    }
    console.log("");

    // 检查物化视图
    console.log("📊 检查物化视图:");
    try {
      const [mvResult] = await sequelize.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM sales_summary_mv",
        { type: QueryTypes.SELECT }
      );
      console.log(`  - sales_summary_mv: ${mvResult?.count || 0} 条数据`);
    } catch (error) {
      console.log(`  - sales_summary_mv: 物化视图不存在或无法访问`);
    }
    console.log("");

    // 总结
    console.log("📊 执行总结:");
    console.log(`  - 成功: ${successCount} 个文件`);
    console.log(`  - 失败: ${failCount} 个文件`);
    console.log("");

    if (failCount === 0) {
      console.log("✅ 所有表和物化视图创建成功！");
    } else {
      console.log("⚠️  部分文件执行失败，请检查错误信息");
    }
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
