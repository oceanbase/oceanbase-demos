"use client";

import { useState } from "react";
import { Layout, ConfigProvider } from "antd";
import DatasetIntroduction from "@/components/DatasetIntroduction";
import ScenarioSelector from "@/components/ScenarioSelector";
import ScenarioDescription from "@/components/ScenarioDescription";
import QueryTypeSelector from "@/components/QueryTypeSelector";
import SQLEditor from "@/components/SQLEditor";
import ResultsPanel from "@/components/ResultsPanel";

const { Content } = Layout;

// 场景数据
const scenarioData = {
  1: {
    description: "这是一句简单的场景描述说明这是一句简单的场景描述",
    sql: `SELECT (
COUNT(CASE WHEN event_type = 'purchase' THEN 1 ELSE NULL END) /
COUNT(CASE WHEN event_type = 'view' THEN 1 ELSE NULL END)
) AS bought_rate
FROM events
WHERE event_time >= '2019-11-23 23:59:59'
AND event_time <= '2019-11-30 23:59:59'`,
  },
  2: {
    description: "场景2的描述信息",
    sql: `SELECT * FROM events LIMIT 100`,
  },
  3: {
    description: "场景3的描述信息",
    sql: `SELECT COUNT(*) FROM events`,
  },
};

// 模拟执行时间数据
const getExecutionTimes = () => {
  return [
    {
      type: "查询基础表",
      time: 2100,
    },
    {
      type: "查询实时物化视图",
      time: 800,
    },
    {
      type: "查询改写",
      time: 2000,
    },
  ];
};

// 模拟执行结果数据
const getExecutionResults = () => {
  return Array.from({ length: 6 }, () => ({
    刷新ID: "20241212",
    刷新方法: "20241212",
    刷新优化: "20241212",
    开始时间: "20241212",
    "1L": "20241212",
    结束时间: "20241212",
    "1L_1": "20241212",
    运行时长: "20241212",
    "1L_2": "20241212",
    其他字段: "20241212",
  }));
};

export default function Home() {
  const [activeScenario, setActiveScenario] = useState(1);
  const [activeQueryType, setActiveQueryType] = useState("base");
  const [hasExecuted, setHasExecuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [executionTimes, setExecutionTimes] = useState<
    Array<{ type: string; time: number }>
  >([]);
  const [executionResults, setExecutionResults] = useState<
    Array<Record<string, string | number>>
  >([]);

  const handleExecuteSQL = async () => {
    setLoading(true);
    setHasExecuted(false);

    // 模拟API调用延迟
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 生成执行时间数据
    const times = getExecutionTimes();
    setExecutionTimes(times);

    // 生成执行结果数据
    const results = getExecutionResults();
    setExecutionResults(results);

    setHasExecuted(true);
    setLoading(false);
  };

  const currentScenario = scenarioData[activeScenario as keyof typeof scenarioData];

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1890ff",
        },
      }}
    >
      <Layout style={{ minHeight: "100vh", background: "#fff" }}>
        <Content 
          style={{ 
            padding: "24px", 
            maxWidth: 1400, 
            margin: "0 auto", 
            width: "100%",
            background: "#fff"
          }}
        >
          <DatasetIntroduction />
          
          <ScenarioSelector
            activeScenario={activeScenario}
            onScenarioChange={setActiveScenario}
          />

          <ScenarioDescription description={currentScenario.description} />

          <QueryTypeSelector
            activeQueryType={activeQueryType}
            onQueryTypeChange={setActiveQueryType}
          />

          <SQLEditor
            onExecute={handleExecuteSQL}
            loading={loading}
          />

          <ResultsPanel
            executionTimes={executionTimes}
            executionResults={executionResults}
            hasExecuted={hasExecuted}
          />
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
