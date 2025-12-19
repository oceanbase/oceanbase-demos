"use client";

import { useMemo } from "react";
import { useIntl } from "react-intl";
import { scenarios as baseScenarios, queryTypes as baseQueryTypes } from "@/data/scenarios";
import type { Scenario } from "@/data/scenarios";

// SQL 注释的替换映射（原始中文 -> 国际化 key）
const sqlCommentReplacements = [
  { original: "-- 查询基础表：需要JOIN 3个表后进行聚合统计", key: "sql.comment.baseTable1" },
  { original: "-- 查询基础表：需要JOIN 3个表后进行多维度聚合", key: "sql.comment.baseTable2" },
  { original: "-- 查询基础表：需要JOIN 3个表后进行复杂聚合统计", key: "sql.comment.baseTable3" },
  { original: "-- 查询基础表：复杂的多表JOIN、多条件过滤和聚合统计", key: "sql.comment.baseTable5" },
  { original: "-- 查询聚合物化视图：直接使用预聚合数据，只需二次聚合（JOIN和聚合成本都已消除）", key: "sql.comment.materializedView" },
  { original: "-- 查询改写：查询基础表，通过 MV_REWRITE hint 指定使用物化视图", key: "sql.comment.rewrite" },
];

export function useScenarios() {
  const intl = useIntl();

  const scenarios = useMemo<Scenario[]>(() => {
    return baseScenarios.map((scenario) => {
      // 替换 SQL 中的注释
      const translateSql = (sql: string) => {
        let translatedSql = sql;
        sqlCommentReplacements.forEach(({ original, key }) => {
          if (translatedSql.includes(original)) {
            translatedSql = translatedSql.replace(
              original,
              intl.formatMessage({ id: key })
            );
          }
        });
        return translatedSql;
      };

      return {
        ...scenario,
        name: intl.formatMessage({ id: `scenario.scenario${scenario.id}.name` }),
        description: intl.formatMessage({
          id: `scenario.scenario${scenario.id}.description`,
        }),
        sql: {
          base: translateSql(scenario.sql.base),
          materialized: translateSql(scenario.sql.materialized),
          rewrite: translateSql(scenario.sql.rewrite),
        },
      };
    });
  }, [intl]);

  return scenarios;
}

export function useQueryTypes() {
  const intl = useIntl();

  const queryTypes = useMemo(() => {
    return baseQueryTypes.map((queryType) => {
      const key = queryType.key;
      let labelKey = "";
      let descriptionKey = "";

      if (key === "base") {
        labelKey = "sql.baseQuery";
        descriptionKey = "sql.baseQueryDesc";
      } else if (key === "materialized") {
        labelKey = "sql.materializedQuery";
        descriptionKey = "sql.materializedQueryDesc";
      } else if (key === "rewrite") {
        labelKey = "sql.rewriteQuery";
        descriptionKey = "sql.rewriteQueryDesc";
      }

      return {
        key: queryType.key,
        label: intl.formatMessage({ id: labelKey }),
        description: intl.formatMessage({ id: descriptionKey }),
      };
    });
  }, [intl]);

  return queryTypes;
}

