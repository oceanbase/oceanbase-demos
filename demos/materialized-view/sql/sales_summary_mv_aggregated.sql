-- 销售汇总聚合物化视图（预聚合版本）
-- 直接在物化视图中预聚合常用维度组合，避免查询时再次聚合
-- 用于快速查询销售统计数据，性能提升更明显
-- 参考：https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000002016850
-- 
-- 设计思路：
-- 1. 预聚合最细粒度的维度组合（日期+类目+品牌+地区等）
-- 2. 查询时只需简单的SUM/COUNT，无需GROUP BY
-- 3. 如果查询维度更粗，可以进一步聚合，但数据量已大幅减少
--
-- 注意：如果OceanBase不支持在物化视图中使用GROUP BY，此方案不可行
-- 此时需要创建多个物化视图，每个针对不同的查询场景

-- 方案1：按日期+类目+品牌+地区预聚合（最细粒度）
CREATE MATERIALIZED VIEW `sales_summary_mv_agg1`
PARTITION BY RANGE COLUMNS(sale_date) (
  PARTITION p202401 VALUES LESS THAN ('2024-02-01'),
  PARTITION p202402 VALUES LESS THAN ('2024-03-01'),
  PARTITION p202403 VALUES LESS THAN ('2024-04-01'),
  PARTITION p202404 VALUES LESS THAN ('2024-05-01'),
  PARTITION p202405 VALUES LESS THAN ('2024-06-01'),
  PARTITION p202406 VALUES LESS THAN ('2024-07-01'),
  PARTITION p202407 VALUES LESS THAN ('2024-08-01'),
  PARTITION p202408 VALUES LESS THAN ('2024-09-01'),
  PARTITION p202409 VALUES LESS THAN ('2024-10-01'),
  PARTITION p202410 VALUES LESS THAN ('2024-11-01'),
  PARTITION p202411 VALUES LESS THAN ('2024-12-01'),
  PARTITION p202412 VALUES LESS THAN ('2025-01-01'),
  PARTITION p_future VALUES LESS THAN MAXVALUE
)
REFRESH COMPLETE ON DEMAND
ENABLE QUERY REWRITE
AS
SELECT
  -- 维度字段（GROUP BY）
  o.order_date AS sale_date,
  DATE_FORMAT(o.order_date, '%Y-%m') AS sale_month,
  p.category_level1_id,
  p.category_level1_name,
  p.category_level2_id,
  p.category_level2_name,
  p.brand_id,
  p.brand_name,
  o.region_id,
  o.region_name,
  u.user_level,
  -- 聚合指标（预计算）
  COUNT(DISTINCT o.order_id) AS order_count,
  COUNT(DISTINCT o.user_id) AS user_count,
  COUNT(DISTINCT oi.item_id) AS item_count,
  SUM(oi.quantity) AS total_quantity,
  SUM(oi.amount) AS total_sales,
  AVG(oi.amount) AS avg_item_amount,
  AVG(o.order_amount) AS avg_order_amount,
  MIN(o.order_amount) AS min_order_amount,
  MAX(o.order_amount) AS max_order_amount
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
LEFT JOIN users u ON o.user_id = u.user_id
WHERE o.order_status = 'COMPLETED'
GROUP BY 
  o.order_date,
  DATE_FORMAT(o.order_date, '%Y-%m'),
  p.category_level1_id,
  p.category_level1_name,
  p.category_level2_id,
  p.category_level2_name,
  p.brand_id,
  p.brand_name,
  o.region_id,
  o.region_name,
  u.user_level;

-- ============================================
-- 为聚合物化视图创建索引以优化查询性能
-- ============================================
-- 注意：如果索引已存在，执行时会报错，可以忽略错误或先删除已存在的索引
-- 建议：首次创建物化视图后执行此部分，如果索引已存在可以跳过

-- 场景1：按日期和类目统计（WHERE sale_date + GROUP BY category_level1_id, category_level1_name, category_level2_id, category_level2_name, sale_date）
-- 优化场景1：按日期和类目统计（包含二级类目）
CREATE INDEX idx_agg_sale_date_category12 ON sales_summary_mv_agg1(sale_date, category_level1_id, category_level1_name, category_level2_id, category_level2_name);

-- 优化场景1：按类目和日期统计（GROUP BY顺序优化）
CREATE INDEX idx_agg_category12_date ON sales_summary_mv_agg1(category_level1_id, category_level1_name, category_level2_id, category_level2_name, sale_date);

-- 场景2：按品牌和地区统计（WHERE sale_date + brand_id IS NOT NULL + GROUP BY brand_id, brand_name, region_id, region_name）
-- 优化场景2：按日期、品牌和地区统计
CREATE INDEX idx_agg_sale_date_brand_region ON sales_summary_mv_agg1(sale_date, brand_id, brand_name, region_id, region_name);

-- 优化场景2：按品牌和地区统计（GROUP BY顺序优化）
CREATE INDEX idx_agg_brand_region ON sales_summary_mv_agg1(brand_id, brand_name, region_id, region_name);

-- 场景3：按时间段和类目统计（WHERE sale_date + GROUP BY sale_month, category_level1_id, category_level1_name）
-- 优化场景3：按日期、月份和类目统计
CREATE INDEX idx_agg_sale_date_month_category1 ON sales_summary_mv_agg1(sale_date, sale_month, category_level1_id, category_level1_name);

-- 优化场景3：按月份和类目统计（GROUP BY顺序优化）
CREATE INDEX idx_agg_sale_month_category1 ON sales_summary_mv_agg1(sale_month, category_level1_id, category_level1_name);

-- 场景4：按用户等级和类目统计（WHERE sale_date + user_level IS NOT NULL + GROUP BY user_level, category_level1_id, category_level1_name）
-- 优化场景4：按日期、用户等级和类目统计
CREATE INDEX idx_agg_sale_date_user_level_category1 ON sales_summary_mv_agg1(sale_date, user_level, category_level1_id, category_level1_name);

-- 优化场景4：按用户等级和类目统计（GROUP BY顺序优化）
CREATE INDEX idx_agg_user_level_category1 ON sales_summary_mv_agg1(user_level, category_level1_id, category_level1_name);

-- 场景5：综合查询（WHERE sale_date + brand_id IS NOT NULL + GROUP BY sale_month, region_id, region_name, brand_id, brand_name, category_level1_id, category_level1_name）
-- 优化场景5：按日期、月份、品牌、地区和类目统计
CREATE INDEX idx_agg_sale_date_month_brand_region_category1 ON sales_summary_mv_agg1(sale_date, sale_month, brand_id, region_id, category_level1_id, category_level1_name);

-- 优化场景5：按月份、品牌、地区和类目统计（GROUP BY顺序优化）
CREATE INDEX idx_agg_sale_month_brand_region_category1 ON sales_summary_mv_agg1(sale_month, brand_id, brand_name, region_id, region_name, category_level1_id, category_level1_name);

-- 通用索引：支持WHERE条件和ORDER BY
-- 通用索引：按日期过滤
CREATE INDEX idx_agg_sale_date ON sales_summary_mv_agg1(sale_date);

-- 通用索引：按月份过滤
CREATE INDEX idx_agg_sale_month ON sales_summary_mv_agg1(sale_month);

-- 通用索引：按品牌过滤
CREATE INDEX idx_agg_brand_id ON sales_summary_mv_agg1(brand_id);

-- 通用索引：按用户等级过滤
CREATE INDEX idx_agg_user_level ON sales_summary_mv_agg1(user_level);

