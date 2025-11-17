-- 销售汇总物化视图（实时更新 - 备选方案）
-- 如果 FAST REFRESH 不支持（因为查询太复杂），使用此版本
-- 使用 REFRESH COMPLETE ON COMMIT 实现实时更新（全量刷新）
-- 参考：https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000002016850
--
-- 刷新策略说明：
-- - REFRESH COMPLETE ON COMMIT: 基表提交时自动全量刷新（实时更新，但性能开销较大）
-- - REFRESH COMPLETE ON DEMAND: 按需全量刷新（需要手动触发）
--
-- 注意：COMPLETE 刷新会重新计算整个物化视图，性能开销较大
-- 但对于复杂的多表JOIN查询，这是唯一的选择
CREATE MATERIALIZED VIEW `sales_summary_mv`
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
-- 使用 COMPLETE ON DEMAND 实现按需全量刷新
-- 注意：OceanBase 不支持 ON COMMIT，需要使用 ON DEMAND 并手动刷新
REFRESH COMPLETE ON DEMAND
ENABLE QUERY REWRITE
AS
SELECT
  -- 时间维度
  o.order_date AS sale_date,
  DATE_FORMAT(o.order_date, '%Y-%m') AS sale_month,
  DATE_FORMAT(o.order_date, '%Y') AS sale_year,
  -- 地区维度
  o.region_id,
  o.region_name,
  -- 商品维度
  p.product_id,
  p.item_id,
  p.product_name,
  p.brand_id,
  p.brand_name,
  -- 类目维度
  p.category_id,
  p.category_name,
  p.category_level1_id,
  p.category_level1_name,
  p.category_level2_id,
  p.category_level2_name,
  -- 用户维度
  u.user_id,
  u.user_level,
  -- 订单维度
  o.order_id,
  o.order_status,
  -- 聚合指标（预计算）
  oi.quantity AS item_quantity,
  oi.amount AS item_amount,
  o.order_amount AS order_amount
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
LEFT JOIN users u ON o.user_id = u.user_id
WHERE o.order_status = 'COMPLETED';

