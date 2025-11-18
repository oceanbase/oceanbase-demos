"use client";

import { useMemo, useState } from "react";
import { DataGrid, Column, SortColumn } from "react-data-grid";
import { Spin, Empty } from "antd";
import "react-data-grid/lib/styles.css";
import styles from "./ExecutionResultTable.module.css";

interface ExecutionResultTableProps {
  data: Array<Record<string, string | number>>;
  loading?: boolean;
}

export default function ExecutionResultTable({
  data,
  loading = false,
}: ExecutionResultTableProps) {
  const [sortColumns, setSortColumns] = useState<readonly SortColumn[]>([]);

  const columns = useMemo<Column<Record<string, string | number>>[]>(() => {
    if (!data || data.length === 0) return [];

    const firstRow = data[0];
    if (!firstRow || typeof firstRow !== "object") return [];

    const keys = Object.keys(firstRow);
    // 添加行号列
    const rowNumberColumn: Column<Record<string, string | number>> = {
      key: "__row_number__",
      name: "#",
      resizable: false,
      sortable: false,
      width: 60,
      frozen: true,
    };

    // 添加数据列
    const dataColumns = keys.map((key) => ({
      key,
      name: key,
      resizable: true,
      sortable: true,
      width: 150,
    }));

    return [rowNumberColumn, ...dataColumns];
  }, [data]);

  // 排序后的数据（添加行号）
  const sortedRows = useMemo(() => {
    let sorted = data;

    if (sortColumns.length > 0) {
      sorted = [...data].sort((a, b) => {
        for (const sort of sortColumns) {
          // 跳过行号列
          if (sort.columnKey === "__row_number__") continue;

          const aValue = a[sort.columnKey];
          const bValue = b[sort.columnKey];

          // 处理 null/undefined
          if (aValue == null && bValue == null) continue;
          if (aValue == null) return sort.direction === "ASC" ? -1 : 1;
          if (bValue == null) return sort.direction === "ASC" ? 1 : -1;

          // 数值比较
          if (typeof aValue === "number" && typeof bValue === "number") {
            const diff = aValue - bValue;
            if (diff !== 0) {
              return sort.direction === "ASC" ? diff : -diff;
            }
            continue;
          }

          // 字符串比较
          const aStr = String(aValue);
          const bStr = String(bValue);
          const diff = aStr.localeCompare(bStr, undefined, { numeric: true });
          if (diff !== 0) {
            return sort.direction === "ASC" ? diff : -diff;
          }
        }
        return 0;
      });
    }

    // 为每行添加行号
    return sorted.map((row, index) => ({
      ...row,
      __row_number__: index + 1,
    })) as Array<Record<string, string | number>>;
  }, [data, sortColumns]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}
        >
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={styles.container}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
          }}
        >
          <Empty description="暂无数据" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <DataGrid
        columns={columns}
        rows={sortedRows}
        sortColumns={sortColumns}
        onSortColumnsChange={setSortColumns}
        defaultColumnOptions={{
          resizable: true,
          sortable: true,
        }}
        style={{ height: "100%", border: "none" }}
        className="rdg-light"
      />
    </div>
  );
}
