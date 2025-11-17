CREATE TABLE `item_pool` (
  `gmt_create` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `gmt_modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `pool_id` varchar(64) COLLATE utf8mb4_bin NOT NULL,
  `item_id` varchar(128) COLLATE utf8mb4_bin NOT NULL,
  `market_code` varchar(64) COLLATE utf8mb4_bin NOT NULL,
  `gmv_rank` bigint(20) DEFAULT NULL COMMENT '成交降序排名',
  `ext_info` varchar(2000) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '扩展信息',
  PRIMARY KEY (`pool_id`, `market_code`, `item_id`),
  KEY `idx_plat_item` (`market_code`, `item_id`)
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin
  ROW_FORMAT = DYNAMIC
  COMPRESSION = 'zstd_1.3.8'
  REPLICA_NUM = 2
  BLOCK_SIZE = 16384
  TABLET_SIZE = 134217728
  PCTFREE = 0
  TABLE_MODE = 'EXTREME'
  PARTITION BY KEY(item_id) PARTITIONS 64;