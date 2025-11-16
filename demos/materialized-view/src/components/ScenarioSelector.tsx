"use client";

import { Tabs } from "antd";
import styles from "./ScenarioSelector.module.css";

interface ScenarioSelectorProps {
  activeScenario: number;
  onScenarioChange: (scenario: number) => void;
}

const scenarios = [
  { key: "1", label: "场景1" },
  { key: "2", label: "场景2" },
  { key: "3", label: "场景3" },
];

export default function ScenarioSelector({
  activeScenario,
  onScenarioChange,
}: ScenarioSelectorProps) {
  return (
    <div className={styles.container}>
      <Tabs
        activeKey={String(activeScenario)}
        onChange={(key) => onScenarioChange(Number(key))}
        items={scenarios}
        className={styles.tabs}
      />
    </div>
  );
}

