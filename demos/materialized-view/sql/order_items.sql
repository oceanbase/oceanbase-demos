-- 订单明细表
CREATE TABLE `order_items` (
  `order_id` varchar(64) COLLATE utf8mb4_bin NOT NULL COMMENT '订单ID',
  `item_id` varchar(64) COLLATE utf8mb4_bin NOT NULL COMMENT '商品ID',
  `product_id` varchar(64) COLLATE utf8mb4_bin NOT NULL COMMENT '商品SKU ID',
  `quantity` int(11) NOT NULL DEFAULT '1' COMMENT '购买数量',
  `price` decimal(18,2) NOT NULL DEFAULT '0.00' COMMENT '单价',
  `amount` decimal(18,2) NOT NULL DEFAULT '0.00' COMMENT '金额',
  `gmt_create` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`order_id`, `item_id`)
) DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_bin
  ROW_FORMAT = DYNAMIC
  COMPRESSION = 'zstd_1.3.8'
  REPLICA_NUM = 2
  BLOCK_SIZE = 16384
  TABLET_SIZE = 134217728
  PCTFREE = 0
  TABLE_MODE = 'EXTREME'
  PARTITION BY KEY(order_id) PARTITIONS 64;

-- 创建索引
CREATE INDEX `idx_product` ON `order_items` (`product_id`);
CREATE INDEX `idx_order` ON `order_items` (`order_id`);

