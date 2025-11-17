#!/usr/bin/env tsx

/**
 * 测试数据生成脚本
 * 用法: pnpm tsx scripts/generate-test-data.ts [数据量]
 * 例如: pnpm tsx scripts/generate-test-data.ts 100
 */

// 加载环境变量（优先加载 .env.local，然后是 .env）
import { config } from "dotenv";
import { resolve } from "path";
import { existsSync } from "fs";

// 尝试加载 .env.local，如果不存在则加载 .env
const envLocalPath = resolve(process.cwd(), ".env.local");
const envPath = resolve(process.cwd(), ".env");

if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
  console.log("✅ 已加载 .env.local");
} else if (existsSync(envPath)) {
  config({ path: envPath });
  console.log("✅ 已加载 .env");
} else {
  // 也尝试加载默认的 .env（dotenv 会自动查找）
  config();
  console.log("⚠️  未找到 .env.local 或 .env 文件，使用系统环境变量或默认配置");
}

import { sequelize } from "../../src/lib/db";
import { QueryTypes } from "sequelize";

// 配置
const DEFAULT_COUNT = 100; // 默认生成 100 条 item_pool 记录
const POOL_IDS = ["pool_001", "pool_002", "pool_003"];
const MARKET_CODES = ["JD", "TMALL", "TX", "PDD", "SN"];

// 通用品牌名称（避免真实品牌）
const BRANDS = [
  "智能科技",
  "时尚潮流",
  "品质生活",
  "优选品牌",
  "经典系列",
  "新锐品牌",
  "都市风尚",
  "自然健康",
  "精致生活",
  "潮流前线",
  "品质之选",
  "经典传承",
];

// 电商类目体系
const CATEGORIES = {
  ind_level1: [
    { id: "1001", name: "3C数码" },
    { id: "1002", name: "服装服饰" },
    { id: "1003", name: "美妆个护" },
    { id: "1004", name: "家居用品" },
    { id: "1005", name: "食品饮料" },
    { id: "1006", name: "运动户外" },
    { id: "1007", name: "母婴用品" },
  ],
  x_cate_level1: [
    { id: "2001", name: "手机通讯" },
    { id: "2002", name: "电脑办公" },
    { id: "2003", name: "男装" },
    { id: "2004", name: "女装" },
    { id: "2005", name: "护肤" },
    { id: "2006", name: "彩妆" },
    { id: "2007", name: "运动鞋服" },
    { id: "2008", name: "母婴服饰" },
  ],
  x_cate_level2: [
    { id: "3001", name: "智能手机" },
    { id: "3002", name: "笔记本电脑" },
    { id: "3003", name: "T恤" },
    { id: "3004", name: "连衣裙" },
    { id: "3005", name: "面霜" },
    { id: "3006", name: "口红" },
    { id: "3007", name: "运动鞋" },
    { id: "3008", name: "婴儿服装" },
  ],
};

// 电商标签
const LABELS = [
  "热销",
  "新品",
  "限时",
  "包邮",
  "正品",
  "官方",
  "旗舰店",
  "爆款",
  "秒杀",
  "特价",
];

// 商品规格（更符合电商场景）
const SKU_SPECS = {
  digital: [
    "64GB",
    "128GB",
    "256GB",
    "512GB",
    "1TB",
    "8GB+128GB",
    "12GB+256GB",
  ],
  color: ["红色", "蓝色", "黑色", "白色", "粉色", "灰色", "绿色", "紫色"],
  size: ["XS码", "S码", "M码", "L码", "XL码", "XXL码"],
  capacity: ["500ml", "1000ml", "2000ml"],
  weight: ["100g", "200g", "500g", "1kg"],
};

// 商品标题模板（更符合电商场景）
const TITLE_TEMPLATES = {
  digital: [
    "{brand} {category2} {spec} {color}",
    "{brand} {category2} {spec} 全网通",
    "{brand} {category2} {spec} 5G版",
  ],
  clothing: [
    "{brand} {category2} {color} {size}",
    "{brand} {category2} {color} {size} 纯棉",
    "{brand} {category2} {color} {size} 休闲",
  ],
  beauty: [
    "{brand} {category2} {spec} {color}",
    "{brand} {category2} {spec} 保湿",
    "{brand} {category2} {spec} 美白",
  ],
  home: [
    "{brand} {category2} {spec}",
    "{brand} {category2} {spec} 家用",
    "{brand} {category2} {spec} 套装",
  ],
};

// 生成随机数
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

function randomChoices<T>(array: T[], count: number): T[] {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, array.length));
}

// 生成 item_pool 数据
async function generateItemPool(count: number) {
  console.log(`\n📦 生成 ${count} 条 item_pool 数据...`);

  const poolId = randomChoice(POOL_IDS);
  const BATCH_SIZE = 10000; // 每批插入 10000 条数据
  let inserted = 0;

  for (let batchStart = 1; batchStart <= count; batchStart += BATCH_SIZE) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE - 1, count);
    const values: string[] = [];

    for (let i = batchStart; i <= batchEnd; i++) {
      const itemId = `item_${String(i).padStart(6, "0")}`;
      const marketCode = randomChoice(MARKET_CODES);
      const gmvRank = randomInt(1, count);
      const extInfo = JSON.stringify({ source: "test", batch: Date.now() });

      values.push(
        `('${poolId}', '${itemId}', '${marketCode}', ${gmvRank}, '${extInfo}')`
      );
    }

    const sql = `
      INSERT INTO item_pool (pool_id, item_id, market_code, gmv_rank, ext_info)
      VALUES ${values.join(",\n    ")}
      ON DUPLICATE KEY UPDATE
        gmv_rank = VALUES(gmv_rank),
        ext_info = VALUES(ext_info)
    `;

    await sequelize.query(sql, { type: QueryTypes.INSERT });
    inserted += values.length;

    // 显示进度
    if (inserted % 50000 === 0 || inserted >= count) {
      console.log(
        `  已插入 ${inserted} / ${count} 条 (${Math.round(
          (inserted / count) * 100
        )}%)`
      );
    }
  }

  console.log(`✅ item_pool 数据生成完成，共 ${inserted} 条`);

  return { poolId, count: inserted };
}

// 生成商品标题
function generateItemTitle(
  category1: (typeof CATEGORIES.ind_level1)[0],
  category2: (typeof CATEGORIES.x_cate_level1)[0],
  category3: (typeof CATEGORIES.x_cate_level2)[0],
  brand: string,
  spec: string
): string {
  let template: string[];

  if (category1.id === "1001") {
    // 3C数码
    template = TITLE_TEMPLATES.digital;
    const color = randomChoice(SKU_SPECS.color);
    return randomChoice(template)
      .replace("{brand}", brand)
      .replace("{category2}", category2.name)
      .replace("{spec}", spec)
      .replace("{color}", color);
  } else if (category1.id === "1002") {
    // 服装服饰
    template = TITLE_TEMPLATES.clothing;
    const color = randomChoice(SKU_SPECS.color);
    const size = randomChoice(SKU_SPECS.size);
    return randomChoice(template)
      .replace("{brand}", brand)
      .replace("{category2}", category2.name)
      .replace("{color}", color)
      .replace("{size}", size);
  } else if (category1.id === "1003") {
    // 美妆个护
    template = TITLE_TEMPLATES.beauty;
    const color = randomChoice(SKU_SPECS.color);
    return randomChoice(template)
      .replace("{brand}", brand)
      .replace("{category2}", category2.name)
      .replace("{spec}", spec)
      .replace("{color}", color);
  } else {
    // 其他类目
    template = TITLE_TEMPLATES.home;
    return randomChoice(template)
      .replace("{brand}", brand)
      .replace("{category2}", category2.name)
      .replace("{spec}", spec);
  }
}

// 根据类目选择规格
function getSpecByCategory(
  category1: (typeof CATEGORIES.ind_level1)[0],
  category2: (typeof CATEGORIES.x_cate_level1)[0]
): string {
  if (category1.id === "1001") {
    // 3C数码
    if (category2.id === "2001") {
      return randomChoice(SKU_SPECS.digital); // 手机
    } else {
      return randomChoice([...SKU_SPECS.digital, ...SKU_SPECS.capacity]); // 电脑等
    }
  } else if (category1.id === "1002") {
    // 服装
    return randomChoice(SKU_SPECS.size);
  } else if (category1.id === "1003") {
    // 美妆
    return randomChoice([...SKU_SPECS.capacity, ...SKU_SPECS.color]);
  } else if (category1.id === "1004") {
    // 家居
    return randomChoice([...SKU_SPECS.capacity, ...SKU_SPECS.weight]);
  } else {
    return randomChoice([...SKU_SPECS.capacity, ...SKU_SPECS.weight]);
  }
}

// 生成 sku_base 数据
async function generateSkuBase(poolId: string) {
  console.log(`\n📦 生成 sku_base 数据...`);

  // 获取已生成的 item_pool 数据
  const items = await sequelize.query<{
    item_id: string;
    market_code: string;
  }>(`SELECT item_id, market_code FROM item_pool WHERE pool_id = '${poolId}'`, {
    type: QueryTypes.SELECT,
  });

  const values: string[] = [];
  let skuIndex = 1;
  const skuLabelsMap = new Map<string, string[]>(); // 保存 sku_id -> labels 映射

  for (const item of items) {
    // 每个商品生成 1-3 个 SKU（更符合电商场景）
    const skuCount = randomInt(1, 3);

    // 为每个商品选择类目和品牌（保持一致）
    const category1 = randomChoice(CATEGORIES.ind_level1);
    const category2 =
      CATEGORIES.x_cate_level1.filter((c) => {
        // 根据一级类目筛选二级类目
        if (category1.id === "1001") return ["2001", "2002"].includes(c.id);
        if (category1.id === "1002") return ["2003", "2004"].includes(c.id);
        if (category1.id === "1003") return ["2005", "2006"].includes(c.id);
        if (category1.id === "1006") return ["2007"].includes(c.id);
        if (category1.id === "1007") return ["2008"].includes(c.id);
        return true;
      })[0] || randomChoice(CATEGORIES.x_cate_level1);

    const category3 =
      CATEGORIES.x_cate_level2.filter((c) => {
        // 根据二级类目筛选三级类目
        if (category2.id === "2001") return ["3001"].includes(c.id);
        if (category2.id === "2002") return ["3002"].includes(c.id);
        if (category2.id === "2003") return ["3003"].includes(c.id);
        if (category2.id === "2004") return ["3004"].includes(c.id);
        if (category2.id === "2005") return ["3005"].includes(c.id);
        if (category2.id === "2006") return ["3006"].includes(c.id);
        if (category2.id === "2007") return ["3007"].includes(c.id);
        if (category2.id === "2008") return ["3008"].includes(c.id);
        return true;
      })[0] || randomChoice(CATEGORIES.x_cate_level2);

    const brand = randomChoice(BRANDS);

    for (let j = 0; j < skuCount; j++) {
      const skuId = `sku_${String(skuIndex++).padStart(6, "0")}`;
      const spec = getSpecByCategory(category1, category2);
      const skuPrice = randomInt(5000, 500000); // 价格（分），50元-5000元
      const itemTitle = generateItemTitle(
        category1,
        category2,
        category3,
        brand,
        spec
      );
      const sellerId = `seller_${String(randomInt(1, 50)).padStart(3, "0")}`;
      const sellerNick = `${brand}${randomChoice(["官方", "旗舰", "专营"])}店`;
      const labels = randomChoices(LABELS, randomInt(1, 4));
      const updateTime = new Date(
        Date.now() - randomInt(0, 30) * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      // 处理 ARRAY 类型
      // OceanBase 的 ARRAY 类型在 INSERT 中可能不支持直接字面量
      // 先插入 NULL，然后使用 UPDATE 语句更新 ARRAY 字段
      const arrayValue = "NULL"; // 先设置为 NULL

      values.push(`(
        '${item.market_code}',
        '${item.item_id}',
        '${skuId}',
        ${skuPrice},
        '${itemTitle.replace(/'/g, "''")}',
        '${sellerId}',
        '${sellerNick.replace(/'/g, "''")}',
        '${sellerId}',
        '${brand}',
        '${updateTime}',
        ${arrayValue},
        '${category1.id}',
        '${category1.name}',
        '${category2.id}',
        '${category2.name}',
        '${category3.id}',
        '${category3.name}',
        NULL,
        '${spec}'
      )`);

      // 保存 labels 信息（暂时不更新 ARRAY 字段，因为 OceanBase 的 ARRAY 插入语法限制）
      skuLabelsMap.set(`${item.market_code}|${item.item_id}|${skuId}`, labels);
    }
  }

  if (values.length > 0) {
    // 分批插入，避免 SQL 过长
    const batchSize = 50;
    for (let i = 0; i < values.length; i += batchSize) {
      const batch = values.slice(i, i + batchSize);
      const sql = `
        INSERT INTO sku_base (
          market_code, item_id, sku_id, sku_price, item_title,
          seller_id, seller_nick, seller_code, brand_name, update_time,
          item_labels, ind_level1_id, ind_level1_name,
          x_cate_level1_id, x_cate_level1_name,
          x_cate_level2_id, x_cate_level2_name,
          extra_info, sku_spec
        )
        VALUES ${batch.join(",\n        ")}
        ON DUPLICATE KEY UPDATE
          sku_price = VALUES(sku_price),
          item_title = VALUES(item_title),
          brand_name = VALUES(brand_name),
          update_time = VALUES(update_time)
      `;

      await sequelize.query(sql, { type: QueryTypes.INSERT });
    }
    console.log(`✅ sku_base 数据生成完成，共 ${values.length} 条`);
    console.log(
      `⚠️  注意：item_labels 字段设置为 NULL（OceanBase ARRAY 类型插入语法限制）`
    );
  }
}

// 生成 sku_grp 数据（同款分组）
async function generateSkuGrp(poolId: string) {
  console.log(`\n📦 生成 sku_grp 数据（同款分组）...`);

  // 获取 sku_base 数据
  const skus = await sequelize.query<{
    market_code: string;
    item_id: string;
    sku_id: string;
  }>(
    `SELECT DISTINCT market_code, item_id, sku_id 
     FROM sku_base 
     WHERE item_id IN (SELECT item_id FROM item_pool WHERE pool_id = '${poolId}')`,
    { type: QueryTypes.SELECT }
  );

  if (skus.length === 0) {
    console.log("⚠️  没有找到 sku_base 数据，跳过 sku_grp 生成");
    return;
  }

  // 按品牌和类目分组，创建同款组
  const grpMap = new Map<string, string[]>(); // grp_id -> skus
  let grpIdCounter = 1;

  // 获取品牌和类目信息
  const skuDetails = await sequelize.query<{
    market_code: string;
    item_id: string;
    sku_id: string;
    brand_name: string;
    x_cate_level1_id: string;
  }>(
    `SELECT market_code, item_id, sku_id, brand_name, x_cate_level1_id
     FROM sku_base
     WHERE item_id IN (SELECT item_id FROM item_pool WHERE pool_id = '${poolId}')`,
    { type: QueryTypes.SELECT }
  );

  // 按品牌和类目分组
  for (const sku of skuDetails) {
    if (sku.market_code === "TX") continue; // 跳过淘系，后面单独处理

    const key = `${sku.brand_name}_${sku.x_cate_level1_id}`;
    if (!grpMap.has(key)) {
      grpMap.set(key, []);
    }
    grpMap.get(key)!.push(`${sku.market_code}|${sku.item_id}|${sku.sku_id}`);
  }

  const values: string[] = [];
  const grpIdMap = new Map<string, string>(); // key -> grp_id

  // 为非淘系商品创建分组
  for (const [key, skuList] of grpMap.entries()) {
    if (skuList.length < 2) continue; // 至少需要2个商品才能成组

    const grpId = `grp_${String(grpIdCounter++).padStart(6, "0")}`;
    grpIdMap.set(key, grpId);

    for (const skuStr of skuList) {
      const [marketCode, itemId, skuId] = skuStr.split("|");
      const grpModifiedTime = new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");

      values.push(
        `('${marketCode}', '${itemId}', '${skuId}', '${grpId}', '${grpModifiedTime}')`
      );
    }
  }

  // 为淘系商品创建对应的分组（关联到已有的分组）
  const txSkus = skuDetails.filter((s) => s.market_code === "TX");
  for (const txSku of txSkus) {
    // 找到相同品牌和类目的分组
    const key = `${txSku.brand_name}_${txSku.x_cate_level1_id}`;
    const grpId = grpIdMap.get(key);

    if (grpId) {
      const grpModifiedTime = new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", " ");
      values.push(
        `('TX', '${txSku.item_id}', '${txSku.sku_id}', '${grpId}', '${grpModifiedTime}')`
      );
    }
  }

  if (values.length > 0) {
    const sql = `
      INSERT INTO sku_grp (market_code, item_id, sku_id, grp_id, grp_modified_time)
      VALUES ${values.join(",\n      ")}
      ON DUPLICATE KEY UPDATE
        grp_id = VALUES(grp_id),
        grp_modified_time = VALUES(grp_modified_time)
    `;

    await sequelize.query(sql, { type: QueryTypes.INSERT });
    console.log(
      `✅ sku_grp 数据生成完成，共 ${values.length} 条，${grpIdMap.size} 个分组`
    );
  }
}

// 刷新物化视图
async function refreshMaterializedView() {
  console.log(`\n🔄 刷新物化视图 th_cluster_v3...`);
  try {
    // OceanBase 的物化视图刷新语法
    await sequelize.query("ALTER TABLE th_cluster_v3 REFRESH", {
      type: QueryTypes.RAW,
    });
    console.log("✅ 物化视图刷新完成");
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("does not exist") ||
      errorMessage.includes("不存在")
    ) {
      console.log("⚠️  物化视图不存在，请先创建物化视图");
    } else {
      // 尝试其他刷新语法
      try {
        await sequelize.query("CALL DBMS_MVIEW.REFRESH('th_cluster_v3')", {
          type: QueryTypes.RAW,
        });
        console.log("✅ 物化视图刷新完成（使用存储过程）");
      } catch {
        console.log("⚠️  物化视图刷新失败，可能需要手动刷新或物化视图不存在");
        console.log(
          "   提示：物化视图会在查询时自动更新，或需要手动执行刷新命令"
        );
      }
    }
  }
}

// 主函数
async function main() {
  const count = parseInt(process.argv[2] || String(DEFAULT_COUNT), 10);

  console.log("🚀 开始生成测试数据...");
  console.log(`📊 数据量: ${count} 条 item_pool 记录`);

  try {
    // 显示连接配置（隐藏密码）
    const host = process.env.OCEANBASE_HOST || "127.0.0.1";
    const port = process.env.OCEANBASE_PORT || "2883";
    const database = process.env.OCEANBASE_DATABASE || "test";
    const username = process.env.OCEANBASE_USERNAME || "root";

    console.log("\n📋 数据库连接配置:");
    console.log(`  - Host: ${host}`);
    console.log(`  - Port: ${port}`);
    console.log(`  - Database: ${database}`);
    console.log(`  - Username: ${username}`);
    console.log(
      `  - Password: ${process.env.OCEANBASE_PASSWORD ? "***" : "(未设置)"}\n`
    );

    // 测试连接
    console.log("🔌 正在连接数据库...");
    await sequelize.authenticate();
    console.log("✅ 数据库连接成功\n");

    // 生成数据
    const { poolId } = await generateItemPool(count);
    await generateSkuBase(poolId);
    await generateSkuGrp(poolId);
    await refreshMaterializedView();

    // 统计信息
    console.log("\n📊 数据统计:");
    try {
      const itemPoolResult = await sequelize.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM item_pool",
        { type: QueryTypes.SELECT }
      );
      const skuBaseResult = await sequelize.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM sku_base",
        { type: QueryTypes.SELECT }
      );
      const skuGrpResult = await sequelize.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM sku_grp",
        { type: QueryTypes.SELECT }
      );

      console.log(`  - item_pool: ${itemPoolResult[0]?.count || 0} 条`);
      console.log(`  - sku_base: ${skuBaseResult[0]?.count || 0} 条`);
      console.log(`  - sku_grp: ${skuGrpResult[0]?.count || 0} 条`);

      try {
        const mvResult = await sequelize.query<{ count: string }>(
          "SELECT COUNT(*) as count FROM th_cluster_v3",
          { type: QueryTypes.SELECT }
        );
        console.log(`  - th_cluster_v3: ${mvResult[0]?.count || 0} 条`);
      } catch {
        console.log(`  - th_cluster_v3: 未创建或无法访问`);
      }
    } catch (error) {
      console.error("⚠️  统计信息获取失败:", error);
    }

    console.log("\n✅ 测试数据生成完成！");
  } catch (error) {
    console.error("\n❌ 生成测试数据失败:");

    if (error instanceof Error) {
      if (error.message.includes("ECONNREFUSED")) {
        console.error("\n💡 连接被拒绝，可能的原因：");
        console.error("  1. OceanBase 数据库服务未启动");
        console.error("  2. 数据库地址或端口配置错误");
        console.error("  3. 防火墙阻止了连接");
        console.error("\n📝 请检查：");
        console.error("  - 确保 OceanBase 数据库正在运行");
        console.error("  - 检查 .env.local 或 .env 文件中的配置");
        console.error("  - 确认 OCEANBASE_HOST 和 OCEANBASE_PORT 配置正确");
      } else if (error.message.includes("ENOTFOUND")) {
        console.error("\n💡 DNS 解析失败，可能的原因：");
        console.error("  1. 数据库主机名配置错误");
        console.error("  2. 网络连接问题");
        console.error("\n📝 请检查：");
        console.error("  - 确认 OCEANBASE_HOST 配置正确");
        console.error("  - 检查网络连接是否正常");
      } else if (error.message.includes("Access denied")) {
        console.error("\n💡 访问被拒绝，可能的原因：");
        console.error("  1. 用户名或密码错误");
        console.error("  2. 用户没有访问该数据库的权限");
        console.error("\n📝 请检查：");
        console.error(
          "  - 确认 OCEANBASE_USERNAME 和 OCEANBASE_PASSWORD 配置正确"
        );
        console.error("  - 确认用户有访问数据库的权限");
      } else {
        console.error(`\n错误详情: ${error.message}`);
      }
    } else {
      console.error(error);
    }

    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// 运行脚本
main();
