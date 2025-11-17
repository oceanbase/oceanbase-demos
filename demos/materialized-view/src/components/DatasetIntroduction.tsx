"use client";

import { useState } from "react";
import { Collapse, Button, Space } from "antd";
import { UpOutlined, TableOutlined } from "@ant-design/icons";
import ReactMarkdown from "react-markdown";
import styles from "./DatasetIntroduction.module.css";
import TableStructure from "./TableStructure";

const { Panel } = Collapse;

const datasetDescription = `这是一个**电商销售统计数据集**，包含订单、订单明细、商品、用户等多张表。数据集涵盖了**2024年1月至12月**的销售数据，包含订单信息、商品信息、用户信息等多维度数据。

> **核心特性：聚合物化视图优化**
> 
> 本演示使用**聚合物化视图**（\`sales_summary_mv_agg1\`）来优化查询性能：
> - ✅ **预计算多表JOIN**：避免每次查询时重复执行多表JOIN操作
> - ✅ **预聚合数据**：预计算聚合结果，查询时只需简单的二次聚合
> - ✅ **性能提升显著**：相比直接查询基础表，**性能提升可达10-100倍**
`;

export default function DatasetIntroduction() {
  const [structureModalOpen, setStructureModalOpen] = useState(false);

  return (
    <>
      <div className={styles.container}>
        <Collapse
          ghost
          defaultActiveKey={["1"]}
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
                数据集介绍
                <Button
                  type="link"
                  icon={<TableOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    setStructureModalOpen(true);
                  }}
                  style={{ padding: 0, height: "auto" }}
                >
                  查看表结构和物化视图结构
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
