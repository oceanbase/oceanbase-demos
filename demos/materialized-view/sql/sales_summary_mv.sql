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
  -- 聚合指标（预计算，支持查询改写）
  -- 不使用 DISTINCT，保留明细数据，查询改写时可以执行 DISTINCT
  COUNT(o.order_id) AS order_count_raw,
  COUNT(o.user_id) AS user_count_raw,
  COUNT(oi.item_id) AS item_count_raw,
  -- 对于 AVG，存储 SUM 和 COUNT，而不是直接存储 AVG
  SUM(oi.quantity) AS total_quantity,
  SUM(oi.amount) AS total_sales,
  COUNT(oi.amount) AS amount_count,  -- 用于计算 AVG(oi.amount) = SUM(oi.amount) / COUNT(oi.amount)
  SUM(oi.amount) AS amount_sum,      -- 用于计算 AVG(oi.amount)
  COUNT(o.order_amount) AS order_amount_count,  -- 用于计算 AVG(o.order_amount)
  SUM(o.order_amount) AS order_amount_sum,     -- 用于计算 AVG(o.order_amount)
  MIN(o.order_amount) AS min_order_amount,
  MAX(o.order_amount) AS max_order_amount
FROM orders o
INNER JOIN order_items oi ON o.order_id = oi.order_id
INNER JOIN products p ON oi.product_id = p.product_id
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
  o.region_name;