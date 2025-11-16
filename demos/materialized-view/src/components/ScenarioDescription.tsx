"use client";

import { StarOutlined } from "@ant-design/icons";
import styles from "./ScenarioDescription.module.css";

interface ScenarioDescriptionProps {
  description: string;
}

export default function ScenarioDescription({
  description,
}: ScenarioDescriptionProps) {
  return (
    <div className={styles.container}>
      <StarOutlined className={styles.icon} />
      <span className={styles.text}>
        <span className={styles.label}>场景说明:</span> {description}
      </span>
    </div>
  );
}

