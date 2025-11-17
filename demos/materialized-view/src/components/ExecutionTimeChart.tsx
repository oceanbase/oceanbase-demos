"use client";

import { Column } from "@ant-design/charts";
import { Spin } from "antd";
import { queryTypes } from "@/data/scenarios";

interface ExecutionTimeChartProps {
  data: Array<{
    type: string;
    time: number;
  }>;
  loading?: boolean;
}

export default function ExecutionTimeChart({
  data,
  loading = false,
}: ExecutionTimeChartProps) {
  // 确保数据格式正确
  const chartData = Array.isArray(data)
    ? data.map((item) => ({
        type: item.type || "",
        time: typeof item.time === "number" ? item.time : 0,
      }))
    : [];

  // 获取所有唯一的类型，用于设置颜色映射
  // 使用 queryTypes 的顺序，确保所有类型都有颜色映射（即使值为 0）
  const allTypes = queryTypes.map((q) => q.label);

  // 根据 type 获取颜色
  const getColorByType = (type: string) => {
    if (type.includes("基本表")) {
      return "#057cf2"; // 查询基本表 - 蓝色
    } else if (type.includes("物化视图")) {
      return "#52c41a"; // 查询物化视图 - 绿色
    } else if (type.includes("改写")) {
      return "#fa8c16"; // 查询改写 - 橙色
    }
    return "#057cf2"; // 默认颜色
  };

  // 生成颜色数组，按照 queryTypes 的顺序
  const colorRange = allTypes.map((type) => getColorByType(type));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: any = {
    height: 250,
    padding: 32,
    data: chartData,
    xField: "type",
    yField: "time",
    colorField: "type",
    scale: {
      color: {
        type: "ordinal" as const,
        domain: allTypes, // 使用固定顺序，确保所有类型都有颜色映射
        range: colorRange,
      },
      time: {
        alias: "执行时间",
      },
      type: {
        alias: "查询类型",
        // 确保按照 queryTypes 的顺序显示
        domain: queryTypes.map((q) => q.label),
      },
    },
    tooltip: {
      items: [
        (d: Record<string, unknown>) => ({
          name: "执行时间",
          value: `${(d.time as number) || 0}ms`,
        }),
      ],
    },
    style: {
      maxWidth: 88,
    },
    labels: [
      {
        text: (d: Record<string, unknown>) => {
          const time = d?.time;
          if (typeof time === "number" && time > 0) {
            return `${time}ms`;
          }
          return "";
        },
        style: {
          fontSize: 12,
          fontWeight: 500,
          dy: -20, // 向上偏移，将标签移到柱子正上方
        },
      },
    ],
    axis: {
      y: {
        labelFormatter: (text: string) => `${text}ms`,
        labelFontSize: 12,
        labelFill: "#666",
        grid: true,
        gridLineWidth: 1,
        gridStroke: "#000000",
        gridLineType: "solid",
        gridLineDash: [0, 0],
        gridOpacity: 0.6,
        tick: false,
        tickCount: 3,
      },
    },
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 300,
          padding: "16px",
          background: "#fff",
          borderRadius: "4px",
          width: "100%",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "16px",
        background: "#fff",
        borderRadius: "4px",
        width: "100%",
      }}
    >
      <Column {...config} />
    </div>
  );
}
