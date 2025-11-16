"use client";

import { Tabs } from "antd";
import styles from "./QueryTypeSelector.module.css";

interface QueryTypeSelectorProps {
  activeQueryType: string;
  onQueryTypeChange: (type: string) => void;
}

const queryTypes = [
  { key: "base", label: "查询基本表" },
  { key: "materialized", label: "查询实时物化视图" },
  { key: "rewrite", label: "查询改写" },
];

export default function QueryTypeSelector({
  activeQueryType,
  onQueryTypeChange,
}: QueryTypeSelectorProps) {
  return (
    <div className={styles.container}>
      <Tabs
        activeKey={activeQueryType}
        onChange={onQueryTypeChange}
        items={queryTypes}
        className={styles.tabs}
      />
    </div>
  );
}

