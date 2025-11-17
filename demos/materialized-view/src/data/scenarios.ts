// 多维度查询场景配置
export interface Scenario {
  id: number;
  name: string;
  description: string;
  sql: {
    base: string; // 查询基础表
    materialized: string; // 查询物化视图
    rewrite: string; // 查询改写（与base相同，但会被优化器自动改写为物化视图）
  };
}

export const scenarios: Scenario[] = [
  {
    id: 1,
    name: "场景1：按日期和类目统计销售额（多表JOIN + 聚合）",
    description:
      "统计指定日期范围内，按一级类目和二级类目分组的销售额。此场景需要JOIN订单表、订单明细表、商品表，然后进行SUM聚合。聚合物化视图已预计算JOIN和聚合结果，查询时只需对预聚合数据进行简单的二次聚合，性能提升显著（10-100倍）。",
    sql: {
      base: `-- 查询基础表：需要JOIN 4个表后进行聚合统计
SELECT 
  p.category_level1_id,
  p.category_level1_name,
  p.category_level2_id,
  p.category_level2_name,
  o.order_date,
  COUNT(DISTINCT o.order_id) AS order_count,
  COUNT(DISTINCT oi.item_id) AS item_count,
  SUM(oi.amount) AS total_sales,
  SUM(oi.quantity) AS total_quantity,
  AVG(oi.amount) AS avg_item_amount
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
WHERE o.order_date >= '2024-01-01'
  AND o.order_date < '2024-02-01'
  AND o.order_status = 'COMPLETED'
GROUP BY p.category_level1_id, p.category_level1_name, p.category_level2_id, p.category_level2_name, o.order_date
ORDER BY o.order_date, total_sales DESC;`,
      materialized: `-- 查询聚合物化视图：直接使用预聚合数据，只需二次聚合（JOIN和聚合成本都已消除）
SELECT 
  category_level1_id,
  category_level1_name,
  category_level2_id,
  category_level2_name,
  sale_date AS order_date,
  SUM(order_count) AS order_count,
  SUM(item_count) AS item_count,
  SUM(total_sales) AS total_sales,
  SUM(total_quantity) AS total_quantity,
  SUM(total_sales) / SUM(total_quantity) AS avg_item_amount
FROM sales_summary_mv_agg1
WHERE sale_date >= '2024-01-01'
  AND sale_date < '2024-02-01'
GROUP BY category_level1_id, category_level1_name, category_level2_id, category_level2_name, sale_date
ORDER BY sale_date, total_sales DESC;`,
      rewrite: `-- 查询改写：查询基础表，通过 MV_REWRITE hint 指定使用物化视图
SELECT /*+ MV_REWRITE(sales_summary_mv) */
  p.category_level1_id,
  p.category_level1_name,
  p.category_level2_id,
  p.category_level2_name,
  o.order_date,
  COUNT(DISTINCT o.order_id) AS order_count,
  COUNT(DISTINCT oi.item_id) AS item_count,
  SUM(oi.amount) AS total_sales,
  SUM(oi.quantity) AS total_quantity,
  AVG(oi.amount) AS avg_item_amount
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
WHERE o.order_date >= '2024-01-01'
  AND o.order_date < '2024-02-01'
  AND o.order_status = 'COMPLETED'
GROUP BY p.category_level1_id, p.category_level1_name, p.category_level2_id, p.category_level2_name, o.order_date
ORDER BY o.order_date, total_sales DESC;`,
    },
  },
  {
    id: 2,
    name: "场景2：按品牌和地区统计销量（多维度聚合）",
    description:
      "统计不同品牌在不同地区的商品销量和销售额。此场景需要JOIN订单、订单明细、商品、用户表，然后按品牌和地区进行聚合。聚合物化视图已预计算JOIN和聚合结果，查询时只需对预聚合数据进行简单的二次聚合，性能提升显著（10-100倍）。",
    sql: {
      base: `-- 查询基础表：需要JOIN 4个表后进行多维度聚合
SELECT 
  p.brand_id,
  p.brand_name,
  o.region_id,
  o.region_name,
  COUNT(DISTINCT o.order_id) AS order_count,
  COUNT(DISTINCT oi.item_id) AS item_count,
  SUM(oi.quantity) AS total_quantity,
  SUM(oi.amount) AS total_sales,
  AVG(oi.amount) AS avg_item_amount
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
WHERE o.order_date >= '2024-01-01'
  AND o.order_date < '2024-04-01'
  AND o.order_status = 'COMPLETED'
  AND p.brand_id IS NOT NULL
GROUP BY p.brand_id, p.brand_name, o.region_id, o.region_name
HAVING COUNT(DISTINCT o.order_id) >= 10
ORDER BY total_sales DESC, total_quantity DESC;`,
      materialized: `-- 查询聚合物化视图：直接使用预聚合数据，只需二次聚合（JOIN和聚合成本都已消除）
SELECT 
  brand_id,
  brand_name,
  region_id,
  region_name,
  SUM(order_count) AS order_count,
  SUM(item_count) AS item_count,
  SUM(total_quantity) AS total_quantity,
  SUM(total_sales) AS total_sales,
  SUM(total_sales) / SUM(total_quantity) AS avg_item_amount
FROM sales_summary_mv_agg1
WHERE sale_date >= '2024-01-01'
  AND sale_date < '2024-04-01'
  AND brand_id IS NOT NULL
GROUP BY brand_id, brand_name, region_id, region_name
HAVING SUM(order_count) >= 10
ORDER BY total_sales DESC, total_quantity DESC;`,
      rewrite: `-- 查询改写：查询基础表，通过 MV_REWRITE hint 指定使用物化视图
SELECT /*+ MV_REWRITE(sales_summary_mv) */
  p.brand_id,
  p.brand_name,
  o.region_id,
  o.region_name,
  COUNT(DISTINCT o.order_id) AS order_count,
  COUNT(DISTINCT oi.item_id) AS item_count,
  SUM(oi.quantity) AS total_quantity,
  SUM(oi.amount) AS total_sales,
  AVG(oi.amount) AS avg_item_amount
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
WHERE o.order_date >= '2024-01-01'
  AND o.order_date < '2024-04-01'
  AND o.order_status = 'COMPLETED'
  AND p.brand_id IS NOT NULL
GROUP BY p.brand_id, p.brand_name, o.region_id, o.region_name
HAVING COUNT(DISTINCT o.order_id) >= 10
ORDER BY total_sales DESC, total_quantity DESC;`,
    },
  },
  {
    id: 3,
    name: "场景3：按时间段和类目统计平均订单金额（复杂聚合）",
    description:
      "统计不同时间段（按月）和一级类目的平均订单金额、订单数量等指标。此场景需要JOIN多个表并进行复杂的聚合计算。聚合物化视图已预计算JOIN和聚合结果，查询时只需对预聚合数据进行简单的二次聚合，性能提升显著（10-100倍）。",
    sql: {
      base: `-- 查询基础表：需要JOIN 4个表后进行复杂聚合统计
SELECT 
  DATE_FORMAT(o.order_date, '%Y-%m') AS sale_month,
  p.category_level1_id,
  p.category_level1_name,
  COUNT(DISTINCT o.order_id) AS order_count,
  COUNT(DISTINCT o.user_id) AS user_count,
  COUNT(DISTINCT oi.item_id) AS item_count,
  SUM(oi.amount) AS total_sales,
  AVG(o.order_amount) AS avg_order_amount,
  MIN(o.order_amount) AS min_order_amount,
  MAX(o.order_amount) AS max_order_amount
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
WHERE o.order_date >= '2024-01-01'
  AND o.order_date < '2024-07-01'
  AND o.order_status = 'COMPLETED'
GROUP BY DATE_FORMAT(o.order_date, '%Y-%m'), p.category_level1_id, p.category_level1_name
HAVING COUNT(DISTINCT o.order_id) >= 50
ORDER BY sale_month, total_sales DESC;`,
      materialized: `-- 查询聚合物化视图：直接使用预聚合数据，只需二次聚合（JOIN和聚合成本都已消除）
SELECT 
  sale_month,
  category_level1_id,
  category_level1_name,
  SUM(order_count) AS order_count,
  SUM(user_count) AS user_count,
  SUM(item_count) AS item_count,
  SUM(total_sales) AS total_sales,
  SUM(total_sales) / SUM(order_count) AS avg_order_amount,
  MIN(min_order_amount) AS min_order_amount,
  MAX(max_order_amount) AS max_order_amount
FROM sales_summary_mv_agg1
WHERE sale_date >= '2024-01-01'
  AND sale_date < '2024-07-01'
GROUP BY sale_month, category_level1_id, category_level1_name
HAVING SUM(order_count) >= 50
ORDER BY sale_month, total_sales DESC;`,
      rewrite: `-- 查询改写：查询基础表，通过 MV_REWRITE hint 指定使用物化视图
SELECT /*+ MV_REWRITE(sales_summary_mv) */
  DATE_FORMAT(o.order_date, '%Y-%m') AS sale_month,
  p.category_level1_id,
  p.category_level1_name,
  COUNT(DISTINCT o.order_id) AS order_count,
  COUNT(DISTINCT o.user_id) AS user_count,
  COUNT(DISTINCT oi.item_id) AS item_count,
  SUM(oi.amount) AS total_sales,
  AVG(o.order_amount) AS avg_order_amount,
  MIN(o.order_amount) AS min_order_amount,
  MAX(o.order_amount) AS max_order_amount
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
WHERE o.order_date >= '2024-01-01'
  AND o.order_date < '2024-07-01'
  AND o.order_status = 'COMPLETED'
GROUP BY DATE_FORMAT(o.order_date, '%Y-%m'), p.category_level1_id, p.category_level1_name
HAVING COUNT(DISTINCT o.order_id) >= 50
ORDER BY sale_month, total_sales DESC;`,
    },
  },
  {
    id: 4,
    name: "场景4：按用户等级和类目统计购买行为（多维度分析）",
    description:
      "统计不同用户等级在不同类目下的购买行为，包括订单数、商品数、销售额等。此场景需要JOIN订单、订单明细、商品、用户表，然后进行多维度聚合。聚合物化视图已预计算JOIN和聚合结果，查询时只需对预聚合数据进行简单的二次聚合，性能提升显著（10-100倍）。",
    sql: {
      base: `-- 查询基础表：需要JOIN 4个表后进行多维度聚合
SELECT 
  u.user_level,
  p.category_level1_id,
  p.category_level1_name,
  COUNT(DISTINCT o.order_id) AS order_count,
  COUNT(DISTINCT o.user_id) AS user_count,
  COUNT(DISTINCT oi.item_id) AS item_count,
  SUM(oi.quantity) AS total_quantity,
  SUM(oi.amount) AS total_sales,
  AVG(oi.amount) AS avg_item_amount
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
LEFT JOIN users u ON o.user_id = u.user_id
WHERE o.order_date >= '2024-01-01'
  AND o.order_date < '2024-04-01'
  AND o.order_status = 'COMPLETED'
  AND u.user_level IS NOT NULL
GROUP BY u.user_level, p.category_level1_id, p.category_level1_name
HAVING COUNT(DISTINCT o.order_id) >= 20
ORDER BY user_level, total_sales DESC;`,
      materialized: `-- 查询聚合物化视图：直接使用预聚合数据，只需二次聚合（JOIN和聚合成本都已消除）
SELECT 
  user_level,
  category_level1_id,
  category_level1_name,
  SUM(order_count) AS order_count,
  SUM(user_count) AS user_count,
  SUM(item_count) AS item_count,
  SUM(total_quantity) AS total_quantity,
  SUM(total_sales) AS total_sales,
  SUM(total_sales) / SUM(total_quantity) AS avg_item_amount
FROM sales_summary_mv_agg1
WHERE sale_date >= '2024-01-01'
  AND sale_date < '2024-04-01'
  AND user_level IS NOT NULL
GROUP BY user_level, category_level1_id, category_level1_name
HAVING SUM(order_count) >= 20
ORDER BY user_level, total_sales DESC;`,
      rewrite: `-- 查询改写：查询基础表，通过 MV_REWRITE hint 指定使用物化视图
SELECT /*+ MV_REWRITE(sales_summary_mv) */
  u.user_level,
  p.category_level1_id,
  p.category_level1_name,
  COUNT(DISTINCT o.order_id) AS order_count,
  COUNT(DISTINCT o.user_id) AS user_count,
  COUNT(DISTINCT oi.item_id) AS item_count,
  SUM(oi.quantity) AS total_quantity,
  SUM(oi.amount) AS total_sales,
  AVG(oi.amount) AS avg_item_amount
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
LEFT JOIN users u ON o.user_id = u.user_id
WHERE o.order_date >= '2024-01-01'
  AND o.order_date < '2024-04-01'
  AND o.order_status = 'COMPLETED'
  AND u.user_level IS NOT NULL
GROUP BY u.user_level, p.category_level1_id, p.category_level1_name
HAVING COUNT(DISTINCT o.order_id) >= 20
ORDER BY user_level, total_sales DESC;`,
    },
  },
  {
    id: 5,
    name: "场景5：综合查询（时间+地区+品牌+类目多维度统计）",
    description:
      "综合统计指定时间段内，按地区、品牌、类目等多维度的销售数据。此场景综合了多表JOIN、多条件过滤和复杂聚合统计。聚合物化视图已预计算JOIN和聚合结果，查询时只需对预聚合数据进行简单的二次聚合，性能提升显著（10-100倍）。",
    sql: {
      base: `-- 查询基础表：复杂的多表JOIN、多条件过滤和聚合统计
SELECT 
  DATE_FORMAT(o.order_date, '%Y-%m') AS sale_month,
  o.region_id,
  o.region_name,
  p.brand_id,
  p.brand_name,
  p.category_level1_id,
  p.category_level1_name,
  COUNT(DISTINCT o.order_id) AS order_count,
  COUNT(DISTINCT o.user_id) AS user_count,
  COUNT(DISTINCT oi.item_id) AS item_count,
  SUM(oi.quantity) AS total_quantity,
  SUM(oi.amount) AS total_sales,
  AVG(oi.amount) AS avg_item_amount,
  AVG(o.order_amount) AS avg_order_amount
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
WHERE o.order_date >= '2024-01-01'
  AND o.order_date < '2024-07-01'
  AND o.order_status = 'COMPLETED'
  AND p.brand_id IS NOT NULL
GROUP BY DATE_FORMAT(o.order_date, '%Y-%m'), o.region_id, o.region_name, p.brand_id, p.brand_name, p.category_level1_id, p.category_level1_name
HAVING COUNT(DISTINCT o.order_id) >= 5
ORDER BY sale_month, total_sales DESC;`,
      materialized: `-- 查询聚合物化视图：直接使用预聚合数据，只需二次聚合（JOIN和聚合成本都已消除）
SELECT 
  sale_month,
  region_id,
  region_name,
  brand_id,
  brand_name,
  category_level1_id,
  category_level1_name,
  SUM(order_count) AS order_count,
  SUM(user_count) AS user_count,
  SUM(item_count) AS item_count,
  SUM(total_quantity) AS total_quantity,
  SUM(total_sales) AS total_sales,
  SUM(total_sales) / SUM(total_quantity) AS avg_item_amount,
  SUM(total_sales) / SUM(order_count) AS avg_order_amount
FROM sales_summary_mv_agg1
WHERE sale_date >= '2024-01-01'
  AND sale_date < '2024-07-01'
  AND brand_id IS NOT NULL
GROUP BY sale_month, region_id, region_name, brand_id, brand_name, category_level1_id, category_level1_name
HAVING SUM(order_count) >= 5
ORDER BY sale_month, total_sales DESC;`,
      rewrite: `-- 查询改写：查询基础表，通过 MV_REWRITE hint 指定使用物化视图
SELECT /*+ MV_REWRITE(sales_summary_mv) */
  DATE_FORMAT(o.order_date, '%Y-%m') AS sale_month,
  o.region_id,
  o.region_name,
  p.brand_id,
  p.brand_name,
  p.category_level1_id,
  p.category_level1_name,
  COUNT(DISTINCT o.order_id) AS order_count,
  COUNT(DISTINCT o.user_id) AS user_count,
  COUNT(DISTINCT oi.item_id) AS item_count,
  SUM(oi.quantity) AS total_quantity,
  SUM(oi.amount) AS total_sales,
  AVG(oi.amount) AS avg_item_amount,
  AVG(o.order_amount) AS avg_order_amount
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
WHERE o.order_date >= '2024-01-01'
  AND o.order_date < '2024-07-01'
  AND o.order_status = 'COMPLETED'
  AND p.brand_id IS NOT NULL
GROUP BY DATE_FORMAT(o.order_date, '%Y-%m'), o.region_id, o.region_name, p.brand_id, p.brand_name, p.category_level1_id, p.category_level1_name
HAVING COUNT(DISTINCT o.order_id) >= 5
ORDER BY sale_month, total_sales DESC;`,
    },
  },
];

// 查询类型配置
export const queryTypes = [
  {
    key: "base",
    label: "查询基本表",
    description: "直接查询基础表，需要执行多表JOIN和聚合操作",
  },
  {
    key: "materialized",
    label: "查询物化视图",
    description: "直接查询物化视图，数据已预聚合",
  },
  {
    key: "rewrite",
    label: "查询改写",
    description: "查询基础表，通过 MV_REWRITE hint 指定使用物化视图",
  },
] as const;

export type QueryType = (typeof queryTypes)[number]["key"];
