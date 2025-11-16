"use client";

import { useMemo } from "react";
import { DataGrid, Column } from "react-data-grid";
import "react-data-grid/lib/styles.css";

interface ExecutionResultTableProps {
  data: Array<Record<string, string | number>>;
}

export default function ExecutionResultTable({
  data,
}: ExecutionResultTableProps) {
  const columns = useMemo<Column<Record<string, string | number>>[]>(() => {
    if (data.length === 0) return [];

    const keys = Object.keys(data[0]);
    return keys.map((key) => ({
      key,
      name: key,
      resizable: true,
      sortable: true,
      width: 150,
    }));
  }, [data]);

  if (data.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: 300,
          color: "#999",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>📁</div>
        <div style={{ fontSize: 14 }}>请先点击执行SQL 按钮</div>
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

