CREATE TABLE `sku_grp` (
  `gmt_create` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `gmt_modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `market_code` varchar(64) COLLATE utf8mb4_bin NOT NULL,
  `item_id` varchar(128) COLLATE utf8mb4_bin NOT NULL,
  `sku_id` varchar(512) COLLATE utf8mb4_bin NOT NULL,
  `grp_id` varchar(128) COLLATE utf8mb4_bin NOT NULL,
  `grp_modified_time` datetime NOT NULL,
  PRIMARY KEY (`market_code`, `item_id`, `sku_id`),
  KEY `idx_grp_market` (`grp_id`, `market_code`)
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin
  ROW_FORMAT = DYNAMIC
  COMPRESSION = 'zstd_1.3.8'
  REPLICA_NUM = 2
  BLOCK_SIZE = 16384
  TABLET_SIZE = 134217728
  PCTFREE = 0
  TABLE_MODE = 'EXTREME'
  PARTITION BY KEY(item_id) PARTITIONS 64;