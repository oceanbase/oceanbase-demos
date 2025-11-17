-- 订单表
CREATE TABLE `orders` (
  `order_id` varchar(64) COLLATE utf8mb4_bin NOT NULL COMMENT '订单ID',
  `user_id` varchar(64) COLLATE utf8mb4_bin NOT NULL COMMENT '用户ID',
  `order_date` date NOT NULL COMMENT '订单日期',
  `order_time` datetime NOT NULL COMMENT '订单时间',
  `region_id` varchar(32) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '地区ID',
  `region_name` varchar(200) COLLATE utf8mb4_bin DEFAULT NULL COMMENT '地区名称',
  `order_amount` decimal(18,2) NOT NULL DEFAULT '0.00' COMMENT '订单金额',
  `order_status` varchar(32) COLLATE utf8mb4_bin NOT NULL DEFAULT 'PENDING' COMMENT '订单状态',
  `gmt_create` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `gmt_modified` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`, `order_date`)
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin
  ROW_FORMAT = DYNAMIC
  COMPRESSION = 'zstd_1.3.8'
  REPLICA_NUM = 2
  BLOCK_SIZE = 16384
  TABLET_SIZE = 134217728
  PCTFREE = 0
  TABLE_MODE = 'EXTREME'
  PARTITION BY RANGE COLUMNS(order_date) (
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
  );

-- 创建索引
CREATE INDEX `idx_user_date` ON `orders` (`user_id`, `order_date`);
CREATE INDEX `idx_date_region` ON `orders` (`order_date`, `region_id`);
CREATE INDEX `idx_date_status` ON `orders` (`order_date`, `order_status`);

