"use client";

import { Column } from "@ant-design/charts";
import { Spin } from "antd";
import { useIntl } from "react-intl";
import { useQueryTypes } from "@/hooks/useScenarios";

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
  const intl = useIntl();
  const queryTypes = useQueryTypes();
  
  // 确保数据格式正确
  const chartData = Array.isArray(data)
    ? data.map((item) => ({
        type: item.type || "",
        time: typeof item.time === "number" ? item.time : 0,
      }))
    : [];

  // 获取所有唯一的类型，用于设置颜色映射
  // 使用国际化后的 queryTypes 的顺序，确保所有类型都有颜色映射（即使值为 0）
  const allTypes = queryTypes.map((q) => q.label);

  // 根据 type 索引获取颜色（按照 queryTypes 的顺序）
  const colors = ["#057cf2", "#52c41a", "#fa8c16"]; // 蓝色、绿色、橙色
  const getColorByType = (type: string) => {
    const index = queryTypes.findIndex((q) => q.label === type);
    return index >= 0 ? colors[index] : "#057cf2";
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
        alias: intl.formatMessage({ id: "results.executionTime" }),
      },
      type: {
        alias: intl.locale === "zh-CN" ? "查询类型" : "Query Type",
        // 确保按照国际化后的 queryTypes 的顺序显示
        domain: allTypes,
      },
    },
    tooltip: {
      items: [
        (d: Record<string, unknown>) => ({
          name: intl.formatMessage({ id: "results.executionTime" }),
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
        background: "#fff",
        borderRadius: "4px",
        width: "100%",
      }}
    >
      <Column {...config} />
    </div>
  );
}
