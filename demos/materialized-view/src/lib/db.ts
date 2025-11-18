import { Sequelize, QueryTypes } from "sequelize";
import mysql2 from "mysql2";
import { scenarios } from "@/data/scenarios";

// 获取数据库配置（每次调用时重新读取环境变量）
function getDbConfig() {
  return {
    host: process.env.OCEANBASE_HOST || "127.0.0.1",
    port: parseInt(process.env.OCEANBASE_PORT || "2883", 10),
    database: process.env.OCEANBASE_DATABASE || "test",
    username: process.env.OCEANBASE_USERNAME || "root",
    password: process.env.OCEANBASE_PASSWORD || "",
    dialect: "mysql" as const,
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000, // 从连接池获取连接的超时时间（30秒）
      idle: 10000,
    },
    timezone: "+08:00", // 设置时区
    // mysql2 特定配置
    dialectOptions: {
      connectTimeout: 10000, // mysql2 连接超时（10秒）
      // 禁用自动重连，由应用层控制
      reconnect: false,
    },
  };
}

// 延迟创建 Sequelize 实例（确保环境变量已加载）
let sequelizeInstance: Sequelize | null = null;

function getSequelize(): Sequelize {
  if (!sequelizeInstance) {
    const dbConfig = getDbConfig();
    sequelizeInstance = new Sequelize(
      dbConfig.database,
      dbConfig.username,
      dbConfig.password,
      {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        dialectModule: mysql2, // 明确指定使用 mysql2，避免加载其他驱动
        logging: dbConfig.logging,
        pool: dbConfig.pool,
        timezone: dbConfig.timezone,
        dialectOptions: dbConfig.dialectOptions,
      }
    );
  }
  return sequelizeInstance;
}

// 导出 sequelize（延迟初始化）
export const sequelize = new Proxy({} as Sequelize, {
  get(_target, prop) {
    return Reflect.get(getSequelize(), prop);
  },
});

// 测试数据库连接
export async function testConnection() {
  try {
    const dbConfig = getDbConfig();
    console.log(
      `[数据库连接] 尝试连接到 ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`
    );

    await sequelize.authenticate();
    console.log("OceanBase 数据库连接成功");
    return true;
  } catch (error) {
    const dbConfig = getDbConfig();
    console.error("OceanBase 数据库连接失败:", error);

    // 提供更详细的错误信息
    if (error instanceof Error) {
      if (
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("ECONNREFUSED")
      ) {
        console.error(`
[连接诊断]
- 连接地址: ${dbConfig.host}:${dbConfig.port}
- 数据库名: ${dbConfig.database}
- 用户名: ${dbConfig.username}

可能的原因:
1. OceanBase 数据库服务未启动
2. 主机地址或端口配置错误
3. 网络连接问题或防火墙阻止
4. 连接超时（当前超时设置: 10秒）

解决方案:
- 检查 OceanBase 服务是否运行: obd cluster list
- 验证连接信息是否正确
- 检查网络连接和防火墙设置
- 尝试增加连接超时时间
        `);
      } else if (
        error.message.includes("Access denied") ||
        error.message.includes("ER_ACCESS_DENIED_ERROR")
      ) {
        console.error(`
[认证失败]
- 用户名: ${dbConfig.username}
- 密码: ${dbConfig.password ? "***" : "(未设置)"}

请检查用户名和密码是否正确
        `);
      }
    }

    return false;
  }
}

// 根据场景 ID 和查询类型获取实际执行的 SQL
function getActualSql(
  sql: string,
  scenarioId?: number,
  queryType?: string
): string {
  // 如果提供了场景 ID 和查询类型，且查询类型是 rewrite，则使用 materialized 查询
  if (scenarioId && queryType === "rewrite") {
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (scenario) {
      console.log(
        `[查询转换] 场景 ${scenarioId} 的 rewrite 查询转换为物化视图查询`
      );
      return scenario.sql.materialized;
    }
  }

  // 否则返回原始 SQL
  return sql;
}

// 执行原始 SQL 查询
export async function executeQuery(
  sql: string,
  scenarioId?: number,
  queryType?: string
) {
  try {
    // 根据场景 ID 和查询类型获取实际执行的 SQL
    const actualSql = getActualSql(sql, scenarioId, queryType);

    // Sequelize.query 返回 [results, metadata] 格式
    // 使用 type: QueryTypes.SELECT 明确指定查询类型
    const queryResult = await sequelize.query(actualSql, {
      type: QueryTypes.SELECT,
    });

    // queryResult 是结果数组（使用 QueryTypes.SELECT 时直接返回数组）
    // 确保返回的是数组
    const data = Array.isArray(queryResult) ? queryResult : [];

    return {
      success: true,
      data: data,
      rowCount: data.length,
    };
  } catch (error: unknown) {
    console.error("SQL 执行错误:", error);
    const errorMessage =
      error instanceof Error ? error.message : "SQL 执行失败";
    return {
      success: false,
      error: errorMessage,
      data: [],
      rowCount: 0,
    };
  }
}

// 执行 SQL 并测量执行时间
export async function executeQueryWithTiming(
  sql: string,
  scenarioId?: number,
  queryType?: string
) {
  const startTime = Date.now();
  const result = await executeQuery(sql, scenarioId, queryType);
  const endTime = Date.now();
  const executionTime = endTime - startTime;

  return {
    ...result,
    executionTime,
  };
}
