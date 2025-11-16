# 测试数据生成脚本

## 使用方法

### 基本用法

生成默认数量的测试数据（100 条 item_pool 记录）：

```bash
pnpm generate:data
```

### 指定数据量

生成指定数量的测试数据：

```bash
pnpm generate:data 500
```

这将生成 500 条 item_pool 记录，以及相应的 sku_base 和 sku_grp 数据。

## 生成的数据

脚本会生成以下测试数据：

1. **item_pool**：商品池数据

   - pool_id: pool_001, pool_002, pool_003
   - market_code: JD, TMALL, TX, PDD, SN
   - gmv_rank: 随机排名

2. **sku_base**：SKU 基础信息

   - 每个商品生成 1-3 个 SKU
   - 包含品牌、类目、价格、标签等信息
   - 支持多个市场平台

3. **sku_grp**：SKU 分组（同款商品）

   - 按品牌和类目自动分组
   - 支持跨市场同款关联
   - 淘系（TX）商品关联到其他市场的同款

4. **th_cluster_v3**：物化视图
   - 自动刷新物化视图
   - 包含所有关联数据

## 数据特点

### 品牌（通用品牌，避免真实品牌）

- 智能科技、时尚潮流、品质生活、优选品牌、经典系列、新锐品牌
- 都市风尚、自然健康、精致生活、潮流前线、品质之选、经典传承

### 类目体系（完整的三级类目）

- **一级类目**：3C 数码、服装服饰、美妆个护、家居用品、食品饮料、运动户外、母婴用品
- **二级类目**：手机通讯、电脑办公、男装、女装、护肤、彩妆、运动鞋服、母婴服饰
- **三级类目**：智能手机、笔记本电脑、T 恤、连衣裙、面霜、口红、运动鞋、婴儿服装

### 商品标签

- 热销、新品、限时、包邮、正品、官方、旗舰店、爆款、秒杀、特价

### 商品规格（按类目分类）

- **3C 数码**：存储容量（64GB、128GB、256GB 等）、颜色
- **服装**：尺码（XS、S、M、L、XL、XXL）、颜色
- **美妆**：容量（500ml、1000ml 等）、颜色
- **家居**：容量、重量

### 商品标题（符合电商规范）

- 使用模板生成，包含品牌、类目、规格等关键信息
- 例如："智能科技 手机通讯 128GB 黑色"、"时尚潮流 女装 红色 M 码 纯棉"

## 环境变量配置

脚本会自动加载环境变量文件（按优先级）：

1. `.env.local`（优先）
2. `.env`
3. 系统环境变量

确保在项目根目录创建 `.env.local` 文件并配置：

```env
OCEANBASE_HOST=your_host
OCEANBASE_PORT=2883
OCEANBASE_DATABASE=your_database
OCEANBASE_USERNAME=your_username
OCEANBASE_PASSWORD=your_password
```

## 注意事项

1. **环境变量**：确保 `.env.local` 文件存在且配置正确
2. **数据库连接**：确保 OceanBase 数据库服务正在运行
3. **表结构**：确保表结构已创建（运行 `sql/` 目录下的 SQL 文件）
4. **物化视图**：物化视图需要手动创建后才能刷新
5. **数据去重**：脚本会使用 `ON DUPLICATE KEY UPDATE`，重复运行不会产生重复数据

## 常见问题

### 连接被拒绝 (ECONNREFUSED)

- 检查 OceanBase 数据库服务是否正在运行
- 确认 `OCEANBASE_HOST` 和 `OCEANBASE_PORT` 配置正确
- 检查防火墙设置

### DNS 解析失败 (ENOTFOUND)

- 确认 `OCEANBASE_HOST` 配置正确
- 检查网络连接是否正常

### 访问被拒绝 (Access denied)

- 确认 `OCEANBASE_USERNAME` 和 `OCEANBASE_PASSWORD` 配置正确
- 确认用户有访问数据库的权限

## 清理数据

如需清理测试数据，可以执行：

```sql
DELETE FROM sku_grp;
DELETE FROM sku_base;
DELETE FROM item_pool;
REFRESH MATERIALIZED VIEW th_cluster_v3;
```
