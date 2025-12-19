"use client";

import { useMemo } from "react";
import { useIntl } from "react-intl";
import {
  scenarios as baseScenarios,
  queryTypes as baseQueryTypes,
} from "@/data/scenarios";
import type { Scenario } from "@/data/scenarios";

// SQL 注释的替换映射（原始中文 -> 国际化 key -> 默认中文）
const sqlCommentReplacements = [
  {
    original: "-- 查询基础表：需要JOIN 3个表后进行聚合统计",
    key: "sql.comment.baseTable1",
    defaultMessage: "-- 查询基础表：需要JOIN 3个表后进行聚合统计",
  },
  {
    original: "-- 查询基础表：需要JOIN 3个表后进行多维度聚合",
    key: "sql.comment.baseTable2",
    defaultMessage: "-- 查询基础表：需要JOIN 3个表后进行多维度聚合",
  },
  {
    original: "-- 查询基础表：需要JOIN 3个表后进行复杂聚合统计",
    key: "sql.comment.baseTable3",
    defaultMessage: "-- 查询基础表：需要JOIN 3个表后进行复杂聚合统计",
  },
  {
    original: "-- 查询基础表：复杂的多表JOIN、多条件过滤和聚合统计",
    key: "sql.comment.baseTable5",
    defaultMessage: "-- 查询基础表：复杂的多表JOIN、多条件过滤和聚合统计",
  },
  {
    original:
      "-- 查询聚合物化视图：直接使用预聚合数据，只需二次聚合（JOIN和聚合成本都已消除）",
    key: "sql.comment.materializedView",
    defaultMessage:
      "-- 查询聚合物化视图：直接使用预聚合数据，只需二次聚合（JOIN和聚合成本都已消除）",
  },
  {
    original: "-- 查询改写：查询基础表，通过 MV_REWRITE hint 指定使用物化视图",
    key: "sql.comment.rewrite",
    defaultMessage:
      "-- 查询改写：查询基础表，通过 MV_REWRITE hint 指定使用物化视图",
  },
];

// 场景默认文案映射
const scenarioDefaults: Record<number, { name: string; description: string }> =
  {
    1: {
      name: "场景1：按日期和类目统计销售额（多表JOIN + 聚合）",
      description:
        "统计指定日期范围内，按一级类目和二级类目分组的销售额。此场景需要JOIN订单表、订单明细表、商品表，然后进行SUM聚合。聚合物化视图已预计算JOIN和聚合结果，查询时只需对预聚合数据进行简单的二次聚合，性能提升显著（10-100倍）。",
    },
    2: {
      name: "场景2：按品牌和地区统计销量（多维度聚合）",
      description:
        "统计不同品牌在不同地区的商品销量和销售额。此场景需要JOIN订单、订单明细、商品表，然后按品牌和地区进行聚合。聚合物化视图已预计算JOIN和聚合结果，查询时只需对预聚合数据进行简单的二次聚合，性能提升显著（10-100倍）。",
    },
    3: {
      name: "场景3：按时间段和类目统计平均订单金额（复杂聚合）",
      description:
        "统计不同时间段（按月）和一级类目的平均订单金额、订单数量等指标。此场景需要JOIN多个表并进行复杂的聚合计算。聚合物化视图已预计算JOIN和聚合结果，查询时只需对预聚合数据进行简单的二次聚合，性能提升显著（10-100倍）。",
    },
    4: {
      name: "场景4：按二级类目和品牌统计销售数据（多维度分析）",
      description:
        "统计不同二级类目和品牌的销售数据，包括订单数、用户数、商品数、销售额等。此场景需要JOIN订单、订单明细、商品表，然后按二级类目和品牌进行聚合。聚合物化视图已预计算JOIN和聚合结果，查询时只需对预聚合数据进行简单的二次聚合，性能提升显著（10-100倍）。",
    },
    5: {
      name: "场景5：综合查询（时间+地区+品牌+类目多维度统计）",
      description:
        "综合统计指定时间段内，按地区、品牌、类目等多维度的销售数据。此场景综合了多表JOIN、多条件过滤和复杂聚合统计。聚合物化视图已预计算JOIN和聚合结果，查询时只需对预聚合数据进行简单的二次聚合，性能提升显著（10-100倍）。",
    },
  };

export function useScenarios() {
  const intl = useIntl();

  const scenarios = useMemo<Scenario[]>(() => {
    return baseScenarios.map((scenario) => {
      // 替换 SQL 中的注释
      const translateSql = (sql: string) => {
        let translatedSql = sql;
        sqlCommentReplacements.forEach(({ original, key, defaultMessage }) => {
          if (translatedSql.includes(original)) {
            translatedSql = translatedSql.replace(
              original,
              intl.formatMessage({ id: key, defaultMessage })
            );
          }
        });
        return translatedSql;
      };

      const defaults = scenarioDefaults[scenario.id] || {
        name: scenario.name,
        description: scenario.description,
      };

      return {
        ...scenario,
        name: intl.formatMessage({
          id: `scenario.scenario${scenario.id}.name`,
          defaultMessage: defaults.name,
        }),
        description: intl.formatMessage({
          id: `scenario.scenario${scenario.id}.description`,
          defaultMessage: defaults.description,
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

// 查询类型默认文案
const queryTypeDefaults: Record<
  string,
  { label: string; description: string }
> = {
  base: {
    label: "查询基本表",
    description: "直接查询基础表，需要执行多表JOIN和聚合操作",
  },
  materialized: {
    label: "查询物化视图",
    description: "直接查询物化视图，数据已预聚合",
  },
  rewrite: {
    label: "查询改写",
    description: "查询基础表，通过 MV_REWRITE hint 指定使用物化视图",
  },
};

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

      const defaults = queryTypeDefaults[key] || {
        label: queryType.label,
        description: queryType.description || "",
      };

      return {
        key: queryType.key,
        label: intl.formatMessage({
          id: labelKey,
          defaultMessage: defaults.label,
        }),
        description: intl.formatMessage({
          id: descriptionKey,
          defaultMessage: defaults.description,
        }),
      };
    });
  }, [intl]);

  return queryTypes;
}
