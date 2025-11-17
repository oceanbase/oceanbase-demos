#!/usr/bin/env tsx

/**
 * 电商场景测试数据生成脚本
 * 用法: pnpm tsx scripts/generate-ecommerce-data.ts [订单数量]
 * 例如: pnpm tsx scripts/generate-ecommerce-data.ts 10000
 */

import { config } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";
import { Sequelize, QueryTypes } from "sequelize";

// 加载环境变量
const envLocalPath = resolve(process.cwd(), ".env.local");
const envPath = resolve(process.cwd(), ".env");

if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
} else if (existsSync(envPath)) {
  config({ path: envPath });
}

// 创建 Sequelize 实例
const sequelize = new Sequelize(
  process.env.OCEANBASE_DATABASE || "test",
  process.env.OCEANBASE_USERNAME || "root",
  process.env.OCEANBASE_PASSWORD || "",
  {
    host: process.env.OCEANBASE_HOST || "127.0.0.1",
    port: parseInt(process.env.OCEANBASE_PORT || "2883", 10),
    dialect: "mysql",
    logging: false,
  }
);

// 配置
const DEFAULT_ORDER_COUNT = 10000; // 默认生成 10000 个订单
const BATCH_SIZE = 1000; // 批量插入大小
// 对于大数据量，使用更小的批次以避免 SQL 语句过长
const LARGE_DATA_BATCH_SIZE = 500; // 大数据量时的批次大小
// 分批生成数据的批次大小（每批生成的订单数）
const DATA_GENERATION_BATCH_SIZE = 10000; // 每批生成 10000 个订单及其相关的用户和商品

// 地区数据
const REGIONS = [
  { id: "BJ", name: "北京" },
  { id: "SH", name: "上海" },
  { id: "GZ", name: "广州" },
  { id: "SZ", name: "深圳" },
  { id: "HZ", name: "杭州" },
  { id: "CD", name: "成都" },
  { id: "WH", name: "武汉" },
  { id: "XA", name: "西安" },
  { id: "NJ", name: "南京" },
  { id: "TJ", name: "天津" },
];

// 用户等级
const USER_LEVELS = ["NORMAL", "VIP", "SVIP"];

// 品牌数据
const BRANDS = [
  { id: "BRAND001", name: "智能科技" },
  { id: "BRAND002", name: "时尚潮流" },
  { id: "BRAND003", name: "品质生活" },
  { id: "BRAND004", name: "优选品牌" },
  { id: "BRAND005", name: "经典系列" },
  { id: "BRAND006", name: "新锐品牌" },
  { id: "BRAND007", name: "都市风尚" },
  { id: "BRAND008", name: "自然健康" },
];

// 类目数据
const CATEGORIES = {
  level1: [
    { id: "1001", name: "3C数码" },
    { id: "1002", name: "服装服饰" },
    { id: "1003", name: "美妆个护" },
    { id: "1004", name: "家居用品" },
    { id: "1005", name: "食品饮料" },
  ],
  level2: [
    { id: "2001", name: "手机通讯", parent: "1001" },
    { id: "2002", name: "电脑办公", parent: "1001" },
    { id: "2003", name: "男装", parent: "1002" },
    { id: "2004", name: "女装", parent: "1002" },
    { id: "2005", name: "护肤", parent: "1003" },
    { id: "2006", name: "彩妆", parent: "1003" },
    { id: "2007", name: "家具", parent: "1004" },
    { id: "2008", name: "家纺", parent: "1004" },
  ],
};

// 订单状态
const ORDER_STATUSES = ["PENDING", "PAID", "SHIPPED", "COMPLETED", "CANCELLED"];

// 生成随机日期（2024年1月到6月）
function randomDate(start: Date, end: Date): Date {
  return new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
}

// 生成用户数据
async function generateUsers(count: number, startUserId: number = 1) {
  console.log(`\n👥 生成 ${count} 个用户...`);
  const userIds: string[] = [];

  // 对于大数据量，使用更小的批次以避免内存问题和 SQL 语句过长
  const batchSize = count > 1000000 ? LARGE_DATA_BATCH_SIZE : BATCH_SIZE;
  const totalBatches = Math.ceil(count / batchSize);

  // 流式处理：分批生成和插入，避免一次性加载所有数据到内存
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const startIndex = startUserId + batchIndex * batchSize;
    const endIndex = Math.min(
      startUserId + (batchIndex + 1) * batchSize - 1,
      startUserId + count - 1
    );
    const batchUsers: Array<{
      user_id: string;
      user_name: string;
      user_level: string;
      region_id: string;
    }> = [];

    // 生成当前批次的数据
    for (let i = startIndex; i <= endIndex; i++) {
      const user_id = `user_${String(i).padStart(8, "0")}`;
      const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];
      const user_level =
        USER_LEVELS[Math.floor(Math.random() * USER_LEVELS.length)];

      batchUsers.push({
        user_id,
        user_name: `用户${i}`,
        user_level,
        region_id: region.id,
      });
      userIds.push(user_id);
    }

    // 批量插入当前批次
    try {
      const values = batchUsers
        .map(
          (u) =>
            `('${u.user_id}', '${u.user_name.replace(/'/g, "''")}', '${
              u.user_level
            }', '${u.region_id}')`
        )
        .join(",");

      // 使用 INSERT IGNORE 避免重复键错误，或使用 ON DUPLICATE KEY UPDATE
      await sequelize.query(
        `INSERT IGNORE INTO users (user_id, user_name, user_level, region_id) VALUES ${values}`,
        { type: QueryTypes.RAW }
      );

      if ((batchIndex + 1) % 10 === 0 || batchIndex === totalBatches - 1) {
        console.log(
          `  ✅ 已生成 ${Math.min((batchIndex + 1) * batchSize, count)} 个用户`
        );
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorName =
        error instanceof Error ? error.constructor.name : "Unknown";

      // UniqueConstraintError 在使用 INSERT IGNORE 后不应该出现，但如果出现则跳过
      if (
        errorName === "UniqueConstraintError" ||
        errorMsg.includes("Duplicate") ||
        errorMsg.includes("duplicate") ||
        errorMsg.includes("已存在")
      ) {
        console.log(
          `  ⚠️  跳过重复数据 (批次 ${batchIndex + 1}/${totalBatches})`
        );
        // 继续执行，不抛出错误
      } else {
        console.error(
          `  ❌ 批量插入失败 (批次 ${
            batchIndex + 1
          }/${totalBatches}): ${errorName} - ${errorMsg}`
        );
        throw error;
      }
    }
  }

  console.log(`✅ 用户生成完成，共 ${count} 个用户`);
  return userIds;
}

// 生成商品数据
async function generateProducts(count: number, startProductId: number = 1) {
  console.log(`\n📦 生成 ${count} 个商品...`);
  const products = [];
  const brands = BRANDS;
  const categories = CATEGORIES.level2;

  for (let i = 0; i < count; i++) {
    const currentProductId = startProductId + i;
    const item_id = `item_${String(currentProductId).padStart(8, "0")}`;
    const product_id = `product_${String(currentProductId).padStart(8, "0")}`;
    const category = categories[Math.floor(Math.random() * categories.length)];
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const category_level1 = CATEGORIES.level1.find(
      (c) => c.id === category.parent
    );

    products.push({
      product_id,
      item_id,
      product_name: `${brand.name} ${category.name} 商品${currentProductId}`,
      brand_id: brand.id,
      brand_name: brand.name,
      category_id: category.id,
      category_name: category.name,
      category_level1_id: category_level1?.id || "",
      category_level1_name: category_level1?.name || "",
      category_level2_id: category.id,
      category_level2_name: category.name,
    });
  }

  // 批量插入
  const batches = [];
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    batches.push(products.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const values = batch
      .map(
        (p) =>
          `('${p.product_id}', '${p.item_id}', '${p.product_name.replace(
            /'/g,
            "''"
          )}', '${p.brand_id}', '${p.brand_name.replace(/'/g, "''")}', '${
            p.category_id
          }', '${p.category_name.replace(/'/g, "''")}', '${
            p.category_level1_id
          }', '${p.category_level1_name.replace(/'/g, "''")}', '${
            p.category_level2_id
          }', '${p.category_level2_name.replace(/'/g, "''")}')`
      )
      .join(",");

    await sequelize.query(
      `INSERT IGNORE INTO products (product_id, item_id, product_name, brand_id, brand_name, category_id, category_name, category_level1_id, category_level1_name, category_level2_id, category_level2_name) VALUES ${values}`,
      { type: QueryTypes.RAW }
    );

    if ((i + 1) % 10 === 0 || i === batches.length - 1) {
      console.log(
        `  ✅ 已生成 ${Math.min((i + 1) * BATCH_SIZE, products.length)} 个商品`
      );
    }
  }

  console.log(`✅ 商品生成完成，共 ${products.length} 个商品`);
  return products;
}

// 生成订单数据
async function generateOrders(
  orderCount: number,
  userIds: string[],
  products: Array<{
    product_id: string;
    item_id: string;
  }>,
  startOrderId: number = 1
) {
  console.log(`\n🛒 生成 ${orderCount} 个订单...`);
  const orders = [];
  const orderItems = [];
  const startDate = new Date("2024-01-01");
  const endDate = new Date("2024-06-30");

  for (let i = 0; i < orderCount; i++) {
    const currentOrderId = startOrderId + i;
    const order_id = `order_${String(currentOrderId).padStart(10, "0")}`;
    const user_id = userIds[Math.floor(Math.random() * userIds.length)];
    const orderDate = randomDate(startDate, endDate);
    const order_date = orderDate.toISOString().split("T")[0];
    const order_time = orderDate.toISOString().slice(0, 19).replace("T", " ");
    const region = REGIONS[Math.floor(Math.random() * REGIONS.length)];
    const order_status =
      ORDER_STATUSES[Math.floor(Math.random() * ORDER_STATUSES.length)];

    // 每个订单包含 1-5 个商品
    const itemCount = Math.floor(Math.random() * 5) + 1;
    let order_amount = 0;

    for (let j = 1; j <= itemCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const price = parseFloat((Math.random() * 1000 + 10).toFixed(2));
      const amount = parseFloat((price * quantity).toFixed(2));
      order_amount += amount;

      orderItems.push({
        order_id,
        item_id: `${order_id}_item_${j}`,
        product_id: product.product_id,
        quantity,
        price,
        amount,
      });
    }

    orders.push({
      order_id,
      user_id,
      order_date,
      order_time,
      region_id: region.id,
      region_name: region.name,
      order_amount: parseFloat(order_amount.toFixed(2)),
      order_status,
    });
  }

  // 批量插入订单
  const orderBatches = [];
  for (let i = 0; i < orders.length; i += BATCH_SIZE) {
    orderBatches.push(orders.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < orderBatches.length; i++) {
    const batch = orderBatches[i];
    const values = batch
      .map(
        (o) =>
          `('${o.order_id}', '${o.user_id}', '${o.order_date}', '${
            o.order_time
          }', '${o.region_id}', '${o.region_name.replace(/'/g, "''")}', ${
            o.order_amount
          }, '${o.order_status}')`
      )
      .join(",");

    await sequelize.query(
      `INSERT IGNORE INTO orders (order_id, user_id, order_date, order_time, region_id, region_name, order_amount, order_status) VALUES ${values}`,
      { type: QueryTypes.RAW }
    );

    if ((i + 1) % 10 === 0 || i === orderBatches.length - 1) {
      console.log(
        `  ✅ 已生成 ${Math.min((i + 1) * BATCH_SIZE, orders.length)} 个订单`
      );
    }
  }

  // 批量插入订单明细
  const itemBatches = [];
  for (let i = 0; i < orderItems.length; i += BATCH_SIZE) {
    itemBatches.push(orderItems.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < itemBatches.length; i++) {
    const batch = itemBatches[i];
    const values = batch
      .map(
        (oi) =>
          `('${oi.order_id}', '${oi.item_id}', '${oi.product_id}', ${oi.quantity}, ${oi.price}, ${oi.amount})`
      )
      .join(",");

    await sequelize.query(
      `INSERT IGNORE INTO order_items (order_id, item_id, product_id, quantity, price, amount) VALUES ${values}`,
      { type: QueryTypes.RAW }
    );

    if ((i + 1) % 10 === 0 || i === itemBatches.length - 1) {
      console.log(
        `  ✅ 已生成 ${Math.min(
          (i + 1) * BATCH_SIZE,
          orderItems.length
        )} 个订单明细`
      );
    }
  }

  console.log(
    `✅ 订单生成完成，共 ${orders.length} 个订单，${orderItems.length} 个订单明细`
  );
}

// 刷新物化视图
async function refreshMaterializedView() {
  console.log(`\n🔄 刷新物化视图 sales_summary_mv...`);

  const refreshMethods = [
    {
      name: "ALTER TABLE ... REFRESH",
      sql: "ALTER TABLE sales_summary_mv REFRESH",
    },
    {
      name: "DBMS_MVIEW.REFRESH",
      sql: "CALL DBMS_MVIEW.REFRESH('sales_summary_mv')",
    },
    {
      name: "REFRESH MATERIALIZED VIEW",
      sql: "REFRESH MATERIALIZED VIEW sales_summary_mv",
    },
  ];

  let refreshed = false;
  for (const method of refreshMethods) {
    try {
      await sequelize.query(method.sql, { type: QueryTypes.RAW });
      console.log(`✅ 物化视图刷新完成（使用 ${method.name}）`);
      refreshed = true;
      break;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes("does not exist") ||
        errorMessage.includes("不存在")
      ) {
        console.log(`  ⚠️  ${method.name} 失败: 物化视图不存在`);
        break;
      } else {
        console.log(`  ⚠️  ${method.name} 失败: ${errorMessage}`);
      }
    }
  }

  if (!refreshed) {
    console.log("⚠️  所有刷新方法都失败，物化视图可能需要手动刷新");
    console.log("   提示：可以尝试执行: ALTER TABLE sales_summary_mv REFRESH");
  }
}

// 分批生成数据：每批生成用户、商品和订单
async function generateDataBatch(
  batchIndex: number,
  batchOrderCount: number,
  totalBatches: number,
  startOrderId: number,
  startUserId: number,
  startProductId: number
) {
  console.log(
    `\n📦 批次 ${
      batchIndex + 1
    }/${totalBatches}：生成 ${batchOrderCount} 个订单...`
  );

  // 1. 生成本批次的用户（订单数量的 10%）
  const userCount = Math.max(100, Math.floor(batchOrderCount * 0.1));
  const userIds = await generateUsers(userCount, startUserId);

  // 2. 生成本批次的商品（订单数量的 20%）
  const productCount = Math.max(200, Math.floor(batchOrderCount * 0.2));
  const products = await generateProducts(productCount, startProductId);

  // 3. 生成本批次的订单和订单明细
  await generateOrders(batchOrderCount, userIds, products, startOrderId);

  console.log(
    `✅ 批次 ${
      batchIndex + 1
    }/${totalBatches} 完成（${batchOrderCount} 个订单）`
  );

  // 返回下一批的起始ID
  return {
    nextUserId: startUserId + userCount,
    nextProductId: startProductId + productCount,
  };
}

// 主函数
async function main() {
  const orderCount = parseInt(
    process.argv[2] || String(DEFAULT_ORDER_COUNT),
    10
  );

  try {
    console.log("🔌 正在连接数据库...");
    await sequelize.authenticate();
    console.log("✅ 数据库连接成功\n");

    console.log(`📊 开始生成测试数据（订单数量: ${orderCount}）\n`);

    // 分批生成数据
    const totalBatches = Math.ceil(orderCount / DATA_GENERATION_BATCH_SIZE);
    let generatedOrderCount = 0;
    let currentUserId = 1;
    let currentProductId = 1;

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const remainingOrders = orderCount - generatedOrderCount;
      const batchOrderCount = Math.min(
        DATA_GENERATION_BATCH_SIZE,
        remainingOrders
      );
      const startOrderId = generatedOrderCount + 1;

      const result = await generateDataBatch(
        batchIndex,
        batchOrderCount,
        totalBatches,
        startOrderId,
        currentUserId,
        currentProductId
      );

      generatedOrderCount += batchOrderCount;
      currentUserId = result.nextUserId;
      currentProductId = result.nextProductId;
    }

    // 4. 刷新物化视图
    await refreshMaterializedView();

    // 5. 统计信息
    console.log("\n📊 数据统计:");
    try {
      const [userCountResult] = await sequelize.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM users",
        { type: QueryTypes.SELECT }
      );
      console.log(`  - 用户: ${userCountResult?.count || 0} 个`);

      const [productCountResult] = await sequelize.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM products",
        { type: QueryTypes.SELECT }
      );
      console.log(`  - 商品: ${productCountResult?.count || 0} 个`);

      const [orderCountResult] = await sequelize.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM orders",
        { type: QueryTypes.SELECT }
      );
      console.log(`  - 订单: ${orderCountResult?.count || 0} 个`);

      const [itemCountResult] = await sequelize.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM order_items",
        { type: QueryTypes.SELECT }
      );
      console.log(`  - 订单明细: ${itemCountResult?.count || 0} 个`);

      const [mvCountResult] = await sequelize.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM sales_summary_mv",
        { type: QueryTypes.SELECT }
      );
      console.log(`  - 物化视图: ${mvCountResult?.count || 0} 条`);
    } catch {
      console.log("  ⚠️  无法获取统计信息");
    }

    console.log("\n✅ 测试数据生成完成！");
  } catch (error) {
    console.error("\n❌ 生成测试数据失败:");
    if (error instanceof Error) {
      console.error(`错误类型: ${error.constructor.name}`);
      console.error(`错误消息: ${error.message}`);
      if ("stack" in error && error.stack) {
        console.error(`错误堆栈:\n${error.stack}`);
      }
      // 如果是 Sequelize 错误，输出更多信息
      if ("name" in error && error.name === "SequelizeValidationError") {
        console.error("验证错误详情:");
        if ("errors" in error && Array.isArray(error.errors)) {
          error.errors.forEach((err: unknown) => {
            if (err && typeof err === "object" && "message" in err) {
              console.error(`  - ${err.message}`);
            }
          });
        }
      }
    } else {
      console.error("未知错误:", error);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
