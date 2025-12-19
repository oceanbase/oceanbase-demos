"use client";

import { useState, useMemo } from "react";
import { Collapse, Button, Space } from "antd";
import { UpOutlined, TableOutlined } from "@ant-design/icons";
import { useIntl } from "react-intl";
import ReactMarkdown from "react-markdown";
import styles from "./DatasetIntroduction.module.css";
import TableStructure from "./TableStructure";

const { Panel } = Collapse;

export default function DatasetIntroduction() {
  const intl = useIntl();
  const [structureModalOpen, setStructureModalOpen] = useState(false);

  const datasetDescription = useMemo(() => {
    const desc = intl.formatMessage({ id: "dataset.description" });
    const featureTitle = intl.formatMessage({ id: "dataset.feature.title" });
    const precomputeJoin = intl.formatMessage({ id: "dataset.feature.precomputeJoin" });
    const preaggregate = intl.formatMessage({ id: "dataset.feature.preaggregate" });
    const performance = intl.formatMessage({ id: "dataset.feature.performance" });

    return `${desc}

> **${featureTitle}**
> 
> ${intl.locale === "zh-CN" ? "本演示使用**聚合物化视图**（`sales_summary_mv`）来优化查询性能：" : "This demo uses **aggregation materialized view** (`sales_summary_mv`) to optimize query performance:"}
> - ✅ ${precomputeJoin}
> - ✅ ${preaggregate}
> - ✅ ${performance}
`;
  }, [intl]);

  return (
    <>
      <div className={styles.container}>
        <Collapse
          ghost
          defaultActiveKey={[]}
          expandIconPosition="right"
          expandIcon={({ isActive }) => (
            <UpOutlined
              rotate={isActive ? 0 : 180}
              style={{
                fontSize: 12,
                transition: "transform 0.3s",
              }}
            />
          )}
          className={styles.collapse}
        >
          <Panel
            header={
              <Space>
                {intl.formatMessage({ id: "dataset.title" })}
                <Button
                  type="link"
                  icon={<TableOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setStructureModalOpen(true);
                  }}
                  style={{ padding: 0, height: "auto" }}
                >
                  {intl.formatMessage({ id: "dataset.viewTableStructure" })}
                </Button>
              </Space>
            }
            key="1"
          >
            <div className={styles.description}>
              <ReactMarkdown>{datasetDescription}</ReactMarkdown>
            </div>
          </Panel>
        </Collapse>
      </div>
      <TableStructure
        open={structureModalOpen}
        onClose={() => setStructureModalOpen(false)}
      />
    </>
  );
}
