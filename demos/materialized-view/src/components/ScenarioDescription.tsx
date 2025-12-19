"use client";

import Image from "next/image";
import { useIntl } from "react-intl";
import styles from "./ScenarioDescription.module.css";

interface ScenarioDescriptionProps {
  description: string;
}

export default function ScenarioDescription({
  description,
}: ScenarioDescriptionProps) {
  const intl = useIntl();

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
        <span className={styles.label}>{intl.formatMessage({ id: "scenario.label", defaultMessage: "场景说明:" })}</span> {description}
      </span>
    </div>
  );
}
