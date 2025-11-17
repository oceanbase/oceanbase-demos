-- 物化视图日志
-- 用于支持物化视图的 FAST REFRESH（增量刷新）
-- 参考：https://www.oceanbase.com/docs/common-oceanbase-database-cn-1000000002016850

-- 为 orders 表创建物化视图日志
CREATE MATERIALIZED VIEW LOG ON orders
WITH PRIMARY KEY, ROWID
INCLUDING NEW VALUES;

-- 为 order_items 表创建物化视图日志
CREATE MATERIALIZED VIEW LOG ON order_items
WITH PRIMARY KEY, ROWID
INCLUDING NEW VALUES;

-- 为 products 表创建物化视图日志
CREATE MATERIALIZED VIEW LOG ON products
WITH PRIMARY KEY, ROWID
INCLUDING NEW VALUES;

-- 为 users 表创建物化视图日志
CREATE MATERIALIZED VIEW LOG ON users
WITH PRIMARY KEY, ROWID
INCLUDING NEW VALUES;

