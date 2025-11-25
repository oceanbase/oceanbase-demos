import { Sequelize, QueryTypes } from "sequelize";
import mysql2 from "mysql2";
import { scenarios } from "@/data/scenarios";

// 数据库配置类型
interface DbConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  dialect: "mysql";
  logging: boolean | typeof console.log;
  pool: {
    max: number;
    min: number;
    acquire: number;
    idle: number;
    evict: number;
  };
  timezone: string;
  dialectOptions: {
    connectTimeout: number;
    reconnect: boolean;
    enableKeepAlive: boolean;
    keepAliveInitialDelay: number;
  };
}

// 缓存数据库配置（只读取一次）
let cachedDbConfig: DbConfig | null = null;

// 获取数据库配置（只读取一次，后续复用）
function getDbConfig(): DbConfig {
  if (!cachedDbConfig) {
    cachedDbConfig = {
      host: process.env.OCEANBASE_HOST || "127.0.0.1",
      port: parseInt(process.env.OCEANBASE_PORT || "2883", 10),
      database: process.env.OCEANBASE_DATABASE || "test",
      username: process.env.OCEANBASE_USERNAME || "root",
      password: process.env.OCEANBASE_PASSWORD || "",
      dialect: "mysql" as const,
      logging: process.env.NODE_ENV === "development" ? console.log : false,
      pool: {
        max: 20, // 最大连接数：支持并发查询（可同时处理多个场景的3个查询）
        min: 3, // 最小连接数：保持预热连接，减少连接建立延迟
        acquire: 60000, // 从连接池获取连接的超时时间（60秒，应对高并发场景）
        idle: 30000, // 连接空闲超时时间（30秒，平衡资源利用和连接保持）
        evict: 1000, // 连接池检查空闲连接的间隔（1秒）
      },
      timezone: "+08:00", // 设置时区
      // mysql2 特定配置
      dialectOptions: {
        connectTimeout: 30000, // mysql2 连接超时（30秒，应对网络延迟）
        // 禁用自动重连，由应用层控制
        reconnect: false,
        // mysql2 连接选项
        enableKeepAlive: true, // 启用 TCP keepalive，保持连接活跃
        keepAliveInitialDelay: 0, // keepalive 初始延迟
      },
    };
  }
  return cachedDbConfig;
}

// 缓存 Sequelize 实例（单例模式）
let sequelizeInstance: Sequelize | null = null;

// 获取 Sequelize 实例（只创建一次，后续复用）
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

// 测试数据库连接（带重试机制）
export async function testConnection(retries = 2) {
  // 复用缓存的配置
  const dbConfig = getDbConfig();
  // 复用 Sequelize 实例
  const sequelize = getSequelize();

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[数据库连接] 重试连接 (${attempt}/${retries})...`);
        // 等待后重试，避免立即重试
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }

      console.log(
        `[数据库连接] 尝试连接到 ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`
      );

      await sequelize.authenticate();
      console.log("数据库连接成功");
      return true;
    } catch (error) {
      const isLastAttempt = attempt === retries;

      if (isLastAttempt) {
        console.error("数据库连接失败:", error);

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
- 连接超时: ${dbConfig.dialectOptions.connectTimeout}ms

可能的原因:
1. 数据库服务未启动
2. 主机地址或端口配置错误
3. 网络连接问题或防火墙阻止
4. 连接超时（当前超时设置: ${dbConfig.dialectOptions.connectTimeout}ms）

解决方案:
- 检查数据库服务是否运行
- 验证连接信息是否正确
- 检查网络连接和防火墙设置
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
      }
    }
  }

  return false;
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

    // 查询超时配置（60秒，应对复杂查询和网络延迟）
    const queryTimeout = 60000;

    // 复用 Sequelize 实例
    const sequelize = getSequelize();

    // Sequelize.query 返回 [results, metadata] 格式
    // 使用 type: QueryTypes.SELECT 明确指定查询类型
    // 添加超时配置和重试机制以应对并发和延时场景
    // 使用 Promise.race 实现查询超时
    const queryPromise = sequelize.query(actualSql, {
      type: QueryTypes.SELECT,
      // 使用连接池中的连接，支持并发查询
      raw: true,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`查询超时（${queryTimeout}ms）`));
      }, queryTimeout);
    });

    const queryResult = await Promise.race([queryPromise, timeoutPromise]);

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

    // 提供更详细的错误信息，帮助诊断并发和超时问题
    let errorMessage = "SQL 执行失败";
    if (error instanceof Error) {
      errorMessage = error.message;

      // 识别常见的并发和超时错误
      if (
        error.message.includes("timeout") ||
        error.message.includes("ETIMEDOUT")
      ) {
        errorMessage = "查询超时，可能是网络延迟或查询复杂度过高";
      } else if (
        error.message.includes("Connection lost") ||
        error.message.includes("ECONNRESET")
      ) {
        errorMessage = "数据库连接丢失，请重试";
      } else if (error.message.includes("Too many connections")) {
        errorMessage = "数据库连接数过多，请稍后重试";
      }
    }

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

// 获取连接池状态（用于监控和调试）
export function getPoolStatus() {
  try {
    // 访问 Sequelize 内部的连接池
    const sequelizeInstance = getSequelize();
    const pool = (
      sequelizeInstance as unknown as {
        pool?: {
          size?: number;
          available?: number;
          using?: number;
          waiting?: number;
        };
      }
    ).pool;

    if (!pool) {
      return null;
    }

    return {
      size: pool.size || 0, // 当前连接数
      available: pool.available || 0, // 可用连接数
      using: pool.using || 0, // 正在使用的连接数
      waiting: pool.waiting || 0, // 等待连接的请求数
    };
  } catch (error) {
    console.error("获取连接池状态失败:", error);
    return null;
  }
}
