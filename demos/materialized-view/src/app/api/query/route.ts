import { NextRequest, NextResponse } from "next/server";
import { executeQueryWithTiming, testConnection } from "@/lib/db";
import { scenarios, type QueryType } from "@/data/scenarios";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scenarioId, queryType } = body;

    // 验证必需参数
    if (!scenarioId || typeof scenarioId !== "number") {
      return NextResponse.json(
        { success: false, error: "场景 ID 不能为空且必须是数字" },
        { status: 400 }
      );
    }

    if (!queryType || typeof queryType !== "string") {
      return NextResponse.json(
        { success: false, error: "查询类型不能为空" },
        { status: 400 }
      );
    }

    // 验证查询类型是否有效
    const validQueryTypes: QueryType[] = ["base", "materialized", "rewrite"];
    if (!validQueryTypes.includes(queryType as QueryType)) {
      return NextResponse.json(
        { success: false, error: "无效的查询类型" },
        { status: 400 }
      );
    }

    // 从内置场景中获取 SQL
    const scenario = scenarios.find((s) => s.id === scenarioId);
    if (!scenario) {
      return NextResponse.json(
        { success: false, error: "场景不存在" },
        { status: 400 }
      );
    }

    // 获取场景对应的 SQL
    const sql = scenario.sql[queryType as QueryType];
    if (!sql) {
      return NextResponse.json(
        { success: false, error: "场景中不存在该查询类型的 SQL" },
        { status: 400 }
      );
    }

    // 测试数据库连接
    const isConnected = await testConnection();
    if (!isConnected) {
      return NextResponse.json(
        {
          success: false,
          error: `数据库连接失败，请检查配置\n可能原因: 数据库服务未启动、网络问题或配置错误`,
        },
        { status: 500 }
      );
    }

    // 执行 SQL 查询（使用内置场景的 SQL，确保安全）
    const result = await executeQueryWithTiming(sql, scenarioId, queryType);

    // 打印执行时间
    console.log(`\n[API] SQL 执行时间: ${result.executionTime}ms`);
    if (result.success) {
      console.log(`[API] 查询成功，返回 ${result.rowCount} 行数据`);
    } else {
      console.log(`[API] 查询失败: ${result.error}`);
    }

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        rowCount: result.rowCount,
        executionTime: result.executionTime,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          executionTime: result.executionTime, // 即使失败也返回执行时间
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("API 错误:", error);
    const errorMessage = error instanceof Error ? error.message : "服务器错误";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

// 健康检查接口
export async function GET() {
  try {
    const isConnected = await testConnection();
    return NextResponse.json({
      success: isConnected,
      message: isConnected ? "数据库连接正常" : "数据库连接失败",
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "服务器错误";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
