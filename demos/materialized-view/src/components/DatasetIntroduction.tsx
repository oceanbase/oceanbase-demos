"use client";

import { Collapse } from "antd";
import { CaretUpOutlined } from "@ant-design/icons";
import styles from "./DatasetIntroduction.module.css";

const { Panel } = Collapse;

const datasetDescription = `这是一个来自跨国零售商的样本数据集，包含2010年12月1日至2011年12月9日的发票信息。该公司主要销售礼品，部分客户是批发商。该数据可用于分析销售趋势、产品销售情况和客户购买行为。`;

export default function DatasetIntroduction() {
  return (
    <div className={styles.container}>
      <Collapse
        ghost
        defaultActiveKey={["1"]}
        expandIcon={({ isActive }) => (
          <CaretUpOutlined 
            rotate={isActive ? 0 : 180} 
            style={{ 
              fontSize: 12,
              color: "#666",
              transition: "transform 0.3s"
            }} 
          />
        )}
        className={styles.collapse}
      >
        <Panel header="数据集介绍" key="1">
          <p className={styles.description}>{datasetDescription}</p>
        </Panel>
      </Collapse>
    </div>
  );
}

