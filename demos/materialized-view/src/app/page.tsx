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
  // 跟踪每个查询类型的 loading 状态
  const [queryLoadingStates, setQueryLoadingStates] = useState<
    Record<QueryType, boolean>
  >({
    base: false,
    materialized: false,
    rewrite: false,
  });
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
      setHasExecuted(true);
      // 初始化所有查询类型的 loading 状态为 true
      setQueryLoadingStates({
        base: true,
        materialized: true,
        rewrite: true,
      });
      // 初始化执行时间数组，所有查询类型都显示为 0
      setExecutionTimes(
        queryTypes.map((q) => ({
          type: q.label,
          time: 0,
        }))
      );
      setExecutionResults([]);

      // 用于存储所有查询结果
      const queryResults: {
        base?: Awaited<ReturnType<typeof executeSQLQuery>>;
        materialized?: Awaited<ReturnType<typeof executeSQLQuery>>;
        rewrite?: Awaited<ReturnType<typeof executeSQLQuery>>;
      } = {};

      const errors: string[] = [];
      let loadingEnded = false; // 标记是否已经结束 loading

      // 处理单个查询结果的函数
      const handleQueryResult = (
        queryType: QueryType,
        result: Awaited<ReturnType<typeof executeSQLQuery>>
      ) => {
        queryResults[queryType] = result;

        // 更新对应查询类型的 loading 状态为 false
        setQueryLoadingStates((prev) => ({
          ...prev,
          [queryType]: false,
        }));

        // 第一个查询返回后立即结束 loading
        if (!loadingEnded) {
          loadingEnded = true;
          setLoading(false);
        }

        // 更新执行时间（立即更新，不等待其他查询）
        setExecutionTimes((prevTimes) => {
          // 创建一个 Map 来存储当前的执行时间数据
          const timesMap = new Map<string, number>();

          // 将现有数据放入 Map（排除当前更新的查询类型）
          const currentLabel =
            queryTypes.find((q) => q.key === queryType)?.label || "";
          prevTimes.forEach((item) => {
            if (item.type !== currentLabel) {
              timesMap.set(item.type, item.time);
            }
          });

          // 如果查询成功，添加新的执行时间；否则保持为 0
          if (result.success && result.executionTime !== undefined) {
            timesMap.set(currentLabel, result.executionTime);
          } else {
            // 查询失败或未完成，设置为 0
            timesMap.set(currentLabel, 0);
          }

          // 按照 queryTypes 的顺序重新排列，确保固定顺序，未返回的查询显示为 0
          const orderedTimes: Array<{ type: string; time: number }> = [];
          queryTypes.forEach((q) => {
            const time = timesMap.get(q.label);
            orderedTimes.push({
              type: q.label,
              time: time !== undefined ? time : 0,
            });
          });

          return orderedTimes;
        });

        // 如果是当前选中的查询类型，立即更新结果
        if (queryType === activeQueryType && result.success) {
          setExecutionResults(Array.isArray(result.data) ? result.data : []);
        }

        // 处理错误
        if (!result.success) {
          const queryLabel =
            queryTypes.find((q) => q.key === queryType)?.label || queryType;
          const errorMsg = `查询${queryLabel}失败: ${
            result.error || "未知错误"
          }`;
          errors.push(errorMsg);
          setError((prevError) => {
            const newErrors = prevError
              ? prevError
                  .split("; ")
                  .filter((e) => !e.startsWith(`查询${queryLabel}`))
              : [];
            newErrors.push(errorMsg);
            return newErrors.join("; ");
          });
          message.error(errorMsg, 3);
        }
      };

      try {
        // 并行执行三种查询类型，但每个查询完成后立即更新图表
        const promises = [
          executeSQLQuery(currentScenario.sql.base).then((result) => {
            handleQueryResult("base", result);
            return result;
          }),
          executeSQLQuery(currentScenario.sql.materialized).then((result) => {
            handleQueryResult("materialized", result);
            return result;
          }),
          executeSQLQuery(currentScenario.sql.rewrite).then((result) => {
            handleQueryResult("rewrite", result);
            return result;
          }),
        ];

        // 等待所有查询完成（用于最终结果保存）
        await Promise.all(promises);

        // 所有查询完成后，保存完整结果（按照 queryTypes 的顺序，未返回的显示为 0）
        const executionTimes: Array<{ type: string; time: number }> = [];
        queryTypes.forEach((q) => {
          const result = queryResults[q.key as QueryType];
          executionTimes.push({
            type: q.label,
            time:
              result?.success && result.executionTime !== undefined
                ? result.executionTime
                : 0,
          });
        });

        const results: ScenarioResults = {
          executionTimes,
          results: {
            base:
              queryResults.base?.success &&
              Array.isArray(queryResults.base.data)
                ? queryResults.base.data
                : [],
            materialized:
              queryResults.materialized?.success &&
              Array.isArray(queryResults.materialized.data)
                ? queryResults.materialized.data
                : [],
            rewrite:
              queryResults.rewrite?.success &&
              Array.isArray(queryResults.rewrite.data)
                ? queryResults.rewrite.data
                : [],
          },
        };

        setScenarioResults((prev) => {
          const newMap = new Map(prev);
          newMap.set(scenarioId, results);
          return newMap;
        });

        // 确保当前查询类型的结果已显示
        const currentResult = results.results[activeQueryType];
        setExecutionResults(currentResult);

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
        // 重置所有查询类型的 loading 状态
        setQueryLoadingStates({
          base: false,
          materialized: false,
          rewrite: false,
        });
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
    // 重置所有查询类型的 loading 状态
    setQueryLoadingStates({
      base: false,
      materialized: false,
      rewrite: false,
    });
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
          colorLink: "#057cf2",
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
            bodyStyle={{ paddingBottom: 0 }}
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
                  queryLoadingStates={queryLoadingStates}
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
