"use client";

import { Column } from "@ant-design/charts";

interface ExecutionTimeChartProps {
  data: Array<{
    type: string;
    time: number;
  }>;
}

export default function ExecutionTimeChart({
  data,
}: ExecutionTimeChartProps) {
  const config = {
    data,
    xField: "type",
    yField: "time",
    color: "#1890ff",
    columnStyle: {
      radius: [4, 4, 0, 0],
    },
    label: {
      position: "top" as const,
      formatter: (datum: { time: number }) => `${datum.time}ms`,
      style: {
        fill: "#333",
        fontSize: 12,
        fontWeight: 500,
      },
    },
    xAxis: {
      label: {
        autoRotate: false,
        style: {
          fill: "#666",
          fontSize: 12,
        },
      },
      line: {
        style: {
          stroke: "#e8e8e8",
          lineWidth: 1,
        },
      },
    },
    yAxis: {
      label: {
        formatter: (text: string) => `${text}ms`,
        style: {
          fill: "#666",
          fontSize: 12,
        },
      },
      grid: {
        line: {
          style: {
            stroke: "#e8e8e8",
            lineWidth: 1,
          },
        },
      },
      line: {
        style: {
          stroke: "#e8e8e8",
          lineWidth: 1,
        },
      },
    },
    meta: {
      time: {
        alias: "执行时间",
      },
      type: {
        alias: "查询类型",
      },
    },
    height: 300,
    padding: [16, 24, 24, 24],
    animation: {
      appear: {
        animation: "fade-in",
        duration: 1000,
      },
    },
  };

  return (
    <div style={{ 
      padding: "16px", 
      background: "#fff", 
      borderRadius: "4px",
      width: "100%"
    }}>
      <Column {...config} />
    </div>
  );
}

