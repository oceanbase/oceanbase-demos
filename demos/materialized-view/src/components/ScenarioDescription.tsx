"use client";

import Image from "next/image";
import styles from "./ScenarioDescription.module.css";

interface ScenarioDescriptionProps {
  description: string;
}

export default function ScenarioDescription({
  description,
}: ScenarioDescriptionProps) {
  return (
    <div className={styles.container}>
      <Image
        src="/image/start.svg"
        alt="start"
        width={24}
        height={24}
        style={{ marginTop: -2 }}
      />
      <span className={styles.text}>
        <span className={styles.label}>场景说明:</span> {description}
      </span>
    </div>
  );
}
