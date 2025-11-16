# OceanBase 物化视图性能对比演示

这是一个基于 Next.js 的 OceanBase 物化视图性能对比演示应用，用于对比直接查询基础表、查询物化视图和优化器自动改写查询的性能差异。

## 功能特性

- 🎯 **多维度查询场景**：5 个不同的多维度查询场景
- 📊 **性能对比**：自动对比三种查询方式的执行时间
- 🔄 **自动执行**：页面加载和切换场景时自动执行 SQL
- 📈 **可视化展示**：图表展示性能差异，表格展示查询结果
- 🗄️ **真实数据库**：使用 Sequelize 连接 OceanBase 数据库执行真实查询

## 技术栈

- **前端框架**：Next.js 16 + React 19
- **UI 组件库**：Ant Design 5
- **图表库**：@ant-design/charts
- **数据库 ORM**：Sequelize
- **数据库驱动**：mysql2（OceanBase 兼容 MySQL 协议）

## 快速开始

### 1. 安装依赖

本项目使用 [pnpm](https://pnpm.io/) 管理依赖。如果还没有安装 pnpm，可以通过以下方式安装：

```bash
npm install -g pnpm
# 或
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

然后安装项目依赖：

```bash
pnpm install
```

### 2. 配置数据库连接

复制 `.env.example` 文件为 `.env.local`（或 `.env`），并配置 OceanBase 数据库连接信息：

```bash
cp .env.example .env.local
```

编辑 `.env.local` 文件，填入你的数据库配置：

```env
# OceanBase 数据库配置
OCEANBASE_HOST=127.0.0.1
OCEANBASE_PORT=2883
OCEANBASE_DATABASE=test
OCEANBASE_USERNAME=root
OCEANBASE_PASSWORD=your_password

# 环境变量
NODE_ENV=development
```

### 3. 准备数据库

确保 OceanBase 数据库中已经创建了以下表：

- `item_pool`：商品池表
- `sku_base`：SKU 基础信息表
- `sku_grp`：SKU 分组表
- `th_cluster_v3`：物化视图

表结构定义请参考 `sql/` 目录下的 SQL 文件。

### 4. 生成测试数据

使用测试数据生成脚本创建测试数据：

```bash
# 生成默认数量的测试数据（100 条）
pnpm generate:data

# 生成指定数量的测试数据（例如 500 条）
pnpm generate:data 500
```

脚本会自动生成：

- `item_pool` 数据（商品池）
- `sku_base` 数据（SKU 基础信息，每个商品 1-3 个 SKU）
- `sku_grp` 数据（同款分组）
- 自动刷新物化视图 `th_cluster_v3`

更多信息请参考 `scripts/README.md`。

### 5. 启动开发服务器

```bash
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 使用说明

1. **选择场景**：在场景选择器中选择要测试的查询场景
2. **选择查询类型**：选择要对比的查询方式（基础表/物化视图/查询改写）
3. **查看 SQL**：在 SQL 编辑器中查看或编辑生成的 SQL
4. **执行查询**：点击"执行 SQL"按钮或等待自动执行
5. **查看结果**：
   - 在"执行时间"标签页查看性能对比图表
   - 在"执行结果"标签页查看查询返回的数据

## 项目结构

```
.
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── query/
│   │   │       └── route.ts          # API 路由：处理 SQL 查询
│   │   ├── page.tsx                   # 主页面
│   │   └── layout.tsx                 # 布局组件
│   ├── components/                   # React 组件
│   │   ├── ScenarioSelector.tsx      # 场景选择器
│   │   ├── QueryTypeSelector.tsx     # 查询类型选择器
│   │   ├── SQLEditor.tsx             # SQL 编辑器
│   │   ├── ResultsPanel.tsx          # 结果展示面板
│   │   └── ...
│   ├── data/
│   │   └── scenarios.ts              # 场景配置数据
│   └── lib/
│       └── db.ts                     # 数据库连接配置
├── sql/                              # SQL 脚本
│   ├── item_pool.sql
│   ├── sku_base.sql
│   ├── sku_grp.sql
│   └── th_cluster_v3.sql
└── package.json
```

## API 接口

### POST /api/query

执行 SQL 查询

**请求体：**

```json
{
  "sql": "SELECT * FROM item_pool LIMIT 10"
}
```

**响应：**

```json
{
  "success": true,
  "data": [...],
  "rowCount": 10,
  "executionTime": 123
}
```

### GET /api/query

健康检查接口，检查数据库连接状态

**响应：**

```json
{
  "success": true,
  "message": "数据库连接正常"
}
```

## 查询场景

### 场景 1：按池子 ID 和类目维度查询商品信息

查询特定池子中某个一级类目的商品及其竞对信息。

### 场景 2：按品牌和 GMV 排名维度统计

统计不同品牌在不同 GMV 排名区间的商品数量。

### 场景 3：按市场代码和同款分组维度查询

查询特定市场的商品及其同款信息。

### 场景 4：按类目和标签维度过滤查询

查询特定类目和标签的商品信息。

### 场景 5：多维度聚合统计

按类目、品牌、市场等多维度进行聚合统计。

## 开发

### 构建生产版本

```bash
pnpm build
```

### 启动生产服务器

```bash
pnpm start
```

## 物化视图性能优化

### 为什么基表查询也很快？

基表查询速度快的原因：

1. **良好的索引设计**：

   - `item_pool` 表的主键包含 `pool_id`，WHERE 条件 `pool_id = 'pool_001'` 可以直接利用主键索引
   - `item_pool` 表有 `idx_plat_item(market_code, item_id)` 索引，可以优化 JOIN 操作
   - `sku_base` 表的主键包含 `item_id` 和 `market_code`，可以快速定位 JOIN 数据

2. **分区剪枝（Partition Pruning）**：

   - 基表都按 `item_id` 进行了 64 个分区
   - OceanBase 优化器可以利用分区剪枝快速定位到相关分区，减少扫描的数据量

3. **查询相对简单**：

   - 场景 1 只涉及 2 个表的 JOIN（`item_pool LEFT JOIN sku_base`）
   - WHERE 条件使用了主键字段（`pool_id`），可以快速定位数据
   - OceanBase 的优化器可以生成高效的执行计划

4. **OceanBase 的优化特性**：
   - 并行查询：OceanBase 支持并行执行，充分利用多核资源
   - 智能优化器：自动选择最优的执行计划
   - 分区并行：不同分区可以并行扫描

### 为什么物化视图可能没有性能优势？

物化视图的性能优势取决于多个因素：

1. **索引缺失**：物化视图如果没有合适的索引，查询可能比基表慢
2. **分区策略**：物化视图的分区策略（按 `pool_id` 和 `item_id`）可能与查询模式不匹配
3. **数据量**：当数据量较小时，物化视图的维护开销可能大于直接查询基础表的开销
4. **数据新鲜度**：物化视图需要定期刷新以保持数据最新
5. **查询复杂度**：对于简单的查询（如场景 1 的 2 表 JOIN），物化视图的优势不明显；对于复杂的多表 JOIN 查询（如物化视图定义中的 4-5 个表 JOIN），物化视图的优势更明显

### 优化物化视图性能

1. **创建索引**：运行 `pnpm recreate:mv` 脚本会自动为物化视图创建以下索引：

   - `idx_pool_id`：优化按池子 ID 查询
   - `idx_ind_level1_id`：优化按类目查询
   - `idx_pool_ind`：优化按池子 ID 和类目的组合查询
   - `idx_brand_name`：优化按品牌查询
   - `idx_market_code`：优化按市场代码查询
   - `idx_grp_id`：优化按分组 ID 查询

2. **刷新物化视图**：确保物化视图数据是最新的：

   ```bash
   pnpm refresh:mv
   ```

3. **重新创建物化视图**（包含索引）：

   ```bash
   pnpm recreate:mv
   ```

4. **增加数据量**：使用更大的数据集测试，更能体现物化视图的优势：
   ```bash
   pnpm generate:data 1000000  # 生成 100 万条数据
   ```

### 性能对比建议

- **小数据量（< 10,000 条）**：物化视图可能没有明显优势，甚至可能更慢
- **中等数据量（10,000 - 100,000 条）**：物化视图开始显现优势
- **大数据量（> 100,000 条）**：物化视图的优势会非常明显，特别是对于复杂的多表 JOIN 查询

## 注意事项

1. **数据库连接**：确保 OceanBase 数据库服务正在运行，并且网络可达
2. **环境变量**：不要将包含密码的 `.env.local` 文件提交到版本控制系统
3. **SQL 安全**：当前实现直接执行用户输入的 SQL，生产环境需要添加 SQL 注入防护
4. **性能测试**：建议在数据量较大的环境中测试，以获得更准确的性能对比结果
5. **物化视图优化**：确保物化视图已创建索引并已刷新数据，以获得最佳性能
6. **构建配置**：
   - 项目默认使用 **Turbopack**（Next.js 16 的默认打包器），已配置为支持 Sequelize
   - 如需使用 webpack，可以使用 `pnpm dev:webpack` 或 `pnpm build:webpack`
   - 通过 `dialectModule` 明确指定使用 mysql2，避免 Sequelize 加载其他数据库驱动

## 许可证

MIT
