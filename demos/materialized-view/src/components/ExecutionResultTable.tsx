"use client";

import { useMemo } from "react";
import { DataGrid, Column } from "react-data-grid";
import { Spin, Empty } from "antd";
import "react-data-grid/lib/styles.css";

interface ExecutionResultTableProps {
  data: Array<Record<string, string | number>>;
  loading?: boolean;
}

export default function ExecutionResultTable({
  data,
  loading = false,
}: ExecutionResultTableProps) {
  const columns = useMemo<Column<Record<string, string | number>>[]>(() => {
    if (!data || data.length === 0) return [];

    const firstRow = data[0];
    if (!firstRow || typeof firstRow !== "object") return [];

    const keys = Object.keys(firstRow);
    return keys.map((key) => ({
      key,
      name: key,
      resizable: true,
      sortable: true,
      width: 150,
    }));
  }, [data]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 400,
          background: "#fff",
          border: "1px solid #e8e8e8",
          borderRadius: "4px",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 400,
          background: "#fff",
          border: "1px solid #e8e8e8",
          borderRadius: "4px",
        }}
      >
        <Empty description="暂无数据" />
      </div>
    );
  }

  return (
    <div
      style={{
        height: 400,
        border: "1px solid #e8e8e8",
        borderRadius: "4px",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      <DataGrid
        columns={columns}
        rows={data}
        defaultColumnOptions={{
          resizable: true,
          sortable: true,
        }}
        style={{ height: "100%", border: "none" }}
      />
    </div>
  );
}
