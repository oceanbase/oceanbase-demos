CREATE MATERIALIZED VIEW `th_cluster_v3`
PARTITION BY KEY(`pool_id`) PARTITIONS 16
SUBPARTITION BY KEY(`item_id`) SUBPARTITIONS 8
REFRESH COMPLETE ON DEMAND
ENABLE QUERY REWRITE
AS
SELECT
  -- 池子信息
  item_pool.pool_id as pool_id,
  item_pool.market_code as market_code,
  item_pool.item_id as item_id,
  item_pool.gmv_rank,
  -- 竞对信息补全
  a.sku_id as sku_id,
  a.seller_id as seller_id,
  a.brand_name as brand_name,
  a.item_title as item_title,
  a.item_labels as item_labels,
  a.sku_spec as sku_spec,
  a.ind_level1_id,
  a.x_cate_level1_id,
  a.x_cate_level2_id,
  -- 同款信息
  b.grp_id as grp_id,
  c.item_id as tb_item_id,
  c.sku_id as tb_sku_id,
  -- 淘系信息
  d.item_title as tb_item_title,
  d.seller_id as tb_seller_id,
  d.item_labels as tb_item_labels,
  -- 无用字段
  b.item_id as item_id_ignored,
  b.market_code as market_code_ignored,
  b.sku_id as sku_id_ignored,
  a.item_id as item_id_ignored2,
  a.market_code as market_code_ignored2,
  c.market_code as tb_market_code_ignored,
  c.grp_id as tb_grp_id_ignored,
  d.item_id as tb_item_id_ignored,
  d.sku_id as tb_sku_id_ignored,
  d.market_code as tb_market_code_ignored2
FROM item_pool
LEFT JOIN sku_base a ON item_pool.item_id = a.item_id AND item_pool.market_code = a.market_code
LEFT JOIN sku_grp b ON a.market_code = b.market_code AND a.item_id = b.item_id AND a.sku_id = b.sku_id AND b.market_code <> 'TX'
LEFT JOIN sku_grp c ON b.grp_id = c.grp_id AND c.market_code = 'TX'
LEFT JOIN sku_base d ON c.item_id = d.item_id AND c.sku_id = d.sku_id AND c.market_code = d.market_code;

-- ============================================
-- 为物化视图创建索引以优化查询性能
-- ============================================
-- 注意：如果索引已存在，执行时会报错，可以忽略错误或先删除已存在的索引
-- 建议：首次创建物化视图后执行此部分，如果索引已存在可以跳过

-- 按池子ID过滤
CREATE INDEX idx_pool_id ON th_cluster_v3(pool_id);

-- 按一级类目ID过滤
CREATE INDEX idx_ind_level1_id ON th_cluster_v3(ind_level1_id);

-- 按池子ID和一级类目ID组合查询
CREATE INDEX idx_pool_ind ON th_cluster_v3(pool_id, ind_level1_id);

-- 按品牌名称过滤
CREATE INDEX idx_brand_name ON th_cluster_v3(brand_name);

-- 按市场代码过滤
CREATE INDEX idx_market_code ON th_cluster_v3(market_code);

-- 按同款组ID过滤
CREATE INDEX idx_grp_id ON th_cluster_v3(grp_id);