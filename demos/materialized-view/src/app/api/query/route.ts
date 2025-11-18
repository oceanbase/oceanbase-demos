import { NextRequest, NextResponse } from "next/server";
import { executeQueryWithTiming, testConnection } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sql, scenarioId, queryType } = body;

    if (!sql || typeof sql !== "string") {
      return NextResponse.json(
        { success: false, error: "SQL 查询不能为空" },
        { status: 400 }
      );
    }

    // 测试数据库连接
    const isConnected = await testConnection();
    if (!isConnected) {
      const host = process.env.OCEANBASE_HOST || "127.0.0.1";
      const port = process.env.OCEANBASE_PORT || "2883";
      return NextResponse.json(
        {
          success: false,
          error: `数据库连接失败，请检查配置\n连接地址: ${host}:${port}\n可能原因: 数据库服务未启动、网络问题或配置错误`,
        },
        { status: 500 }
      );
    }

    // 执行 SQL 查询（如果提供了场景 ID 和查询类型，会进行转换）
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
