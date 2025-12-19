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
    const desc = intl.formatMessage({ id: "dataset.description", defaultMessage: "这是一个**电商销售统计数据集**，包含订单、订单明细、商品等多张表。数据集涵盖了**2024年1月至12月**的销售数据，包含订单信息、商品信息、用户信息等多维度数据。" });
    const featureTitle = intl.formatMessage({ id: "dataset.feature.title", defaultMessage: "核心特性：聚合物化视图优化" });
    const precomputeJoin = intl.formatMessage({ id: "dataset.feature.precomputeJoin", defaultMessage: "**预计算多表JOIN**：避免每次查询时重复执行多表JOIN操作" });
    const preaggregate = intl.formatMessage({ id: "dataset.feature.preaggregate", defaultMessage: "**预聚合数据**：预计算聚合结果，查询时只需简单的二次聚合" });
    const performance = intl.formatMessage({ id: "dataset.feature.performance", defaultMessage: "**性能提升显著**：相比直接查询基础表，**性能提升可达10-100倍**" });

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
                {intl.formatMessage({ id: "dataset.title", defaultMessage: "数据集介绍" })}
                <Button
                  type="link"
                  icon={<TableOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setStructureModalOpen(true);
                  }}
                  style={{ padding: 0, height: "auto" }}
                >
                  {intl.formatMessage({ id: "dataset.viewTableStructure", defaultMessage: "查看表结构和物化视图结构" })}
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
