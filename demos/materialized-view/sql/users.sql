-- 用户表
CREATE TABLE `users` (
  `user_id` varchar(64) COLLATE utf8mb4_bin NOT NULL COMMENT '用户ID',
  `user_name` varchar(200) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '用户名称',
  `user_level` varchar(32) COLLATE utf8mb4_bin DEFAULT 'NORMAL' COMMENT '用户等级：NORMAL, VIP, SVIP',
  `region_id` varchar(32) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '地区ID',
  `gmt_create` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `gmt_modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin
  ROW_FORMAT = DYNAMIC
  COMPRESSION = 'zstd_1.3.8'
  REPLICA_NUM = 2
  BLOCK_SIZE = 16384
  TABLET_SIZE = 134217728
  PCTFREE = 0
  TABLE_MODE = 'EXTREME'
  PARTITION BY KEY(user_id) PARTITIONS 64;

-- 创建索引
CREATE INDEX `idx_level` ON `users` (`user_level`);
CREATE INDEX `idx_region` ON `users` (`region_id`);

