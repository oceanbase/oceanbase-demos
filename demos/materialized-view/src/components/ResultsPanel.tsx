"use client";

import { useState } from "react";
import { Radio, Empty } from "antd";
import { useIntl } from "react-intl";
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
  loading?: boolean;
}

export default function ResultsPanel({
  executionTimes,
  executionResults,
  hasExecuted,
  loading = false,
}: ResultsPanelProps) {
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState<"time" | "result">("time");

  return (
    <div className={styles.container}>
      <div className={styles.tabSelector}>
        <Radio.Group
          value={activeTab}
          onChange={(e) => setActiveTab(e.target.value)}
          className={styles.radioGroup}
          optionType="button"
        >
          <Radio.Button value="time">{intl.formatMessage({ id: "results.executionTime" })}</Radio.Button>
          <Radio.Button value="result">{intl.formatMessage({ id: "results.executionResult" })}</Radio.Button>
        </Radio.Group>
      </div>

      <div className={styles.content}>
        {activeTab === "time" ? (
          loading || hasExecuted ? (
            <div className={styles.chartContainer}>
              <ExecutionTimeChart data={executionTimes} loading={loading} />
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 300,
                background: "#fff",
                borderRadius: "4px",
              }}
            >
              <Empty description={intl.formatMessage({ id: "results.executeFirst" })} />
            </div>
          )
        ) : (
          <ExecutionResultTable
            data={
              hasExecuted && Array.isArray(executionResults)
                ? executionResults
                : []
            }
            loading={loading}
          />
        )}
      </div>
    </div>
  );
}
