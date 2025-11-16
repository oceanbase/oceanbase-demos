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
    name: "场景1：按池子ID和类目维度查询商品信息",
    description:
      "查询特定池子中某个一级类目的商品及其竞对信息，包括商品标题、品牌、卖家等详细信息。适用于需要分析特定类目下商品竞争情况的场景。",
    sql: {
      base: `-- 查询基础表：通过JOIN多个表获取数据
SELECT 
  ip.pool_id,
  ip.gmv_rank,
  sb.item_title,
  sb.brand_name,
  sb.seller_id,
  sb.sku_spec,
  sb.ind_level1_id,
  sb.x_cate_level1_id,
  sb.x_cate_level2_id
FROM item_pool ip
LEFT JOIN sku_base sb ON ip.item_id = sb.item_id AND ip.market_code = sb.market_code
WHERE ip.pool_id = 'pool_001'
  AND sb.ind_level1_id = '1001'
ORDER BY ip.gmv_rank;`,
      materialized: `-- 查询物化视图：直接查询预聚合的物化视图
SELECT 
  pool_id,
  gmv_rank,
  item_title,
  brand_name,
  seller_id,
  sku_spec,
  ind_level1_id,
  x_cate_level1_id,
  x_cate_level2_id
FROM th_cluster_v3
WHERE pool_id = 'pool_001'
  AND ind_level1_id = '1001'
ORDER BY gmv_rank;`,
      rewrite: `-- 查询改写：查询基础表，通过 MV_REWRITE hint 指定使用物化视图
SELECT /*+ MV_REWRITE(th_cluster_v3) */
  ip.pool_id,
  ip.gmv_rank,
  sb.item_title,
  sb.brand_name,
  sb.seller_id,
  sb.sku_spec,
  sb.ind_level1_id,
  sb.x_cate_level1_id,
  sb.x_cate_level2_id
FROM item_pool ip
LEFT JOIN sku_base sb ON ip.item_id = sb.item_id AND ip.market_code = sb.market_code
WHERE ip.pool_id = 'pool_001'
  AND sb.ind_level1_id = '1001'
ORDER BY ip.gmv_rank;`,
    },
  },
  {
    id: 2,
    name: "场景2：按品牌和GMV排名维度统计",
    description:
      "统计不同品牌在不同GMV排名区间的商品数量，用于分析品牌在商品池中的分布情况。",
    sql: {
      base: `-- 查询基础表：统计品牌和GMV排名分布
SELECT 
  sb.brand_name,
  CASE 
    WHEN ip.gmv_rank <= 10 THEN 'TOP10'
    WHEN ip.gmv_rank <= 50 THEN 'TOP50'
    WHEN ip.gmv_rank <= 100 THEN 'TOP100'
    ELSE '其他'
  END AS rank_range,
  COUNT(DISTINCT ip.item_id) AS item_count,
  COUNT(DISTINCT sb.sku_id) AS sku_count
FROM item_pool ip
LEFT JOIN sku_base sb ON ip.item_id = sb.item_id AND ip.market_code = sb.market_code
WHERE ip.pool_id = 'pool_001'
  AND sb.brand_name IS NOT NULL
GROUP BY sb.brand_name, rank_range
ORDER BY sb.brand_name, rank_range;`,
      materialized: `-- 查询物化视图：直接统计物化视图数据
SELECT 
  brand_name,
  CASE 
    WHEN gmv_rank <= 10 THEN 'TOP10'
    WHEN gmv_rank <= 50 THEN 'TOP50'
    WHEN gmv_rank <= 100 THEN 'TOP100'
    ELSE '其他'
  END AS rank_range,
  COUNT(DISTINCT item_id) AS item_count,
  COUNT(DISTINCT sku_id) AS sku_count
FROM th_cluster_v3
WHERE pool_id = 'pool_001'
  AND brand_name IS NOT NULL
GROUP BY brand_name, rank_range
ORDER BY brand_name, rank_range;`,
      rewrite: `-- 查询改写：查询基础表，通过 MV_REWRITE hint 指定使用物化视图
SELECT /*+ MV_REWRITE(th_cluster_v3) */
  sb.brand_name,
  CASE 
    WHEN ip.gmv_rank <= 10 THEN 'TOP10'
    WHEN ip.gmv_rank <= 50 THEN 'TOP50'
    WHEN ip.gmv_rank <= 100 THEN 'TOP100'
    ELSE '其他'
  END AS rank_range,
  COUNT(DISTINCT ip.item_id) AS item_count,
  COUNT(DISTINCT sb.sku_id) AS sku_count
FROM item_pool ip
LEFT JOIN sku_base sb ON ip.item_id = sb.item_id AND ip.market_code = sb.market_code
WHERE ip.pool_id = 'pool_001'
  AND sb.brand_name IS NOT NULL
GROUP BY sb.brand_name, rank_range
ORDER BY sb.brand_name, rank_range;`,
    },
  },
  {
    id: 3,
    name: "场景3：按市场代码和同款分组维度查询",
    description:
      "查询特定市场的商品及其同款信息，包括竞对商品和对应的淘系商品信息。适用于跨平台商品对比分析。",
    sql: {
      base: `-- 查询基础表：查询商品及其同款信息
SELECT 
  ip.pool_id,
  ip.market_code,
  sb.item_title AS competitor_item_title,
  sb.brand_name AS competitor_brand,
  sg.grp_id,
  sb_tx.item_title AS taobao_item_title,
  sb_tx.seller_id AS taobao_seller_id
FROM item_pool ip
LEFT JOIN sku_base sb ON ip.item_id = sb.item_id AND ip.market_code = sb.market_code
LEFT JOIN sku_grp sg ON sb.market_code = sg.market_code 
  AND sb.item_id = sg.item_id 
  AND sb.sku_id = sg.sku_id 
  AND sg.market_code <> 'TX'
LEFT JOIN sku_grp sg_tx ON sg.grp_id = sg_tx.grp_id AND sg_tx.market_code = 'TX'
LEFT JOIN sku_base sb_tx ON sg_tx.item_id = sb_tx.item_id 
  AND sg_tx.sku_id = sb_tx.sku_id 
  AND sg_tx.market_code = sb_tx.market_code
WHERE ip.pool_id = 'pool_001'
  AND ip.market_code = 'JD'
  AND sg.grp_id IS NOT NULL;`,
      materialized: `-- 查询物化视图：直接查询预关联的同款信息
SELECT 
  pool_id,
  market_code,
  item_title AS competitor_item_title,
  brand_name AS competitor_brand,
  grp_id,
  tb_item_title AS taobao_item_title,
  tb_seller_id AS taobao_seller_id
FROM th_cluster_v3
WHERE pool_id = 'pool_001'
  AND market_code = 'JD'
  AND grp_id IS NOT NULL;`,
      rewrite: `-- 查询改写：查询基础表，通过 MV_REWRITE hint 指定使用物化视图
SELECT /*+ MV_REWRITE(th_cluster_v3) */
  ip.pool_id,
  ip.market_code,
  sb.item_title AS competitor_item_title,
  sb.brand_name AS competitor_brand,
  sg.grp_id,
  sb_tx.item_title AS taobao_item_title,
  sb_tx.seller_id AS taobao_seller_id
FROM item_pool ip
LEFT JOIN sku_base sb ON ip.item_id = sb.item_id AND ip.market_code = sb.market_code
LEFT JOIN sku_grp sg ON sb.market_code = sg.market_code 
  AND sb.item_id = sg.item_id 
  AND sb.sku_id = sg.sku_id 
  AND sg.market_code <> 'TX'
LEFT JOIN sku_grp sg_tx ON sg.grp_id = sg_tx.grp_id AND sg_tx.market_code = 'TX'
LEFT JOIN sku_base sb_tx ON sg_tx.item_id = sb_tx.item_id 
  AND sg_tx.sku_id = sb_tx.sku_id 
  AND sg_tx.market_code = sb_tx.market_code
WHERE ip.pool_id = 'pool_001'
  AND ip.market_code = 'JD'
  AND sg.grp_id IS NOT NULL;`,
    },
  },
  {
    id: 4,
    name: "场景4：按类目和二级类目维度过滤查询",
    description:
      "查询特定一级类目和二级类目的商品信息。适用于按类目层级进行商品筛选的场景。",
    sql: {
      base: `-- 查询基础表：按类目和二级类目过滤
SELECT 
  ip.pool_id,
  ip.gmv_rank,
  sb.item_title,
  sb.brand_name,
  sb.item_labels,
  sb.x_cate_level1_id,
  sb.x_cate_level2_id
FROM item_pool ip
LEFT JOIN sku_base sb ON ip.item_id = sb.item_id AND ip.market_code = sb.market_code
WHERE ip.pool_id = 'pool_001'
  AND sb.x_cate_level1_id = '2001'
  AND sb.x_cate_level2_id = '200101'
ORDER BY ip.gmv_rank;`,
      materialized: `-- 查询物化视图：直接查询物化视图并按类目过滤
SELECT 
  pool_id,
  gmv_rank,
  item_title,
  brand_name,
  item_labels,
  x_cate_level1_id,
  x_cate_level2_id
FROM th_cluster_v3
WHERE pool_id = 'pool_001'
  AND x_cate_level1_id = '2001'
  AND x_cate_level2_id = '200101'
ORDER BY gmv_rank;`,
      rewrite: `-- 查询改写：查询基础表，通过 MV_REWRITE hint 指定使用物化视图
SELECT /*+ MV_REWRITE(th_cluster_v3) */
  ip.pool_id,
  ip.gmv_rank,
  sb.item_title,
  sb.brand_name,
  sb.item_labels,
  sb.x_cate_level1_id,
  sb.x_cate_level2_id
FROM item_pool ip
LEFT JOIN sku_base sb ON ip.item_id = sb.item_id AND ip.market_code = sb.market_code
WHERE ip.pool_id = 'pool_001'
  AND sb.x_cate_level1_id = '2001'
  AND sb.x_cate_level2_id = '200101'
ORDER BY ip.gmv_rank;`,
    },
  },
  {
    id: 5,
    name: "场景5：多维度聚合统计",
    description:
      "按类目、品牌、市场等多维度进行聚合统计，计算商品数量、SKU数量等指标。适用于多维度数据分析场景。",
    sql: {
      base: `-- 查询基础表：多维度聚合统计
SELECT 
  sb.ind_level1_id,
  sb.x_cate_level1_id,
  sb.brand_name,
  ip.market_code,
  COUNT(DISTINCT ip.item_id) AS item_count,
  COUNT(DISTINCT sb.sku_id) AS sku_count,
  AVG(ip.gmv_rank) AS avg_gmv_rank,
  MIN(ip.gmv_rank) AS min_gmv_rank,
  MAX(ip.gmv_rank) AS max_gmv_rank
FROM item_pool ip
LEFT JOIN sku_base sb ON ip.item_id = sb.item_id AND ip.market_code = sb.market_code
WHERE ip.pool_id = 'pool_001'
  AND sb.ind_level1_id IS NOT NULL
  AND sb.brand_name IS NOT NULL
GROUP BY sb.ind_level1_id, sb.x_cate_level1_id, sb.brand_name, ip.market_code
HAVING COUNT(DISTINCT ip.item_id) >= 5
ORDER BY item_count DESC, avg_gmv_rank ASC;`,
      materialized: `-- 查询物化视图：直接进行多维度聚合统计
SELECT 
  ind_level1_id,
  x_cate_level1_id,
  brand_name,
  market_code,
  COUNT(DISTINCT item_id) AS item_count,
  COUNT(DISTINCT sku_id) AS sku_count,
  AVG(gmv_rank) AS avg_gmv_rank,
  MIN(gmv_rank) AS min_gmv_rank,
  MAX(gmv_rank) AS max_gmv_rank
FROM th_cluster_v3
WHERE pool_id = 'pool_001'
  AND ind_level1_id IS NOT NULL
  AND brand_name IS NOT NULL
GROUP BY ind_level1_id, x_cate_level1_id, brand_name, market_code
HAVING COUNT(DISTINCT item_id) >= 5
ORDER BY item_count DESC, avg_gmv_rank ASC;`,
      rewrite: `-- 查询改写：查询基础表，通过 MV_REWRITE hint 指定使用物化视图
SELECT /*+ MV_REWRITE(th_cluster_v3) */
  sb.ind_level1_id,
  sb.x_cate_level1_id,
  sb.brand_name,
  ip.market_code,
  COUNT(DISTINCT ip.item_id) AS item_count,
  COUNT(DISTINCT sb.sku_id) AS sku_count,
  AVG(ip.gmv_rank) AS avg_gmv_rank,
  MIN(ip.gmv_rank) AS min_gmv_rank,
  MAX(ip.gmv_rank) AS max_gmv_rank
FROM item_pool ip
LEFT JOIN sku_base sb ON ip.item_id = sb.item_id AND ip.market_code = sb.market_code
WHERE ip.pool_id = 'pool_001'
  AND sb.ind_level1_id IS NOT NULL
  AND sb.brand_name IS NOT NULL
GROUP BY sb.ind_level1_id, sb.x_cate_level1_id, sb.brand_name, ip.market_code
HAVING COUNT(DISTINCT ip.item_id) >= 5
ORDER BY item_count DESC, avg_gmv_rank ASC;`,
    },
  },
];

// 查询类型配置
export const queryTypes = [
  {
    key: "base",
    label: "查询基本表",
    description: "直接查询基础表，需要执行多表JOIN操作",
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
