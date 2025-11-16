import { Sequelize } from 'sequelize';
import mysql2 from 'mysql2';

// 获取数据库配置（每次调用时重新读取环境变量）
function getDbConfig() {
  return {
    host: process.env.OCEANBASE_HOST || '127.0.0.1',
    port: parseInt(process.env.OCEANBASE_PORT || '2883', 10),
    database: process.env.OCEANBASE_DATABASE || 'test',
    username: process.env.OCEANBASE_USERNAME || 'root',
    password: process.env.OCEANBASE_PASSWORD || '',
    dialect: 'mysql' as const,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    timezone: '+08:00', // 设置时区
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

// 设置查询改写系统变量
async function setupQueryRewrite() {
  try {
    // 尝试设置会话级别的查询改写变量
    await sequelize.query("SET query_rewrite_enabled = false", { raw: true });
    await sequelize.query("SET query_rewrite_integrity = 'stale_tolerated'", { raw: true });
  } catch (error) {
    // 如果设置失败，不影响其他功能，只记录警告
    if (process.env.NODE_ENV === 'development') {
      console.warn('设置查询改写系统变量失败:', error);
    }
  }
}

// 测试数据库连接
export async function testConnection() {
  try {
    await sequelize.authenticate();
    await setupQueryRewrite();
    console.log('OceanBase 数据库连接成功');
    return true;
  } catch (error) {
    console.error('OceanBase 数据库连接失败:', error);
    return false;
  }
}

// 清理 SQL：移除注释和多余空白
function cleanSQL(sql: string): string {
  return sql
    // 移除单行注释 (-- 开头)
    .replace(/--.*$/gm, '')
    // 移除多行注释 (/* ... */)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // 移除多余空白行
    .replace(/\n\s*\n/g, '\n')
    // 移除首尾空白
    .trim();
}

// 执行原始 SQL 查询
export async function executeQuery(sql: string) {
  try {
    // 确保查询改写系统变量已设置（每次查询前设置，确保会话变量生效）
    await setupQueryRewrite();
    
    // 清理 SQL（移除注释）
    const cleanedSQL = cleanSQL(sql);
    
    // Sequelize.query 返回 [results, metadata] 格式
    // 不使用 type: 'SELECT'，直接使用 raw: true 获取结果数组
    const queryResult = await sequelize.query(cleanedSQL, {
      raw: true,
    });
    
    // queryResult 是 [results, metadata] 格式
    // results 是结果数组
    const results = Array.isArray(queryResult) && queryResult.length > 0 
      ? queryResult[0] 
      : [];
    
    // 确保返回的是数组
    const data = Array.isArray(results) ? results : [];
    
    return {
      success: true,
      data: data,
      rowCount: data.length,
    };
  } catch (error: unknown) {
    console.error('SQL 执行错误:', error);
    const errorMessage = error instanceof Error ? error.message : 'SQL 执行失败';
    return {
      success: false,
      error: errorMessage,
      data: [],
      rowCount: 0,
    };
  }
}

// 执行 SQL 并测量执行时间
export async function executeQueryWithTiming(sql: string) {
  const startTime = Date.now();
  const result = await executeQuery(sql);
  const endTime = Date.now();
  const executionTime = endTime - startTime;

  return {
    ...result,
    executionTime,
  };
}

