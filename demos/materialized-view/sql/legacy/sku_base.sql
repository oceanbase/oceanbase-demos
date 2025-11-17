CREATE TABLE `sku_base` (
  `gmt_create` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `gmt_modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `market_code` varchar(32) COLLATE utf8mb4_bin NOT NULL,
  `item_id` varchar(128) COLLATE utf8mb4_bin NOT NULL,
  `sku_id` varchar(512) COLLATE utf8mb4_bin NOT NULL,
  `sku_price` bigint(20) DEFAULT NULL COMMENT '竞对商品价格',
  `item_title` varchar(2000) COLLATE utf8mb4_bin DEFAULT NULL,
  `seller_id` varchar(200) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '卖家id',
  `seller_nick` varchar(2000) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '卖家昵称',
  `seller_code` varchar(200) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '卖家code',
  `brand_name` varchar(500) COLLATE utf8mb4_bin DEFAULT NULL,
  `update_time` datetime DEFAULT NULL COMMENT '采集更新时间',
  `item_labels` ARRAY(VARCHAR(16)) DEFAULT NULL COMMENT '情报局竞对商品自定义标签',
  `ind_level1_id` varchar(20) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '对应淘系一级行业id',
  `ind_level1_name` varchar(200) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '对应淘系一级行业名称',
  `x_cate_level1_id` varchar(200) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '行业子类目',
  `x_cate_level1_name` varchar(300) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '行业二级子类目',
  `x_cate_level2_id` varchar(200) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '行业子类目',
  `x_cate_level2_name` varchar(300) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '行业二级子类目',
  `extra_info` varchar(65535) COLLATE utf8mb4_bin DEFAULT NULL,
  `sku_spec` varchar(1024) COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'sku规格',
  PRIMARY KEY (`market_code`, `item_id`, `sku_id`)
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin
  ROW_FORMAT = DYNAMIC
  COMPRESSION = 'zstd_1.3.8'
  REPLICA_NUM = 2
  BLOCK_SIZE = 16384
  TABLET_SIZE = 134217728
  PCTFREE = 0
  TABLE_MODE = 'EXTREME'
  PARTITION BY KEY(item_id) PARTITIONS 64;