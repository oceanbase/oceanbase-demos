-- 销售汇总物化视图（实时更新）
-- 预计算订单、订单明细、商品、类目、用户等多表JOIN和聚合结果
-- 用于快速查询销售统计数据
-- 参考：https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000002016850
-- 
-- 刷新策略说明：
-- - REFRESH FAST ON COMMIT: 基表提交时自动增量刷新（实时更新）
-- - REFRESH FAST ON DEMAND: 按需增量刷新（需要手动触发）
-- - REFRESH COMPLETE: 全量刷新（适用于不支持 FAST REFRESH 的复杂查询）
--
-- 注意：如果物化视图涉及复杂的多表JOIN或聚合，可能不支持 FAST REFRESH
-- 此时需要使用 REFRESH COMPLETE ON DEMAND 或 REFRESH COMPLETE ON COMMIT
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
-- 使用 FAST REFRESH ON DEMAND 实现按需增量刷新
-- 注意：OceanBase 不支持 ON COMMIT，需要使用 ON DEMAND 并手动刷新
-- 如果创建失败（因为查询太复杂），可以改为 REFRESH COMPLETE ON DEMAND
REFRESH FAST ON DEMAND
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

-- ============================================
-- 为明细物化视图创建索引以优化查询性能
-- ============================================
-- 注意：如果索引已存在，执行时会报错，可以忽略错误或先删除已存在的索引
-- 建议：首次创建物化视图后执行此部分，如果索引已存在可以跳过

-- 场景1：按日期和类目统计（GROUP BY category_level1_id, category_level1_name, category_level2_id, category_level2_name, sale_date）
-- 优化场景1：按日期和类目统计（包含二级类目）
CREATE INDEX idx_sale_date_category12 ON sales_summary_mv(sale_date, category_level1_id, category_level1_name, category_level2_id, category_level2_name);

-- 优化场景1：按类目和日期统计（GROUP BY顺序优化）
CREATE INDEX idx_category12_date ON sales_summary_mv(category_level1_id, category_level1_name, category_level2_id, category_level2_name, sale_date);

-- 场景2：按品牌和地区统计（GROUP BY brand_id, brand_name, region_id, region_name）
-- 优化场景2：按日期、品牌和地区统计
CREATE INDEX idx_sale_date_brand_region_full ON sales_summary_mv(sale_date, brand_id, brand_name, region_id, region_name);

-- 优化场景2：按品牌和地区统计（GROUP BY顺序优化）
CREATE INDEX idx_brand_region ON sales_summary_mv(brand_id, brand_name, region_id, region_name);

-- 场景3：按时间段和类目统计（GROUP BY sale_month, category_level1_id, category_level1_name）
-- 优化场景3：按时间段和类目统计
CREATE INDEX idx_sale_date_category1 ON sales_summary_mv(sale_date, category_level1_id, category_level1_name);

-- 优化场景3：按月份和类目统计
CREATE INDEX idx_sale_month_category1 ON sales_summary_mv(sale_month, category_level1_id, category_level1_name);

-- 场景4：按用户等级和类目统计（GROUP BY user_level, category_level1_id, category_level1_name）
-- 优化场景4：按用户等级和类目统计
CREATE INDEX idx_user_level_category1 ON sales_summary_mv(user_level, category_level1_id, category_level1_name);

-- 优化场景4：按日期、用户等级和类目统计
CREATE INDEX idx_sale_date_user_level ON sales_summary_mv(sale_date, user_level, category_level1_id);

-- 场景5：综合查询（GROUP BY sale_month, region_id, brand_id, category_level1_id等）
-- 优化场景5：按日期、品牌、地区和类目统计
CREATE INDEX idx_sale_date_brand_region ON sales_summary_mv(sale_date, brand_id, region_id, category_level1_id);

-- 优化场景5：按月份、品牌、地区和类目统计
CREATE INDEX idx_sale_month_brand_region ON sales_summary_mv(sale_month, brand_id, region_id, category_level1_id, category_level1_name);

-- 通用索引：支持WHERE条件和GROUP BY
-- 通用索引：按日期过滤
CREATE INDEX idx_sale_date ON sales_summary_mv(sale_date);

-- 通用索引：按品牌过滤
CREATE INDEX idx_brand_id ON sales_summary_mv(brand_id);

-- 通用索引：按用户等级过滤
CREATE INDEX idx_user_level ON sales_summary_mv(user_level);

