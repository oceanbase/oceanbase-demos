-- 商品表
CREATE TABLE `products` (
  `product_id` varchar(64) COLLATE utf8mb4_bin NOT NULL COMMENT '商品SKU ID',
  `item_id` varchar(64) COLLATE utf8mb4_bin NOT NULL COMMENT '商品ID',
  `product_name` varchar(500) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '商品名称',
  `brand_id` varchar(64) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '品牌ID',
  `brand_name` varchar(200) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '品牌名称',
  `category_id` varchar(64) COLLATE utf8mb4_bin NOT NULL COMMENT '类目ID',
  `category_name` varchar(200) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '类目名称',
  `category_level1_id` varchar(64) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '一级类目ID',
  `category_level1_name` varchar(200) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '一级类目名称',
  `category_level2_id` varchar(64) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '二级类目ID',
  `category_level2_name` varchar(200) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '二级类目名称',
  `gmt_create` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `gmt_modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`product_id`)
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin
  ROW_FORMAT = DYNAMIC
  COMPRESSION = 'zstd_1.3.8'
  REPLICA_NUM = 2
  BLOCK_SIZE = 16384
  TABLET_SIZE = 134217728
  PCTFREE = 0
  TABLE_MODE = 'EXTREME'
  PARTITION BY KEY(product_id) PARTITIONS 64;

-- 创建索引
CREATE INDEX `idx_item` ON `products` (`item_id`);
CREATE INDEX `idx_category` ON `products` (`category_id`);
CREATE INDEX `idx_category_level1` ON `products` (`category_level1_id`);
CREATE INDEX `idx_brand` ON `products` (`brand_id`);

