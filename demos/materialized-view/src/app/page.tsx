"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Layout, ConfigProvider, message, Card } from "antd";
import DatasetIntroduction from "@/components/DatasetIntroduction";
import ScenarioDescription from "@/components/ScenarioDescription";
import SQLEditor from "@/components/SQLEditor";
import ResultsPanel from "@/components/ResultsPanel";
import { scenarios, queryTypes, type QueryType } from "@/data/scenarios";

const { Content } = Layout;

// 执行 SQL 查询
async function executeSQLQuery(sql: string) {
  try {
    const response = await fetch("/api/query", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql }),
    });

    const result = await response.json();
    return result;
  } catch (error: unknown) {
    console.error("API 调用失败:", error);
    const errorMessage =
      error instanceof Error ? error.message : "网络请求失败";
    return {
      success: false,
      error: errorMessage,
      data: [],
      rowCount: 0,
      executionTime: 0,
    };
  }
}

// 存储每个场景的查询结果
interface ScenarioResults {
  executionTimes: Array<{ type: string; time: number }>;
  results: {
    base: Array<Record<string, string | number>>;
    materialized: Array<Record<string, string | number>>;
    rewrite: Array<Record<string, string | number>>;
  };
}

export default function Home() {
  const [activeScenario, setActiveScenario] = useState(1);
  const [activeQueryType, setActiveQueryType] = useState<QueryType>("base");
  const [hasExecuted, setHasExecuted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [executionTimes, setExecutionTimes] = useState<
    Array<{ type: string; time: number }>
  >([]);
  const [executionResults, setExecutionResults] = useState<
    Array<Record<string, string | number>>
  >([]);
  const [error, setError] = useState<string>("");
  // 存储每个场景的查询结果
  const [scenarioResults, setScenarioResults] = useState<
    Map<number, ScenarioResults>
  >(new Map());

  // 执行场景的所有查询（同时执行3种查询类型）
  const executeScenarioQueries = useCallback(
    async (scenarioId: number) => {
      const currentScenario = scenarios.find((s) => s.id === scenarioId);
      if (!currentScenario) {
        return;
      }

      setLoading(true);
      setError("");

      try {
        // 并行执行三种查询类型
        const [baseResult, materializedResult, rewriteResult] =
          await Promise.all([
            executeSQLQuery(currentScenario.sql.base),
            executeSQLQuery(currentScenario.sql.materialized),
            executeSQLQuery(currentScenario.sql.rewrite),
          ]);

        // 检查是否有查询失败
        const errors: string[] = [];
        if (!baseResult.success) {
          errors.push(`查询基本表失败: ${baseResult.error || "未知错误"}`);
        }
        if (!materializedResult.success) {
          errors.push(
            `查询物化视图失败: ${materializedResult.error || "未知错误"}`
          );
        }
        if (!rewriteResult.success) {
          errors.push(`查询改写失败: ${rewriteResult.error || "未知错误"}`);
        }

        // 如果有错误，显示错误信息
        if (errors.length > 0) {
          const errorMessage = errors.join("; ");
          setError(errorMessage);
          message.error(`部分查询执行失败: ${errorMessage}`, 5);
        } else {
          setError("");
        }

        // 构建执行时间数据（只包含成功的查询）
        const times = [];
        if (baseResult.success && baseResult.executionTime !== undefined) {
          times.push({
            type:
              queryTypes.find((q) => q.key === "base")?.label || "查询基本表",
            time: baseResult.executionTime,
          });
        }
        if (
          materializedResult.success &&
          materializedResult.executionTime !== undefined
        ) {
          times.push({
            type:
              queryTypes.find((q) => q.key === "materialized")?.label ||
              "查询物化视图",
            time: materializedResult.executionTime,
          });
        }
        if (
          rewriteResult.success &&
          rewriteResult.executionTime !== undefined
        ) {
          times.push({
            type:
              queryTypes.find((q) => q.key === "rewrite")?.label || "查询改写",
            time: rewriteResult.executionTime,
          });
        }

        // 保存结果
        const results: ScenarioResults = {
          executionTimes: times,
          results: {
            base:
              baseResult.success && Array.isArray(baseResult.data)
                ? baseResult.data
                : [],
            materialized:
              materializedResult.success &&
              Array.isArray(materializedResult.data)
                ? materializedResult.data
                : [],
            rewrite:
              rewriteResult.success && Array.isArray(rewriteResult.data)
                ? rewriteResult.data
                : [],
          },
        };

        setScenarioResults((prev) => {
          const newMap = new Map(prev);
          newMap.set(scenarioId, results);
          return newMap;
        });

        // 更新当前显示的数据
        setExecutionTimes(times);
        const currentResult = results.results[activeQueryType];
        setExecutionResults(currentResult);
        setHasExecuted(true);

        // 只有所有查询都成功时才显示成功消息
        if (errors.length === 0) {
          message.success(`场景查询完成，三种查询类型已执行`);
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "查询执行失败";
        setError(errorMessage);
        message.error(errorMessage);
        setExecutionResults([]);
        setExecutionTimes([]);
        setHasExecuted(false);
      } finally {
        setLoading(false);
      }
    },
    [activeQueryType]
  );

  // 手动执行 SQL（用于用户点击执行按钮）
  const handleExecuteSQL = useCallback(async () => {
    await executeScenarioQueries(activeScenario);
  }, [activeScenario, executeScenarioQueries]);

  const currentScenario = scenarios.find((s) => s.id === activeScenario);
  const isInitialMount = useRef(true);

  // 当场景改变时，检查是否需要执行查询
  const handleScenarioChange = (scenarioId: number) => {
    setActiveScenario(scenarioId);
    // 如果该场景已有结果，直接使用；否则会在 useEffect 中执行查询
  };

  // 当查询类型改变时，只更新显示的数据，不重新查询
  const handleQueryTypeChange = (queryType: QueryType) => {
    setActiveQueryType(queryType);

    const results = scenarioResults.get(activeScenario);
    if (results) {
      setExecutionTimes(results.executionTimes);
      setExecutionResults(results.results[queryType]);
    }
  };

  // 自动执行 SQL：只在场景改变且该场景没有结果时执行
  useEffect(() => {
    // 确保场景存在且有 SQL
    if (!currentScenario || !currentScenario.sql[activeQueryType]) {
      return;
    }

    // 如果该场景已有结果，直接使用
    const existingResults = scenarioResults.get(activeScenario);
    if (existingResults) {
      setExecutionTimes(existingResults.executionTimes);
      setExecutionResults(existingResults.results[activeQueryType]);
      setHasExecuted(true);
      return;
    }

    // 如果是初始加载，延迟一下让 UI 先渲染
    const delay = isInitialMount.current ? 500 : 0;
    isInitialMount.current = false;

    // 该场景没有结果，执行查询
    const timer = setTimeout(() => {
      executeScenarioQueries(activeScenario);
    }, delay);

    return () => clearTimeout(timer);
  }, [
    activeScenario,
    activeQueryType,
    currentScenario,
    scenarioResults,
    executeScenarioQueries,
  ]);

  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 4,
          colorPrimary: "#057cf2",
        },
      }}
    >
      <Layout style={{ minHeight: "100vh" }}>
        <Content
          style={{
            padding: "24px",
            maxWidth: 1400,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <DatasetIntroduction />

          <Card
            bordered={false}
            style={{ boxShadow: "none" }}
            tabList={scenarios.map((scenario) => ({
              key: String(scenario.id),
              tab: scenario.name,
            }))}
            activeTabKey={String(activeScenario)}
            onTabChange={(key) => handleScenarioChange(Number(key))}
          >
            {currentScenario && (
              <>
                <ScenarioDescription
                  description={currentScenario.description}
                />

                <SQLEditor
                  onExecute={() => handleExecuteSQL()}
                  loading={loading}
                  sql={
                    currentScenario ? currentScenario.sql[activeQueryType] : ""
                  }
                  activeQueryType={activeQueryType}
                  onQueryTypeChange={(type) =>
                    handleQueryTypeChange(type as QueryType)
                  }
                  queryTypes={queryTypes}
                />

                {error && (
                  <div
                    style={{
                      marginTop: 16,
                      marginBottom: 16,
                      padding: 12,
                      background: "#fff2f0",
                      border: "1px solid #ffccc7",
                      borderRadius: 4,
                      color: "#cf1322",
                      fontSize: "14px",
                      lineHeight: "1.6",
                    }}
                  >
                    <strong>⚠️ 查询执行错误：</strong>
                    <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                      {error}
                    </div>
                  </div>
                )}

                <ResultsPanel
                  executionTimes={executionTimes}
                  executionResults={executionResults}
                  hasExecuted={hasExecuted}
                  loading={loading}
                />
              </>
            )}
          </Card>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
