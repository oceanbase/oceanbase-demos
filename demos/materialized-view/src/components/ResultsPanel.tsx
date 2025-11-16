"use client";

import { Tabs } from "antd";
import ExecutionTimeChart from "./ExecutionTimeChart";
import ExecutionResultTable from "./ExecutionResultTable";
import styles from "./ResultsPanel.module.css";

interface ResultsPanelProps {
  executionTimes: Array<{
    type: string;
    time: number;
  }>;
  executionResults: Array<Record<string, string | number>>;
  hasExecuted: boolean;
}

const EmptyState = () => (
  <div className={styles.emptyState}>
    <div className={styles.emptyIcon}>📁</div>
    <div className={styles.emptyText}>请先点击执行SQL 按钮</div>
  </div>
);

export default function ResultsPanel({
  executionTimes,
  executionResults,
  hasExecuted,
}: ResultsPanelProps) {
  const items = [
    {
      key: "time",
      label: "执行时间",
      children: hasExecuted ? (
        <div className={styles.chartContainer}>
          <ExecutionTimeChart data={executionTimes} />
        </div>
      ) : (
        <EmptyState />
      ),
    },
    {
      key: "result",
      label: "执行结果",
      children: (
        <ExecutionResultTable
          data={hasExecuted ? executionResults : []}
        />
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <Tabs items={items} defaultActiveKey="time" className={styles.tabs} />
    </div>
  );
}

